# London Hours

An interactive, fully procedural 3D London skyline that runs in the browser. Drag the time slider and watch the city move from sunrise to noon, sunset, dusk and night, then switch on weather and seasonal scenes.

It has no practical use. It exists to show what can be built with plain WebGL, shaders and a lot of curiosity.

**Live demo:** https://london-hours.vercel.app

> 中文簡介:呢個係一個純粹用來展示技術嘅倫敦 3D 場景。拉動時間軸可以睇日出、日落、黃昏同夜景,仲有雪、聖誕、雨、煙花、霧同「梵高投影」模式。全部用程式生成,冇用任何 3D 模型或 API key。

## Features

- **Day and night cycle.** A time slider drives the sun, sky colours, fog, lighting and window lights through sunrise, noon, sunset, dusk and night.
- **Scene buttons.** Snow, Christmas, rain, fireworks and fog, which can be combined.
- **View presets.** Tower Bridge, Westminster, London Eye and a full overview. The default view is the classic night-photo angle across the Thames.
- **Working compass.** The sun's bearing is shown on a compass, so sunrise and sunset appear in the right direction (roughly east-south-east at sunrise and west-south-west at sunset in winter).
- **Painting projection mode.** Public-domain paintings are projected onto the buildings and sky, like an immersive art exhibition. A picker switches between four paintings.
- **Adaptive quality.** Resolution and effects scale automatically to keep the frame rate smooth on phones.

## Controls

| Action | Desktop | Mobile |
| --- | --- | --- |
| Orbit camera | Drag | One-finger drag |
| Zoom | Scroll | Pinch |
| Change time | Time slider | Time slider |
| Scenes and views | Buttons in the panel | Buttons in the panel |

## Tech

- [Three.js](https://threejs.org/) r128, loaded from a CDN, with the post-processing examples (EffectComposer, bloom)
- Procedural city built from instanced meshes, with custom `onBeforeCompile` shaders for building facades and windows
- Sky shader rendered into a cube map and filtered into an environment map for lighting
- Planar water reflection and shadow mapping
- A keyframed time-of-day model that interpolates sky, light, fog and exposure
- GPU-driven rain and snow, CPU-driven fireworks
- Screen-space projection mapping for the painting mode

Everything lives in a single `index.html` file of about 1.5 MB. There is no build step, no framework and no API key.

## Run locally

Because the page loads Three.js from a CDN, you need an internet connection.

```bash
# any static server works
python3 -m http.server 8080
# then open http://localhost:8080
```

Opening `index.html` directly in a browser also works in most cases.

## Deploy

It is a static site, so it works on any static host:

- **Vercel:** import the repo, set Framework Preset to *Other*, leave the build command and output directory empty, then deploy.
- **GitHub Pages:** Settings, then Pages, then choose the `main` branch and the root folder.
- **Netlify:** drag the folder into Netlify Drop.

## Image credits

The painting mode uses works that are in the public domain, taken from Wikimedia Commons:

| Painting | Artist | Source |
| --- | --- | --- |
| The Starry Night | Vincent van Gogh | Wikimedia Commons |
| Starry Night Over the Rhône | Vincent van Gogh | Wikimedia Commons |
| Houses of Parliament, Sunset | Claude Monet | Wikimedia Commons |
| Starry Night (sketch) | Vincent van Gogh | Wikimedia Commons |

<!-- TODO: replace "Wikimedia Commons" with the exact file page URL for each image before going public. -->

This project is not affiliated with or endorsed by any museum, exhibition or rights holder.

## Roadmap

Ideas that may or may not happen:

- Tokyo version with cherry blossom
- Fireworks sound
- More paintings
- A softer horizon in painting mode
- Better layout for painting mode on portrait phones

## Licence

Code: MIT (add a `LICENSE` file if you want this to be official). Paintings: public domain, see credits above.
