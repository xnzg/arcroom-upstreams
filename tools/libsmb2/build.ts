// Builder for the pinned libsmb2 artifact Arcroom links.
//
// This file IS the provenance record: the upstream tarball URL + sha256, the
// slice matrix, the translation units and the framework layout all live here,
// and the artifact carries a generated copy as PROVENANCE.md. Run it once per
// upstream bump, upload `dist-libsmb2/*.zip` to a GitHub release under the
// `libsmb2/` tag namespace, and pin each asset by sha256 in the consuming repo.
//
// LGPL v2.1 (built-in NTLMSSP, Kerberos/GSSAPI disabled): the library ships as
// a dynamic framework so a user can relink the app against their own build, and
// LICENCE-LGPL-2.1.txt rides in the artifact beside it.
//
// The Clang module is upstream's `SMB2`, and clang resolves a framework module
// only under the framework's own name through `-F`, so the bundle inside
// `libsmb2.xcframework` is `SMB2.framework`: `import SMB2` and
// `import SMB2.Raw` are what the consumer writes, and neither changes.

import { basename, join, resolve } from '../lib/path.ts'
import { capture, output, run } from '../lib/proc.ts'

export const upstreamVersion = '6.2'
export const upstreamTag = `libsmb2-${upstreamVersion}`
export const upstreamCommit = 'd67e213a5c4e7e4969fd81f0b95e4ca5831fbba1'
export const upstreamURL =
  `https://github.com/sahlberg/libsmb2/archive/refs/tags/${upstreamTag}.tar.gz`
export const upstreamSHA256 =
  '8e1f9efc6b2e0f6546f0fe121ac0ddf4fc2f0908ae5a6bd1f185be7c9e0bcbb3'

export const artifactRevision = 2
export const artifactSuffix =
  `${upstreamVersion}-arcroom.${artifactRevision}-apple-arm64`
export const artifactName = `libsmb2-${artifactSuffix}.zip`
export const xcframeworkName = 'libsmb2.xcframework'
export const frameworkName = 'SMB2'
export const moduleName = frameworkName
export const swiftPMArtifactName = `${moduleName}-${artifactSuffix}.zip`
export const sourceArtifactName = `libsmb2-${upstreamVersion}-source.tar.gz`
export const releaseTag =
  `libsmb2/${upstreamVersion}-arcroom.${artifactRevision}`
export const bundleIdentifier = 'tech.lakeridge.arcroom.libsmb2'

interface Slice {
  id: string
  sdk: string
  llvmOS: string
  supportedPlatform: string
  supportedPlatformVariant: string | null
  bundlePlatform: string
  minVersion: string
}

