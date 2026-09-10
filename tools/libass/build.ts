import { basename, join, resolve } from '../lib/path.ts'
import { output, run } from '../lib/proc.ts'

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
export const artifactRevision = 1
export const artifactSuffix =
  `${libassVersion}-arcroom.${artifactRevision}-macos-arm64`
export const artifactName = `libass-${artifactSuffix}.zip`
export const moduleName = 'CASS'
export const swiftPMArtifactName = `${moduleName}-${artifactSuffix}.zip`
export const releaseTag = `libass/${libassVersion}-arcroom.${artifactRevision}`
export const minimumMacOSVersion = '15.0'
export const publicHeaders = ['ass.h', 'ass_types.h']
export const linkedLibraries = [
  '/System/Library/Frameworks/CoreFoundation.framework/Versions/A/CoreFoundation',
  '/System/Library/Frameworks/CoreGraphics.framework/Versions/A/CoreGraphics',
  '/System/Library/Frameworks/CoreText.framework/Versions/A/CoreText',
  '/usr/lib/libSystem.B.dylib',
  '/usr/lib/libc++.1.dylib',
  '/usr/lib/libiconv.2.dylib',
]

export function sourceArtifactName(upstream: Upstream): string {
  const extension = upstream.url.endsWith('.tar.xz') ? '.tar.xz' : '.tar.gz'
  return `${upstream.name}-${upstream.version}-source${extension}`
}

interface Args {
  scratch: string | null
  out: string
  keep: boolean
}

