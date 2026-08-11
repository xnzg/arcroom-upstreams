# libsmb2 6.2 for Arcroom (macOS arm64)

Built by `tools/libsmb2/build.ts` in github.com/xnzg/arcroom-upstreams.
Reproduce by running `deno task libsmb2-build` at the revision that pins this
artifact.

- Upstream source: https://github.com/sahlberg/libsmb2/archive/refs/tags/libsmb2-6.2.tar.gz
- Upstream tag: libsmb2-6.2
- Upstream commit: d67e213a5c4e7e4969fd81f0b95e4ca5831fbba1
- Source sha256: 8e1f9efc6b2e0f6546f0fe121ac0ddf4fc2f0908ae5a6bd1f185be7c9e0bcbb3
- Release tag: libsmb2/6.2-arcroom.1
- License: LGPL v2.1 or later (see LICENCE-LGPL-2.1.txt).
- Upstream modifications: none.
- Authentication: built-in NTLMSSP; Kerberos/GSSAPI is disabled.
- Deployment target: macOS 15.0, arm64.
- Clang module: CSMB2.
- Xcode: 26.4.1 (build 17E202).
- Apple clang: Apple clang version 21.0.0 (clang-2100.0.123.102).
- macOS SDK: 26.4.

## Build

The unmodified source files listed by upstream's `lib/CMakeLists.txt` are
compiled directly with the Xcode clang and archived with the Xcode ar. Two
translation units, `compat.c` and `sha1.c`, that produce no symbols for this
configuration are not placed in the archive. The `krb5-wrapper.c` translation
unit is omitted because
Kerberos/GSSAPI support is deliberately disabled. Feature defines describe the
macOS SDK headers and socket structures; no source file is patched.

Compile flags:

```
-std=gnu11 -O2 -DNDEBUG -fPIC -arch arm64 \
  -mmacosx-version-min=15.0 -isysroot <macosx-sdk> \
  -D_FILE_OFFSET_BITS=64 -D_U_=__attribute__((unused)) \
  -DCONFIGURE_OPTION_TCP_LINGER=1 \
  -DHAVE_ARPA_INET_H=1 \
  -DHAVE_DLFCN_H=1 \
  -DHAVE_ERRNO_H=1 \
  -DHAVE_FCNTL_H=1 \
  -DHAVE_INTTYPES_H=1 \
  -DHAVE_LINGER=1 \
  -DHAVE_NETDB_H=1 \
  -DHAVE_NETINET_IN_H=1 \
  -DHAVE_NETINET_TCP_H=1 \
  -DHAVE_POLL_H=1 \
  -DHAVE_SOCKADDR_LEN=1 \
  -DHAVE_SOCKADDR_STORAGE=1 \
  -DHAVE_STDINT_H=1 \
  -DHAVE_STDIO_H=1 \
  -DHAVE_STDLIB_H=1 \
  -DHAVE_STRINGS_H=1 \
  -DHAVE_STRING_H=1 \
  -DHAVE_SYS_ERRNO_H=1 \
  -DHAVE_SYS_FCNTL_H=1 \
  -DHAVE_SYS_IOCTL_H=1 \
  -DHAVE_SYS_POLL_H=1 \
  -DHAVE_SYS_SOCKET_H=1 \
  -DHAVE_SYS_STAT_H=1 \
  -DHAVE_SYS_TIME_H=1 \
  -DHAVE_SYS_TYPES_H=1 \
  -DHAVE_SYS_UIO_H=1 \
  -DHAVE_SYS_UNISTD_H=1 \
  -DHAVE_TIME_H=1 \
  -DHAVE_UNISTD_H=1 \
  -DSTDC_HEADERS=1
```

## Artifact

`libsmb2.xcframework` contains one static `libsmb2.a` slice with the seven
unmodified upstream public headers and a generated `CSMB2` module
map. The platform set deliberately matches the ffmpeg artifact present in this
repository at this revision: macOS arm64 only. The older README plan to cover
all Apple platforms is not the platform set that ffmpeg currently ships.
The combined archive carries this provenance and the license; SwiftPM requires
the binary target's XCFramework alone at its archive root. The release therefore
also carries the exact pinned upstream source tarball as
`libsmb2-6.2-source.tar.gz`; its sha256 is the source sha256 above and its root
contains the upstream LGPL license.

Because this is a static LGPL library, an application distributor must satisfy
LGPL v2.1 section 6, including providing the application object files or an
equivalent relinking mechanism plus the corresponding libsmb2 source offer.
This archive alone does not discharge the consuming application's obligations.
