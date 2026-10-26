# Vendored dependencies

All dependencies used by the delivered local preview and offline exporters are checked in as ordinary files. No npm install or network access is needed.

| Files | Version | License | Upstream |
| --- | --- | --- | --- |
| `vendor/lottie/lottie.min.js` | lottie-web 5.13.0 | MIT; `vendor/lottie/LICENSE.md` | https://github.com/airbnb/lottie-web/tree/v5.13.0 |
| `vendor/resvg/index.cjs`, `index_bg.wasm` | @resvg/resvg-wasm 2.6.2 | MPL-2.0; `vendor/resvg/LICENSE` | https://github.com/yisibl/resvg-js/tree/v2.6.2 |
| `vendor/h264/encoder.cjs` | h264-mp4-encoder 1.0.12 | MIT; `vendor/h264/LICENSE.md` | https://github.com/TrevorSundberg/h264-mp4-encoder |

The resvg JavaScript loader is the unmodified npm `index.js`, renamed to `.cjs`; the WASM binary is unmodified. Its corresponding source is available at the upstream tag above. MPL notices apply to these vendored library files, not to the original logo art. The H.264 encoder's WebAssembly is embedded in its JavaScript bundle. Its upstream project uses minih264 and minimp4.

`vendor/checksums.json` records SHA-256 hashes of the delivered third-party runtime files. The PNG/MP4/Lottie/SVG assets do not need resvg or the encoder at playback time; only the Lottie preview/player needs lottie-web. The SVG needs neither library.
