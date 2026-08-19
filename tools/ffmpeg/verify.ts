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
  buildVersion,
  frameworkVersion,
  installName,
  isVersionedLayout,
  libraries,
  sha256,
  Slice,
  slices,
  triple,
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

async function plist(path: string): Promise<Record<string, unknown>> {
  return JSON.parse(
    await capture(['plutil', '-convert', 'json', '-o', '-', path]),
  )
}

async function expand(zip: string, into: string): Promise<string> {
  await Deno.mkdir(into, { recursive: true })
  await run(['ditto', '-x', '-k', zip, into])
  return into
}

async function sdkPath(slice: Slice): Promise<string> {
  return (await capture(['xcrun', '--sdk', slice.sdk, '--show-sdk-path']))
    .trim()
}

async function verifySlice(
  xcframework: string,
  library: string,
  slice: Slice,
  entry: Record<string, unknown>,
): Promise<void> {
  const label = `${library} ${slice.id}`
  check(
    JSON.stringify(entry['SupportedArchitectures']) === '["arm64"]',
    `${label}: SupportedArchitectures arm64`,
  )
  check(
    entry['SupportedPlatform'] === slice.supportedPlatform,
    `${label}: SupportedPlatform ${slice.supportedPlatform}`,
  )
  check(
    (entry['SupportedPlatformVariant'] ?? null) ===
      slice.supportedPlatformVariant,
    `${label}: SupportedPlatformVariant ${slice.supportedPlatformVariant}`,
  )

  const bundle = join(xcframework, slice.id, `${library}.framework`)
  const versioned = isVersionedLayout(slice)
    ? join(bundle, 'Versions', frameworkVersion)
    : bundle
  const binary = join(versioned, library)
  check(await exists(binary), `${label}: ${library} binary`)
  check(
    entry['BinaryPath'] ===
      (isVersionedLayout(slice)
        ? `${library}.framework/Versions/${frameworkVersion}/${library}`
        : `${library}.framework/${library}`),
    `${label}: BinaryPath ${entry['BinaryPath']}`,
  )

  if (isVersionedLayout(slice)) {
    for (const name of ['Headers', 'Modules', 'Resources', library]) {
      const stat = await Deno.lstat(join(bundle, name)).catch(() => null)
      check(
        stat?.isSymlink === true,
        `${label}: top-level ${name} is a symlink`,
      )
    }
    check(
      (await Deno.readLink(join(bundle, 'Versions', 'Current')).catch(() =>
        ''
      )) === frameworkVersion,
      `${label}: Versions/Current -> ${frameworkVersion}`,
    )
  } else {
    // A versioned bundle is rejected when an iOS or visionOS app embeds it, and
    // the rejection lands at submission rather than at build.
    check(
      !await exists(join(bundle, 'Versions')),
      `${label}: flat bundle, no Versions directory`,
    )
  }
  check(
    await exists(join(versioned, 'Modules', 'module.modulemap')),
    `${label}: module.modulemap`,
  )

  const info = await plist(
    join(
      isVersionedLayout(slice) ? join(versioned, 'Resources') : versioned,
      'Info.plist',
    ),
  )
  check(info['CFBundleExecutable'] === library, `${label}: CFBundleExecutable`)
  check(
    info['CFBundleIdentifier'] === `org.ffmpeg.${library}`,
    `${label}: CFBundleIdentifier`,
  )
  check(
    info['CFBundleShortVersionString'] === upstreamVersion,
    `${label}: CFBundleShortVersionString ${upstreamVersion}`,
  )
  check(
    JSON.stringify(info['CFBundleSupportedPlatforms']) ===
      JSON.stringify([slice.bundlePlatform]),
    `${label}: CFBundleSupportedPlatforms ${slice.bundlePlatform}`,
  )
  const minimumKey = slice.supportedPlatform === 'macos'
    ? 'LSMinimumSystemVersion'
    : 'MinimumOSVersion'
  check(
    info[minimumKey] === slice.minVersion,
    `${label}: ${minimumKey} ${slice.minVersion}`,
  )

  // The load command, not the SDK the compiler saw, is what decides which
  // device a slice is loadable on and where xcodebuild files it. A device-triple
  // binary sitting in a simulator slice passes every structural check above.
  const { platform, minos } = await buildVersion(binary)
  const platformCodes: Record<string, string> = {
    'macos-arm64': '1',
    'ios-arm64': '2',
    'ios-arm64-simulator': '7',
    'xros-arm64': '11',
    'xros-arm64-simulator': '12',
  }
  check(
    platform === platformCodes[slice.id],
    `${label}: LC_BUILD_VERSION platform ${platform} (want ${
      platformCodes[slice.id]
    })`,
  )
  check(
    minos === slice.minVersion,
    `${label}: LC_BUILD_VERSION minos ${minos} (want ${slice.minVersion})`,
  )

  check(
    (await capture(['otool', '-D', binary])).trim().split('\n').at(-1)
      ?.trim() === installName(library),
    `${label}: install name ${installName(library)}`,
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
        `${label}: links ${sibling} as ${
          installName(sibling)
        } (got ${dependency})`,
      )
      continue
    }
    check(
      dependency.startsWith('/usr/lib/') ||
        dependency.startsWith('/System/Library/'),
      `${label}: non-system dependency ${dependency}`,
    )
  }

  check(
    (await capture(['file', '-b', binary])).includes('arm64'),
    `${label}: arm64 Mach-O`,
  )
  const signed = await new Deno.Command('codesign', {
    args: ['--verify', '--deep', '--strict', bundle],
    stdout: 'null',
    stderr: 'null',
  }).output()
  check(signed.success, `${label}: code signature valid`)
}

async function verifyFramework(
  xcframework: string,
  library: string,
): Promise<void> {
  const rootPlist = join(xcframework, 'Info.plist')
  check(await exists(rootPlist), `${library}: xcframework Info.plist`)
  const available = (await plist(rootPlist))['AvailableLibraries'] as Record<
    string,
    unknown
  >[]
  check(
    available.length === slices.length,
    `${library}: ${slices.length} slices (got ${available.length})`,
  )
  for (const slice of slices) {
    const entry = available.find((one) => one['LibraryIdentifier'] === slice.id)
    if (entry === undefined) {
      check(false, `${library}: LibraryIdentifier ${slice.id}`)
      continue
    }
    await verifySlice(xcframework, library, slice, entry)
  }
}

async function verifyModules(
  scratch: string,
  xcframeworkRoot: string,
  slice: Slice,
): Promise<void> {
  const flat = join(scratch, 'flat', slice.id)
  await Deno.remove(flat, { recursive: true }).catch(() => {})
  await Deno.mkdir(flat, { recursive: true })
  for (const library of libraries) {
    await Deno.symlink(
      join(
        xcframeworkRoot,
        `${library}.xcframework`,
        slice.id,
        `${library}.framework`,
      ),
      join(flat, `${library}.framework`),
    )
  }
  const probe = join(scratch, `probe-${slice.id}.c`)
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
      '-target',
      triple(slice),
      '-isysroot',
      await sdkPath(slice),
      '-fmodules',
      `-fmodules-cache-path=${join(scratch, `module-cache-${slice.id}`)}`,
      `-F${flat}`,
      probe,
    ],
    stdout: 'inherit',
    stderr: 'inherit',
  }).output()
  check(
    compiled.success,
    `${slice.id}: every module imports from the published layout`,
  )
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
  for (const slice of slices) {
    await verifyModules(scratch, combined, slice)
  }

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