// The deployment floors are Arcroom's, from `packages/arcroom/package.yml`, and
// are the same rows the ffmpeg artifact carries.
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
    id: 'tvos-arm64',
    sdk: 'appletvos',
    llvmOS: 'tvos',
    supportedPlatform: 'tvos',
    supportedPlatformVariant: null,
    bundlePlatform: 'AppleTVOS',
    minVersion: '26.0',
  },
  {
    id: 'tvos-arm64-simulator',
    sdk: 'appletvsimulator',
    llvmOS: 'tvos',
    supportedPlatform: 'tvos',
    supportedPlatformVariant: 'simulator',
    bundlePlatform: 'AppleTVSimulator',
    minVersion: '26.0',
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

// The triple is the only input that settles a slice's LC_BUILD_VERSION: a
// version-min flag has no simulator spelling, so a device binary filed as a
// simulator slice would pass every other structural check.
export function triple(slice: Slice): string {
  const variant = slice.supportedPlatformVariant
  return `arm64-apple-${slice.llvmOS}${slice.minVersion}${
    variant === null ? '' : `-${variant}`
  }`
}

// A conventional framework install name: the app has an rpath to its own
// `Frameworks` directory, so nothing here needs the flat spelling ffmpeg uses
// for five sibling dylibs.
export const installName = `@rpath/${frameworkName}.framework/${frameworkName}`

// The translation units upstream's `lib/CMakeLists.txt` lists, minus
// `krb5-wrapper.c`: Kerberos/GSSAPI is deliberately disabled.
export const sources = [
  'aes.c',
  'aes128ccm.c',
  'alloc.c',
  'asn1-ber.c',
  'compat.c',
  'dcerpc.c',
  'dcerpc-lsa.c',
  'dcerpc-srvsvc.c',
  'errors.c',
  'hmac.c',
  'hmac-md5.c',
  'init.c',
  'libsmb2.c',
  'md4c.c',
  'md5.c',
  'ntlmssp.c',
  'pdu.c',
  'sha1.c',
  'sha224-256.c',
  'sha384-512.c',
  'smb2-cmd-close.c',
  'smb2-cmd-create.c',
  'smb2-cmd-echo.c',
  'smb2-cmd-error.c',
  'smb2-cmd-flush.c',
  'smb2-cmd-ioctl.c',
  'smb2-cmd-lock.c',
  'smb2-cmd-logoff.c',
  'smb2-cmd-negotiate.c',
  'smb2-cmd-notify-change.c',
  'smb2-cmd-oplock-break.c',
  'smb2-cmd-query-directory.c',
  'smb2-cmd-query-info.c',
  'smb2-cmd-read.c',
  'smb2-cmd-session-setup.c',
  'smb2-cmd-set-info.c',
  'smb2-cmd-tree-connect.c',
  'smb2-cmd-tree-disconnect.c',
  'smb2-cmd-write.c',
  'smb2-data-file-info.c',
  'smb2-data-filesystem-info.c',
  'smb2-data-security-descriptor.c',
  'smb2-data-reparse-point.c',
  'smb2-share-enum.c',
  'smb2-signing.c',
  'smb3-seal.c',
  'socket.c',
  'spnego-wrapper.c',
  'sync.c',
  'timestamps.c',
  'unicode.c',
  'usha.c',
]

// `compat.c` and `sha1.c` produce no symbols for this configuration; the
// framework is linked from the rest, and every slice must agree.
export const expectedObjectNames = sources
  .map((name) => `${name.slice(0, -2)}.o`)
  .filter((name) => name !== 'compat.o' && name !== 'sha1.o')

// The headers upstream's own module map names, and so the ones the framework
// ships: the seven public headers, the private header the `Internal` submodule
// takes, and the Apple `config.h`.
export const headers = [
  'libsmb2-private.h',
  'apple/config.h',
  'smb2/libsmb2-dcerpc-lsa.h',
  'smb2/libsmb2-dcerpc-srvsvc.h',
  'smb2/libsmb2-dcerpc.h',
  'smb2/libsmb2-raw.h',
  'smb2/libsmb2.h',
  'smb2/smb2-errors.h',
  'smb2/smb2.h',
]

// Upstream's headers cross-include as `<smb2/x.h>`, which only resolves through
// an include path. Inside a framework there is none, and the framework lookup
// clang falls back to matches the *framework's* name (SMB2), which only finds a
// `smb2.framework` on a case-insensitive volume. These three
// framework-internal cross-includes are therefore respelled relative in the
// shipped copies; the compiled sources and every other byte are upstream's,
// and the verifier asserts exactly this difference.
export const headerRewrites: Record<string, [string, string][]> = {
  'smb2/libsmb2-dcerpc-srvsvc.h': [[
    '#include <smb2/libsmb2-dcerpc.h>',
    '#include "libsmb2-dcerpc.h"',
  ]],
  'smb2/libsmb2.h': [[
    '#include <smb2/libsmb2-dcerpc-srvsvc.h>',
    '#include "libsmb2-dcerpc-srvsvc.h"',
  ]],
  'smb2/smb2.h': [[
    '#include <smb2/smb2-errors.h>',
    '#include "smb2-errors.h"',
  ]],
}

// Upstream's `include/module.modulemap`, byte for byte apart from the
// `framework` keyword: the submodule surface is the contract `import SMB2` and
// `import SMB2.Raw` are written against.
function moduleMap(): string {
  return `framework module ${moduleName} [system] [extern_c] {
    module LibSMB2 {
        header "apple/config.h"
        header "smb2/smb2-errors.h"
        header "smb2/smb2.h"
        header "smb2/libsmb2.h"
        header "smb2/libsmb2-dcerpc.h"
        header "smb2/libsmb2-dcerpc-lsa.h"
        header "smb2/libsmb2-dcerpc-srvsvc.h"
    }

    module Internal {
        header "libsmb2-private.h"
    }

    explicit module Raw {
        header "smb2/libsmb2-raw.h"
    }

    export SMB2
}
`
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
    out: 'dist-libsmb2',
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
    const tool of ['tar', 'xcrun', 'xcodebuild', 'codesign', 'zip', 'ditto']
  ) {
    if (!await onPath(tool)) {
      throw new Error(
        `missing build tool: ${tool} (install the full Xcode, not only the CLI tools)`,
      )
    }
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

interface Source {
  directory: string
  tarball: string
}

async function extractSource(scratch: string): Promise<Source> {
  const tarball = await fetchSource(scratch)
  const source = join(scratch, `libsmb2-${upstreamTag}`)
  await Deno.remove(source, { recursive: true }).catch(() => {})
  await run(['tar', 'xzf', tarball], scratch)
  return { directory: source, tarball }
}

async function sdkPath(slice: Slice): Promise<string> {
  return (await capture(['xcrun', '--sdk', slice.sdk, '--show-sdk-path']))
    .trim()
}

function compileFlags(source: string, sdk: string, slice: Slice): string[] {
  return [
    '-std=gnu11',
    '-O2',
    '-DNDEBUG',
    '-fPIC',
    '-target',
    triple(slice),
    '-isysroot',
    sdk,
    '-D_FILE_OFFSET_BITS=64',
    '-D_U_=__attribute__((unused))',
    '-DHAVE_CONFIG_H=1',
    `-I${join(source, 'include')}`,
    `-I${join(source, 'include', 'apple')}`,
    `-I${join(source, 'include', 'smb2')}`,
    `-I${join(source, 'lib')}`,
  ]
}

interface Built {
  dylib: string
  objectNames: string[]
}

async function buildSlice(
  source: string,
  scratch: string,
  slice: Slice,
): Promise<Built> {
  const sdk = await sdkPath(slice)
  const objects = join(scratch, `objects-${slice.id}`)
  await Deno.remove(objects, { recursive: true }).catch(() => {})
  await Deno.mkdir(objects, { recursive: true })
  const flags = compileFlags(source, sdk, slice)
  const objectPaths: string[] = []
  for (const name of sources) {
    const object = join(objects, `${name.slice(0, -2)}.o`)
    await run([
      'xcrun',
      '--sdk',
      slice.sdk,
      'clang',
      ...flags,
      '-c',
      join(source, 'lib', name),
      '-o',
      object,
    ])
    const symbols = await capture([
      'xcrun',
      '--sdk',
      slice.sdk,
      'nm',
      '-g',
      object,
    ])
    if (symbols.trim() === '') {
      console.log(`note: ${name} is empty for ${slice.id}`)
    } else {
      objectPaths.push(object)
    }
  }
  const objectNames = objectPaths.map(basename).sort()
  if (objectNames.join('\n') !== expectedObjectNames.toSorted().join('\n')) {
    throw new Error(
      `${slice.id}: unexpected nonempty objects:\n${objectNames.join('\n')}`,
    )
  }
  const dylib = join(scratch, `${frameworkName}-${slice.id}.dylib`)
  await Deno.remove(dylib).catch(() => {})
  await run([
    'xcrun',
    '--sdk',
    slice.sdk,
    'clang',
    '-dynamiclib',
    '-target',
    triple(slice),
    '-isysroot',
    sdk,
    `-Wl,-install_name,${installName}`,
    '-o',
    dylib,
    ...objectPaths,
  ])
  await Deno.remove(objects, { recursive: true })
  return { dylib, objectNames }
}

function infoPlist(slice: Slice): string {
  const minimumKey = slice.supportedPlatform === 'macos'
    ? 'LSMinimumSystemVersion'
    : 'MinimumOSVersion'
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>CFBundleDevelopmentRegion</key>
\t<string>en</string>
\t<key>CFBundleExecutable</key>
\t<string>${frameworkName}</string>
\t<key>CFBundleIdentifier</key>
\t<string>${bundleIdentifier}</string>
\t<key>CFBundleInfoDictionaryVersion</key>
\t<string>6.0</string>
\t<key>CFBundleName</key>
\t<string>${frameworkName}</string>
\t<key>CFBundlePackageType</key>
\t<string>FMWK</string>
\t<key>CFBundleShortVersionString</key>
\t<string>${upstreamVersion}</string>
\t<key>CFBundleSupportedPlatforms</key>
\t<array>
\t\t<string>${slice.bundlePlatform}</string>
\t</array>
\t<key>CFBundleVersion</key>
\t<string>${upstreamVersion}</string>
\t<key>${minimumKey}</key>
\t<string>${slice.minVersion}</string>
</dict>
</plist>
`
}

async function stageFramework(
  source: string,
  sliceStage: string,
  slice: Slice,
  dylib: string,
): Promise<void> {
  const bundle = join(sliceStage, `${frameworkName}.framework`)
  const versioned = isVersionedLayout(slice)
    ? join(bundle, 'Versions', 'A')
    : bundle
  const resources = isVersionedLayout(slice)
    ? join(versioned, 'Resources')
    : versioned
  await Deno.mkdir(join(versioned, 'Headers'), { recursive: true })
  await Deno.mkdir(join(versioned, 'Modules'), { recursive: true })
  await Deno.mkdir(resources, { recursive: true })

  for (const header of headers) {
    const [folder, ...rest] = header.split('/')
    if (rest.length > 0) {
      await Deno.mkdir(join(versioned, 'Headers', folder!), { recursive: true })
    }
    let text = await Deno.readTextFile(join(source, 'include', header))
    for (const [from, to] of headerRewrites[header] ?? []) {
      if (text.split(from).length !== 2) {
        throw new Error(`${header}: expected exactly one \`${from}\``)
      }
      text = text.replace(from, to)
    }
    await Deno.writeTextFile(join(versioned, 'Headers', header), text)
  }
  await Deno.writeTextFile(
    join(versioned, 'Modules', 'module.modulemap'),
    moduleMap(),
  )
  await Deno.writeTextFile(join(resources, 'Info.plist'), infoPlist(slice))
  await Deno.copyFile(
    join(source, 'LICENCE-LGPL-2.1.txt'),
    join(resources, 'COPYING'),
  )

  const binary = join(versioned, frameworkName)
  await Deno.copyFile(dylib, binary)
  await Deno.chmod(binary, 0o755)

  if (!isVersionedLayout(slice)) return
  await Deno.symlink('A', join(bundle, 'Versions', 'Current'))
  for (const entry of ['Headers', 'Modules', 'Resources', frameworkName]) {
    await Deno.symlink(join('Versions', 'Current', entry), join(bundle, entry))
  }
}

