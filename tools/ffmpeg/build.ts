// Builder for the pinned ffmpeg artifact Arcroom links.
//
// This file IS the provenance record: the upstream tarball URL + sha256, the
// exact configure line, the slice matrix, and the codec allowlist all live
// here, and the artifact carries a generated copy as PROVENANCE.md. Run it once
// per upstream bump, upload `dist-ffmpeg/*.zip` to a GitHub release under the
// `ffmpeg/` tag namespace, and pin each asset by sha256 in the consuming repo.
//
// LGPL v2.1 (no --enable-gpl, no --enable-version3, no --enable-nonfree): the
// libraries ship as separate dynamic frameworks so a user can relink the
// app against their own build, and COPYING.LGPLv2.1 rides in the artifact.

import { basename, join, resolve } from '../lib/path.ts'
import { capture, output, run } from '../lib/proc.ts'

export const upstreamVersion = '8.1.2'
export const upstreamURL =
  `https://ffmpeg.org/releases/ffmpeg-${upstreamVersion}.tar.xz`
export const upstreamSHA256 =
  '464beb5e7bf0c311e68b45ae2f04e9cc2af88851abb4082231742a74d97b524c'

export const artifactRevision = 4
export const artifactSuffix =
  `${upstreamVersion}-arcroom.${artifactRevision}-apple-arm64`
export const releaseTag =
  `ffmpeg/${upstreamVersion}-arcroom.${artifactRevision}`

// The deployment floors are Arcroom's, from `packages/arcroom/package.yml`.
// tvOS is absent on purpose: the TV shell has no write path and never links
// these frameworks.
export interface Slice {
  id: string
  sdk: string
  llvmOS: string
  supportedPlatform: string
  supportedPlatformVariant: string | null
  bundlePlatform: string
  minVersion: string
}

export const slices: Slice[] = [
  {
    id: 'macos-arm64',
    sdk: 'macosx',
    llvmOS: 'macos',
    supportedPlatform: 'macos',
    supportedPlatformVariant: null,
    bundlePlatform: 'MacOSX',
    minVersion: '15.4',
  },
  {
    id: 'ios-arm64',
    sdk: 'iphoneos',
    llvmOS: 'ios',
    supportedPlatform: 'ios',
    supportedPlatformVariant: null,
    bundlePlatform: 'iPhoneOS',
    minVersion: '18.4',
  },
  {
    id: 'ios-arm64-simulator',
    sdk: 'iphonesimulator',
    llvmOS: 'ios',
    supportedPlatform: 'ios',
    supportedPlatformVariant: 'simulator',
    bundlePlatform: 'iPhoneSimulator',
    minVersion: '18.4',
  },
  {
    id: 'xros-arm64',
    sdk: 'xros',
    llvmOS: 'xros',
    supportedPlatform: 'xros',
    supportedPlatformVariant: null,
    bundlePlatform: 'XROS',
    minVersion: '26.0',
  },
  {
    id: 'xros-arm64-simulator',
    sdk: 'xrsimulator',
    llvmOS: 'xros',
    supportedPlatform: 'xros',
    supportedPlatformVariant: 'simulator',
    bundlePlatform: 'XRSimulator',
    minVersion: '26.0',
  },
]

// Only a macOS framework may carry the versioned bundle layout; every other
// Apple platform requires the flat one, and a versioned bundle there is
// rejected at embed time rather than at build time.
export function isVersionedLayout(slice: Slice): boolean {
  return slice.supportedPlatform === 'macos'
}

export function triple(slice: Slice): string {
  const variant = slice.supportedPlatformVariant
  return `arm64-apple-${slice.llvmOS}${slice.minVersion}${
    variant === null ? '' : `-${variant}`
  }`
}

// `--disable-everything` turns the component table off. These lists restore the
// existing audio ladder plus the narrow demux/decode surface used by the
// standalone importer experiment. Arcroom still authors its own output boxes.
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
  'h264',
  'hevc',
  'ass',
  'movtext',
  'srt',
  'webvtt',
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

