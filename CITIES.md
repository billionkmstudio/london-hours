# Hours series: engine and city config design

Plan for turning London Hours into a series (Hong Kong, Paris, Tokyo, New York, and more) without copy-pasting a 1.5 MB file for every city.

## 1. What the current file is made of

`index.html` is about 1,420 lines, but about 1.4 MB of it is two base64 lines holding the painting textures (lines 254 and 256). The real code is small.

| Part | Roughly where | City-specific? |
| --- | --- | --- |
| Shared uniforms, sky shader, lights, materials | 238-450 | No (engine) |
| Ground, river, trees, boats, cars | 451-520, 680-702, 902-956 | Mostly engine, driven by a few numbers (`RW`, `ROW0`, road layout) |
| City blocks generator | 521-679 | Engine, but the exclusion zones (`excl`, `blocked`) are London coordinates |
| Landmarks: Tower Bridge, Shard, Gherkin, St Paul's, Big Ben, London Eye | 703-882 (about 180 lines) | **Yes, 100% city-specific** |
| Christmas tree and riverside lights | 883-901 | Mostly engine, tree position is city-specific |
| Rain, snow, fireworks | 957-1063 | No (engine) |
| Day/night keyframes (`KF`), sun and moon model | 1064-1125 | Partly: sun bearings depend on latitude and the compass assumes London |
| Post-processing, planar reflection | 1126-1193 | No (engine) |
| Camera, input, `VIEWS` | 1194-1229, 1287 | `VIEWS` is city-specific |
| UI, `PRE` presets, button labels | 1230-1317 | Labels and presets are city-specific |
| Compass | 1332+ | Engine, but sunrise and sunset ticks assume London |
| Van Gogh projection, `PAINTS` | 252-293, 257 | Engine plus city-chosen paintings |

Rule of thumb: about 75% of the code is engine and about 25% is London.

## 2. Proposed file layout

```
/engine/
  engine.js        scene, sky, lights, water, post-processing, weather, fireworks, camera, loop
  city-blocks.js   procedural block generator (reads the city config)
  projection.js    painting projection mode
  ui.js            time slider, chips, compass, footer
  engine.css
/cities/
  london.js        config + landmark builders
  hongkong.js
  tokyo.js ...
/paintings/        jpg files instead of base64 in the HTML
/london/index.html   loads engine + cities/london.js
/tokyo/index.html    ...
/index.html          series landing page (city cards)
```

Moving the paintings out of the HTML into normal `.jpg` files also cuts each page from about 1.5 MB to about 150 KB of code, and lets the browser cache them across cities.

No build step is needed. Plain `<script src>` files work on Vercel and GitHub Pages as they are.

## 3. City config schema (draft)

```js
window.CITY = {
  id: 'london',
  name: 'London',
  nameZh: '倫敦',
  latLon: [51.507, -0.128],
  timeZone: 'Europe/London',          // for the "city time now" button

  // Sun path. Drives KF keyframes, shadow direction and compass ticks.
  sun: { latitude: 51.5, season: 'winter' },   // winter / summer / equinox

  // Layout
  water: { type: 'river', halfWidth: 28, direction: 'x' },  // river | harbour | coast | none
  blocks: { rowStart: 40, density: 1.0, heightScale: 1.0, style: 'victorian' },
  exclusions: [ { x: 62, z: 52, r: 17 } /* ... */ ],

  // Landmarks: each is a function that builds a group and a list of lights
  landmarks: [ 'towerBridge', 'shard', 'gherkin', 'stPauls', 'bigBen', 'londonEye' ],

  // Camera presets
  views: { default: 'all', list: { tower: { label: ['塔橋', 'tower bridge'], t: [55,16,2], az: 3.02, el: .18, R: 128 } } },

  // Scene buttons available in this city, with city-specific extras
  scenes: ['snow', 'xmas', 'rain', 'fire', 'fog', 'vg'],   // Tokyo might add 'sakura'

  // Presets (button row)
  presets: { sunrise: { h: 6.35, fx: {} } },

  // Paintings for the projection mode
  paintings: [ { file: 'starry-night.jpg', title: 'The Starry Night', artist: 'Vincent van Gogh', year: 1889, source: 'https://commons.wikimedia.org/...' } ],

  // Page meta
  meta: { title: 'London Hours', ogImage: '/london/og.jpg' }
};
```

## 4. What each city actually needs

| City | Water | Landmarks (new work) | Extra scene | Notes |
| --- | --- | --- | --- | --- |
| Hong Kong | Harbour, wide water between two shores | IFC, Bank of China, Central skyline, Peak, Kowloon side | Typhoon rain, light show | Very dense and tall blocks. Latitude 22.3 N, so the sun path is much higher |
| Tokyo | River plus bay | Tokyo Tower, Skytree, Shibuya crossing, Rainbow Bridge | Cherry blossom, neon | Mt Fuji can be a distant silhouette on the sky |
| Paris | River (Seine) | Eiffel Tower, Notre-Dame, Sacré-Cœur | Hourly sparkle on the tower | Uniform Haussmann block height is easy and looks good |
| New York | Rivers around Manhattan | Empire State, One WTC, Brooklyn Bridge, Statue of Liberty | Snow, countdown | The street grid is a different layout from the London generator |

These are design ideas. Real positions, directions and heights must be checked per city before building.

## 5. Work estimate

1. **Refactor London into engine + config.** The biggest single step, because everything that is hard-coded to London has to move into the config (compass ticks, `VIEWS`, `PRE`, labels, block exclusions, time zone button). It must be verified that London still looks identical afterwards.
2. **Pull the paintings out of the HTML.** Small, mechanical.
3. **Build city number two** (Tokyo or Hong Kong recommended). This is where the config schema gets tested. Expect to adjust the schema once or twice.
4. **Series landing page.** Small once at least two cities exist.
5. Each further city: mostly new landmark builders plus layout tuning, similar in size to the London landmark section (about 180 lines) plus tuning time.

## 6. Risks

- **Regression.** Refactoring a working site can break it. Keep the current single-file London as a tagged release so it can always be restored.
- **Copyright and trademark.** Do not copy light shows, logos or branded building details. Stylised shapes are safer. Keep paintings to verified public-domain works.
- **Performance.** Each city is its own page. Do not put several cities on one page.
- **Sun model.** Latitude changes sunrise and sunset bearings and day length. Hong Kong and London should not share the same keyframes.
- **Analytics and meta tags.** Each city page needs its own title, `og:url`, `og:image` and, if wanted, its own subdomain.

## 7. Suggested order

1. Tag the current London as `v1`.
2. Refactor into `engine/` + `cities/london.js` and confirm it matches v1.
3. Add Tokyo or Hong Kong.
4. Add the series landing page.
5. Add Paris and New York.
