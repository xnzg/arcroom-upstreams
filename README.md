# arcroom-upstreams

Prebuilt, relinkable dynamic xcframeworks of LGPL-2.1 C libraries consumed by
the [Arcroom](https://github.com/wuhu-labs/wuhu) app. Each release ships the
libraries as separate dynamic frameworks precisely so that a user can relink
the application against their own build of the same libraries, as LGPL-2.1
section 6 requires.

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
  SwiftPM `binaryTarget` consumption.

## Corresponding source

- Upstream source: <https://ffmpeg.org/releases/ffmpeg-8.1.2.tar.xz>
- Source sha256:
  `464beb5e7bf0c311e68b45ae2f04e9cc2af88851abb4082231742a74d97b524c`
- Build script: `tools/ffmpeg/build.ts` in the wuhu-app monorepo, run as
  `deno task ffmpeg-build`. The script is the provenance record: it pins the
  tarball by sha256, holds the exact configure line and codec allowlist, and
  writes the `PROVENANCE.md` that rides in every artifact. A copy of that
  provenance — including the full configure flags — is checked in here as
  [PROVENANCE.md](PROVENANCE.md).

No ffmpeg sources are modified; the binaries are a straight build of the
unmodified upstream tarball with the configuration recorded above.

## Planned

- libsmb2 (all Apple platforms)

## License

The prebuilt libraries are LGPL v2.1 or later; see [LICENSE](LICENSE). ffmpeg
is a trademark of Fabrice Bellard, originator of the FFmpeg project.