function parseArgs(argv: string[]): Args {
  const args: Args = { scratch: null, out: 'dist-libass', keep: false }
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
    throw new Error('the artifact is macOS arm64 only; run on Apple silicon')
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

async function extractSource(
  scratch: string,
  upstream: Upstream,
): Promise<{ directory: string; tarball: string }> {
  const tarball = await fetchSource(scratch, upstream)
  const directory = join(scratch, upstream.directory)
  await Deno.remove(directory, { recursive: true }).catch(() => {})
  await run(['tar', 'xf', tarball], scratch)
  return { directory, tarball }
}

interface Toolchain {
  xcodeVersion: string
  xcodeBuild: string
  clangVersion: string
  sdkVersion: string
  sdkPath: string
  cc: string
  cxx: string
}

async function toolchain(): Promise<Toolchain> {
  const xcode = (await output(['xcodebuild', '-version'])).trim().split('\n')
  const clang = (await output([
    'xcrun',
    '--sdk',
    'macosx',
    'clang',
    '--version',
  ])).split('\n')[0]!.trim()
  return {
    xcodeVersion: xcode[0]?.replace(/^Xcode /, '') ?? '',
    xcodeBuild: xcode[1]?.replace(/^Build version /, '') ?? '',
    clangVersion: clang,
    sdkVersion: (await output([
      'xcrun',
      '--sdk',
      'macosx',
      '--show-sdk-version',
    ])).trim(),
    sdkPath: (await output(['xcrun', '--sdk', 'macosx', '--show-sdk-path']))
      .trim(),
    cc: (await output(['xcrun', '--sdk', 'macosx', '-f', 'clang'])).trim(),
    cxx: (await output(['xcrun', '--sdk', 'macosx', '-f', 'clang++'])).trim(),
  }
}

export function commonFlags(sdk: string): string {
  return `-arch arm64 -mmacosx-version-min=${minimumMacOSVersion} -isysroot ${sdk} -O2 -DNDEBUG -fPIC -fvisibility=hidden`
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
  tools: Toolchain,
  prefix: string,
): Record<string, string> {
  const flags = commonFlags(tools.sdkPath)
  return {
    MACOSX_DEPLOYMENT_TARGET: minimumMacOSVersion,
    CC: tools.cc,
    CXX: tools.cxx,
    CFLAGS: flags,
    CXXFLAGS: flags,
    LDFLAGS:
      `-arch arm64 -mmacosx-version-min=${minimumMacOSVersion} -isysroot ${tools.sdkPath}`,
    PKG_CONFIG_PATH: join(prefix, 'lib', 'pkgconfig'),
    PKG_CONFIG_LIBDIR: join(prefix, 'lib', 'pkgconfig'),
  }
}

async function buildFreetype(
  source: string,
  prefix: string,
  tools: Toolchain,
  env: Record<string, string>,
): Promise<void> {
  const build = join(source, 'build')
  await Deno.mkdir(build, { recursive: true })
  await run(
    [
      'cmake',
      '..',
      `-DCMAKE_OSX_ARCHITECTURES=arm64`,
      `-DCMAKE_OSX_DEPLOYMENT_TARGET=${minimumMacOSVersion}`,
      `-DCMAKE_OSX_SYSROOT=${tools.sdkPath}`,
      `-DCMAKE_INSTALL_PREFIX=${prefix}`,
      `-DCMAKE_C_FLAGS=${commonFlags(tools.sdkPath)}`,
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
  tools: Toolchain,
  scratch: string,
): Promise<void> {
  const object = join(scratch, 'harfbuzz.o')
  await run([
    'xcrun',
    '--sdk',
    'macosx',
    'clang++',
    ...commonFlags(tools.sdkPath).split(' '),
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
    'macosx',
    'ar',
    'rcs',
    join(prefix, 'lib', 'libharfbuzz.a'),
    object,
  ])
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
  scratch: string,
): Promise<string> {
  const archive = join(scratch, 'libass.a')
  await Deno.remove(archive).catch(() => {})
  await run([
    'xcrun',
    '--sdk',
    'macosx',
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

function provenance(tools: Toolchain): string {
  const sources = upstreams.map((upstream) =>
    `- ${upstream.name} ${upstream.version}: ${upstream.url} (sha256 ${upstream.sha256}), ${upstream.license}, license file \`${upstream.licenseFile}\`, published beside this archive as \`${
      sourceArtifactName(upstream)
    }\`.`
  ).join('\n')
  return `# libass ${libassVersion} for Arcroom (macOS arm64)

Built by \`tools/libass/build.ts\` in github.com/xnzg/arcroom-upstreams.
Reproduce by running \`deno task libass-build\` at the revision that pins this
artifact.

- Release tag: ${releaseTag}
- Deployment target: macOS ${minimumMacOSVersion}, arm64.
- Clang module: ${moduleName}.
- Xcode: ${tools.xcodeVersion} (build ${tools.xcodeBuild}).
- Apple clang: ${tools.clangVersion}.
- macOS SDK: ${tools.sdkVersion}.
- Upstream modifications: none.

## Upstream sources

${sources}

## Build

One static archive, \`libass.a\`, holds libass and every library it needs at
link time: FreeType (no zlib, bzip2, png, brotli or HarfBuzz callback),
FriBidi, HarfBuzz (the single-file amalgamation compiled with the Xcode
clang++, FreeType and CoreText enabled, no glib, ICU or graphite) and
libunibreak. Fontconfig and DirectWrite are disabled; the CoreText font
provider is the only system provider and libass is configured not to require
one, so fonts added through \`ass_add_font\` work without any system font.

Common compile flags:

\`\`\`
${commonFlags('<macosx-sdk>')}
\`\`\`

FreeType (CMake): ${configureOptions.freetype.join(' ')}

FriBidi (configure): ${configureOptions.fribidi.join(' ')}

libunibreak (configure): ${configureOptions.libunibreak.join(' ')}

HarfBuzz (clang++ on src/harfbuzz.cc): ${configureOptions.harfbuzz.join(' ')}

libass (configure): ${configureOptions.libass.join(' ')}

## Artifact

\`libass.xcframework\` contains one static \`libass.a\` slice, the two public
libass headers under \`ass/\`, an umbrella \`libass.h\` and a \`${moduleName}\`
module map whose link directives pull in libc++, libiconv, CoreText,
CoreGraphics and CoreFoundation. The platform set matches the libsmb2 artifact
in this repository: macOS arm64 only.

FriBidi is LGPL v2.1 and statically linked here, so an application distributor
must satisfy LGPL v2.1 section 6 for it, including providing the application
object files or an equivalent relinking mechanism plus the corresponding source
offer; the exact source tarballs ship beside this archive for that purpose.
This archive alone does not discharge the consuming application's obligations.
`
}

async function packageArtifact(
  sources: Map<string, { directory: string; tarball: string }>,
  archive: string,
  headers: string,
  tools: Toolchain,
  scratch: string,
  outDir: string,
): Promise<string[]> {
  const stage = join(scratch, 'stage')
  await Deno.remove(stage, { recursive: true }).catch(() => {})
  await Deno.mkdir(stage, { recursive: true })
  await run([
    'xcodebuild',
    '-create-xcframework',
    '-library',
    archive,
    '-headers',
    headers,
    '-output',
    join(stage, 'libass.xcframework'),
  ])
  const licenseNames: string[] = []
  for (const upstream of upstreams) {
    const name = `LICENSE-${upstream.name}.txt`
    await Deno.copyFile(
      join(sources.get(upstream.name)!.directory, upstream.licenseFile),
      join(stage, name),
    )
    licenseNames.push(name)
  }
  await Deno.writeTextFile(join(stage, 'PROVENANCE.md'), provenance(tools))

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
    await Deno.copyFile(sources.get(upstream.name)!.tarball, target)
    artifacts.push(target)
  }
  return artifacts
}

export async function main(argv: string[]): Promise<void> {
  const args = parseArgs(argv)
  await preflight()
  const scratch = resolve(
    args.scratch ?? join(Deno.env.get('TMPDIR') ?? '/tmp', 'arcroom-libass'),
  )
  await Deno.mkdir(scratch, { recursive: true })
  const prefix = join(scratch, 'prefix')
  try {
    await Deno.remove(prefix, { recursive: true }).catch(() => {})
    await Deno.mkdir(join(prefix, 'lib', 'pkgconfig'), { recursive: true })
    const tools = await toolchain()
    const env = buildEnvironment(tools, prefix)
    const sources = new Map<string, { directory: string; tarball: string }>()
    for (const upstream of upstreams) {
      sources.set(upstream.name, await extractSource(scratch, upstream))
    }
    await buildFreetype(sources.get('freetype')!.directory, prefix, tools, env)
    await buildAutotools(
      sources.get('fribidi')!.directory,
      prefix,
      configureOptions.fribidi,
      env,
    )
    await buildAutotools(
      sources.get('libunibreak')!.directory,
      prefix,
      configureOptions.libunibreak,
      env,
    )
    await buildHarfbuzz(
      sources.get('harfbuzz')!.directory,
      prefix,
      tools,
      scratch,
    )
    await buildAutotools(
      sources.get('libass')!.directory,
      prefix,
      configureOptions.libass,
      env,
    )
    const archive = await combineArchive(prefix, scratch)
    const headers = await stageHeaders(prefix, scratch)
    const artifacts = await packageArtifact(
      sources,
      archive,
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
          ...upstreams.map((upstream) => upstream.directory),
          'prefix',
          'harfbuzz.o',
          'libass.a',
          'headers',
          'stage',
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
