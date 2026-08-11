# arcroom-upstreams

[![ffmpeg](https://github.com/xnzg/arcroom-upstreams/actions/workflows/ffmpeg.yml/badge.svg)](https://github.com/xnzg/arcroom-upstreams/actions/workflows/ffmpeg.yml)
[![libsmb2](https://github.com/xnzg/arcroom-upstreams/actions/workflows/libsmb2.yml/badge.svg)](https://github.com/xnzg/arcroom-upstreams/actions/workflows/libsmb2.yml)

Pinned Apple-platform builds of LGPL-2.1 C libraries consumed by the
[Arcroom](https://github.com/wuhu-labs/wuhu) app, and the scripts that produce
them. ffmpeg ships as relinkable dynamic frameworks. libsmb2 is a static
XCFramework; an application distributing it must provide its relinkable object
files or an equivalent mechanism in addition to the corresponding source and
license required by LGPL-2.1 section 6.

## Current residents

### libsmb2 6.2

Release tag `libsmb2/6.2-arcroom.1` carries an unmodified, unforked static build
of upstream tag `libsmb2-6.2` for macOS arm64. `libsmb2.xcframework` exposes the
high-level public API as Clang module `CSMB2`; built-in NTLMSSP is enabled and
Kerberos/GSSAPI is disabled.

The release has three assets:

- `libsmb2-6.2-arcroom.1-macos-arm64.zip` — the XCFramework, upstream
  `LICENCE-LGPL-2.1.txt`, and generated `PROVENANCE.md`, for a Bazel
  `apple_static_xcframework_import`.
- `CSMB2-6.2-arcroom.1-macos-arm64.zip` — the same XCFramework alone at the
  archive root, in the shape required by a SwiftPM `binaryTarget`.
- `libsmb2-6.2-source.tar.gz` — the exact pinned upstream source tarball,
  including `LICENCE-LGPL-2.1.txt`; its sha256 is
  `8e1f9efc6b2e0f6546f0fe121ac0ddf4fc2f0908ae5a6bd1f185be7c9e0bcbb3`.

SwiftPM binary targets cannot carry the license and provenance beside the
XCFramework at the archive root, so the release's combined archive supplies
those notices and the source asset supplies the durable corresponding source.
An application distributor must still carry the required notice and provide
its object files or an equivalent relinking mechanism; these assets do not by
themselves discharge that distributor's LGPL obligations.

This one-slice platform set deliberately matches the ffmpeg artifact below.
The earlier plan said libsmb2 would cover all Apple platforms, but ffmpeg does
not yet do so; additional slices belong in a later coordinated artifact
revision.

Corresponding source and the complete build configuration are recorded in
[`PROVENANCE-libsmb2.md`](PROVENANCE-libsmb2.md). The source tag resolves to
commit `d67e213a5c4e7e4969fd81f0b95e4ca5831fbba1`; no source is modified.

### ffmpeg 8.1.2

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

Requirements: Apple silicon, macOS 15 or later, full Xcode (not only the
standalone command line tools), and [Deno](https://deno.com). Creating an
XCFramework requires `xcodebuild`, which the standalone tools do not provide.
This repo has no third-party dependencies.

```sh
deno task ffmpeg-build                 # writes dist-ffmpeg/*.zip, prints sha256s
deno task ffmpeg-verify dist-ffmpeg    # expands the zips and asserts the layout
deno task libsmb2-build                # writes two zips and the source tarball
deno task libsmb2-verify dist-libsmb2  # verifies archive, module, and link
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

The ffmpeg and libsmb2 workflows run their respective build and verification
tasks on a GitHub-hosted macOS arm64 runner on every push to `main`, on pull
requests, and on demand. They upload the release-shaped zips and `SHA256SUMS`
as workflow artifacts. They do not publish releases: those stay manual, so a
pinned asset is never overwritten under a consumer that recorded its checksum.

## Publishing a release

1. Bump `artifactRevision` (or `upstreamVersion` plus its sha256) in
   `tools/ffmpeg/build.ts`.
2. Run `deno task ffmpeg-build` and `deno task ffmpeg-verify dist-ffmpeg`.
3. `gh release create ffmpeg/<version>-arcroom.<n> dist-ffmpeg/*.zip`, with the
   printed sha256 table in the release notes.
4. Copy the generated `PROVENANCE.md` out of the combined zip to the repo root.

libsmb2 follows the same process with `artifactRevision` in
`tools/libsmb2/build.ts` and `deno task libsmb2-build`. Update all four version
literals below together; never use a glob, because a stale artifact from an
older build must not enter a release:

```sh
gh release create libsmb2/6.2-arcroom.1 \
  dist-libsmb2/libsmb2-6.2-arcroom.1-macos-arm64.zip \
  dist-libsmb2/CSMB2-6.2-arcroom.1-macos-arm64.zip \
  dist-libsmb2/libsmb2-6.2-source.tar.gz
```

Copy its generated provenance to `PROVENANCE-libsmb2.md`.

Never replace an asset on an existing release: consumers pin by checksum.

## License

The prebuilt libraries are LGPL v2.1 or later; see [LICENSE](LICENSE). ffmpeg
is a trademark of Fabrice Bellard, originator of the FFmpeg project.

The build scripts under `tools/` are original to this repository and are
released under the same terms.
