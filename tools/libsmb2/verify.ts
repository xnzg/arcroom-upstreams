// The artifact gate. Every check expands the zips the way a consumer does and
// asserts what the consumer depends on: the slice matrix, each bundle's layout
// and Info.plist, the LC_BUILD_VERSION platform and floor, the install name,
// that nothing links outside libSystem, the signatures, that the module map
// still imports as `SMB2` and `SMB2.Raw` under that slice's own SDK, and that
// the macOS slice actually loads and runs.

import { basename, join, resolve } from '../lib/path.ts'
import { capture, run } from '../lib/proc.ts'
import {
  artifactName,
  buildVersion,
  bundleIdentifier,
  frameworkName,
  headers,
  installName,
  isVersionedLayout,
  moduleName,
  platformCodes,
  sha256,
  slices,
  sourceArtifactName,
  swiftPMArtifactName,
  triple,
  upstreamSHA256,
  upstreamTag,
  upstreamVersion,
  xcframeworkName,
} from './build.ts'

const failures: string[] = []

const allowedLinkedLibraries = ['/usr/lib/libSystem.B.dylib']

const expectedExports = [
  '_smb2_connect_share_async',
  '_smb2_destroy_context',
  '_smb2_init_context',
  '_smb2_service',
]

function check(condition: boolean, description: string): void {
  console.log(`${condition ? 'ok  ' : 'FAIL'} ${description}`)
  if (!condition) failures.push(description)
}

async function exists(path: string): Promise<boolean> {
  try {
    await Deno.lstat(path)
    return true
  } catch {
    return false
  }
}

async function isSymlink(path: string): Promise<boolean> {
  try {
    return (await Deno.lstat(path)).isSymlink
  } catch {
    return false
  }
}

async function entryNames(dir: string): Promise<string[]> {
  const names: string[] = []
  for await (const entry of Deno.readDir(dir)) names.push(entry.name)
  return names.sort()
}

async function plistValue(plist: string, key: string): Promise<string> {
  return (await capture(['plutil', '-extract', key, 'raw', '-o', '-', plist]))
    .trim()
}

function sameStrings(actual: string[], expected: string[]): boolean {
  return actual.join('\n') === expected.join('\n')
}

function printSetDifference(actual: string[], expected: string[]): void {
  const actualSet = new Set(actual)
  const expectedSet = new Set(expected)
  for (
    const item of actual.filter((candidate) => !expectedSet.has(candidate))
  ) {
    console.error(`  unexpected: ${item}`)
  }
  for (
    const item of expected.filter((candidate) => !actualSet.has(candidate))
  ) {
    console.error(`  missing: ${item}`)
  }
}

function frameworkRoot(dir: string, slice: typeof slices[number]): string {
  const bundle = join(dir, `${frameworkName}.framework`)
  return isVersionedLayout(slice) ? join(bundle, 'Versions', 'A') : bundle
}

function frameworkBinary(dir: string, slice: typeof slices[number]): string {
  return join(frameworkRoot(dir, slice), frameworkName)
}

async function sdkPath(slice: typeof slices[number]): Promise<string> {
  return (await capture(['xcrun', '--sdk', slice.sdk, '--show-sdk-path']))
    .trim()
}

async function verifyModule(
  scratch: string,
  dir: string,
  slice: typeof slices[number],
): Promise<void> {
  const probe = join(scratch, `module-probe-${slice.id}.m`)
  await Deno.writeTextFile(
    probe,
    `@import ${moduleName};
@import ${moduleName}.Raw;
int main(void) { return 0; }
`,
  )
  const compiled = await new Deno.Command('clang', {
    args: [
      '-fsyntax-only',
      '-x',
      'objective-c',
      '-target',
      triple(slice),
      '-isysroot',
      await sdkPath(slice),
      '-fmodules',
      `-fmodules-cache-path=${join(scratch, `module-cache-${slice.id}`)}`,
      `-F${dir}`,
      probe,
    ],
    stdout: 'inherit',
    stderr: 'inherit',
  }).output()
  check(
    compiled.success,
    `${slice.id}: ${moduleName} and ${moduleName}.Raw import from the published layout`,
  )
}