// The platform a slice actually landed on is decided by LC_BUILD_VERSION, not
// by the SDK the compiler saw, and `xcodebuild -create-xcframework` reads that
// load command to place the slice.
export const platformCodes: Record<string, number> = {
  'macos-arm64': 1,
  'ios-arm64': 2,
  'ios-arm64-simulator': 7,
  'tvos-arm64': 3,
  'tvos-arm64-simulator': 8,
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

// Compiling one translation unit per module against the staged framework is
// what proves the module map and the headers it names are importable at all —
// a broken module otherwise surfaces as a Swift build failure days later, in
// the artifact consumer. `Raw` is explicit, so it takes its own import.
async function verifyModules(
  scratch: string,
  frameworkDir: string,
  slice: Slice,
): Promise<void> {
  const probe = join(scratch, `module-probe-${slice.id}.m`)
  await Deno.writeTextFile(
    probe,
    `@import ${moduleName};
@import ${moduleName}.Raw;
int main(void) { return 0; }
`,
  )
  const cache = join(scratch, `module-cache-${slice.id}`)
  await run([
    'clang',
    '-fsyntax-only',
    '-x',
    'objective-c',
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

interface Toolchain {
  xcodeVersion: string
  xcodeBuild: string
  clangVersion: string
  sdkVersions: Map<string, string>
}

async function toolchain(active: Slice[]): Promise<Toolchain> {
  const xcode = (await output(['xcodebuild', '-version'])).trim().split('\n')
  const sdkVersions = new Map<string, string>()
  for (const slice of active) {
    sdkVersions.set(
      slice.sdk,
      (await capture(['xcrun', '--sdk', slice.sdk, '--show-sdk-version']))
        .trim(),
    )
  }
  return {
    xcodeVersion: xcode[0]?.replace(/^Xcode /, '') ?? '',
    xcodeBuild: xcode[1]?.replace(/^Build version /, '') ?? '',
    clangVersion: (await output(['xcrun', 'clang', '--version']))
      .split('\n')[0]!.trim(),
    sdkVersions,
  }
}

const platformNames: Record<string, string> = {
  macos: 'macOS',
  ios: 'iOS',
  tvos: 'tvOS',
  xros: 'visionOS',
}

function provenance(tools: Toolchain, active: Slice[]): string {
  const sliceRows = active.map((slice) =>
    `| \`${slice.id}\` | \`${slice.sdk}\` | \`${triple(slice)}\` | ${
      platformNames[slice.llvmOS]
    } ${slice.minVersion} | ${tools.sdkVersions.get(slice.sdk)} |`
  ).join('\n')
  return `# libsmb2 ${upstreamVersion} for Arcroom (Apple arm64)

Built by \`tools/libsmb2/build.ts\` in github.com/xnzg/arcroom-upstreams.
Reproduce by running \`deno task libsmb2-build\` at the revision that pins this
artifact.

- Upstream source: ${upstreamURL}
- Upstream tag: ${upstreamTag}
- Upstream commit: ${upstreamCommit}
- Source sha256: ${upstreamSHA256}
- Release tag: ${releaseTag}
- License: LGPL v2.1 or later (see LICENCE-LGPL-2.1.txt, shipped as \`COPYING\`
  inside every slice of the framework).
- Upstream modifications: none to the compiled sources. The shipped headers are
  upstream's, with the three framework-internal cross-includes respelled
  relative so a framework module can resolve them without an include path (see
  Artifact); nothing else differs.
- Authentication: built-in NTLMSSP; Kerberos/GSSAPI is disabled.
- Clang module: ${moduleName} (upstream's own module map, with the \`LibSMB2\`,
  \`Internal\` and explicit \`Raw\` submodules).
- Install name: \`${installName}\`.
- Bundle identifier: ${bundleIdentifier}.
- Xcode: ${tools.xcodeVersion} (build ${tools.xcodeBuild}).
- Apple clang: ${tools.clangVersion}.

## Slices

Every xcframework carries one arm64 slice per row; there is no x86_64 anywhere.
The deployment floors are Arcroom's, from its \`package.yml\`.

| LibraryIdentifier | SDK | target triple | deployment target | SDK version |
| --- | --- | --- | --- | --- |
${sliceRows}

## Build

The unmodified source files listed by upstream's \`lib/CMakeLists.txt\` are
compiled for each slice with the Xcode clang and linked into one dynamic
library; the \`krb5-wrapper.c\` translation unit is omitted because
Kerberos/GSSAPI support is deliberately disabled. Two translation units,
\`compat.c\` and \`sha1.c\`, produce no symbols for this configuration and so
contribute no object; every slice is asserted to carry the same object set. No
source file is patched: \`include/apple/config.h\`, upstream's own Apple
configuration, supplies the configure results.

Compile flags, where \`<target>\` is the slice's triple and \`<sysroot>\` its SDK
path:

\`\`\`
-std=gnu11 -O2 -DNDEBUG -fPIC -target <target> -isysroot <sysroot> \\
  -D_FILE_OFFSET_BITS=64 -D_U_=__attribute__((unused)) -DHAVE_CONFIG_H=1 \\
  -I<source>/include -I<source>/include/apple \\
  -I<source>/include/smb2 -I<source>/lib
\`\`\`

Link command:

\`\`\`
clang -dynamiclib -target <target> -isysroot <sysroot> \\
  -Wl,-install_name,${installName} -o ${frameworkName} <objects...>
\`\`\`

## Artifact

\`${xcframeworkName}\` holds one \`${frameworkName}.framework\` per slice: the
dynamic library, the nine headers upstream's module map names under \`Headers/\`
in their \`apple/\` and \`smb2/\` subdirectories, the module map at
\`Modules/module.modulemap\`, an \`Info.plist\`, and the LGPL license as
\`COPYING\`. In the shipped header copies, three framework-internal cross-includes
are respelled from \`<smb2/x.h>\` to \`"x.h"\`: \`smb2/smb2.h\` includes
\`smb2-errors.h\`, \`smb2/libsmb2.h\` includes \`libsmb2-dcerpc-srvsvc.h\`, and
\`smb2/libsmb2-dcerpc-srvsvc.h\` includes \`libsmb2-dcerpc.h\`. A framework
module has no include path, and clang's fallback framework lookup matches the
include's prefix against the framework's name. The macOS slice carries the versioned bundle layout
(\`Versions/A\`); every other slice carries the flat one, which is what those
platforms accept. Every slice is ad hoc signed; the embedding application
re-signs it.

The combined archive carries this provenance and the license beside the
xcframework; SwiftPM requires the binary target's XCFramework alone at its
archive root, so the release also carries \`${swiftPMArtifactName}\` with the
same xcframework alone, and the exact pinned upstream source tarball as
\`${sourceArtifactName}\`.

The library is dynamic and relinkable: the application links and embeds
\`${frameworkName}.framework\` and loads it from its own \`Frameworks\`
directory, so replacing that bundle with a build of the corresponding source
satisfies LGPL v2.1 section 6.
`
}

async function packageArtifact(
  source: string,
  dylibs: Map<string, string>,
  active: Slice[],
  sourceTarball: string,
  scratch: string,
  outDir: string,
): Promise<string[]> {
  const stage = join(scratch, 'stage')
  await Deno.remove(stage, { recursive: true }).catch(() => {})
  await Deno.mkdir(stage, { recursive: true })

  const slicesDir = join(scratch, 'slices')
  await Deno.remove(slicesDir, { recursive: true }).catch(() => {})
  for (const slice of active) {
    const sliceStage = join(slicesDir, slice.id)
    await Deno.mkdir(sliceStage, { recursive: true })
    await stageFramework(source, sliceStage, slice, dylibs.get(slice.id)!)
    await assertPlatform(frameworkBinary(sliceStage, slice), slice)
    await verifyModules(scratch, sliceStage, slice)
  }

  const xcframework = join(stage, xcframeworkName)
  const args = ['xcodebuild', '-create-xcframework']
  for (const slice of active) {
    args.push(
      '-framework',
      join(slicesDir, slice.id, `${frameworkName}.framework`),
    )
  }
  args.push('-output', xcframework)
  await run(args)
  await Deno.remove(slicesDir, { recursive: true })

  // arm64 refuses to load an unsigned Mach-O; the app re-signs on embed, this
  // only has to be a valid signature.
  for (const slice of active) {
    await run([
      'codesign',
      '--force',
      '--sign',
      '-',
      '--timestamp=none',
      join(xcframework, slice.id, `${frameworkName}.framework`),
    ])
  }

  await Deno.copyFile(
    join(source, 'LICENCE-LGPL-2.1.txt'),
    join(stage, 'LICENCE-LGPL-2.1.txt'),
  )
  await Deno.writeTextFile(
    join(stage, 'PROVENANCE.md'),
    provenance(await toolchain(active), active),
  )

  const resolvedOut = resolve(outDir)
  await Deno.mkdir(resolvedOut, { recursive: true })
  for await (const entry of Deno.readDir(resolvedOut)) {
    if (
      entry.isFile &&
      (entry.name.startsWith('libsmb2-') ||
        entry.name.startsWith(`${moduleName}-`)) &&
      (entry.name.endsWith('.zip') || entry.name.endsWith('.tar.gz'))
    ) {
      await Deno.remove(join(resolvedOut, entry.name))
    }
  }
  const zip = join(resolvedOut, artifactName)
  await run([
    'zip',
    '--symlinks',
    '-r',
    '-X',
    '-q',
    zip,
    xcframeworkName,
    'LICENCE-LGPL-2.1.txt',
    'PROVENANCE.md',
  ], stage)
  const swiftPMZip = join(resolvedOut, swiftPMArtifactName)
  await run([
    'ditto',
    '-c',
    '-k',
    '--keepParent',
    join(stage, xcframeworkName),
    swiftPMZip,
  ])
  const sourceArchive = join(resolvedOut, sourceArtifactName)
  await Deno.copyFile(sourceTarball, sourceArchive)
  return [zip, swiftPMZip, sourceArchive]
}

// The slice's Mach-O, wherever that slice's bundle layout puts it.
function frameworkBinary(frameworkDir: string, slice: Slice): string {
  const bundle = join(frameworkDir, `${frameworkName}.framework`)
  return isVersionedLayout(slice)
    ? join(bundle, 'Versions', 'A', frameworkName)
    : join(bundle, frameworkName)
}

export async function main(argv: string[]): Promise<void> {
  const args = parseArgs(argv)
  await preflight()
  const active = args.only === null
    ? slices
    : slices.filter((slice) => args.only!.includes(slice.id))
  if (active.length === 0) throw new Error('no slice matched --only')
  const scratch = resolve(
    args.scratch ?? join(Deno.env.get('TMPDIR') ?? '/tmp', 'arcroom-libsmb2'),
  )
  await Deno.mkdir(scratch, { recursive: true })
  try {
    const source = await extractSource(scratch)
    const dylibs = new Map<string, string>()
    let expected: string | null = null
    for (const slice of active) {
      console.log(`\n=== ${slice.id} (${triple(slice)}) ===`)
      const built = await buildSlice(source.directory, scratch, slice)
      const objectNames = built.objectNames.join('\n')
      expected ??= objectNames
      if (objectNames !== expected) {
        throw new Error(
          `${slice.id} built a different object set:\n${objectNames}`,
        )
      }
      dylibs.set(slice.id, built.dylib)
    }
    const artifacts = await packageArtifact(
      source.directory,
      dylibs,
      active,
      source.tarball,
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
          `libsmb2-${upstreamTag}`,
          'stage',
          'slices',
          ...active.map((slice) => `${frameworkName}-${slice.id}.dylib`),
        ]
      ) {
        await Deno.remove(join(scratch, entry), { recursive: true }).catch(
          () => {},
        )
      }
      await Deno.remove(join(scratch, basename(upstreamURL))).catch(() => {})
    }
  }
}

if (import.meta.main) await main(Deno.args)
