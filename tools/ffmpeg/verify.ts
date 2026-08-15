// Artifact gate. Runs against the combined and per-library zips as published — never against the
// staging directory — so what it proves is what a consumer downloads: an
// http_archive consumer expands the combined zip, a SwiftPM `binaryTarget`
// expands one per-framework zip, and both must find the same frameworks with
// flat `@rpath/<name>` install names and importable modules.
//
//   deno run -A tools/ffmpeg/verify.ts dist-ffmpeg

import { basename, join, resolve } from '../lib/path.ts'
import { capture, run } from '../lib/proc.ts'
import {
  artifactSuffix,
  frameworkVersion,
  installName,
  libraries,
  minimumMacOSVersion,
  sha256,
  upstreamVersion,
} from './build.ts'

const failures: string[] = []

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

async function entryNames(dir: string): Promise<string[]> {
  const names: string[] = []
  for await (const entry of Deno.readDir(dir)) names.push(entry.name)
  return names.sort()
}

async function plistValue(plist: string, key: string): Promise<string> {
  return (await capture(['plutil', '-extract', key, 'raw', '-o', '-', plist]))
    .trim()
}

async function expand(zip: string, into: string): Promise<string> {
  await Deno.mkdir(into, { recursive: true })
  await run(['ditto', '-x', '-k', zip, into])
  return into
}

async function verifyFramework(xcframework: string, library: string) {
  const rootPlist = join(xcframework, 'Info.plist')
  check(await exists(rootPlist), `${library}: xcframework Info.plist`)
  check(
    await plistValue(rootPlist, 'AvailableLibraries.0.LibraryIdentifier') ===
      'macos-arm64',
    `${library}: LibraryIdentifier macos-arm64`,
  )
  check(
    await plistValue(
      rootPlist,
      'AvailableLibraries.0.SupportedArchitectures.0',
    ) ===
      'arm64',
    `${library}: SupportedArchitectures arm64`,
  )

  const bundle = join(xcframework, 'macos-arm64', `${library}.framework`)
  const versioned = join(bundle, 'Versions', frameworkVersion)
  const binary = join(versioned, library)
  check(await exists(binary), `${library}: Versions/A/${library}`)
  for (const entry of ['Headers', 'Modules', 'Resources', library]) {
    const link = join(bundle, entry)
    const stat = await Deno.lstat(link).catch(() => null)
    check(
      stat?.isSymlink === true,
      `${library}: top-level ${entry} is a symlink`,
    )
  }
  check(
    (await Deno.readLink(join(bundle, 'Versions', 'Current')).catch(() =>
      ''
    )) ===
      frameworkVersion,
    `${library}: Versions/Current -> ${frameworkVersion}`,
  )
  check(
    await exists(join(versioned, 'Modules', 'module.modulemap')),
    `${library}: module.modulemap`,
  )

  const plist = join(versioned, 'Resources', 'Info.plist')
  check(
    await plistValue(plist, 'CFBundleExecutable') === library,
    `${library}: CFBundleExecutable`,
  )
  check(
    await plistValue(plist, 'CFBundleIdentifier') === `org.ffmpeg.${library}`,
    `${library}: CFBundleIdentifier`,
  )
  check(
    await plistValue(plist, 'CFBundleShortVersionString') === upstreamVersion,
    `${library}: CFBundleShortVersionString ${upstreamVersion}`,
  )
  check(
    await plistValue(plist, 'LSMinimumSystemVersion') === minimumMacOSVersion,
    `${library}: LSMinimumSystemVersion ${minimumMacOSVersion}`,
  )

  check(
    (await capture(['otool', '-D', binary])).trim().split('\n').at(-1)
      ?.trim() ===
      installName(library),
    `${library}: install name ${installName(library)}`,
  )

  const dependencies = (await capture(['otool', '-L', binary])).split('\n')
    .slice(1)
    .map((line) => line.trim().split(' ')[0]!)
    .filter((name) => name !== '')
  for (const dependency of dependencies) {
    const sibling = libraries.find((other) => dependency.includes(other))
    if (sibling) {
      check(
        dependency === installName(sibling),
        `${library}: links ${sibling} as ${
          installName(sibling)
        } (got ${dependency})`,
      )
      continue
    }
    check(
      dependency.startsWith('/usr/lib/') ||
        dependency.startsWith('/System/Library/'),
      `${library}: non-system dependency ${dependency}`,
    )
  }

  check(
    (await capture(['file', '-b', binary])).includes('arm64'),
    `${library}: arm64 Mach-O`,
  )
  const signed = await new Deno.Command('codesign', {
    args: ['--verify', '--deep', '--strict', bundle],
    stdout: 'null',
    stderr: 'null',
  }).output()
  check(signed.success, `${library}: code signature valid`)
}

