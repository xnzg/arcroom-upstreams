// Builder for the pinned ffmpeg artifact Arcroom links.
//
// This file IS the provenance record: the upstream tarball URL + sha256, the
// exact configure line, and the codec allowlist all live here, and the artifact
// carries a generated copy as PROVENANCE.md. Run it once per upstream bump,
// upload `dist-ffmpeg/*.zip` to a GitHub release under the `ffmpeg/` tag
// namespace, and pin each asset by sha256 in the consuming repo.
//
// LGPL v2.1 (no --enable-gpl, no --enable-version3, no --enable-nonfree): the
// three libraries ship as separate dynamic frameworks so a user can relink the
// app against their own build, and COPYING.LGPLv2.1 rides in the artifact.

import { basename, join, resolve } from '../lib/path.ts'
import { output, run } from '../lib/proc.ts'

export const upstreamVersion = '8.1.2'
export const upstreamURL =
  `https://ffmpeg.org/releases/ffmpeg-${upstreamVersion}.tar.xz`
export const upstreamSHA256 =
  '464beb5e7bf0c311e68b45ae2f04e9cc2af88851abb4082231742a74d97b524c'

export const artifactRevision = 1
export const artifactSuffix =
  `${upstreamVersion}-arcroom.${artifactRevision}-macos-arm64`
export const releaseTag =
  `ffmpeg/${upstreamVersion}-arcroom.${artifactRevision}`

// Arcroom demuxes and muxes everything itself; ffmpeg is here to decode and
// encode audio samples and nothing else. `--disable-everything` turns the whole
// component table off and these lists turn back on exactly what the import
// audio ladder can meet.
const decoders = [
  'aac',
  'aac_latm',
  'ac3',
  'dca',
  'eac3',
  'flac',
  'mlp',
  'opus',
  'truehd',
  'vorbis',
  // Every pcm_* decoder ffmpeg 8.1 has except pcm_alaw_at / pcm_mulaw_at, which
  // are AudioToolbox wrappers and would drag an autodetected system backend in.
  'pcm_alaw',
  'pcm_bluray',
  'pcm_dvd',
  'pcm_f16le',
  'pcm_f24le',
  'pcm_f32be',
  'pcm_f32le',
  'pcm_f64be',
  'pcm_f64le',
  'pcm_lxf',
  'pcm_mulaw',
  'pcm_s16be',
  'pcm_s16be_planar',
  'pcm_s16le',
  'pcm_s16le_planar',
  'pcm_s24be',
  'pcm_s24daud',
  'pcm_s24le',
  'pcm_s24le_planar',
  'pcm_s32be',
  'pcm_s32le',
  'pcm_s32le_planar',
  'pcm_s64be',
  'pcm_s64le',
  'pcm_s8',
  'pcm_s8_planar',
  'pcm_sga',
  'pcm_u16be',
  'pcm_u16le',
  'pcm_u24be',
  'pcm_u24le',
  'pcm_u32be',
  'pcm_u32le',
  'pcm_u8',
  'pcm_vidc',
]

const encoders = ['aac', 'eac3']

const parsers = [
  'aac',
  'aac_latm',
  'ac3',
  'dca',
  'flac',
  'mlp',
  'opus',
  'vorbis',
]

export const libraries = ['libavutil', 'libswresample', 'libavcodec']

export const frameworkVersion = 'A'
export const minimumMacOSVersion = '15.0'

// ffmpeg bakes the configure line into `avcodec_configuration()`, which the
// artifact therefore ships. A staged DESTDIR install keeps the builder's scratch
// directory out of that string, so the same source produces the same string on
// any machine — and a contract test can assert on it.
const installPrefix = '/arcroom-ffmpeg'

