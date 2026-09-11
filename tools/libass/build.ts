import { basename, join, resolve } from '../lib/path.ts'
import { capture, output, run } from '../lib/proc.ts'

export interface Upstream {
  name: string
  version: string
  url: string
  sha256: string
  directory: string
  license: string
  licenseFile: string
}

export const upstreams: Upstream[] = [
  {
    name: 'freetype',
    version: '2.14.3',
    url:
      'https://github.com/freetype/freetype/archive/refs/tags/VER-2-14-3.tar.gz',
    sha256: 'dc49de6b01a266eef4876a4dd34d9842c475d3e28ff2eff63bd2fb760ab56261',
    directory: 'freetype-VER-2-14-3',
    license: 'FreeType License (FTL)',
    licenseFile: 'LICENSE.TXT',
  },
  {
    name: 'fribidi',
    version: '1.0.16',
    url:
      'https://github.com/fribidi/fribidi/releases/download/v1.0.16/fribidi-1.0.16.tar.xz',
    sha256: '1b1cde5b235d40479e91be2f0e88a309e3214c8ab470ec8a2744d82a5a9ea05c',
    directory: 'fribidi-1.0.16',
    license: 'LGPL v2.1 or later',
    licenseFile: 'COPYING',
  },
  {
    name: 'harfbuzz',
    version: '14.2.1',
    url:
      'https://github.com/harfbuzz/harfbuzz/releases/download/14.2.1/harfbuzz-14.2.1.tar.xz',
    sha256: 'a54a5d8e9380a41fbb762ce367bcbf7704792dfca0d93f1bbca86c5a57902e0e',
    directory: 'harfbuzz-14.2.1',
    license: 'MIT (Old MIT)',
    licenseFile: 'COPYING',
  },
  {
    name: 'libunibreak',
    version: '6.1',
    url:
      'https://github.com/adah1972/libunibreak/releases/download/libunibreak_6_1/libunibreak-6.1.tar.gz',
    sha256: 'cc4de0099cf7ff05005ceabff4afed4c582a736abc38033e70fdac86335ce93f',
    directory: 'libunibreak-6.1',
    license: 'zlib',
    licenseFile: 'LICENCE',
  },
  {
    name: 'libass',
    version: '0.17.5',
    url:
      'https://github.com/libass/libass/releases/download/0.17.5/libass-0.17.5.tar.xz',
    sha256: '2dca25c0e0c837ddf00b52011b3f82cac1e4ddd3ad018227806b0c2288864acc',
    directory: 'libass-0.17.5',
    license: 'ISC',
    licenseFile: 'COPYING',
  },
]

export const libassVersion = '0.17.5'
export const artifactRevision = 2
export const artifactSuffix =
  `${libassVersion}-arcroom.${artifactRevision}-apple-arm64`
export const artifactName = `libass-${artifactSuffix}.zip`
export const moduleName = 'CASS'
export const swiftPMArtifactName = `${moduleName}-${artifactSuffix}.zip`
export const releaseTag = `libass/${libassVersion}-arcroom.${artifactRevision}`
export const publicHeaders = ['ass.h', 'ass_types.h']

// The system libraries a force-loaded `libass.a` is allowed to pull in, by
// leaf name: the absolute paths differ per platform (a macOS framework binary
// sits under `Versions/A`, every other platform's does not), the set does not.
export const linkedLibraries = [
  'CoreFoundation',
  'CoreGraphics',
  'CoreText',
  'libSystem.B.dylib',
  'libc++.1.dylib',
  'libiconv.2.dylib',
]

// The deployment floors are Arcroom's, from `packages/arcroom/package.yml`, and
// match the ffmpeg artifact's. Unlike ffmpeg, libass does get a tvOS slice:
// ffmpeg is absent there only because the TV shell has no write path, while the
// TV shell does render subtitles.
export interface Slice {
  id: string
  sdk: string
  llvmOS: string
  supportedPlatform: string
  supportedPlatformVariant: string | null
  cmakeSystemName: string | null
  vtoolPlatform: string
  minVersion: string
}