async function verifyModules(scratch: string, xcframeworkRoot: string) {
  const flat = join(scratch, 'flat')
  await Deno.remove(flat, { recursive: true }).catch(() => {})
  await Deno.mkdir(flat, { recursive: true })
  for (const library of libraries) {
    await Deno.symlink(
      join(
        xcframeworkRoot,
        `${library}.xcframework`,
        'macos-arm64',
        `${library}.framework`,
      ),
      join(flat, `${library}.framework`),
    )
  }
  const probe = join(scratch, 'probe.c')
  await Deno.writeTextFile(
    probe,
    libraries.map((library) => `#include <${library}/${library}.h>`).join(
      '\n',
    ) +
      '\nint main(void) { return 0; }\n',
  )
  const compiled = await new Deno.Command('clang', {
    args: [
      '-fsyntax-only',
      '-fmodules',
      `-fmodules-cache-path=${join(scratch, 'module-cache')}`,
      `-F${flat}`,
      probe,
    ],
    stdout: 'inherit',
    stderr: 'inherit',
  }).output()
  check(compiled.success, 'every module imports from the published layout')
}

async function main(argv: string[]): Promise<void> {
  const dist = resolve(argv[0] ?? 'dist-ffmpeg')
  const scratch = await Deno.makeTempDir({ prefix: 'arcroom-verify-' })

  const combinedZip = join(dist, `ffmpeg-${artifactSuffix}.zip`)
  check(await exists(combinedZip), `${basename(combinedZip)} present`)
  const combined = await expand(combinedZip, join(scratch, 'combined'))
  check(
    (await entryNames(combined)).join(' ') ===
      [
        'COPYING.LGPLv2.1',
        'PROVENANCE.md',
        ...libraries.map((l) => `${l}.xcframework`),
      ].sort().join(' '),
    'combined zip root holds every xcframework, COPYING.LGPLv2.1, PROVENANCE.md',
  )

  for (const library of libraries) {
    await verifyFramework(join(combined, `${library}.xcframework`), library)
  }
  await verifyModules(scratch, combined)

  for (const library of libraries) {
    const zip = join(dist, `${library}-${artifactSuffix}.zip`)
    check(await exists(zip), `${basename(zip)} present`)
    const expanded = await expand(zip, join(scratch, library))
    check(
      (await entryNames(expanded)).join(' ') === `${library}.xcframework`,
      `${library}: SwiftPM zip holds ${library}.xcframework at its root`,
    )
    const same = await new Deno.Command('diff', {
      args: [
        '-r',
        join(expanded, `${library}.xcframework`),
        join(combined, `${library}.xcframework`),
      ],
      stdout: 'inherit',
      stderr: 'inherit',
    }).output()
    check(same.success, `${library}: SwiftPM zip matches the combined zip`)
  }

  console.log('')
  for (
    const name of [
      `ffmpeg-${artifactSuffix}.zip`,
      ...libraries.map((l) => `${l}-${artifactSuffix}.zip`),
    ]
  ) {
    if (await exists(join(dist, name))) {
      console.log(`${await sha256(join(dist, name))}  ${name}`)
    }
  }

  await Deno.remove(scratch, { recursive: true }).catch(() => {})
  if (failures.length > 0) {
    console.error(`\n${failures.length} check(s) failed:`)
    for (const failure of failures) console.error(`  ${failure}`)
    Deno.exit(1)
  }
  console.log('\nall checks passed')
}

if (import.meta.main) await main(Deno.args)
