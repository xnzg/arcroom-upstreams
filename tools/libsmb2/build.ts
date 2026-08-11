import { basename, join, resolve } from '../lib/path.ts'
import { output, run } from '../lib/proc.ts'

export const upstreamVersion = '6.2'
export const upstreamTag = `libsmb2-${upstreamVersion}`
export const upstreamCommit = 'd67e213a5c4e7e4969fd81f0b95e4ca5831fbba1'
export const upstreamURL =
  `https://github.com/sahlberg/libsmb2/archive/refs/tags/${upstreamTag}.tar.gz`
export const upstreamSHA256 =
  '8e1f9efc6b2e0f6546f0fe121ac0ddf4fc2f0908ae5a6bd1f185be7c9e0bcbb3'

export const artifactRevision = 1
export const artifactSuffix =
  `${upstreamVersion}-arcroom.${artifactRevision}-macos-arm64`
export const artifactName = `libsmb2-${artifactSuffix}.zip`
export const moduleName = 'CSMB2'
export const swiftPMArtifactName = `${moduleName}-${artifactSuffix}.zip`
export const sourceArtifactName = `libsmb2-${upstreamVersion}-source.tar.gz`
export const releaseTag =
  `libsmb2/${upstreamVersion}-arcroom.${artifactRevision}`
export const minimumMacOSVersion = '15.0'