export const slices: Slice[] = [
  {
    id: 'macos-arm64',
    sdk: 'macosx',
    llvmOS: 'macos',
    supportedPlatform: 'macos',
    supportedPlatformVariant: null,
    cmakeSystemName: null,
    vtoolPlatform: 'MACOS',
    minVersion: '15.4',
  },
  {
    id: 'ios-arm64',
    sdk: 'iphoneos',
    llvmOS: 'ios',
    supportedPlatform: 'ios',
    supportedPlatformVariant: null,
    cmakeSystemName: 'iOS',
    vtoolPlatform: 'IOS',
    minVersion: '18.4',
  },
  {
    id: 'ios-arm64-simulator',
    sdk: 'iphonesimulator',
    llvmOS: 'ios',
    supportedPlatform: 'ios',
    supportedPlatformVariant: 'simulator',
    cmakeSystemName: 'iOS',
    vtoolPlatform: 'IOSSIMULATOR',
    minVersion: '18.4',
  },
  {
    id: 'tvos-arm64',
    sdk: 'appletvos',
    llvmOS: 'tvos',
    supportedPlatform: 'tvos',
    supportedPlatformVariant: null,
    cmakeSystemName: 'tvOS',
    vtoolPlatform: 'TVOS',
    minVersion: '26.0',
  },
  {
    id: 'tvos-arm64-simulator',
    sdk: 'appletvsimulator',
    llvmOS: 'tvos',
    supportedPlatform: 'tvos',
    supportedPlatformVariant: 'simulator',
    cmakeSystemName: 'tvOS',
    vtoolPlatform: 'TVOSSIMULATOR',
    minVersion: '26.0',
  },
  {
    id: 'xros-arm64',
    sdk: 'xros',
    llvmOS: 'xros',
    supportedPlatform: 'xros',
    supportedPlatformVariant: null,
    cmakeSystemName: 'visionOS',
    vtoolPlatform: 'VISIONOS',
    minVersion: '26.0',
  },
  {
    id: 'xros-arm64-simulator',
    sdk: 'xrsimulator',
    llvmOS: 'xros',
    supportedPlatform: 'xros',
    supportedPlatformVariant: 'simulator',
    cmakeSystemName: 'visionOS',
    vtoolPlatform: 'VISIONOSSIMULATOR',
    minVersion: '26.0',
  },
]

// The triple is the only input that settles a slice's LC_BUILD_VERSION.
// `-mmacosx-version-min` has no simulator spelling at all, and letting a
// configure probe pick the platform is how a device object ends up filed as a
// simulator slice.
export function triple(slice: Slice): string {
  const variant = slice.supportedPlatformVariant
  return `arm64-apple-${slice.llvmOS}${slice.minVersion}${
    variant === null ? '' : `-${variant}`
  }`
}

