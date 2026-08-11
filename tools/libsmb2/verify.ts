import { basename, join, resolve } from '../lib/path.ts'
import { capture, run } from '../lib/proc.ts'
import {
  artifactName,
  expectedObjectNames,
  minimumMacOSVersion,
  moduleName,
  publicHeaders,
  sha256,
  sourceArtifactName,
  swiftPMArtifactName,
  upstreamSHA256,
  upstreamTag,
} from './build.ts'

const failures: string[] = []

const allowedUndefinedSymbols = [
  '__DefaultRuneLocale',
  '___chkstk_darwin',
  '___darwin_check_fd_set_overflow',
  '___error',
  '___maskrune',
  '___memcpy_chk',
  '___memmove_chk',
  '___stack_chk_fail',
  '___stack_chk_guard',
  '___toupper',
  '_accept',
  '_asprintf',
  '_bind',
  '_bzero',
  '_calloc',
  '_close',
  '_connect',
  '_fclose',
  '_fcntl',
  '_feof',
  '_fgets',
  '_fopen',
  '_free',
  '_freeaddrinfo',
  '_getaddrinfo',
  '_getenv',
  '_gethostname',
  '_getlogin_r',
  '_getpid',
  '_getprotobyname',
  '_getsockopt',
  '_listen',
  '_malloc',
  '_memcmp',
  '_memcpy',
  '_memmove',
  '_memset',
  '_poll',
  '_printf',
  '_putchar',
  '_puts',
  '_random',
  '_readv',
  '_select',
  '_setsockopt',
  '_snprintf',
  '_socket',
  '_sprintf',
  '_srandom',
  '_strcat',
  '_strchr',
  '_strcmp',
  '_strcpy',
  '_strdup',
  '_strerror',
  '_strlen',
  '_strncmp',
  '_strncpy',
  '_strtol',
  '_time',
  '_vsnprintf',
  '_writev',
]

const allowedLinkedLibraries = ['/usr/lib/libSystem.B.dylib']

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

function nmSymbols(output: string): string[] {
  return output.split('\n').map((line) => line.trim().split(/\s+/).at(-1) ?? '')
    .filter((symbol) => symbol.startsWith('_'))
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
      `-Wl,-force_load,${archive}`,
      '-o',
      executable,
    ],
    stdout: 'inherit',
    stderr: 'inherit',
  }).output()
  check(linked.success, 'force-loaded static archive links successfully')
  if (!linked.success) return

  const linkedLibraries = (await capture(['otool', '-L', executable]))
    .split('\n')
    .slice(1)
    .map((line) => line.trim().split(/\s+/)[0] ?? '')
    .filter((path) => path !== '')
    .sort()
  check(
    sameStrings(linkedLibraries, allowedLinkedLibraries),
    'force-loaded archive links exactly the allowed Apple system libraries',
  )
  if (!sameStrings(linkedLibraries, allowedLinkedLibraries)) {
    printSetDifference(linkedLibraries, allowedLinkedLibraries)
  }
}

async function verifyDeploymentTargets(
  scratch: string,
  archive: string,
): Promise<void> {
  const objects = join(scratch, 'archive-objects')
  await Deno.mkdir(objects, { recursive: true })
  await run(['ar', '-x', archive], objects)
  const invalid: string[] = []
  for (const object of expectedObjectNames) {
    const build = await capture([
      'xcrun',
      'vtool',
      '-show-build',
      join(objects, object),
    ])
    if (
      !build.includes('platform MACOS') ||
      !build.includes(`minos ${minimumMacOSVersion}`)
    ) {
      invalid.push(object)
    }
  }
  check(
    invalid.length === 0,
    `all ${expectedObjectNames.length} objects target macOS ${minimumMacOSVersion}`,
  )
  for (const object of invalid) console.error(`  invalid target: ${object}`)
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
      .filter((member) => !member.startsWith('__.SYMDEF'))
    check(
      sameStrings(members, expectedObjectNames),
      `archive contains exactly the ${expectedObjectNames.length} expected objects`,
    )
    if (!sameStrings(members, expectedObjectNames)) {
      printSetDifference(members, expectedObjectNames)
    }
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
    const definedSymbols = new Set(nmSymbols(symbols))
    const undefinedSymbols = nmSymbols(await capture(['nm', '-u', archive]))
      .filter((symbol) => !definedSymbols.has(symbol))
      .filter((symbol, index, all) => all.indexOf(symbol) === index)
      .sort()
    const expectedUndefinedSymbols = allowedUndefinedSymbols.toSorted()
    check(
      sameStrings(undefinedSymbols, expectedUndefinedSymbols),
      'archive has exactly the allowed Apple system undefined symbols',
    )
    if (!sameStrings(undefinedSymbols, expectedUndefinedSymbols)) {
      printSetDifference(undefinedSymbols, expectedUndefinedSymbols)
    }

    await verifyDeploymentTargets(scratch, archive)
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

    const source = join(dist, sourceArtifactName)
    check(await exists(source), `${basename(source)} present`)
    check(
      await sha256(source) === upstreamSHA256,
      'source asset is byte-identical to the pinned upstream tarball',
    )
    const sourceMembers = await capture(['tar', '-tzf', source])
    check(
      sourceMembers.split('\n').includes(
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