const sources = [
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

export const expectedObjectNames = [
  'aes.o',
  'aes128ccm.o',
  'alloc.o',
  'asn1-ber.o',
  'dcerpc.o',
  'dcerpc-lsa.o',
  'dcerpc-srvsvc.o',
  'errors.o',
  'hmac.o',
  'hmac-md5.o',
  'init.o',
  'libsmb2.o',
  'md4c.o',
  'md5.o',
  'ntlmssp.o',
  'pdu.o',
  'sha224-256.o',
  'sha384-512.o',
  'smb2-cmd-close.o',
  'smb2-cmd-create.o',
  'smb2-cmd-echo.o',
  'smb2-cmd-error.o',
  'smb2-cmd-flush.o',
  'smb2-cmd-ioctl.o',
  'smb2-cmd-lock.o',
  'smb2-cmd-logoff.o',
  'smb2-cmd-negotiate.o',
  'smb2-cmd-notify-change.o',
  'smb2-cmd-oplock-break.o',
  'smb2-cmd-query-directory.o',
  'smb2-cmd-query-info.o',
  'smb2-cmd-read.o',
  'smb2-cmd-session-setup.o',
  'smb2-cmd-set-info.o',
  'smb2-cmd-tree-connect.o',
  'smb2-cmd-tree-disconnect.o',
  'smb2-cmd-write.o',
  'smb2-data-file-info.o',
  'smb2-data-filesystem-info.o',
  'smb2-data-security-descriptor.o',
  'smb2-data-reparse-point.o',
  'smb2-share-enum.o',
  'smb2-signing.o',
  'smb3-seal.o',
  'socket.o',
  'spnego-wrapper.o',
  'sync.o',
  'timestamps.o',
  'unicode.o',
  'usha.o',
]

export const publicHeaders = [
  'libsmb2-dcerpc-lsa.h',
  'libsmb2-dcerpc-srvsvc.h',
  'libsmb2-dcerpc.h',
  'libsmb2-raw.h',
  'libsmb2.h',
  'smb2-errors.h',
  'smb2.h',
]

const featureDefines = [
  'CONFIGURE_OPTION_TCP_LINGER=1',
  'HAVE_ARPA_INET_H=1',
  'HAVE_DLFCN_H=1',
  'HAVE_ERRNO_H=1',
  'HAVE_FCNTL_H=1',
  'HAVE_INTTYPES_H=1',
  'HAVE_LINGER=1',
  'HAVE_NETDB_H=1',
  'HAVE_NETINET_IN_H=1',
  'HAVE_NETINET_TCP_H=1',
  'HAVE_POLL_H=1',
  'HAVE_SOCKADDR_LEN=1',
  'HAVE_SOCKADDR_STORAGE=1',
  'HAVE_STDINT_H=1',
  'HAVE_STDIO_H=1',
  'HAVE_STDLIB_H=1',
  'HAVE_STRINGS_H=1',
  'HAVE_STRING_H=1',
  'HAVE_SYS_ERRNO_H=1',
  'HAVE_SYS_FCNTL_H=1',
  'HAVE_SYS_IOCTL_H=1',
  'HAVE_SYS_POLL_H=1',
  'HAVE_SYS_SOCKET_H=1',
  'HAVE_SYS_STAT_H=1',
  'HAVE_SYS_TIME_H=1',
  'HAVE_SYS_TYPES_H=1',
  'HAVE_SYS_UIO_H=1',
  'HAVE_SYS_UNISTD_H=1',
  'HAVE_TIME_H=1',
  'HAVE_UNISTD_H=1',
  'STDC_HEADERS=1',
]

interface Args {
  scratch: string | null
  out: string
  keep: boolean
}

function parseArgs(argv: string[]): Args {
  const args: Args = { scratch: null, out: 'dist-libsmb2', keep: false }
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
  for (const tool of ['tar', 'xcrun', 'xcodebuild', 'zip']) {
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

function compileFlags(source: string, sdk: string): string[] {
  return [
    '-std=gnu11',
    '-O2',
    '-DNDEBUG',
    '-fPIC',
    '-arch',
    'arm64',
    `-mmacosx-version-min=${minimumMacOSVersion}`,
    '-isysroot',
    sdk,
    '-D_FILE_OFFSET_BITS=64',
    '-D_U_=__attribute__((unused))',
    ...featureDefines.map((define) => `-D${define}`),
    `-I${join(source, 'include')}`,
    `-I${join(source, 'include', 'smb2')}`,
    `-I${join(source, 'lib')}`,
  ]
}

async function buildArchive(source: string, scratch: string): Promise<string> {
  const sdk = (await output(['xcrun', '--sdk', 'macosx', '--show-sdk-path']))
    .trim()
  const objects = join(scratch, 'objects')
  await Deno.remove(objects, { recursive: true }).catch(() => {})
  await Deno.mkdir(objects, { recursive: true })
  const flags = compileFlags(source, sdk)
  const objectPaths: string[] = []
  for (const name of sources) {
    const object = join(objects, `${name.slice(0, -2)}.o`)
    await run([
      'xcrun',
      '--sdk',
      'macosx',
      'clang',
      ...flags,
      '-c',
      join(source, 'lib', name),
      '-o',
      object,
    ])
    const symbols = await output([
      'xcrun',
      '--sdk',
      'macosx',
      'nm',
      '-g',
      object,
    ])
    if (symbols.trim() === '') {
      console.log(`note: ${name} is empty for this configuration`)
    } else {
      objectPaths.push(object)
    }
  }
  const objectNames = objectPaths.map(basename).sort()
  if (objectNames.join('\n') !== expectedObjectNames.toSorted().join('\n')) {
    throw new Error(
      `unexpected nonempty objects:\n${objectNames.join('\n')}`,
    )
  }
  const archive = join(scratch, 'libsmb2.a')
  await Deno.remove(archive).catch(() => {})
  await run(['xcrun', '--sdk', 'macosx', 'ar', 'rcs', archive, ...objectPaths])
  return archive
}

function umbrellaHeader(): string {
  return `#include <stdint.h>
#include <stddef.h>
#include <time.h>
#include <smb2/smb2.h>
#include <smb2/libsmb2.h>
`
}

function moduleMap(): string {
  return `module ${moduleName} [system] {
  header "libsmb2.h"
  export *
}
`
}

async function stageHeaders(source: string, scratch: string): Promise<string> {
  const headers = join(scratch, 'headers')
  await Deno.remove(headers, { recursive: true }).catch(() => {})
  await Deno.mkdir(join(headers, 'smb2'), { recursive: true })
  for (const header of publicHeaders) {
    await Deno.copyFile(
      join(source, 'include', 'smb2', header),
      join(headers, 'smb2', header),
    )
  }
  await Deno.writeTextFile(join(headers, 'libsmb2.h'), umbrellaHeader())
  await Deno.writeTextFile(join(headers, 'module.modulemap'), moduleMap())
  return headers
}

interface Toolchain {
  xcodeVersion: string
  xcodeBuild: string
  clangVersion: string
  sdkVersion: string
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
  }
}

function provenance(toolchain: Toolchain): string {
  return `# libsmb2 ${upstreamVersion} for Arcroom (macOS arm64)

Built by \`tools/libsmb2/build.ts\` in github.com/xnzg/arcroom-upstreams.
Reproduce by running \`deno task libsmb2-build\` at the revision that pins this
artifact.

- Upstream source: ${upstreamURL}
- Upstream tag: ${upstreamTag}
- Upstream commit: ${upstreamCommit}
- Source sha256: ${upstreamSHA256}
- Release tag: ${releaseTag}
- License: LGPL v2.1 or later (see LICENCE-LGPL-2.1.txt).
- Upstream modifications: none.
- Authentication: built-in NTLMSSP; Kerberos/GSSAPI is disabled.
- Deployment target: macOS ${minimumMacOSVersion}, arm64.
- Clang module: ${moduleName}.
- Xcode: ${toolchain.xcodeVersion} (build ${toolchain.xcodeBuild}).
- Apple clang: ${toolchain.clangVersion}.
- macOS SDK: ${toolchain.sdkVersion}.

## Build

The unmodified source files listed by upstream's \`lib/CMakeLists.txt\` are
compiled directly with the Xcode clang and archived with the Xcode ar. Two
translation units, \`compat.c\` and \`sha1.c\`, that produce no symbols for this
configuration are not placed in the archive. The \`krb5-wrapper.c\` translation
unit is omitted because
Kerberos/GSSAPI support is deliberately disabled. Feature defines describe the
macOS SDK headers and socket structures; no source file is patched.

Compile flags:

\`\`\`
-std=gnu11 -O2 -DNDEBUG -fPIC -arch arm64 \\
  -mmacosx-version-min=${minimumMacOSVersion} -isysroot <macosx-sdk> \\
  -D_FILE_OFFSET_BITS=64 -D_U_=__attribute__((unused)) \\
  ${featureDefines.map((define) => `-D${define}`).join(' \\\n  ')}
\`\`\`

## Artifact

\`libsmb2.xcframework\` contains one static \`libsmb2.a\` slice with the seven
unmodified upstream public headers and a generated \`${moduleName}\` module
map. The platform set deliberately matches the ffmpeg artifact present in this
repository at this revision: macOS arm64 only. The older README plan to cover
all Apple platforms is not the platform set that ffmpeg currently ships.
The combined archive carries this provenance and the license; SwiftPM requires
the binary target's XCFramework alone at its archive root. The release therefore
also carries the exact pinned upstream source tarball as
\`${sourceArtifactName}\`; its sha256 is the source sha256 above and its root
contains the upstream LGPL license.

Because this is a static LGPL library, an application distributor must satisfy
LGPL v2.1 section 6, including providing the application object files or an
equivalent relinking mechanism plus the corresponding libsmb2 source offer.
This archive alone does not discharge the consuming application's obligations.
`
}

async function packageArtifact(
  source: string,
  archive: string,
  headers: string,
  sourceTarball: string,
  toolchain: Toolchain,
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
    join(stage, 'libsmb2.xcframework'),
  ])
  await Deno.copyFile(
    join(source, 'LICENCE-LGPL-2.1.txt'),
    join(stage, 'LICENCE-LGPL-2.1.txt'),
  )
  await Deno.writeTextFile(
    join(stage, 'PROVENANCE.md'),
    provenance(toolchain),
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
    '-r',
    '-X',
    '-q',
    zip,
    'libsmb2.xcframework',
    'LICENCE-LGPL-2.1.txt',
    'PROVENANCE.md',
  ], stage)
  const swiftPMZip = join(resolvedOut, swiftPMArtifactName)
  await run([
    'ditto',
    '-c',
    '-k',
    '--keepParent',
    join(stage, 'libsmb2.xcframework'),
    swiftPMZip,
  ])
  const sourceArchive = join(resolvedOut, sourceArtifactName)
  await Deno.copyFile(sourceTarball, sourceArchive)
  return [zip, swiftPMZip, sourceArchive]
}

export async function main(argv: string[]): Promise<void> {
  const args = parseArgs(argv)
  await preflight()
  const scratch = resolve(
    args.scratch ?? join(Deno.env.get('TMPDIR') ?? '/tmp', 'arcroom-libsmb2'),
  )
  await Deno.mkdir(scratch, { recursive: true })
  try {
    const source = await extractSource(scratch)
    const archive = await buildArchive(source.directory, scratch)
    const headers = await stageHeaders(source.directory, scratch)
    const artifacts = await packageArtifact(
      source.directory,
      archive,
      headers,
      source.tarball,
      await toolchain(),
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
          'objects',
          'libsmb2.a',
          'headers',
          'stage',
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