export function sourceArtifactName(upstream: Upstream): string {
  const extension = upstream.url.endsWith('.tar.xz') ? '.tar.xz' : '.tar.gz'
  return `${upstream.name}-${upstream.version}-source${extension}`
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
    out: 'dist-libass',
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
    throw new Error('the artifact is Apple arm64 only; run on Apple silicon')
  }
  for (
    const tool of ['tar', 'xcrun', 'xcodebuild', 'zip', 'cmake', 'make', 'sh']
  ) {
    if (!await onPath(tool)) throw new Error(`missing build tool: ${tool}`)
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

async function fetchSource(
  scratch: string,
  upstream: Upstream,
): Promise<string> {
  const tarball = join(scratch, basename(upstream.url))
  try {
    await Deno.stat(tarball)
    console.log(`reusing ${tarball}`)
  } catch {
    console.log(`GET ${upstream.url}`)
    const response = await fetch(upstream.url)
    if (!response.ok) {
      throw new Error(`GET ${upstream.url} failed: ${response.status}`)
    }
    await Deno.writeFile(tarball, response.body!)
  }
  const actual = await sha256(tarball)
  if (actual !== upstream.sha256) {
    await Deno.remove(tarball)
    throw new Error(
      `sha256 mismatch for ${upstream.url}: expected ${upstream.sha256}, got ${actual}`,
    )
  }
  return tarball
}

// Autotools configures and builds in the source tree, so every slice gets its
// own extraction rather than a shared one — seven `make distclean` rounds would
// serialise what is otherwise seven independent trees, and freetype's CMake
// cache is per-platform anyway.
async function extractSources(
  scratch: string,
  workDir: string,
): Promise<Map<string, string>> {
  await Deno.remove(workDir, { recursive: true }).catch(() => {})
  await Deno.mkdir(workDir, { recursive: true })
  const directories = new Map<string, string>()
  for (const upstream of upstreams) {
    const tarball = await fetchSource(scratch, upstream)
    await run(['tar', 'xf', tarball], workDir)
    directories.set(upstream.name, join(workDir, upstream.directory))
  }
  return directories
}

interface Toolchain {
  xcodeVersion: string
  xcodeBuild: string
  clangVersion: string
  sdkVersions: Map<string, string>
  cc: string
  cxx: string
}

async function toolchain(active: Slice[]): Promise<Toolchain> {
  const xcode = (await output(['xcodebuild', '-version'])).trim().split('\n')
  const clang = (await output([
    'xcrun',
    '--sdk',
    'macosx',
    'clang',
    '--version',
  ])).split('\n')[0]!.trim()
  const sdkVersions = new Map<string, string>()
  for (const slice of active) {
    if (sdkVersions.has(slice.sdk)) continue
    sdkVersions.set(
      slice.sdk,
      (await capture(['xcrun', '--sdk', slice.sdk, '--show-sdk-version']))
        .trim(),
    )
  }
  return {
    xcodeVersion: xcode[0]?.replace(/^Xcode /, '') ?? '',
    xcodeBuild: xcode[1]?.replace(/^Build version /, '') ?? '',
    clangVersion: clang,
    sdkVersions,
    cc: (await output(['xcrun', '--sdk', 'macosx', '-f', 'clang'])).trim(),
    cxx: (await output(['xcrun', '--sdk', 'macosx', '-f', 'clang++'])).trim(),
  }
}

export async function sdkPath(slice: Slice): Promise<string> {
  return (await capture(['xcrun', '--sdk', slice.sdk, '--show-sdk-path']))
    .trim()
}

export function commonFlags(slice: Slice, sdk: string): string {
  return `-target ${
    triple(slice)
  } -isysroot ${sdk} -O2 -DNDEBUG -fPIC -fvisibility=hidden`
}

export const configureOptions = {
  freetype: [
    '-DCMAKE_BUILD_TYPE=Release',
    '-DBUILD_SHARED_LIBS=OFF',
    '-DFT_DISABLE_ZLIB=ON',
    '-DFT_DISABLE_BZIP2=ON',
    '-DFT_DISABLE_PNG=ON',
    '-DFT_DISABLE_HARFBUZZ=ON',
    '-DFT_DISABLE_BROTLI=ON',
    '-DCMAKE_INSTALL_LIBDIR=lib',
  ],
  fribidi: ['--disable-shared', '--enable-static', '--disable-debug'],
  libunibreak: ['--disable-shared', '--enable-static'],
  harfbuzz: [
    '-std=c++11',
    '-fno-exceptions',
    '-fno-rtti',
    '-fno-threadsafe-statics',
    '-DHAVE_FREETYPE=1',
    '-DHAVE_CORETEXT=1',
    '-DHAVE_PTHREAD=1',
    '-DHB_NO_MT=1',
  ],
  libass: [
    '--disable-shared',
    '--enable-static',
    '--disable-fontconfig',
    '--enable-coretext',
    '--disable-require-system-font-provider',
    '--disable-directwrite',
  ],
}

function buildEnvironment(
  slice: Slice,
  sdk: string,
  tools: Toolchain,
  prefix: string,
): Record<string, string> {
  const flags = commonFlags(slice, sdk)
  const env: Record<string, string> = {
    CC: tools.cc,
    CXX: tools.cxx,
    CFLAGS: flags,
    CXXFLAGS: flags,
    LDFLAGS: `-target ${triple(slice)} -isysroot ${sdk}`,
    PKG_CONFIG_PATH: join(prefix, 'lib', 'pkgconfig'),
    PKG_CONFIG_LIBDIR: join(prefix, 'lib', 'pkgconfig'),
  }
  // Only meaningful for the macOS slice, and actively harmful elsewhere:
  // libtool and the linker both read it and would stamp a macOS floor onto an
  // iOS object.
  if (slice.supportedPlatform === 'macos') {
    env.MACOSX_DEPLOYMENT_TARGET = slice.minVersion
  }
  return env
}

async function buildFreetype(
  source: string,
  prefix: string,
  slice: Slice,
  sdk: string,
  env: Record<string, string>,
): Promise<void> {
  const build = join(source, 'build')
  await Deno.mkdir(build, { recursive: true })
  // CMake owns the platform selection here rather than a `-target` in
  // CMAKE_C_FLAGS: it appends its own arch/sysroot/version-min flags after the
  // user flags, so a triple in CFLAGS loses the argument. The system name plus
  // the simulator-or-device sysroot is what CMake reads, and every object's
  // LC_BUILD_VERSION is asserted afterwards regardless.
  await run(
    [
      'cmake',
      '..',
      ...(slice.cmakeSystemName === null
        ? []
        : [`-DCMAKE_SYSTEM_NAME=${slice.cmakeSystemName}`]),
      '-DCMAKE_OSX_ARCHITECTURES=arm64',
      `-DCMAKE_OSX_DEPLOYMENT_TARGET=${slice.minVersion}`,
      `-DCMAKE_OSX_SYSROOT=${sdk}`,
      `-DCMAKE_INSTALL_PREFIX=${prefix}`,
      '-DCMAKE_C_FLAGS=-O2 -DNDEBUG -fPIC -fvisibility=hidden',
      ...configureOptions.freetype,
    ],
    build,
    env,
  )
  await run(['make', `-j${navigator.hardwareConcurrency}`], build, env)
  await run(['make', 'install'], build, env)
}

async function buildAutotools(
  source: string,
  prefix: string,
  options: string[],
  env: Record<string, string>,
): Promise<void> {
  await run(
    [
      'sh',
      './configure',
      `--prefix=${prefix}`,
      '--host=aarch64-apple-darwin',
      ...options,
    ],
    source,
    env,
  )
  await run(['make', `-j${navigator.hardwareConcurrency}`], source, env)
  await run(['make', 'install'], source, env)
}

// harfbuzz is built from its single-file amalgamation with the Xcode clang++
// rather than meson: no build-system dependency, and the feature set is the
// explicit define list above.
async function buildHarfbuzz(
  source: string,
  prefix: string,
  slice: Slice,
  sdk: string,
  scratch: string,
): Promise<void> {
  const object = join(scratch, 'harfbuzz.o')
  await run([
    'xcrun',
    '--sdk',
    slice.sdk,
    'clang++',
    ...commonFlags(slice, sdk).split(' '),
    ...configureOptions.harfbuzz,
    `-I${join(prefix, 'include', 'freetype2')}`,
    '-c',
    join(source, 'src', 'harfbuzz.cc'),
    '-o',
    object,
  ])
  await run([
    'xcrun',
    '--sdk',
    slice.sdk,
    'ar',
    'rcs',
    join(prefix, 'lib', 'libharfbuzz.a'),
    object,
  ])
  await Deno.remove(object)
  const include = join(prefix, 'include', 'harfbuzz')
  await Deno.mkdir(include, { recursive: true })
  for await (const entry of Deno.readDir(join(source, 'src'))) {
    if (
      entry.isFile && entry.name.endsWith('.h') &&
      (entry.name === 'hb.h' || entry.name.startsWith('hb-'))
    ) {
      await Deno.copyFile(
        join(source, 'src', entry.name),
        join(include, entry.name),
      )
    }
  }
  const harfbuzz = upstreams.find((upstream) => upstream.name === 'harfbuzz')!
  await Deno.writeTextFile(
    join(prefix, 'lib', 'pkgconfig', 'harfbuzz.pc'),
    `prefix=${prefix}
libdir=\${prefix}/lib
includedir=\${prefix}/include

Name: harfbuzz
Description: HarfBuzz text shaping library
Version: ${harfbuzz.version}
Libs: -L\${libdir} -lharfbuzz
Libs.private: -lc++ -framework CoreText -framework CoreGraphics -framework CoreFoundation
Requires.private: freetype2
Cflags: -I\${includedir}/harfbuzz
`,
  )
}

function umbrellaHeader(): string {
  return `#include <stdint.h>
#include <stddef.h>
#include <ass/ass_types.h>
#include <ass/ass.h>
`
}

// The link directives are what let a Swift module that imports CASS link the
// C++ runtime, iconv and the CoreText provider's frameworks without every
// consumer restating them.
function moduleMap(): string {
  return `module ${moduleName} [system] {
  header "libass.h"
  export *
  link "c++"
  link "iconv"
  link framework "CoreText"
  link framework "CoreGraphics"
  link framework "CoreFoundation"
}
`
}

async function combineArchive(
  prefix: string,
  slice: Slice,
  slicesDir: string,
): Promise<string> {
  const archive = join(slicesDir, slice.id, 'libass.a')
  await Deno.mkdir(join(slicesDir, slice.id), { recursive: true })
  await Deno.remove(archive).catch(() => {})
  await run([
    'xcrun',
    '--sdk',
    slice.sdk,
    'libtool',
    '-static',
    '-o',
    archive,
    join(prefix, 'lib', 'libass.a'),
    join(prefix, 'lib', 'libfreetype.a'),
    join(prefix, 'lib', 'libharfbuzz.a'),
    join(prefix, 'lib', 'libfribidi.a'),
    join(prefix, 'lib', 'libunibreak.a'),
  ])
  return archive
}

// The platform a slice actually landed on is decided by LC_BUILD_VERSION, not
// by the SDK the compiler saw, and `xcodebuild -create-xcframework` reads that
// load command to place the slice. Asserting every member here is what stops a
// device object from being filed as a simulator one, and it is the only check
// on CMake's and configure's platform guesses.
export async function assertPlatform(
  archive: string,
  slice: Slice,
  scratch: string,
): Promise<number> {
  const objects = join(scratch, `objects-${slice.id}`)
  await Deno.remove(objects, { recursive: true }).catch(() => {})
  await Deno.mkdir(objects, { recursive: true })
  await run(['xcrun', 'ar', '-x', archive], objects)
  let count = 0
  for await (const entry of Deno.readDir(objects)) {
    if (!entry.isFile || !entry.name.endsWith('.o')) continue
    const build = await capture([
      'xcrun',
      'vtool',
      '-show-build',
      join(objects, entry.name),
    ])
    if (!build.includes(`platform ${slice.vtoolPlatform}`)) {
      throw new Error(
        `${entry.name} in ${slice.id}: expected platform ${slice.vtoolPlatform}, got:\n${build}`,
      )
    }
    if (!build.includes(`minos ${slice.minVersion}`)) {
      throw new Error(
        `${entry.name} in ${slice.id}: expected minos ${slice.minVersion}, got:\n${build}`,
      )
    }
    count++
  }
  await Deno.remove(objects, { recursive: true })
  if (count === 0) throw new Error(`${archive} has no objects`)
  return count
}

async function stageHeaders(prefix: string, scratch: string): Promise<string> {
  const headers = join(scratch, 'headers')
  await Deno.remove(headers, { recursive: true }).catch(() => {})
  await Deno.mkdir(join(headers, 'ass'), { recursive: true })
  for (const header of publicHeaders) {
    await Deno.copyFile(
      join(prefix, 'include', 'ass', header),
      join(headers, 'ass', header),
    )
  }
  await Deno.writeTextFile(join(headers, 'libass.h'), umbrellaHeader())
  await Deno.writeTextFile(join(headers, 'module.modulemap'), moduleMap())
  return headers
}

const platformNames: Record<string, string> = {
  macos: 'macOS',
  ios: 'iOS',
  tvos: 'tvOS',
  xros: 'visionOS',
}

function provenance(tools: Toolchain, active: Slice[]): string {
  const sources = upstreams.map((upstream) =>
    `- ${upstream.name} ${upstream.version}: ${upstream.url} (sha256 ${upstream.sha256}), ${upstream.license}, license file \`${upstream.licenseFile}\`, published beside this archive as \`${
      sourceArtifactName(upstream)
    }\`.`
  ).join('\n')
  const sliceRows = active.map((slice) =>
    `| \`${slice.id}\` | \`${slice.sdk}\` | \`${triple(slice)}\` | ${
      platformNames[slice.llvmOS]
    } ${slice.minVersion} | ${tools.sdkVersions.get(slice.sdk)} |`
  ).join('\n')
  return `# libass ${libassVersion} for Arcroom (Apple arm64)

Built by \`tools/libass/build.ts\` in github.com/xnzg/arcroom-upstreams.
Reproduce by running \`deno task libass-build\` at the revision that pins this
artifact.

- Release tag: ${releaseTag}
- Clang module: ${moduleName}.
- Xcode: ${tools.xcodeVersion} (build ${tools.xcodeBuild}).
- Apple clang: ${tools.clangVersion}.
- Upstream modifications: none.

## Upstream sources

${sources}

## Slices

Every slice is arm64; there is no x86_64 anywhere. The deployment floors are
Arcroom's, from its \`package.yml\`.

| LibraryIdentifier | SDK | target triple | deployment target | SDK version |
| --- | --- | --- | --- | --- |
${sliceRows}

## Build

One static archive, \`libass.a\` per slice, holds libass and every library it
needs at link time: FreeType (no zlib, bzip2, png, brotli or HarfBuzz
callback), FriBidi, HarfBuzz (the single-file amalgamation compiled with the
Xcode clang++, FreeType and CoreText enabled, no glib, ICU or graphite) and
libunibreak. Fontconfig and DirectWrite are disabled; the CoreText font
provider is the only system provider and is present on every slice, and libass
is configured not to require one, so fonts added through \`ass_add_font\` work
without any system font. Every platform is served by the same portable C
sources and the same flags — only the target triple and the SDK differ.

Common compile flags, where \`<target>\` is the slice's triple and
\`<sysroot>\` its SDK path:

\`\`\`
${commonFlags(active[0]!, '<sysroot>').replace(triple(active[0]!), '<target>')}
\`\`\`

FreeType (CMake): ${configureOptions.freetype.join(' ')}

Every FreeType slice also passes \`-DCMAKE_OSX_ARCHITECTURES=arm64
-DCMAKE_OSX_SYSROOT=<sysroot> -DCMAKE_OSX_DEPLOYMENT_TARGET=<floor>\`, and a
non-macOS slice adds \`-DCMAKE_SYSTEM_NAME=<iOS|tvOS|visionOS>\`: CMake appends
its own platform flags after the user ones, so it owns the target selection
there rather than a triple in \`CMAKE_C_FLAGS\`.

FriBidi (configure): ${configureOptions.fribidi.join(' ')}

libunibreak (configure): ${configureOptions.libunibreak.join(' ')}

HarfBuzz (clang++ on src/harfbuzz.cc): ${configureOptions.harfbuzz.join(' ')}

libass (configure): ${configureOptions.libass.join(' ')}

Every autotools package is configured \`--host=aarch64-apple-darwin\`, so no
configure probe runs a target binary.

## Artifact

\`libass.xcframework\` contains one static \`libass.a\` per slice above, the two
public libass headers under \`ass/\`, an umbrella \`libass.h\` and a
\`${moduleName}\` module map whose link directives pull in libc++, libiconv,
CoreText, CoreGraphics and CoreFoundation. Every member object of every archive
is asserted to carry the slice's \`LC_BUILD_VERSION\` platform and minimum OS.

FriBidi is LGPL v2.1 and statically linked here, so an application distributor
must satisfy LGPL v2.1 section 6 for it, including providing the application
object files or an equivalent relinking mechanism plus the corresponding source
offer; the exact source tarballs ship beside this archive for that purpose.
This archive alone does not discharge the consuming application's obligations.
`
}

async function packageArtifact(
  archives: Map<string, string>,
  active: Slice[],
  licenses: string,
  tarballs: Map<string, string>,
  headers: string,
  tools: Toolchain,
  scratch: string,
  outDir: string,
): Promise<string[]> {
  const stage = join(scratch, 'stage')
  await Deno.remove(stage, { recursive: true }).catch(() => {})
  await Deno.mkdir(stage, { recursive: true })
  const args = ['xcodebuild', '-create-xcframework']
  for (const slice of active) {
    args.push('-library', archives.get(slice.id)!, '-headers', headers)
  }
  args.push('-output', join(stage, 'libass.xcframework'))
  await run(args)
  const licenseNames: string[] = []
  for (const upstream of upstreams) {
    const name = `LICENSE-${upstream.name}.txt`
    await Deno.copyFile(join(licenses, name), join(stage, name))
    licenseNames.push(name)
  }
  await Deno.writeTextFile(
    join(stage, 'PROVENANCE.md'),
    provenance(tools, active),
  )

  const resolvedOut = resolve(outDir)
  await Deno.mkdir(resolvedOut, { recursive: true })
  for await (const entry of Deno.readDir(resolvedOut)) {
    if (
      entry.isFile &&
      (entry.name.endsWith('.zip') || entry.name.includes('-source.tar.'))
    ) {
      await Deno.remove(join(resolvedOut, entry.name))
    }
  }
  const zip = join(resolvedOut, artifactName)
  await run([
    'zip',
    '-r',
    '-X',
    '-q',
    zip,
    'libass.xcframework',
    'PROVENANCE.md',
    ...licenseNames,
  ], stage)
  const swiftPMZip = join(resolvedOut, swiftPMArtifactName)
  await run([
    'ditto',
    '-c',
    '-k',
    '--keepParent',
    join(stage, 'libass.xcframework'),
    swiftPMZip,
  ])
  const artifacts = [zip, swiftPMZip]
  for (const upstream of upstreams) {
    const target = join(resolvedOut, sourceArtifactName(upstream))
    await Deno.copyFile(tarballs.get(upstream.name)!, target)
    artifacts.push(target)
  }
  return artifacts
}

export async function main(argv: string[]): Promise<void> {
  const args = parseArgs(argv)
  await preflight()
  const active = args.only === null
    ? slices
    : slices.filter((slice) => args.only!.includes(slice.id))
  if (active.length === 0) throw new Error('no slice matched --only')
  const scratch = resolve(
    args.scratch ?? join(Deno.env.get('TMPDIR') ?? '/tmp', 'arcroom-libass'),
  )
  await Deno.mkdir(scratch, { recursive: true })
  const slicesDir = join(scratch, 'slices')
  const licenses = join(scratch, 'licenses')
  try {
    await Deno.remove(slicesDir, { recursive: true }).catch(() => {})
    await Deno.mkdir(licenses, { recursive: true })
    const tools = await toolchain(active)
    const tarballs = new Map<string, string>()
    for (const upstream of upstreams) {
      tarballs.set(upstream.name, await fetchSource(scratch, upstream))
    }
    const archives = new Map<string, string>()
    let headers = ''
    for (const slice of active) {
      console.log(`\n=== ${slice.id} (${triple(slice)}) ===`)
      const sdk = await sdkPath(slice)
      const workDir = join(scratch, 'work', slice.id)
      const prefix = join(scratch, 'prefix', slice.id)
      await Deno.remove(prefix, { recursive: true }).catch(() => {})
      await Deno.mkdir(join(prefix, 'lib', 'pkgconfig'), { recursive: true })
      const sources = await extractSources(scratch, workDir)
      for (const upstream of upstreams) {
        await Deno.copyFile(
          join(sources.get(upstream.name)!, upstream.licenseFile),
          join(licenses, `LICENSE-${upstream.name}.txt`),
        )
      }
      const env = buildEnvironment(slice, sdk, tools, prefix)
      await buildFreetype(sources.get('freetype')!, prefix, slice, sdk, env)
      await buildAutotools(
        sources.get('fribidi')!,
        prefix,
        configureOptions.fribidi,
        env,
      )
      await buildAutotools(
        sources.get('libunibreak')!,
        prefix,
        configureOptions.libunibreak,
        env,
      )
      await buildHarfbuzz(sources.get('harfbuzz')!, prefix, slice, sdk, scratch)
      await buildAutotools(
        sources.get('libass')!,
        prefix,
        configureOptions.libass,
        env,
      )
      const archive = await combineArchive(prefix, slice, slicesDir)
      const objects = await assertPlatform(archive, slice, scratch)
      console.log(
        `${slice.id}: ${objects} objects, platform ${slice.vtoolPlatform}, minos ${slice.minVersion}`,
      )
      if (headers === '') headers = await stageHeaders(prefix, scratch)
      await Deno.remove(workDir, { recursive: true }).catch(() => {})
      await Deno.remove(prefix, { recursive: true }).catch(() => {})
      archives.set(slice.id, archive)
    }
    const artifacts = await packageArtifact(
      archives,
      active,
      licenses,
      tarballs,
      headers,
      tools,
      scratch,
      args.out,
    )
    console.log(`\ntag ${releaseTag}`)
    for (const artifact of artifacts) {
      console.log(`${await sha256(artifact)}  ${artifact}`)
    }
  } finally {
    if (!args.keep) {
      for (
        const entry of [
          'work',
          'prefix',
          'slices',
          'headers',
          'stage',
          'licenses',
        ]
      ) {
        await Deno.remove(join(scratch, entry), { recursive: true }).catch(
          () => {},
        )
      }
      for (const upstream of upstreams) {
        await Deno.remove(join(scratch, basename(upstream.url))).catch(() => {})
      }
    }
  }
}

if (import.meta.main) await main(Deno.args)