const encoders = ['aac', 'eac3', 'h264_videotoolbox']

const parsers = [
  'aac',
  'aac_latm',
  'ac3',
  'dca',
  'flac',
  'mlp',
  'opus',
  'vorbis',
  'h264',
  'hevc',
]

const demuxers = ['matroska', 'mov']
const protocols = ['file']
const hwaccels = ['h264_videotoolbox', 'hevc_videotoolbox']

export const libraries = [
  'libavutil',
  'libswresample',
  'libswscale',
  'libavcodec',
  'libavformat',
]

export const frameworkVersion = 'A'

// ffmpeg bakes the configure line into `avcodec_configuration()`, which the
// artifact therefore ships. A staged DESTDIR install keeps the builder's scratch
// directory out of that string, so the same source produces the same string on
// any machine — and a contract test can assert on it.
const installPrefix = '/arcroom-ffmpeg'

export function configureFlags(slice: Slice, sdkPath: string): string[] {
  const flags = [
    `--prefix=${installPrefix}`,
    '--disable-gpl',
    '--disable-nonfree',
    '--disable-version3',
    '--disable-everything',
    '--disable-autodetect',
    // Matroska ContentCompression: real-world Bluray remuxes ship zlib-
    // compressed PGS (and sometimes SRT) tracks; without zlib lavf delivers
    // the payloads still compressed. Links the system /usr/lib/libz.
    '--enable-zlib',
    '--disable-programs',
    '--disable-doc',
    '--enable-avformat',
    '--disable-avfilter',
    '--disable-avdevice',
    '--enable-swscale',
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
    '--enable-videotoolbox',
    '--install-name-dir=@rpath',
  ]
  // Every slice states its platform as an explicit LLVM triple rather than a
  // version-min flag. `-mmacosx-version-min` has no simulator spelling at all,
  // and configure's own probes are what would otherwise pick a platform: a
  // device triple that silently lands in a simulator slice is the classic
  // failure, and the triple is the only input that settles LC_BUILD_VERSION.
  const target = triple(slice)
  flags.push(`--extra-cflags=-target ${target} -isysroot ${sdkPath}`)
  flags.push(`--extra-ldflags=-target ${target} -isysroot ${sdkPath}`)
  if (slice.supportedPlatform !== 'macos') {
    flags.push(
      '--enable-cross-compile',
      '--target-os=darwin',
      '--arch=arm64',
      `--sysroot=${sdkPath}`,
    )
  }
  // The framework install names are longer than the `@rpath/libavcodec.62.dylib`
  // ffmpeg links with, and install_name_tool cannot grow the load commands
  // after the fact.
  flags.push('--extra-ldflags=-Wl,-headerpad_max_install_names')
  flags.push(
    `--enable-decoder=${decoders.join(',')}`,
    `--enable-encoder=${encoders.join(',')}`,
    `--enable-parser=${parsers.join(',')}`,
    `--enable-demuxer=${demuxers.join(',')}`,
    `--enable-protocol=${protocols.join(',')}`,
    `--enable-hwaccel=${hwaccels.join(',')}`,
  )
  return flags
}

