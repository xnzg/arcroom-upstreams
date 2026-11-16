# libsmb2 6.2 for Arcroom (Apple arm64)

Built by `tools/libsmb2/build.ts` in github.com/xnzg/arcroom-upstreams.
Reproduce by running `deno task libsmb2-build` at the revision that pins this
artifact.

- Upstream source: https://github.com/sahlberg/libsmb2/archive/refs/tags/libsmb2-6.2.tar.gz
- Upstream tag: libsmb2-6.2
- Upstream commit: d67e213a5c4e7e4969fd81f0b95e4ca5831fbba1
- Source sha256: 8e1f9efc6b2e0f6546f0fe121ac0ddf4fc2f0908ae5a6bd1f185be7c9e0bcbb3
- Release tag: libsmb2/6.2-arcroom.2
- License: LGPL v2.1 or later (see LICENCE-LGPL-2.1.txt, shipped as `COPYING`
  inside every slice of the framework).
- Upstream modifications: none to the compiled sources. The shipped headers are
  upstream's, with the three framework-internal cross-includes respelled
  relative so a framework module can resolve them without an include path (see
  Artifact); nothing else differs.
- Authentication: built-in NTLMSSP; Kerberos/GSSAPI is disabled.
- Clang module: SMB2 (upstream's own module map, with the `LibSMB2`,
  `Internal` and explicit `Raw` submodules).
- Install name: `@rpath/SMB2.framework/SMB2`.
- Bundle identifier: tech.lakeridge.arcroom.libsmb2.
- Xcode: 26.6 (build 17F113).
- Apple clang: Apple clang version 21.0.0 (clang-2100.1.1.101).

## Slices

Every xcframework carries one arm64 slice per row; there is no x86_64 anywhere.
The deployment floors are Arcroom's, from its `package.yml`.

| LibraryIdentifier | SDK | target triple | deployment target | SDK version |
| --- | --- | --- | --- | --- |
| `macos-arm64` | `macosx` | `arm64-apple-macos15.4` | macOS 15.4 | 26.5 |
| `ios-arm64` | `iphoneos` | `arm64-apple-ios18.4` | iOS 18.4 | 26.5 |
| `ios-arm64-simulator` | `iphonesimulator` | `arm64-apple-ios18.4-simulator` | iOS 18.4 | 26.5 |
| `tvos-arm64` | `appletvos` | `arm64-apple-tvos26.0` | tvOS 26.0 | 26.5 |
| `tvos-arm64-simulator` | `appletvsimulator` | `arm64-apple-tvos26.0-simulator` | tvOS 26.0 | 26.5 |
| `xros-arm64` | `xros` | `arm64-apple-xros26.0` | visionOS 26.0 | 26.5 |
| `xros-arm64-simulator` | `xrsimulator` | `arm64-apple-xros26.0-simulator` | visionOS 26.0 | 26.5 |

## Build

The unmodified source files listed by upstream's `lib/CMakeLists.txt` are
compiled for each slice with the Xcode clang and linked into one dynamic
library; the `krb5-wrapper.c` translation unit is omitted because
Kerberos/GSSAPI support is deliberately disabled. Two translation units,
`compat.c` and `sha1.c`, produce no symbols for this configuration and so
contribute no object; every slice is asserted to carry the same object set. No
source file is patched: `include/apple/config.h`, upstream's own Apple
configuration, supplies the configure results.

Compile flags, where `<target>` is the slice's triple and `<sysroot>` its SDK
path:

```
-std=gnu11 -O2 -DNDEBUG -fPIC -target <target> -isysroot <sysroot> \
  -D_FILE_OFFSET_BITS=64 -D_U_=__attribute__((unused)) -DHAVE_CONFIG_H=1 \
  -I<source>/include -I<source>/include/apple \
  -I<source>/include/smb2 -I<source>/lib
```

Link command:

```
clang -dynamiclib -target <target> -isysroot <sysroot> \
  -Wl,-install_name,@rpath/SMB2.framework/SMB2 -o SMB2 <objects...>
```

## Artifact

`libsmb2.xcframework` holds one `SMB2.framework` per slice: the
dynamic library, the nine headers upstream's module map names under `Headers/`
in their `apple/` and `smb2/` subdirectories, the module map at
`Modules/module.modulemap`, an `Info.plist`, and the LGPL license as
`COPYING`. In the shipped header copies, three framework-internal cross-includes
are respelled from `<smb2/x.h>` to `"x.h"`: `smb2/smb2.h` includes
`smb2-errors.h`, `smb2/libsmb2.h` includes `libsmb2-dcerpc-srvsvc.h`, and
`smb2/libsmb2-dcerpc-srvsvc.h` includes `libsmb2-dcerpc.h`. A framework
module has no include path, and clang's fallback framework lookup matches the
include's prefix against the framework's name. The macOS slice carries the versioned bundle layout
(`Versions/A`); every other slice carries the flat one, which is what those
platforms accept. Every slice is ad hoc signed; the embedding application
re-signs it.

The combined archive carries this provenance and the license beside the
xcframework; SwiftPM requires the binary target's XCFramework alone at its
archive root, so the release also carries `SMB2-6.2-arcroom.2-apple-arm64.zip` with the
same xcframework alone, and the exact pinned upstream source tarball as
`libsmb2-6.2-source.tar.gz`.

The library is dynamic and relinkable: the application links and embeds
`SMB2.framework` and loads it from its own `Frameworks`
directory, so replacing that bundle with a build of the corresponding source
satisfies LGPL v2.1 section 6.