// The macOS slice is the only one this machine can execute, so it carries the
// proof that the bundle is not just well-formed but loadable.
async function verifyRun(
  scratch: string,
  dir: string,
  slice: typeof slices[number],
): Promise<void> {
  const probe = join(scratch, 'run-probe.c')
  const executable = join(scratch, 'run-probe')
  await Deno.writeTextFile(
    probe,
    `#include <${frameworkName}/smb2/libsmb2.h>

int main(void) {
  struct smb2_context *context = smb2_init_context();
  if (context == 0) return 1;
  smb2_destroy_context(context);
  return 0;
}
`,
  )
  const linked = await new Deno.Command('clang', {
    args: [
      '-target',
      triple(slice),
      '-isysroot',
      await sdkPath(slice),
      `-F${dir}`,
      `-Wl,-rpath,${resolve(dir)}`,
      probe,
      '-framework',
      frameworkName,
      '-o',
      executable,
    ],
    stdout: 'inherit',
    stderr: 'inherit',
  }).output()
  check(linked.success, 'a client links against the framework')
  if (!linked.success) return
  const linkedLibraries = (await capture(['otool', '-L', executable]))
    .split('\n')
    .slice(1)
    .map((line) => line.trim().split(/\s+/)[0] ?? '')
    .filter((path) => path !== '')
    .sort()
  check(
    sameStrings(
      linkedLibraries,
      [installName, ...allowedLinkedLibraries].sort(),
    ),
    'the client loads the framework and nothing but libSystem',
  )
  // `env` is how the permission set can name the runner: a temp path is not
  // in the allow list, and the probe still has to be executed, not read.
  const ran = await new Deno.Command('env', {
    args: [executable],
    stdout: 'inherit',
  }).output()
  check(ran.success, 'the macOS slice loads and creates a context')
}