function configureFlags(): string[] {
  return [
    `--prefix=${installPrefix}`,
    '--disable-gpl',
    '--disable-nonfree',
    '--disable-version3',
    '--disable-everything',
    '--disable-autodetect',
    '--disable-programs',
    '--disable-doc',
    '--disable-avformat',
    '--disable-avfilter',
    '--disable-avdevice',
    '--disable-swscale',
    '--disable-network',
    '--disable-protocols',
    '--disable-muxers',
    '--disable-demuxers',
    '--disable-devices',
    '--disable-filters',
    '--disable-bsfs',
    '--disable-static',
    '--enable-shared',
    '--enable-pic',
    '--disable-debug',
    '--enable-neon',
    '--install-name-dir=@rpath',
    `--extra-cflags=-mmacosx-version-min=${minimumMacOSVersion}`,
    `--extra-ldflags=-mmacosx-version-min=${minimumMacOSVersion}`,
    // The framework install names are longer than the `@rpath/libavcodec.62.dylib`
    // ffmpeg links with, and install_name_tool cannot grow the load commands
    // after the fact.
    '--extra-ldflags=-Wl,-headerpad_max_install_names',
    `--enable-decoder=${decoders.join(',')}`,
    `--enable-encoder=${encoders.join(',')}`,
    `--enable-parser=${parsers.join(',')}`,
  ]
}

interface Args {
  scratch: string | null
  out: string
  keep: boolean
}

function parseArgs(argv: string[]): Args {
  const args: Args = { scratch: null, out: 'dist-ffmpeg', keep: false }
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--scratch':
        args.scratch = argv[++i]!
        break
      case '--out':
        args.out = argv[++i]!
        break
      case '--keep':
        args.keep = true
        break
      default:
        throw new Error(`unknown argument: ${argv[i]}`)
    }
  }
  return args
}

async function onPath(tool: string): Promise<boolean> {
  for (const dir of (Deno.env.get('PATH') ?? '').split(':')) {
    if (!dir) continue
    try {
      await Deno.stat(join(dir, tool))
      return true
    } catch {
      continue
    }
  }
  return false
}

async function preflight(): Promise<void> {
  if (Deno.build.os !== 'darwin' || Deno.build.arch !== 'aarch64') {
    throw new Error(
      'the artifact is macOS arm64 only; run this on Apple silicon',
    )
  }
  for (
    const tool of ['bash', 'make', 'clang', 'install_name_tool', 'zip', 'ditto']
  ) {
    if (!await onPath(tool)) {
      throw new Error(
        `missing build tool: ${tool} (install the Xcode CLI tools)`,
      )
    }
  }
  // ffmpeg's aarch64 assembly goes through clang's integrated assembler, so the
  // nasm/yasm requirement is x86-only and this host never hits it. Should the
  // artifact ever gain an x86_64 slice, `brew install nasm` first — it is a
  // build-time tool for this script, never a dependency of the product.
  if (!await onPath('nasm') && !await onPath('yasm')) {
    console.log(
      'note: no nasm/yasm found; not required for an arm64-only build',
    )
  }
}

export async function sha256(path: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    await Deno.readFile(path),
  )
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function fetchSource(scratch: string): Promise<string> {
  const tarball = join(scratch, basename(upstreamURL))
  try {
    await Deno.stat(tarball)
    console.log(`reusing ${tarball}`)
  } catch {
    console.log(`GET ${upstreamURL}`)
    const response = await fetch(upstreamURL)
    if (!response.ok) {
      throw new Error(`GET ${upstreamURL} failed: ${response.status}`)
    }
    await Deno.writeFile(tarball, response.body!)
  }
  const actual = await sha256(tarball)
  if (actual !== upstreamSHA256) {
    await Deno.remove(tarball)
    throw new Error(
      `sha256 mismatch for ${upstreamURL}: expected ${upstreamSHA256}, got ${actual}`,
    )
  }
  return tarball
}

async function buildFFmpeg(scratch: string): Promise<string> {
  const tarball = await fetchSource(scratch)
  const source = join(scratch, `ffmpeg-${upstreamVersion}`)
  await Deno.remove(source, { recursive: true }).catch(() => {})
  await run(['tar', 'xf', tarball], scratch)

  const destdir = join(scratch, 'install')
  await Deno.remove(destdir, { recursive: true }).catch(() => {})
  await run(['bash', 'configure', ...configureFlags()], source)
  await run(['make', `-j${navigator.hardwareConcurrency}`], source)
  await run(['make', 'install', `DESTDIR=${destdir}`], source)
  return join(destdir, installPrefix)
}

async function installedDylib(
  prefix: string,
  library: string,
): Promise<string> {
  // ffmpeg installs the fully versioned `libavutil.60.63.100.dylib` as the real
  // file and leaves the major-version name a symlink onto it.
  const pattern = new RegExp(`^${library}\\.[0-9.]+\\.dylib$`)
  for await (const entry of Deno.readDir(join(prefix, 'lib'))) {
    if (entry.isFile && pattern.test(entry.name)) {
      return join(prefix, 'lib', entry.name)
    }
  }
  throw new Error(`${library} was not installed as a versioned dylib`)
}

