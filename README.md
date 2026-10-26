# Siphon wheel

A text-free silver wheel surrounded by a single cool-gradient water ribbon on charcoal navy. Water climbs the left leg, crests above the wheel, descends the right leg, and returns along the bottom. The eight-spoke wheel turns slowly in the flow direction.

## Delivered files

| Path | Format / dimensions | Purpose |
| --- | --- | --- |
| `artifacts/image.png` | PNG, 512 × 512, opaque | Required preview; delivered separately |
| `deliverables/siphon-wheel.json` | Standalone vector Lottie, 512 × 512, 60 fps, 6 s | Two-second intro followed by four-second steady segment |
| `deliverables/siphon-wheel-loop.json` | Standalone vector Lottie, 512 × 512, 60 fps, 4 s | Whole-file looping; already primed |
| `deliverables/siphon-wheel.mp4` | MP4, H.264 Baseline, YUV 4:2:0, 512 × 512, 60 fps, 6 s, silent | One-pass fallback with intro |
| `deliverables/siphon-wheel-loop.mp4` | MP4, H.264 Baseline, YUV 4:2:0, 512 × 512, 60 fps, 4 s, silent | Steady-state video for native `loop` playback |
| `source/siphon-wheel.svg` | Editable SVG + inline CSS, 512 × 512 viewBox | Independent animated source: intro once, then infinite flow |
| `source/generate.py`, `source/palette.json` | Python / JSON | Editable geometry, animation, and palette; regenerate SVG and Lottie |
| `deliverables/siphon-wheel-poster.png` | PNG, 512 × 512 | Static, filled mark / reduced-motion fallback |
| `deliverables/siphon-wheel-32.png` | PNG, 32 × 32 | Icon-size review |

`result.json` records the output contract, limitations, and check evidence. There are no fonts, embedded raster images, text layers, expression dependencies, or remote assets in either Lottie file. Background is `#090F18`; water accents are `#627DFA`, `#36C9EF`, and `#94EDFF`.

## Play the intro once

Lottie JSON describes a timeline; the player decides which range repeats. **Do not set whole-file `loop: true` on `siphon-wheel.json`**: that would repeat its intro. Its markers are `intro` at frame 0 for 120 frames and `loop` at frame 120 for 240 frames. Use this segment setup with the included lottie-web 5.13.0:

```html
<div id="mark" style="width:64px;height:64px" role="img" aria-label="Siphon wheel"></div>
<script src="/vendor/lottie/lottie.min.js"></script>
<script>
const animation = lottie.loadAnimation({
  container: document.getElementById('mark'),
  renderer: 'svg',
  autoplay: false,
  loop: false,
  path: '/deliverables/siphon-wheel.json'
});
let priming = true;
animation.addEventListener('complete', () => {
  if (!priming) return;
  priming = false;
  animation.loop = true;
  animation.playSegments([120, 360], true);
});
animation.addEventListener('DOMLoaded', () => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    priming = false;
    animation.goToAndStop(120, true);
  } else {
    animation.playSegments([0, 120], true);
  }
});
</script>
```

For an existing dashboard-configured player that only loops a whole file, hot-swap `siphon-wheel-loop.json`; it is steady-state only. Keeping the intro once requires the segment setup above (also implemented in `preview/player.js`). The JSON remains a separate, replaceable asset. Another Lottie player needs equivalent segment controls; that integration has not been tested here.

The MP4 with intro is for one-pass playback. Use the loop-only MP4 for native video looping. The preview demonstrates switching from the intro video to the loop video; a browser may briefly delay this one-time source switch. Lottie or the SVG source is preferred for the continuous page logo.

## Preview and visual review

From the repository root:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/preview/`. It uses local, vendored lottie-web and supports replay, pause, video fallback, reduced motion, and 32/64/128 px previews. The SVG can also be used directly in an `<img>` element; its CSS handles the intro and loop without JavaScript.

Before publication, watch the prime and at least two loops, check the upward left flow and downward right flow, inspect the 32 px sample, and compare the palette against the live site. This is the chosen human visual approval step; the automated checks do not certify visual approval. No deployment or external publication was performed.

**Unverified requirement:** the exact site background/accent match and current logo source format could not be checked. The repository contained no site assets, and `https://sigmahook.com` returned an access error (direct HTTP request: 403). SVG+CSS was selected as the editable source allowed by the brief. The chosen palette is fully editable; no requester-specific value is required to use the result.

## Edit and reproduce offline

Requires Python 3 and Node.js 18 or newer with WebAssembly enabled. No package installation, network, browser, or `node_modules` is required. All export dependencies are ordinary vendored files with notices in `THIRD_PARTY.md`.

Edit `source/palette.json` for colors and `source/generate.py` for shape or timing changes. Then run:

```sh
python3 source/generate.py
node tools/render.cjs
node tools/check.cjs
```

The export renders the actual Lottie with lottie-web's SVG renderer, rasterizes with resvg, and encodes H.264 using the bundled WASM encoder. MP4 indexes are moved before media for fast start. Checks write temporary files only under `test/scratch/`; they do not rely on retained scratch files.

## Local check results

- Exact mathematical loop endpoints: **0 differing pixels** at 512 × 512.
- Standalone loop asset matches the full asset's repeating segment at six sampled frames.
- Progressive empty-to-full priming, forward water flow, and rotor motion passed pixel checks.
- Real lottie-web segment controller completed the intro once, then two loops within `[120, 360)`.
- Both MP4s independently decoded in full: 360 / 240 frames, 6 / 4 seconds, H.264 Baseline, YUV420p, 60 fps, no audio.
- Rendered PNG, intermediate priming frame, 32 px sample, and decoded video frame inspected locally.

The repeating endpoint is the position at exactly four seconds, equal to its start. The last stored sample is at 239/60 seconds, followed by the first sample on repeat; no duplicate endpoint frame is added, which would introduce a pause. Video encoding is lossy, so byte-identical Lottie endpoint pixels do not imply identical decoded video pixels.

Machine-readable pixel and container checks are in `review/check-results.json`. Intermediate rendered frames are under `review/`. No full browser automation or live Cloudflare integration test was performed.
