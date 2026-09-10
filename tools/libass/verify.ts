import { basename, join, resolve } from '../lib/path.ts'
import { capture, run } from '../lib/proc.ts'
import {
  artifactName,
  linkedLibraries,
  minimumMacOSVersion,
  moduleName,
  publicHeaders,
  sha256,
  sourceArtifactName,
  swiftPMArtifactName,
  upstreams,
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

// The probe renders one positioned, coloured line through the CoreText
// provider, so it proves shaping, rasterising and font selection rather than
// just symbol resolution.
async function verifyLink(
  scratch: string,
  headers: string,
  archive: string,
): Promise<void> {
  const probe = join(scratch, 'link-probe.c')
  const executable = join(scratch, 'link-probe')
  await Deno.writeTextFile(
    probe,
    `#include <libass.h>
#include <stdio.h>
#include <string.h>
static const char script[] =
  "[Script Info]\\nScriptType: v4.00+\\nPlayResX: 640\\nPlayResY: 360\\n"
  "[V4+ Styles]\\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\\n"
  "Style: Default,Arial,40,&H0000FFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,2,0,2,10,10,10,1\\n"
  "[Events]\\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\\n"
  "Dialogue: 0,0:00:00.00,0:00:05.00,Default,,0,0,0,,{\\\\pos(320,180)}Hello libass\\n";
int main(void) {
  ASS_Library *library = ass_library_init();
  ASS_Renderer *renderer = ass_renderer_init(library);
  ass_set_frame_size(renderer, 640, 360);
  ass_set_fonts(renderer, NULL, "sans-serif", ASS_FONTPROVIDER_AUTODETECT, NULL, 1);
  ASS_Track *track = ass_read_memory(library, (char *)script, strlen(script), NULL);
  int change = 0;
  ASS_Image *image = ass_render_frame(renderer, track, 1000, &change);
  int count = 0;
  for (ASS_Image *cursor = image; cursor; cursor = cursor->next) count++;
  printf("images=%d\\n", count);
  ass_free_track(track);
  ass_renderer_done(renderer);
  ass_library_done(library);
  return count > 0 ? 0 : 1;
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
      '-lc++',
      '-liconv',
      '-framework',
      'CoreText',
      '-framework',
      'CoreGraphics',
      '-framework',
      'CoreFoundation',
      '-o',
      executable,
    ],
    stdout: 'inherit',
    stderr: 'inherit',
  }).output()
  check(linked.success, 'force-loaded static archive links successfully')
  if (!linked.success) return

  const rendered = await new Deno.Command(executable, {
    stdout: 'inherit',
    stderr: 'inherit',
  }).output()
  check(rendered.success, 'probe renders a styled line through CoreText fonts')

  const actualLibraries = (await capture(['otool', '-L', executable]))
    .split('\n')
    .slice(1)
    .map((line) => line.trim().split(/\s+/)[0] ?? '')
    .filter((path) => path !== '')
    .sort()
  check(
    sameStrings(actualLibraries, linkedLibraries.toSorted()),
    'force-loaded archive links exactly the allowed Apple system libraries',
  )
  if (!sameStrings(actualLibraries, linkedLibraries.toSorted())) {
    printSetDifference(actualLibraries, linkedLibraries.toSorted())
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
  const members = (await entryNames(objects)).filter((name) =>
    name.endsWith('.o')
  )
  for (const object of members) {
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
    members.length > 0 && invalid.length === 0,
    `all ${members.length} objects target macOS ${minimumMacOSVersion}`,
  )
  for (const object of invalid) console.error(`  invalid target: ${object}`)
}

async function main(argv: string[]): Promise<void> {
  const dist = resolve(argv[0] ?? 'dist-libass')
  const scratch = await Deno.makeTempDir({ prefix: 'arcroom-libass-verify-' })
  try {
    const expectedArtifacts = [
      artifactName,
      swiftPMArtifactName,
      ...upstreams.map(sourceArtifactName),
    ].sort()
    const releaseArtifacts = (await entryNames(dist)).filter((name) =>
      name.endsWith('.zip') || name.includes('-source.tar.')
    )
    check(
      sameStrings(releaseArtifacts, expectedArtifacts),
      'dist contains exactly the named release artifacts',
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
          'PROVENANCE.md',
          'libass.xcframework',
          ...upstreams.map((upstream) => `LICENSE-${upstream.name}.txt`),
        ].sort().join(' '),
      'zip root holds the xcframework, every upstream license, and provenance',
    )

    const xcframework = join(expanded, 'libass.xcframework')
    const plist = join(xcframework, 'Info.plist')
    check(await exists(plist), 'xcframework Info.plist')
    check(
      await plistValue(plist, 'AvailableLibraries.0.LibraryIdentifier') ===
        'macos-arm64',
      'LibraryIdentifier macos-arm64',
    )
    check(
      await plistValue(plist, 'AvailableLibraries.0.SupportedPlatform') ===
        'macos',
      'SupportedPlatform macos',
    )
    check(
      await plistValue(plist, 'AvailableLibraries.0.LibraryPath') ===
        'libass.a',
      'LibraryPath libass.a',
    )

    const slice = join(xcframework, 'macos-arm64')
    const archive = join(slice, 'libass.a')
    const headers = join(slice, 'Headers')
    check(await exists(archive), 'static libass.a')
    check(
      (await capture(['lipo', '-archs', archive])).trim() === 'arm64',
      'archive contains exactly arm64',
    )
    for (const header of publicHeaders) {
      check(await exists(join(headers, 'ass', header)), `public ass/${header}`)
    }
    check(await exists(join(headers, 'libass.h')), 'umbrella libass.h')
    check(await exists(join(headers, 'module.modulemap')), 'module.modulemap')

    const symbols = await capture(['nm', '-gU', archive])
    for (
      const symbol of [
        '_ass_library_init',
        '_ass_renderer_init',
        '_ass_new_track',
        '_ass_process_codec_private',
        '_ass_process_chunk',
        '_ass_flush_events',
        '_ass_add_font',
        '_ass_render_frame',
        '_ass_set_fonts',
        '_ass_coretext_add_provider',
        '_hb_shape',
        '_FT_Init_FreeType',
        '_fribidi_get_bidi_types',
        '_set_linebreaks_utf32',
      ]
    ) {
      check(symbols.includes(symbol), `exports ${symbol.slice(1)}`)
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
      (await entryNames(swiftPM)).join(' ') === 'libass.xcframework',
      'SwiftPM zip holds libass.xcframework at its root',
    )
    const same = await new Deno.Command('diff', {
      args: ['-r', join(swiftPM, 'libass.xcframework'), xcframework],
      stdout: 'inherit',
      stderr: 'inherit',
    }).output()
    check(same.success, 'SwiftPM XCFramework matches the combined zip')

    for (const upstream of upstreams) {
      const source = join(dist, sourceArtifactName(upstream))
      check(await exists(source), `${basename(source)} present`)
      check(
        await sha256(source) === upstream.sha256,
        `${upstream.name} source asset is byte-identical to the pinned upstream tarball`,
      )
    }

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