// A bare `@rpath/<name>` rather than the conventional
// `@rpath/<name>.framework/Versions/A/<name>`, because the two consumers anchor
// @rpath at different depths and only the flat spelling satisfies both. Bazel
// links an imported dynamic framework through a `_solib_*` directory whose sole
// entry is the framework's top-level binary symlink, and points the rpath at
// that directory; an app bundle instead gets one
// `@executable_path/../Frameworks/<name>.framework` rpath per framework. Both
// then resolve the same name, so the test build and the shipped app load the
// identical dylib.
export function installName(library: string): string {
  return `@rpath/${library}`
}

function infoPlist(library: string, soVersion: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDevelopmentRegion</key>
	<string>en</string>
	<key>CFBundleExecutable</key>
	<string>${library}</string>
	<key>CFBundleIdentifier</key>
	<string>org.ffmpeg.${library}</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
	<string>${library}</string>
	<key>CFBundlePackageType</key>
	<string>FMWK</string>
	<key>CFBundleShortVersionString</key>
	<string>${upstreamVersion}</string>
	<key>CFBundleVersion</key>
	<string>${soVersion}</string>
	<key>LSMinimumSystemVersion</key>
	<string>${minimumMacOSVersion}</string>
</dict>
</plist>
`
}

function xcframeworkPlist(library: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>AvailableLibraries</key>
	<array>
		<dict>
			<key>BinaryPath</key>
			<string>${library}.framework/Versions/${frameworkVersion}/${library}</string>
			<key>LibraryIdentifier</key>
			<string>macos-arm64</string>
			<key>LibraryPath</key>
			<string>${library}.framework</string>
			<key>SupportedArchitectures</key>
			<array>
				<string>arm64</string>
			</array>
			<key>SupportedPlatform</key>
			<string>macos</string>
		</dict>
	</array>
	<key>CFBundlePackageType</key>
	<string>XFWK</string>
	<key>XCFrameworkFormatVersion</key>
	<string>1.0</string>
</dict>
</plist>
`
}

// ffmpeg's own headers cross-include as `<libavutil/samplefmt.h>`. Naming the
// frameworks after the libraries makes clang's framework header lookup resolve
// exactly those spellings, so the installed headers go in untouched and Swift
// imports read `import libavcodec`.
function moduleMap(library: string): string {
  return `framework module ${library} {
  umbrella header "${library}.h"
  export *
}
`
}

async function headerNames(dir: string): Promise<string[]> {
  const names: string[] = []
  for await (const entry of Deno.readDir(dir)) {
    if (entry.isFile && entry.name.endsWith('.h')) names.push(entry.name)
  }
  return names.sort()
}

// ffmpeg installs every hardware-context header regardless of configuration, so
// the set includes ones that reach for SDKs this build has neither enabled nor
// any way to see (`<d3d11.h>`, `<AMF/core/Factory.h>`). They cannot go in the
// umbrella, and leaving them beside it only trades a fatal error for an
// -Wincomplete-umbrella warning, so drop whatever does not compile on its own.
// Deriving that set from the compiler rather than a hand-kept list is what keeps
// an upstream bump from silently reintroducing one.
async function pruneUnbuildableHeaders(
  prefix: string,
  headers: string,
  library: string,
): Promise<string[]> {
  const pruned: string[] = []
  for (const header of await headerNames(headers)) {
    const compiles = await new Deno.Command('clang', {
      args: [
        '-fsyntax-only',
        `-I${join(prefix, 'include')}`,
        join(headers, header),
      ],
      stdout: 'null',
      stderr: 'null',
    }).output()
    if (compiles.success) continue
    await Deno.remove(join(headers, header))
    pruned.push(`${library}/${header}`)
  }
  return pruned
}