async function verifySlice(
  scratch: string,
  dir: string,
  slice: typeof slices[number],
): Promise<void> {
  const root = frameworkRoot(dir, slice)
  const bundle = join(dir, `${frameworkName}.framework`)
  check(await exists(root), `${slice.id}: ${frameworkName}.framework`)
  const binary = frameworkBinary(dir, slice)
  check(await exists(binary), `${slice.id}: ${frameworkName} binary`)

  for (const header of headers) {
    check(
      await exists(join(root, 'Headers', header)),
      `${slice.id}: Headers/${header}`,
    )
  }
  const map = join(root, 'Modules', 'module.modulemap')
  check(await exists(map), `${slice.id}: Modules/module.modulemap`)
  if (await exists(map)) {
    const text = await Deno.readTextFile(map)
    check(
      text.includes(`framework module ${moduleName} `),
      `${slice.id}: declares framework module ${moduleName}`,
    )
    check(
      text.includes('explicit module Raw'),
      `${slice.id}: keeps Raw explicit`,
    )
    check(
      text.includes('header "smb2/libsmb2-raw.h"'),
      `${slice.id}: Raw is the raw-PDU header`,
    )
  }
  const copying = join(
    root,
    ...(isVersionedLayout(slice) ? ['Resources', 'COPYING'] : ['COPYING']),
  )
  check(await exists(copying), `${slice.id}: COPYING`)
  if (await exists(copying)) {
    check(
      (await Deno.readTextFile(copying)).includes(
        'GNU LESSER GENERAL PUBLIC LICENSE',
      ),
      `${slice.id}: COPYING is the LGPL text`,
    )
  }

  const plist = join(
    root,
    ...(isVersionedLayout(slice)
      ? ['Resources', 'Info.plist']
      : ['Info.plist']),
  )
  check(await exists(plist), `${slice.id}: Info.plist`)
  if (await exists(plist)) {
    check(
      await plistValue(plist, 'CFBundleExecutable') === frameworkName,
      `${slice.id}: CFBundleExecutable ${frameworkName}`,
    )
    check(
      await plistValue(plist, 'CFBundleIdentifier') === bundleIdentifier,
      `${slice.id}: CFBundleIdentifier ${bundleIdentifier}`,
    )
    check(
      await plistValue(plist, 'CFBundlePackageType') === 'FMWK',
      `${slice.id}: CFBundlePackageType FMWK`,
    )
    check(
      await plistValue(plist, 'CFBundleVersion') === upstreamVersion,
      `${slice.id}: CFBundleVersion ${upstreamVersion}`,
    )
    check(
      await plistValue(plist, 'CFBundleSupportedPlatforms.0') ===
        slice.bundlePlatform,
      `${slice.id}: CFBundleSupportedPlatforms ${slice.bundlePlatform}`,
    )
    const minimumKey = isVersionedLayout(slice)
      ? 'LSMinimumSystemVersion'
      : 'MinimumOSVersion'
    check(
      await plistValue(plist, minimumKey) === slice.minVersion,
      `${slice.id}: ${minimumKey} ${slice.minVersion}`,
    )
  }

  if (isVersionedLayout(slice)) {
    check(
      await isSymlink(join(bundle, 'Versions', 'Current')),
      `${slice.id}: Versions/Current symlink`,
    )
    for (
      const entry of ['Headers', 'Modules', 'Resources', frameworkName]
    ) {
      check(
        await isSymlink(join(bundle, entry)),
        `${slice.id}: top-level ${entry} symlink`,
      )
    }
  } else {
    check(
      !await isSymlink(join(bundle, 'Headers')),
      `${slice.id}: flat bundle carries a real Headers directory`,
    )
  }

  if (!await exists(binary)) return
  check(
    (await capture(['lipo', '-archs', binary])).trim() === 'arm64',
    `${slice.id}: exactly arm64`,
  )
  const build = await buildVersion(binary)
  check(
    build.platform === String(platformCodes[slice.id]),
    `${slice.id}: LC_BUILD_VERSION platform ${platformCodes[slice.id]}`,
  )
  check(
    build.minos === slice.minVersion,
    `${slice.id}: LC_BUILD_VERSION minos ${slice.minVersion}`,
  )
  const installNames = (await capture(['otool', '-D', binary]))
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
  check(
    installNames.at(-1) === installName,
    `${slice.id}: install name ${installName}`,
  )
  const linked = (await capture(['otool', '-L', binary]))
    .split('\n')
    .slice(2)
    .map((line) => line.trim().split(/\s+/)[0] ?? '')
    .filter((path) => path !== '')
    .sort()
  check(
    sameStrings(linked, allowedLinkedLibraries),
    `${slice.id}: links libSystem and nothing else`,
  )
  if (!sameStrings(linked, allowedLinkedLibraries)) {
    printSetDifference(linked, allowedLinkedLibraries)
  }
  const symbols = await capture(['nm', '-gU', binary])
  for (const symbol of expectedExports) {
    check(symbols.includes(symbol), `${slice.id}: exports ${symbol.slice(1)}`)
  }
  const signed = await new Deno.Command('codesign', {
    args: ['--verify', '--strict', bundle],
    stdout: 'inherit',
    stderr: 'inherit',
  }).output()
  check(signed.success, `${slice.id}: signature verifies`)

  await verifyModule(scratch, dir, slice)
}

