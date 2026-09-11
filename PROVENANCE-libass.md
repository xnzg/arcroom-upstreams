# libass 0.17.5 for Arcroom (Apple arm64)

Built by `tools/libass/build.ts` in github.com/xnzg/arcroom-upstreams.
Reproduce by running `deno task libass-build` at the revision that pins this
artifact.

- Release tag: libass/0.17.5-arcroom.2
- Clang module: CASS.
- Xcode: 26.4 (build 17E192).
- Apple clang: Apple clang version 21.0.0 (clang-2100.0.123.102).
- Upstream modifications: none.

## Upstream sources

- freetype 2.14.3: https://github.com/freetype/freetype/archive/refs/tags/VER-2-14-3.tar.gz (sha256 dc49de6b01a266eef4876a4dd34d9842c475d3e28ff2eff63bd2fb760ab56261), FreeType License (FTL), license file `LICENSE.TXT`, published beside this archive as `freetype-2.14.3-source.tar.gz`.
- fribidi 1.0.16: https://github.com/fribidi/fribidi/releases/download/v1.0.16/fribidi-1.0.16.tar.xz (sha256 1b1cde5b235d40479e91be2f0e88a309e3214c8ab470ec8a2744d82a5a9ea05c), LGPL v2.1 or later, license file `COPYING`, published beside this archive as `fribidi-1.0.16-source.tar.xz`.
- harfbuzz 14.2.1: https://github.com/harfbuzz/harfbuzz/releases/download/14.2.1/harfbuzz-14.2.1.tar.xz (sha256 a54a5d8e9380a41fbb762ce367bcbf7704792dfca0d93f1bbca86c5a57902e0e), MIT (Old MIT), license file `COPYING`, published beside this archive as `harfbuzz-14.2.1-source.tar.xz`.
- libunibreak 6.1: https://github.com/adah1972/libunibreak/releases/download/libunibreak_6_1/libunibreak-6.1.tar.gz (sha256 cc4de0099cf7ff05005ceabff4afed4c582a736abc38033e70fdac86335ce93f), zlib, license file `LICENCE`, published beside this archive as `libunibreak-6.1-source.tar.gz`.
- libass 0.17.5: https://github.com/libass/libass/releases/download/0.17.5/libass-0.17.5.tar.xz (sha256 2dca25c0e0c837ddf00b52011b3f82cac1e4ddd3ad018227806b0c2288864acc), ISC, license file `COPYING`, published beside this archive as `libass-0.17.5-source.tar.xz`.

## Slices

Every slice is arm64; there is no x86_64 anywhere. The deployment floors are
Arcroom's, from its `package.yml`.

| LibraryIdentifier | SDK | target triple | deployment target | SDK version |
| --- | --- | --- | --- | --- |
| `macos-arm64` | `macosx` | `arm64-apple-macos15.4` | macOS 15.4 | 26.4 |
| `ios-arm64` | `iphoneos` | `arm64-apple-ios18.4` | iOS 18.4 | 26.4 |
| `ios-arm64-simulator` | `iphonesimulator` | `arm64-apple-ios18.4-simulator` | iOS 18.4 | 26.4 |
| `tvos-arm64` | `appletvos` | `arm64-apple-tvos26.0` | tvOS 26.0 | 26.4 |
| `tvos-arm64-simulator` | `appletvsimulator` | `arm64-apple-tvos26.0-simulator` | tvOS 26.0 | 26.4 |
| `xros-arm64` | `xros` | `arm64-apple-xros26.0` | visionOS 26.0 | 26.4 |
| `xros-arm64-simulator` | `xrsimulator` | `arm64-apple-xros26.0-simulator` | visionOS 26.0 | 26.4 |

## Build

One static archive, `libass.a` per slice, holds libass and every library it
needs at link time: FreeType (no zlib, bzip2, png, brotli or HarfBuzz
callback), FriBidi, HarfBuzz (the single-file amalgamation compiled with the
Xcode clang++, FreeType and CoreText enabled, no glib, ICU or graphite) and
libunibreak. Fontconfig and DirectWrite are disabled; the CoreText font
provider is the only system provider and is present on every slice, and libass
is configured not to require one, so fonts added through `ass_add_font` work
without any system font. Every platform is served by the same portable C
sources and the same flags — only the target triple and the SDK differ.

Common compile flags, where `<target>` is the slice's triple and
`<sysroot>` its SDK path:

```
-target <target> -isysroot <sysroot> -O2 -DNDEBUG -fPIC -fvisibility=hidden
```

FreeType (CMake): -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=OFF -DFT_DISABLE_ZLIB=ON -DFT_DISABLE_BZIP2=ON -DFT_DISABLE_PNG=ON -DFT_DISABLE_HARFBUZZ=ON -DFT_DISABLE_BROTLI=ON -DCMAKE_INSTALL_LIBDIR=lib

Every FreeType slice also passes `-DCMAKE_OSX_ARCHITECTURES=arm64
-DCMAKE_OSX_SYSROOT=<sysroot> -DCMAKE_OSX_DEPLOYMENT_TARGET=<floor>`, and a
non-macOS slice adds `-DCMAKE_SYSTEM_NAME=<iOS|tvOS|visionOS>`: CMake appends
its own platform flags after the user ones, so it owns the target selection
there rather than a triple in `CMAKE_C_FLAGS`.

FriBidi (configure): --disable-shared --enable-static --disable-debug

libunibreak (configure): --disable-shared --enable-static

HarfBuzz (clang++ on src/harfbuzz.cc): -std=c++11 -fno-exceptions -fno-rtti -fno-threadsafe-statics -DHAVE_FREETYPE=1 -DHAVE_CORETEXT=1 -DHAVE_PTHREAD=1 -DHB_NO_MT=1

libass (configure): --disable-shared --enable-static --disable-fontconfig --enable-coretext --disable-require-system-font-provider --disable-directwrite

Every autotools package is configured `--host=aarch64-apple-darwin`, so no
configure probe runs a target binary.

## Artifact

`libass.xcframework` contains one static `libass.a` per slice above, the two
public libass headers under `ass/`, an umbrella `libass.h` and a
`CASS` module map whose link directives pull in libc++, libiconv,
CoreText, CoreGraphics and CoreFoundation. Every member object of every archive
is asserted to carry the slice's `LC_BUILD_VERSION` platform and minimum OS.

FriBidi is LGPL v2.1 and statically linked here, so an application distributor
must satisfy LGPL v2.1 section 6 for it, including providing the application
object files or an equivalent relinking mechanism plus the corresponding source
offer; the exact source tarballs ship beside this archive for that purpose.
This archive alone does not discharge the consuming application's obligations.
