import { basename, join, resolve } from '../lib/path.ts'
import { capture, run } from '../lib/proc.ts'
import {
  artifactName,
  minimumMacOSVersion,
  moduleName,
  publicHeaders,
  sha256,
  swiftPMArtifactName,
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

async function verifyModule(scratch: string, headers: string): Promise<void> {
  const probe = join(scratch, 'module-probe.m')
  await Deno.writeTextFile(
    probe,
    `@import ${moduleName};\nint main(void) { return 0; }\n`,
  )
  const compiled = await new Deno.Command('xcrun', {
    args: [
      '--sdk',
      'macosx',
      'clang',
      '-fsyntax-only',
      '-fmodules',
      `-fmodules-cache-path=${join(scratch, 'module-cache')}`,
      `-fmodule-map-file=${join(headers, 'module.modulemap')}`,
      `-I${headers}`,
      probe,
    ],
    stdout: 'inherit',
    stderr: 'inherit',
  }).output()
  check(compiled.success, `${moduleName}: module imports from published layout`)
}

async function verifyLink(
  scratch: string,
  headers: string,
  archive: string,
): Promise<void> {
  const probe = join(scratch, 'link-probe.c')
  const executable = join(scratch, 'link-probe')
  await Deno.writeTextFile(
    probe,
    `#include <libsmb2.h>
int main(void) {
  struct smb2_context *context = smb2_init_context();
  if (context == 0) return 1;
  smb2_destroy_context(context);
  return 0;
}
`,
  )
  const sdk = (await capture(['xcrun', '--sdk', 'macosx', '--show-sdk-path']))
    .trim()
  const linked = await new Deno.Command('xcrun', {
    args: [
      '--sdk',
      'macosx',
      'clang',
      '-arch',
      'arm64',
      `-mmacosx-version-min=${minimumMacOSVersion}`,
      '-isysroot',
      sdk,
      `-I${headers}`,
      probe,
      archive,
      '-o',
      executable,
    ],
    stdout: 'inherit',
    stderr: 'inherit',
  }).output()
  check(linked.success, 'static archive links with only Apple system libraries')
}

async function main(argv: string[]): Promise<void> {
  const dist = resolve(argv[0] ?? 'dist-libsmb2')
  const scratch = await Deno.makeTempDir({ prefix: 'arcroom-smb2-verify-' })
  try {
    const zip = join(dist, artifactName)
    check(await exists(zip), `${basename(zip)} present`)
    const expanded = join(scratch, 'expanded')
    await Deno.mkdir(expanded, { recursive: true })
    await run(['ditto', '-x', '-k', zip, expanded])
    check(
      (await entryNames(expanded)).join(' ') ===
        [
          'LICENCE-LGPL-2.1.txt',
          'PROVENANCE.md',
          'libsmb2.xcframework',
        ].sort().join(' '),
      'zip root holds the xcframework, LGPL license, and provenance',
    )

    const xcframework = join(expanded, 'libsmb2.xcframework')
    const plist = join(xcframework, 'Info.plist')
    check(await exists(plist), 'xcframework Info.plist')
    check(
      await plistValue(plist, 'AvailableLibraries.0.LibraryIdentifier') ===
        'macos-arm64',
      'LibraryIdentifier macos-arm64',
    )
    check(
      await plistValue(
        plist,
        'AvailableLibraries.0.SupportedArchitectures.0',
      ) === 'arm64',
      'SupportedArchitectures arm64',
    )
    check(
      await plistValue(plist, 'AvailableLibraries.0.SupportedPlatform') ===
        'macos',
      'SupportedPlatform macos',
    )
    check(
      await plistValue(plist, 'AvailableLibraries.0.LibraryPath') ===
        'libsmb2.a',
      'LibraryPath libsmb2.a',
    )
    check(
      await plistValue(plist, 'AvailableLibraries.0.HeadersPath') ===
        'Headers',
      'HeadersPath Headers',
    )

    const slice = join(xcframework, 'macos-arm64')
    const archive = join(slice, 'libsmb2.a')
    const headers = join(slice, 'Headers')
    check(await exists(archive), 'static libsmb2.a')
    check(
      (await capture(['lipo', '-archs', archive])).trim() === 'arm64',
      'archive contains exactly arm64',
    )
    const members = (await capture(['ar', '-t', archive])).trim().split('\n')
    check(
      members.length === 51,
      'archive contains the 51 nonempty upstream objects',
    )
    for (const header of publicHeaders) {
      check(await exists(join(headers, 'smb2', header)), `public ${header}`)
    }
    check(await exists(join(headers, 'libsmb2.h')), 'umbrella libsmb2.h')
    check(await exists(join(headers, 'module.modulemap')), 'module.modulemap')

    const symbols = await capture(['nm', '-gU', archive])
    for (
      const symbol of [
        '_smb2_init_context',
        '_smb2_destroy_context',
        '_smb2_connect_share_async',
        '_smb2_service',
      ]
    ) {
      check(symbols.includes(symbol), `exports ${symbol.slice(1)}`)
    }
    const undefinedSymbols = await capture(['nm', '-u', archive])
    check(
      !undefinedSymbols.includes('_gss_') &&
        !undefinedSymbols.includes('_krb5_'),
      'Kerberos/GSSAPI symbols absent',
    )

    await verifyModule(scratch, headers)
    await verifyLink(scratch, headers, archive)

    const swiftPMZip = join(dist, swiftPMArtifactName)
    check(await exists(swiftPMZip), `${basename(swiftPMZip)} present`)
    const swiftPM = join(scratch, 'swiftpm')
    await Deno.mkdir(swiftPM, { recursive: true })
    await run(['ditto', '-x', '-k', swiftPMZip, swiftPM])
    check(
      (await entryNames(swiftPM)).join(' ') === 'libsmb2.xcframework',
      'SwiftPM zip holds libsmb2.xcframework at its root',
    )
    const same = await new Deno.Command('diff', {
      args: [
        '-r',
        join(swiftPM, 'libsmb2.xcframework'),
        xcframework,
      ],
      stdout: 'inherit',
      stderr: 'inherit',
    }).output()
    check(same.success, 'SwiftPM XCFramework matches the combined zip')

    console.log(`\n${await sha256(zip)}  ${basename(zip)}`)
    console.log(`${await sha256(swiftPMZip)}  ${basename(swiftPMZip)}`)
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