async function packageFramework(
  prefix: string,
  stage: string,
  library: string,
): Promise<string[]> {
  const dylib = await installedDylib(prefix, library)
  const soVersion = basename(dylib).slice(
    library.length + 1,
    -'.dylib'.length,
  )
  const bundle = join(
    stage,
    `${library}.xcframework`,
    'macos-arm64',
    `${library}.framework`,
  )
  const versioned = join(bundle, 'Versions', frameworkVersion)
  await Deno.mkdir(join(versioned, 'Headers'), { recursive: true })
  await Deno.mkdir(join(versioned, 'Modules'), { recursive: true })
  await Deno.mkdir(join(versioned, 'Resources'), { recursive: true })

  const includeDir = join(prefix, 'include', library)
  for (const header of await headerNames(includeDir)) {
    await Deno.copyFile(
      join(includeDir, header),
      join(versioned, 'Headers', header),
    )
  }
  const pruned = await pruneUnbuildableHeaders(
    prefix,
    join(versioned, 'Headers'),
    library,
  )
  const umbrella = (await headerNames(join(versioned, 'Headers')))
    .map((header) => `#include <${library}/${header}>`)
    .join('\n')
  await Deno.writeTextFile(
    join(versioned, 'Headers', `${library}.h`),
    `${umbrella}\n`,
  )
  await Deno.writeTextFile(
    join(versioned, 'Modules', 'module.modulemap'),
    moduleMap(library),
  )
  await Deno.writeTextFile(
    join(versioned, 'Resources', 'Info.plist'),
    infoPlist(library, soVersion),
  )

  const binary = join(versioned, library)
  await Deno.copyFile(dylib, binary)
  await Deno.chmod(binary, 0o755)

  const rewrites = ['-id', installName(library)]
  for (const line of (await output(['otool', '-L', binary])).split('\n')) {
    const match = line.trim().match(/^(@rpath\/(lib\w+)\.[0-9.]+\.dylib)\s/)
    if (match && libraries.includes(match[2]!)) {
      rewrites.push('-change', match[1]!, installName(match[2]!))
    }
  }
  await run(['install_name_tool', ...rewrites, binary])

  await Deno.symlink(frameworkVersion, join(bundle, 'Versions', 'Current'))
  for (const entry of ['Headers', 'Modules', 'Resources', library]) {
    await Deno.symlink(join('Versions', 'Current', entry), join(bundle, entry))
  }
  // install_name_tool invalidates the signature and arm64 refuses to load an
  // unsigned Mach-O; the app re-signs on embed, this only has to be valid.
  await run(['codesign', '--force', '--sign', '-', '--timestamp=none', bundle])
  await Deno.writeTextFile(
    join(stage, `${library}.xcframework`, 'Info.plist'),
    xcframeworkPlist(library),
  )
  return pruned
}

// Compiling one translation unit per module against the staged frameworks is
// the only proof that the generated umbrella headers and module maps are
// importable at all — a broken module map otherwise surfaces as a Swift build
// failure days later, in the artifact consumer.
async function verifyModules(
  scratch: string,
  frameworkDir: string,
): Promise<void> {
  const probe = join(scratch, 'module-probe.c')
  await Deno.writeTextFile(
    probe,
    libraries.map((library) => `#include <${library}/${library}.h>`).join(
      '\n',
    ) +
      '\nint main(void) { return 0; }\n',
  )
  await run([
    'clang',
    '-fsyntax-only',
    '-fmodules',
    `-fmodules-cache-path=${join(scratch, 'module-cache')}`,
    `-F${frameworkDir}`,
    probe,
  ])
  await Deno.remove(probe)
  await Deno.remove(join(scratch, 'module-cache'), { recursive: true })
}

function provenance(pruned: string[]): string {
  return `# ffmpeg ${upstreamVersion} for Arcroom (macOS arm64)

Built by \`tools/ffmpeg/build.ts\` in github.com/xnzg/arcroom-upstreams.
Reproduce by running \`deno task ffmpeg-build\` at the revision that pins this
artifact.

- Upstream source: ${upstreamURL}
- Source sha256: ${upstreamSHA256}
- Release tag: ${releaseTag}
- License: LGPL v2.1 or later (see COPYING.LGPLv2.1). Built without
  \`--enable-gpl\`, \`--enable-version3\`, and \`--enable-nonfree\`. The three
  libraries ship as separate dynamic frameworks so the application can be
  relinked against a user-supplied build of the same libraries.

## configure

\`\`\`
${configureFlags().join(' \\\n  ')}
\`\`\`

## Compiled-in components

- decoders: ${decoders.join(' ')}
- encoders: ${encoders.join(' ')}
- parsers: ${parsers.join(' ')}
- no muxers, demuxers, protocols, filters, devices, or bitstream filters
- no libavformat, libavfilter, libavdevice, libswscale, and no command-line tools

## Frameworks

${
    libraries.map((library) =>
      `- \`${library}.xcframework\` — install name \`${
        installName(library)
      }\`, module \`${library}\``
    ).join('\n')
  }