interface Args {
  scratch: string | null
  out: string
  keep: boolean
  only: string[] | null
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    scratch: null,
    out: 'dist-ffmpeg',
    keep: false,
    only: null,
  }
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
      case '--only':
        args.only = argv[++i]!.split(',')
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
      'the artifact is Apple arm64 only; run this on Apple silicon',
    )
  }
  for (
    const tool of [
      'bash',
      'make',
      'patch',
      'clang',
      'xcrun',
      'xcodebuild',
      'install_name_tool',
      'zip',
      'ditto',
    ]
  ) {
    if (!await onPath(tool)) {
      throw new Error(
        `missing build tool: ${tool} (install the full Xcode, not only the CLI tools)`,
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

async function sdkPath(slice: Slice): Promise<string> {
  return (await capture(['xcrun', '--sdk', slice.sdk, '--show-sdk-path']))
    .trim()
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

// The patch series is part of the corresponding source LGPL asks for, so it is
// applied to every slice — never only to the platform that needs it — and the
// artifact's PROVENANCE.md names each file. Each patch carries its own
// rationale in the text above its diff.
export async function patchNames(): Promise<string[]> {
  const names: string[] = []
  for await (const entry of Deno.readDir(patchDirectory())) {
    if (entry.isFile && entry.name.endsWith('.patch')) names.push(entry.name)
  }
  return names.sort()
}

function patchDirectory(): string {
  return join(new URL('.', import.meta.url).pathname, 'patches')
}

async function extractSource(scratch: string): Promise<string> {
  const tarball = await fetchSource(scratch)
  const source = join(scratch, `ffmpeg-${upstreamVersion}`)
  await Deno.remove(source, { recursive: true }).catch(() => {})
  await run(['tar', 'xf', tarball], scratch)
  for (const name of await patchNames()) {
    await run(['patch', '-p1', '-i', join(patchDirectory(), name)], source)
  }
  return source
}

// One extracted source, one out-of-tree build directory per slice: five
// configurations cannot share `config.h`, and `make distclean` between them
// would serialise what is otherwise five independent trees.
async function buildSlice(
  source: string,
  scratch: string,
  slice: Slice,
): Promise<string> {
  const buildDir = join(scratch, 'build', slice.id)
  await Deno.remove(buildDir, { recursive: true }).catch(() => {})
  await Deno.mkdir(buildDir, { recursive: true })
  const destdir = join(scratch, 'install', slice.id)
  await Deno.remove(destdir, { recursive: true }).catch(() => {})
  await run(
    [
      'bash',
      join(source, 'configure'),
      ...configureFlags(slice, await sdkPath(slice)),
    ],
    buildDir,
  )
  await run(['make', `-j${navigator.hardwareConcurrency}`], buildDir)
  await run(['make', 'install', `DESTDIR=${destdir}`], buildDir)
  await Deno.remove(buildDir, { recursive: true }).catch(() => {})
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
// identical dylib. It is also the one spelling that survives a versioned macOS
// bundle and a flat iOS one carrying the same binary.
export function installName(library: string): string {
  return `@rpath/${library}`
}

function infoPlist(
  library: string,
  soVersion: string,
  slice: Slice,
): string {
  const minimumKey = slice.supportedPlatform === 'macos'
    ? 'LSMinimumSystemVersion'
    : 'MinimumOSVersion'
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
	<key>CFBundleSupportedPlatforms</key>
	<array>
		<string>${slice.bundlePlatform}</string>
	</array>
	<key>CFBundleVersion</key>
	<string>${soVersion}</string>
	<key>${minimumKey}</key>
	<string>${slice.minVersion}</string>
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

async function compiles(
  slice: Slice,
  sdk: string,
  args: string[],
): Promise<boolean> {
  const result = await new Deno.Command('clang', {
    args: [
      '-fsyntax-only',
      '-target',
      triple(slice),
      '-isysroot',
      sdk,
      ...args,
    ],
    stdout: 'null',
    stderr: 'null',
  }).output()
  return result.success
}

// ffmpeg installs every hardware-context header regardless of configuration, so
// the set includes ones that reach for SDKs this build has neither enabled nor
// any way to see (`<d3d11.h>`, `<AMF/core/Factory.h>`). They cannot go in the
// umbrella, and leaving them beside it only trades a fatal error for an
// -Wincomplete-umbrella warning, so drop whatever does not compile on its own.
// Deriving that set from the compiler rather than a hand-kept list is what keeps
// an upstream bump from silently reintroducing one. The union across slices is
// what every slice drops, so the frameworks stay header-identical: a consumer
// compiles the same source for all of them.
async function unbuildableHeaders(
  prefixes: Map<string, string>,
  active: Slice[],
): Promise<Set<string>> {
  const pruned = new Set<string>()
  for (const slice of active) {
    const prefix = prefixes.get(slice.id)!
    const sdk = await sdkPath(slice)
    for (const library of libraries) {
      const dir = join(prefix, 'include', library)
      for (const header of await headerNames(dir)) {
        const ok = await compiles(slice, sdk, [
          `-I${join(prefix, 'include')}`,
          join(dir, header),
        ])
        if (!ok) pruned.add(`${library}/${header}`)
      }
    }
  }
  return pruned
}

async function stageFramework(
  prefix: string,
  sliceStage: string,
  library: string,
  slice: Slice,
  pruned: Set<string>,
): Promise<void> {
  const dylib = await installedDylib(prefix, library)
  const soVersion = basename(dylib).slice(library.length + 1, -'.dylib'.length)
  const bundle = join(sliceStage, `${library}.framework`)
  const versioned = isVersionedLayout(slice)
    ? join(bundle, 'Versions', frameworkVersion)
    : bundle
  const resources = isVersionedLayout(slice)
    ? join(versioned, 'Resources')
    : versioned
  await Deno.mkdir(join(versioned, 'Headers'), { recursive: true })
  await Deno.mkdir(join(versioned, 'Modules'), { recursive: true })
  await Deno.mkdir(resources, { recursive: true })

  const includeDir = join(prefix, 'include', library)
  const kept: string[] = []
  for (const header of await headerNames(includeDir)) {
    if (pruned.has(`${library}/${header}`)) continue
    await Deno.copyFile(
      join(includeDir, header),
      join(versioned, 'Headers', header),
    )
    kept.push(header)
  }
  await Deno.writeTextFile(
    join(versioned, 'Headers', `${library}.h`),
    `${kept.map((header) => `#include <${library}/${header}>`).join('\n')}\n`,
  )
  await Deno.writeTextFile(
    join(versioned, 'Modules', 'module.modulemap'),
    moduleMap(library),
  )
  await Deno.writeTextFile(
    join(resources, 'Info.plist'),
    infoPlist(library, soVersion, slice),
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

  if (!isVersionedLayout(slice)) return
  await Deno.symlink(frameworkVersion, join(bundle, 'Versions', 'Current'))
  for (const entry of ['Headers', 'Modules', 'Resources', library]) {
    await Deno.symlink(join('Versions', 'Current', entry), join(bundle, entry))
  }
}

// The platform a slice actually landed on is decided by LC_BUILD_VERSION, not
// by the SDK the compiler saw, and `xcodebuild -create-xcframework` reads that
// load command to place the slice. Asserting it here is what stops a device
// binary from being filed as a simulator one.
const platformCodes: Record<string, number> = {
  'macos-arm64': 1,
  'ios-arm64': 2,
  'ios-arm64-simulator': 7,
  'xros-arm64': 11,
  'xros-arm64-simulator': 12,
}

export async function buildVersion(
  binary: string,
): Promise<{ platform: string; minos: string }> {
  const lines = (await capture(['otool', '-l', binary])).split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]!.trim() !== 'cmd LC_BUILD_VERSION') continue
    const fields: Record<string, string> = {}
    for (const line of lines.slice(i + 1, i + 8)) {
      const [key, ...rest] = line.trim().split(/\s+/)
      if (key) fields[key] = rest.join(' ')
    }
    return { platform: fields['platform'] ?? '', minos: fields['minos'] ?? '' }
  }
  throw new Error(`${binary} has no LC_BUILD_VERSION`)
}

async function assertPlatform(binary: string, slice: Slice): Promise<void> {
  const { platform, minos } = await buildVersion(binary)
  const expected = String(platformCodes[slice.id])
  if (platform !== expected && platform !== slice.llvmOS) {
    throw new Error(
      `${binary}: LC_BUILD_VERSION platform ${platform}, expected ${expected} for ${slice.id}`,
    )
  }
  if (minos !== slice.minVersion) {
    throw new Error(
      `${binary}: LC_BUILD_VERSION minos ${minos}, expected ${slice.minVersion}`,
    )
  }
}

// Compiling one translation unit per module against the staged frameworks is
// the only proof that the generated umbrella headers and module maps are
// importable at all — a broken module map otherwise surfaces as a Swift build
// failure days later, in the artifact consumer. Every slice gets its own probe:
// a header the iOS SDK does not have is a consumer's build failure, not ours.
async function verifyModules(
  scratch: string,
  frameworkDir: string,
  slice: Slice,
): Promise<void> {
  const probe = join(scratch, `module-probe-${slice.id}.c`)
  await Deno.writeTextFile(
    probe,
    libraries.map((library) => `#include <${library}/${library}.h>`).join(
      '\n',
    ) +
      '\nint main(void) { return 0; }\n',
  )
  const cache = join(scratch, `module-cache-${slice.id}`)
  await run([
    'clang',
    '-fsyntax-only',
    '-target',
    triple(slice),
    '-isysroot',
    await sdkPath(slice),
    '-fmodules',
    `-fmodules-cache-path=${cache}`,
    `-F${frameworkDir}`,
    probe,
  ])
  await Deno.remove(probe)
  await Deno.remove(cache, { recursive: true })
}

function provenance(
  active: Slice[],
  pruned: Set<string>,
  patches: string[],
): string {
  return `# ffmpeg ${upstreamVersion} for Arcroom (Apple arm64)

Built by \`tools/ffmpeg/build.ts\` in github.com/xnzg/arcroom-upstreams.
Reproduce by running \`deno task ffmpeg-build\` at the revision that pins this
artifact.

- Upstream source: ${upstreamURL}
- Source sha256: ${upstreamSHA256}
- Release tag: ${releaseTag}
- License: LGPL v2.1 or later (see COPYING.LGPLv2.1). Built without
  \`--enable-gpl\`, \`--enable-version3\`, and \`--enable-nonfree\`. The five
  libraries ship as separate dynamic frameworks so the application can be
  relinked against a user-supplied build of the same libraries.

## Upstream modifications

${
    patches.length === 0 ? 'None.' : `Applied to every slice, from
\`tools/ffmpeg/patches/\` in the builder repository:

${patches.map((name) => `- \`${name}\``).join('\n')}`
  }

## Slices

Every xcframework carries one arm64 slice per row; there is no x86_64 anywhere.

| LibraryIdentifier | SDK | target triple | deployment target |
| --- | --- | --- | --- |
${
    active.map((slice) =>
      `| \`${slice.id}\` | \`${slice.sdk}\` | \`${triple(slice)}\` | ${
        slice.supportedPlatform === 'macos' ? 'macOS' : slice.llvmOS
      } ${slice.minVersion} |`
    ).join('\n')
  }

## configure

Every slice shares the flags below. \`<target>\` and \`<sysroot>\` are the
slice's triple and SDK path; non-macOS slices additionally pass
\`--enable-cross-compile --target-os=darwin --arch=arm64 --sysroot=<sysroot>\`.

\`\`\`
${
    configureFlags(slices[0]!, '<sysroot>')
      .map((flag) => flag.replace(triple(slices[0]!), '<target>'))
      .join(' \\\n  ')
  }
\`\`\`

## Compiled-in components

- decoders: ${decoders.join(' ')}
- encoders: ${encoders.join(' ')}
- parsers: ${parsers.join(' ')}
- demuxers: ${demuxers.join(' ')}
- protocols: ${protocols.join(' ')}
- hardware accelerators: ${hwaccels.join(' ')}
- no muxers, filters, devices, or bitstream filters
- no libavfilter, libavdevice, or command-line tools

## Frameworks

${
    libraries.map((library) =>
      `- \`${library}.xcframework\` — install name \`${
        installName(library)
      }\`, module \`${library}\``
    ).join('\n')
  }

