# arcroom-upstreams

[![ffmpeg](https://github.com/xnzg/arcroom-upstreams/actions/workflows/ffmpeg.yml/badge.svg)](https://github.com/xnzg/arcroom-upstreams/actions/workflows/ffmpeg.yml)

Prebuilt, relinkable dynamic xcframeworks of LGPL-2.1 C libraries consumed by
the [Arcroom](https://github.com/wuhu-labs/wuhu) app, and the build scripts that
produce them. Each release ships the libraries as separate dynamic frameworks
precisely so that a user can relink the application against their own build of
the same libraries, as LGPL-2.1 section 6 requires.

## Current resident: ffmpeg 8.1.2

Release tag `ffmpeg/8.1.2-arcroom.1` carries three frameworks — `libavutil`,
`libswresample`, `libavcodec` — for macOS arm64, built with an audio-only codec
allowlist. No libavformat, no libavfilter, no command-line tools, and no GPL,
version-3, or nonfree components: configured with `--disable-gpl`,
`--disable-version3`, `--disable-nonfree`.

Assets per release:

- `ffmpeg-<version>-macos-arm64.zip` — the combined artifact: all three
  xcframeworks plus `COPYING.LGPLv2.1` and `PROVENANCE.md`. This is what the
  monorepo's Bazel build fetches.
- `lib<name>-<version>-macos-arm64.zip` — one zip per xcframework, laid out for
  SwiftPM `binaryTarget` consumption (the `.xcframework` sits at the zip root).

Every framework's install name is a flat `@rpath/<name>`, and each links its
siblings by the same flat name, so a Bazel `_solib_*` directory and an app
bundle's `Frameworks` directory both resolve them.

## Corresponding source

- Upstream source: <https://ffmpeg.org/releases/ffmpeg-8.1.2.tar.xz>
- Source sha256:
  `464beb5e7bf0c311e68b45ae2f04e9cc2af88851abb4082231742a74d97b524c`
- Build script: [`tools/ffmpeg/build.ts`](tools/ffmpeg/build.ts) in this repo.
  The script is the provenance record: it pins the tarball by sha256, holds the
  exact configure line and codec allowlist, and writes the `PROVENANCE.md` that
  rides in every artifact. A copy of that provenance — including the full
  configure flags — is checked in here as [PROVENANCE.md](PROVENANCE.md),
  byte-for-byte as it ships inside `ffmpeg/8.1.2-arcroom.1`; it credits the
  wuhu-app monorepo because that was the script's home when that release was
  cut.

No ffmpeg sources are modified; the binaries are a straight build of the
unmodified upstream tarball with the configuration recorded above.

## Reproducing the build

Requirements: Apple silicon, macOS 15 or later, the Xcode command line tools,
and [Deno](https://deno.com). Nothing else — this repo has no third-party
dependencies.

```sh
deno task ffmpeg-build                 # writes dist-ffmpeg/*.zip, prints sha256s
deno task ffmpeg-verify dist-ffmpeg    # expands the zips and asserts the layout
```

`ffmpeg-build` accepts `--out <dir>` for the output directory, `--scratch <dir>`
for the build tree (defaults under `$TMPDIR`; the source and object files exceed
a gigabyte), and `--keep` to leave that tree in place between runs. Under the
hood the two tasks are `deno run tools/ffmpeg/{build,verify}.ts` with an explicit
permission set; run them directly if you would rather grant your own.

`ffmpeg-verify` is the artifact gate. It expands the four zips exactly as a
consumer does and asserts the xcframework structure, `Info.plist` contents,
`@rpath` install names, that nothing links outside `/usr/lib` and
`/System/Library`, that the code signatures are valid, that every module still
imports under `clang -fmodules`, and that each per-framework zip matches the
combined one.

The build is not bit-for-bit reproducible: timestamps and ad-hoc code signatures
differ per run, so a rebuild will not reproduce a published sha256. What it
reproduces is the corresponding source and the configuration.

## CI

[`.github/workflows/ffmpeg.yml`](.github/workflows/ffmpeg.yml) runs the same two
tasks on a GitHub-hosted macOS arm64 runner on every push to `main`, on pull
requests, and on demand. It uploads the four zips and their `SHA256SUMS` as a
workflow artifact. It does not publish releases: those stay manual, so that a
pinned asset is never overwritten under a consumer that has already recorded its
checksum.

## Publishing a release

1. Bump `artifactRevision` (or `upstreamVersion` plus its sha256) in
   `tools/ffmpeg/build.ts`.
2. Run `deno task ffmpeg-build` and `deno task ffmpeg-verify dist-ffmpeg`.
3. `gh release create ffmpeg/<version>-arcroom.<n> dist-ffmpeg/*.zip`, with the
   printed sha256 table in the release notes.
4. Copy the generated `PROVENANCE.md` out of the combined zip to the repo root.

Never replace an asset on an existing release: consumers pin by checksum.

## Planned

- libsmb2 (all Apple platforms)

## License

The prebuilt libraries are LGPL v2.1 or later; see [LICENSE](LICENSE). ffmpeg
is a trademark of Fabrice Bellard, originator of the FFmpeg project.

The build scripts under `tools/` are original to this repository and are
released under the same terms.