Headers dropped because they need SDKs this configuration neither enables nor
can see: ${pruned.join(', ')}
`
}

// Two shapes of the same frameworks. The combined zip is what an http_archive
// consumer fetches and expands as a directory; the per-framework zips are what a
// SwiftPM `binaryTarget` accepts, which requires the `.xcframework` at the zip
// root and one target per archive.
async function writeZips(stage: string, outDir: string): Promise<string[]> {
  await Deno.mkdir(outDir, { recursive: true })
  const zips: string[] = []

  const combined = join(outDir, `ffmpeg-${artifactSuffix}.zip`)
  await Deno.remove(combined).catch(() => {})
  await run([
    'zip',
    '--symlinks',
    '-r',
    '-X',
    '-q',
    combined,
    ...libraries.map((library) => `${library}.xcframework`),
    'COPYING.LGPLv2.1',
    'PROVENANCE.md',
  ], stage)
  zips.push(combined)

  for (const library of libraries) {
    const zip = join(outDir, `${library}-${artifactSuffix}.zip`)
    await Deno.remove(zip).catch(() => {})
    await run([
      'ditto',
      '-c',
      '-k',
      '--keepParent',
      join(stage, `${library}.xcframework`),
      zip,
    ])
    zips.push(zip)
  }
  return zips
}

async function packageArtifact(
  prefix: string,
  source: string,
  scratch: string,
  outDir: string,
): Promise<string[]> {
  const stage = join(scratch, 'stage')
  await Deno.remove(stage, { recursive: true }).catch(() => {})
  await Deno.mkdir(stage, { recursive: true })
  const pruned: string[] = []
  for (const library of libraries) {
    pruned.push(...await packageFramework(prefix, stage, library))
  }
  // Framework lookup needs the .framework bundles in one directory; the staged
  // xcframeworks nest them one level deeper, so probe through a flat mirror.
  const flat = join(scratch, 'frameworks')
  await Deno.remove(flat, { recursive: true }).catch(() => {})
  await Deno.mkdir(flat, { recursive: true })
  for (const library of libraries) {
    await Deno.symlink(
      join(
        stage,
        `${library}.xcframework`,
        'macos-arm64',
        `${library}.framework`,
      ),
      join(flat, `${library}.framework`),
    )
  }
  await verifyModules(scratch, flat)
  await Deno.remove(flat, { recursive: true })

  await Deno.copyFile(
    join(source, 'COPYING.LGPLv2.1'),
    join(stage, 'COPYING.LGPLv2.1'),
  )
  await Deno.writeTextFile(join(stage, 'PROVENANCE.md'), provenance(pruned))

  return await writeZips(stage, resolve(outDir))
}

export async function main(argv: string[]): Promise<void> {
  const args = parseArgs(argv)
  await preflight()
  const scratch = resolve(
    args.scratch ?? join(Deno.env.get('TMPDIR') ?? '/tmp', 'arcroom-ffmpeg'),
  )
  await Deno.mkdir(scratch, { recursive: true })
  const source = join(scratch, `ffmpeg-${upstreamVersion}`)
  try {
    const prefix = await buildFFmpeg(scratch)
    const zips = await packageArtifact(prefix, source, scratch, args.out)
    console.log(`\ntag ${releaseTag}`)
    for (const zip of zips) {
      console.log(`${await sha256(zip)}  ${zip}`)
    }
  } finally {
    if (!args.keep) {
      // The source tree and object files are over a gigabyte; the machine's
      // internal disk cannot carry them between runs.
      for (
        const dir of [
          'install',
          'stage',
          'frameworks',
          `ffmpeg-${upstreamVersion}`,
        ]
      ) {
        await Deno.remove(join(scratch, dir), { recursive: true }).catch(
          () => {},
        )
      }
      await Deno.remove(join(scratch, basename(upstreamURL))).catch(() => {})
    }
  }
}

if (import.meta.main) await main(Deno.args)