The macOS slice carries the versioned bundle layout
(\`Versions/${frameworkVersion}\`); every other slice carries the flat one, which
is what those platforms accept.

Headers dropped because they need SDKs this configuration neither enables nor
can see: ${[...pruned].sort().join(', ')}
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
  prefixes: Map<string, string>,
  active: Slice[],
  source: string,
  scratch: string,
  outDir: string,
): Promise<string[]> {
  const stage = join(scratch, 'stage')
  await Deno.remove(stage, { recursive: true }).catch(() => {})
  await Deno.mkdir(stage, { recursive: true })
  const pruned = await unbuildableHeaders(prefixes, active)

  const slicesDir = join(scratch, 'slices')
  await Deno.remove(slicesDir, { recursive: true }).catch(() => {})
  for (const slice of active) {
    const sliceStage = join(slicesDir, slice.id)
    await Deno.mkdir(sliceStage, { recursive: true })
    for (const library of libraries) {
      await stageFramework(
        prefixes.get(slice.id)!,
        sliceStage,
        library,
        slice,
        pruned,
      )
      const bundle = join(sliceStage, `${library}.framework`)
      await assertPlatform(
        isVersionedLayout(slice)
          ? join(bundle, 'Versions', frameworkVersion, library)
          : join(bundle, library),
        slice,
      )
    }
    await verifyModules(scratch, sliceStage, slice)
  }

  for (const library of libraries) {
    const xcframework = join(stage, `${library}.xcframework`)
    const args = ['xcodebuild', '-create-xcframework']
    for (const slice of active) {
      args.push(
        '-framework',
        join(slicesDir, slice.id, `${library}.framework`),
      )
    }
    args.push('-output', xcframework)
    await run(args)
    // install_name_tool invalidated the signature and arm64 refuses to load an
    // unsigned Mach-O; the app re-signs on embed, this only has to be valid.
    for (const slice of active) {
      await run([
        'codesign',
        '--force',
        '--sign',
        '-',
        '--timestamp=none',
        join(xcframework, slice.id, `${library}.framework`),
      ])
    }
  }
  await Deno.remove(slicesDir, { recursive: true })

  await Deno.copyFile(
    join(source, 'COPYING.LGPLv2.1'),
    join(stage, 'COPYING.LGPLv2.1'),
  )
  await Deno.writeTextFile(
    join(stage, 'PROVENANCE.md'),
    provenance(active, pruned, await patchNames()),
  )

  return await writeZips(stage, resolve(outDir))
}

export async function main(argv: string[]): Promise<void> {
  const args = parseArgs(argv)
  await preflight()
  const active = args.only === null
    ? slices
    : slices.filter((slice) => args.only!.includes(slice.id))
  if (active.length === 0) throw new Error('no slice matched --only')
  const scratch = resolve(
    args.scratch ?? join(Deno.env.get('TMPDIR') ?? '/tmp', 'arcroom-ffmpeg'),
  )
  await Deno.mkdir(scratch, { recursive: true })
  try {
    const source = await extractSource(scratch)
    const prefixes = new Map<string, string>()
    for (const slice of active) {
      console.log(`\n=== ${slice.id} (${triple(slice)}) ===`)
      prefixes.set(slice.id, await buildSlice(source, scratch, slice))
    }
    const zips = await packageArtifact(
      prefixes,
      active,
      source,
      scratch,
      args.out,
    )
    console.log(`\ntag ${releaseTag}`)
    for (const zip of zips) {
      console.log(`${await sha256(zip)}  ${zip}`)
    }
  } finally {
    if (!args.keep) {
      // The source tree and object files are over a gigabyte per slice; the
      // machine's internal disk cannot carry them between runs.
      for (
        const dir of [
          'build',
          'install',
          'slices',
          'stage',
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
