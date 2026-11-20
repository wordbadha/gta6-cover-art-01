# Vice Nights Cover Studio

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/wordbadha/gta6-cover-art-01/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/wordbadha/gta6-cover-art-01/reward.svg)](https://make.fun/c/gta6-cover-art-01)

An offline web app that turns any photo and a caption into GTA-style cover art — the multi-panel poster look with bold Anton lettering, a Pacifico script subtitle and a Vice City sunset or neon colour grade — exported as a PNG to share.

Built for the [make.fun](https://make.fun/c/gta6-cover-art-01) "Make GTA 6 Cover Art" bounty. No Rockstar logo, artwork or font anywhere: the lettering is Anton and Pacifico under the SIL Open Font License, and the sample photos are model-made images supplied free to use by the kit.

## What it does

- **Six layouts** — Hero + Three, Four Panel, Full Bleed, Tilted Snapshots, Nine Grid, Split Duo.
- **Five colour grades** — Vice Sunset, Neon Nights, Golden Hour, Mono Noir, Ocean Drive.
- **Three post sizes** — 1080 × 1080, 1080 × 1350 and 1920 × 1080, exported at full resolution.
- **Any photo** — upload your own or use the samples; drag a panel to position its photo, scroll to zoom, flip it, re-centre it. Each panel keeps its own photo and crop.
- **Caption** — title in Anton with a gradient fill and outline, subtitle in Pacifico script, top or bottom band.
- **Finish** — poster frame, film grain, vignette and halftone dots.
- **Fast** — Surprise me builds a random cover in one click; Undo and Redo cover every change.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

Static files only — `app/index.html` opens in desktop Chrome and works with no network request. Photos are read on your own machine and never uploaded.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library.

## Files

- `app/` — the studio: `index.html`, `style.css`, `src/cover.js` (the render engine), `src/main.js` (editor wiring), `src/shots.js` (`?shot=` scenes), `fonts/` (Anton + Pacifico, SIL OFL), `samples/` (two model-made photos).
- `screenshots/` — the cover and the editor at work, taken by the app's own `?shot=` scenes.
- `main.ts` — the entry program. `serve.ts` — the local static server. `shots.json` — the screenshot scenes.
- `vendor/makefun-app.ts` — the kit's dossier library, unchanged.

## License

MIT. The fonts in `app/fonts/` are licensed under the SIL Open Font License 1.1 (see `app/fonts/OFL.txt`).