async function main(argv: string[]): Promise<void> {
  const dist = resolve(argv[0] ?? 'dist-libsmb2')
  const scratch = await Deno.makeTempDir({ prefix: 'arcroom-smb2-verify-' })
  try {
    const expectedArtifacts = [
      artifactName,
      sourceArtifactName,
      swiftPMArtifactName,
    ].sort()
    const releaseArtifacts = (await entryNames(dist)).filter((name) =>
      name.endsWith('.zip') || name.endsWith('.tar.gz')
    )
    check(
      sameStrings(releaseArtifacts, expectedArtifacts),
      'dist contains exactly the three named release artifacts',
    )
    if (!sameStrings(releaseArtifacts, expectedArtifacts)) {
      printSetDifference(releaseArtifacts, expectedArtifacts)
    }

    const zip = join(dist, artifactName)
    check(await exists(zip), `${basename(zip)} present`)
    const expanded = join(scratch, 'expanded')
    await Deno.mkdir(expanded, { recursive: true })
    await run(['ditto', '-x', '-k', zip, expanded])
    check(
      sameStrings(await entryNames(expanded), [
        'LICENCE-LGPL-2.1.txt',
        'PROVENANCE.md',
        xcframeworkName,
      ]),
      'zip root holds the xcframework, the LGPL license, and provenance',
    )
    check(
      (await Deno.readTextFile(join(expanded, 'PROVENANCE.md'))).includes(
        `# libsmb2 ${upstreamVersion} for Arcroom`,
      ),
      'provenance names the upstream version',
    )

    const xcframework = join(expanded, xcframeworkName)
    const plist = join(xcframework, 'Info.plist')
    check(await exists(plist), 'xcframework Info.plist')
    if (await exists(plist)) {
      const identifiers = await entryNames(xcframework)
      check(
        sameStrings(
          identifiers,
          slices.map((slice) => slice.id).sort().concat('Info.plist'),
        ),
        'xcframework holds exactly one directory per slice',
      )
      for (const [index, slice] of slices.entries()) {
        const at = (key: string) => `AvailableLibraries.${index}.${key}`
        check(
          await plistValue(plist, at('LibraryIdentifier')) === slice.id,
          `${slice.id}: LibraryIdentifier row ${index}`,
        )
        check(
          await plistValue(plist, at('SupportedPlatform')) ===
            slice.supportedPlatform,
          `${slice.id}: SupportedPlatform ${slice.supportedPlatform}`,
        )
        if (slice.supportedPlatformVariant === null) {
          check(
            !(await capture([
              'plutil',
              '-extract',
              at('SupportedPlatformVariant'),
              'raw',
              '-o',
              '-',
              plist,
            ]).catch(() => '')).trim(),
            `${slice.id}: no SupportedPlatformVariant`,
          )
        } else {
          check(
            await plistValue(plist, at('SupportedPlatformVariant')) ===
              slice.supportedPlatformVariant,
            `${slice.id}: SupportedPlatformVariant ${slice.supportedPlatformVariant}`,
          )
        }
        check(
          await plistValue(plist, at('SupportedArchitectures.0')) === 'arm64',
          `${slice.id}: SupportedArchitectures arm64`,
        )
        check(
          await plistValue(plist, at('LibraryPath')) ===
            `${frameworkName}.framework`,
          `${slice.id}: LibraryPath ${frameworkName}.framework`,
        )
      }
    }

    for (const slice of slices) {
      await verifySlice(scratch, join(xcframework, slice.id), slice)
    }

    const macOS = slices.find((slice) => slice.supportedPlatform === 'macos')!
    await verifyRun(scratch, join(xcframework, macOS.id), macOS)

    const swiftPMZip = join(dist, swiftPMArtifactName)
    check(await exists(swiftPMZip), `${basename(swiftPMZip)} present`)
    const swiftPM = join(scratch, 'swiftpm')
    await Deno.mkdir(swiftPM, { recursive: true })
    await run(['ditto', '-x', '-k', swiftPMZip, swiftPM])
    check(
      sameStrings(await entryNames(swiftPM), [xcframeworkName]),
      'SwiftPM zip holds the xcframework at its root',
    )
    const same = await new Deno.Command('diff', {
      args: ['-r', join(swiftPM, xcframeworkName), xcframework],
      stdout: 'inherit',
      stderr: 'inherit',
    }).output()
    check(same.success, 'SwiftPM xcframework matches the combined zip')

    const source = join(dist, sourceArtifactName)
    check(await exists(source), `${basename(source)} present`)
    check(
      await sha256(source) === upstreamSHA256,
      'source asset is byte-identical to the pinned upstream tarball',
    )
    const members = await capture(['tar', '-tzf', source])
    check(
      members.split('\n').includes(
        `libsmb2-${upstreamTag}/LICENCE-LGPL-2.1.txt`,
      ),
      'source asset contains the upstream LGPL license',
    )

    console.log(`\n${await sha256(zip)}  ${basename(zip)}`)
    console.log(`${await sha256(swiftPMZip)}  ${basename(swiftPMZip)}`)
    console.log(`${await sha256(source)}  ${basename(source)}`)
    if (failures.length > 0) {
      console.error(`\n${failures.length} check(s) failed:`)
      for (const failure of failures) console.error(`  ${failure}`)
      Deno.exit(1)
    }
    console.log('\nall checks passed')
  } finally {
    await Deno.remove(scratch, { recursive: true }).catch(() => {})
  }
}

if (import.meta.main) await main(Deno.args)
