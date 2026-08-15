# ffmpeg 8.1.2 for Arcroom (macOS arm64)

Built by `tools/ffmpeg/build.ts` in github.com/xnzg/arcroom-upstreams.
Reproduce by running `deno task ffmpeg-build` at the revision that pins this
artifact.

- Upstream source: https://ffmpeg.org/releases/ffmpeg-8.1.2.tar.xz
- Source sha256: 464beb5e7bf0c311e68b45ae2f04e9cc2af88851abb4082231742a74d97b524c
- Release tag: ffmpeg/8.1.2-arcroom.2
- License: LGPL v2.1 or later (see COPYING.LGPLv2.1). Built without
  `--enable-gpl`, `--enable-version3`, and `--enable-nonfree`. The three
  libraries ship as separate dynamic frameworks so the application can be
  relinked against a user-supplied build of the same libraries.

## configure

```
--prefix=/arcroom-ffmpeg \
  --disable-gpl \
  --disable-nonfree \
  --disable-version3 \
  --disable-everything \
  --disable-autodetect \
  --disable-programs \
  --disable-doc \
  --enable-avformat \
  --disable-avfilter \
  --disable-avdevice \
  --enable-swscale \
  --disable-network \
  --disable-protocols \
  --disable-muxers \
  --disable-demuxers \
  --disable-devices \
  --disable-filters \
  --disable-bsfs \
  --disable-static \
  --enable-shared \
  --enable-pic \
  --disable-debug \
  --enable-neon \
  --enable-videotoolbox \
  --install-name-dir=@rpath \
  --extra-cflags=-mmacosx-version-min=15.0 \
  --extra-ldflags=-mmacosx-version-min=15.0 \
  --extra-ldflags=-Wl,-headerpad_max_install_names \
  --enable-decoder=aac,aac_latm,ac3,dca,eac3,flac,mlp,opus,truehd,vorbis,h264,hevc,ass,movtext,srt,webvtt,pcm_alaw,pcm_bluray,pcm_dvd,pcm_f16le,pcm_f24le,pcm_f32be,pcm_f32le,pcm_f64be,pcm_f64le,pcm_lxf,pcm_mulaw,pcm_s16be,pcm_s16be_planar,pcm_s16le,pcm_s16le_planar,pcm_s24be,pcm_s24daud,pcm_s24le,pcm_s24le_planar,pcm_s32be,pcm_s32le,pcm_s32le_planar,pcm_s64be,pcm_s64le,pcm_s8,pcm_s8_planar,pcm_sga,pcm_u16be,pcm_u16le,pcm_u24be,pcm_u24le,pcm_u32be,pcm_u32le,pcm_u8,pcm_vidc \
  --enable-encoder=aac,eac3,h264_videotoolbox \
  --enable-parser=aac,aac_latm,ac3,dca,flac,mlp,opus,vorbis,h264,hevc \
  --enable-demuxer=matroska,mov \
  --enable-protocol=file \
  --enable-hwaccel=h264_videotoolbox,hevc_videotoolbox
```

## Compiled-in components

- decoders: aac aac_latm ac3 dca eac3 flac mlp opus truehd vorbis h264 hevc ass movtext srt webvtt pcm_alaw pcm_bluray pcm_dvd pcm_f16le pcm_f24le pcm_f32be pcm_f32le pcm_f64be pcm_f64le pcm_lxf pcm_mulaw pcm_s16be pcm_s16be_planar pcm_s16le pcm_s16le_planar pcm_s24be pcm_s24daud pcm_s24le pcm_s24le_planar pcm_s32be pcm_s32le pcm_s32le_planar pcm_s64be pcm_s64le pcm_s8 pcm_s8_planar pcm_sga pcm_u16be pcm_u16le pcm_u24be pcm_u24le pcm_u32be pcm_u32le pcm_u8 pcm_vidc
- encoders: aac eac3 h264_videotoolbox
- parsers: aac aac_latm ac3 dca flac mlp opus vorbis h264 hevc
- demuxers: matroska mov
- protocols: file
- hardware accelerators: h264_videotoolbox hevc_videotoolbox
- no muxers, filters, devices, or bitstream filters
- no libavfilter, libavdevice, or command-line tools

## Frameworks

- `libavutil.xcframework` — install name `@rpath/libavutil`, module `libavutil`
- `libswresample.xcframework` — install name `@rpath/libswresample`, module `libswresample`
- `libswscale.xcframework` — install name `@rpath/libswscale`, module `libswscale`
- `libavcodec.xcframework` — install name `@rpath/libavcodec`, module `libavcodec`
- `libavformat.xcframework` — install name `@rpath/libavformat`, module `libavformat`

Headers dropped because they need SDKs this configuration neither enables nor
can see: libavutil/hwcontext_amf.h, libavutil/hwcontext_cuda.h, libavutil/hwcontext_d3d11va.h, libavutil/hwcontext_d3d12va.h, libavutil/hwcontext_dxva2.h, libavutil/hwcontext_qsv.h, libavutil/hwcontext_vaapi.h, libavutil/hwcontext_vdpau.h, libavutil/hwcontext_vulkan.h, libavcodec/d3d11va.h, libavcodec/dxva2.h, libavcodec/qsv.h, libavcodec/vdpau.h
