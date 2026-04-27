# PG Viewer

A browser-based viewer for paragliding IGC tracks. Drop one or more `.igc`
files in, see the flight rendered on a 3D globe with terrain, with an
altitude graph below.

## Features

- IGC parsing in the browser (no server)
- Per-flight track coloring (climb, altitude, TEC, ground speed, time, solid)
- Optional layers: shadow + extruded wall, altitude marks, time marks
- Analysis: thermals, glides, dives detection
- Task declaration rendering from C-records
- Altitude vs. time chart, multi-flight overlay
- Bing satellite imagery and Cesium World Terrain via Cesium ion

## Setup

```sh
npm install
cp .env.example .env.local
# edit .env.local and paste your Cesium ion token
npm run dev
```

You need a free Cesium ion access token. Get one at
[cesium.com/ion/tokens](https://cesium.com/ion/tokens). Without it the
globe and terrain won't load.

`npm run build` produces a static `dist/` directory you can host anywhere.
The token is bundled into the build, so use a token scoped to the assets
this app uses (Bing imagery, World Terrain).

### Share feature (optional)

To enable shareable links, deploy the Cloudflare Worker in `worker/` and
set `VITE_STORAGE_URL` in `.env.local`. See `worker/README.md` for setup.
Without this, the app works fine but the share button reports an error.

## Tests

```sh
npm test
```

Unit tests cover the IGC parser, geometry, scales, and analysis.

## License

GPL-3.0-or-later. See [LICENSE](LICENSE).

## Credits

Author: Joseph Coffland

IGC parsing and analysis derived from
[twpayne/igc2kmz.py](https://github.com/twpayne/igc2kmz.py).

Built with [Vue 3](https://vuejs.org/), [Vite](https://vitejs.dev/),
[CesiumJS](https://cesium.com/platform/cesiumjs/), and
[uPlot](https://github.com/leeoniya/uPlot).
