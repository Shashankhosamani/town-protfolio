# Portfolio Town

An interactive 3D portfolio. Visitors drive a car out of a small town square at dusk, down one of four roads, into four cities. Each city is one section of the portfolio:

| Key | City         | Direction | Colour |
|-----|--------------|-----------|--------|
| `1` | Projects     | east      | blue   |
| `2` | Skills       | north     | amber  |
| `3` | Experience   | south     | pink   |
| `4` | Contact      | west      | violet |

Pull up to a city's glowing shop and press **E** to open that section. If someone doesn't want to drive, **"Skip the drive — read as a page"** (or **L**) shows all the content as an ordinary page. That page also works on devices without WebGL.

Built with plain HTML/JS and [three.js](https://threejs.org) r128. No build step.

---

## Run it locally

Browsers block 3D model files on `file://` pages, so serve the folder over HTTP:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

If you do open `index.html` straight from disk, it still works, but it uses a simple procedural car and skips the traffic lights, and it shows a notice saying so. The roads are generated in code either way.

## Edit your content

**All text lives in [`content.js`](content.js).** You never need to touch `index.html` to update the portfolio.

```js
window.PORTFOLIO = {
  profile:    { name, handle, role, tagline, location, resumeUrl },
  projects:   { title, intro, items: [{ name, year, summary, details[], tags[], links[{label,url}] }] },
  skills:     { title, intro, groups: [{ name, items[] }] },
  experience: { title, intro, items: [{ role, org, period, summary, highlights[] }] },
  contact:    { title, intro, links: [{ kind, label, value, url }] }
};
```

- Any text containing `TODO` is highlighted in amber on the page, so you can see which placeholders are left.
- Links only show when `url` starts with `http(s)://`, `mailto:` or `tel:`. Leave it `""` to hide the button.
- An email contact without a `url` gets a `mailto:` link automatically. Every contact gets a **Copy** button.
- Set `profile.resumeUrl` to show a "Résumé" button on the intro screen.
- Text is HTML-escaped, so you can type `<`, `&` and similar characters safely.

## Controls

| Action                    | Keyboard                    | Touch                    |
|---------------------------|-----------------------------|--------------------------|
| Accelerate / brake        | `W` `S` or `↑` `↓`          | ▲ ▼                      |
| Steer                     | `A` `D` or `←` `→`          | ◀ ▶                      |
| Look around               | drag mouse                  | drag                     |
| Enter shop                | `E` or `Enter`              | **ENTER** (lights up)    |
| Fast travel to a city     | `1`–`4`                     | chips at top-left        |
| Reset to town square      | `R`                         | ⟲ Reset                  |
| Page view                 | `L`                         | ≡ Page view              |
| Help                      | `H` or `?`                  | ? Help                   |
| Close window / prev, next | `Esc` / `←` `→` in a panel  | ✕ / panel footer buttons |

## Deep links

- `index.html#projects` (also `#skills`, `#experience`, `#contact`): after **Start Engine**, drops the car at that city and opens the section.
- `index.html#list`: opens the page view right away. Good for a résumé link.

## Deploy (GitHub Pages)

1. Push to GitHub.
2. Go to **Settings → Pages → Build and deployment**, choose **Deploy from a branch**, then select the branch and `/ (root)`.
3. The site goes live at `https://<user>.github.io/town-protfolio/`.

The old `portfolio-track-demo.html` URL redirects to `index.html`.

## Project layout

```
index.html        app: intro, HUD, panels, page view, 3D world
content.js        ← all portfolio copy (edit this)
dodge_challenger_-_muscle_car_-_low-poly/       player car                 (used)
australian_traffic_light__pedestrain_light/     traffic lights at junctions (used)
road_modular/, city_scene/, neighbourhood_city_modular_lowpoly/, modular_bridge…/,
1998_ducati_748/, 2018_bmw_r_ninet_pure/, ford_*/                          (not used)
```

The page loads only the `scene.web.gltf` files, which use small textures from `textures_web/`. Each model loads in the background while the intro screen shows. If a model fails, the page falls back to procedural geometry.

### How the world is built (`initWorld` in `index.html`)

```
                     [ SKILLS ]            north
                         |
  [ CONTACT ] —— ( town square ) —— [ PROJECTS ]
                         |
                  [ EXPERIENCE ]           south
```

- **Layout**: the town square is a roundabout (`HUB_RADIUS`) with a park and fountain in the middle. A straight spoke leaves it in each direction for `CITY_DIST` metres. Each city is a rounded-rectangle ring road (`CITY_W` × `CITY_H`, corner radius `CITY_CORNER`) with an avenue straight through the middle. The spoke meets the ring at a crossroads with the avenue, and the city's shop sits at the far end of the avenue.
- **Street cross-section**: there are two lanes (`ROAD_HALF` each side of centre), a raised curb (`CURB_W` × `CURB_H`) and a tiled sidewalk (`SIDEWALK_W`). Every road is a centre-line resampled to about 1 point per metre. Asphalt, curbs, sidewalks and walls are generated from it and batched into one mesh per material.
- **Junctions**: no junction is placed by hand. On each road, any stretch of curb, sidewalk or edge line that would land on *another* road's asphalt is removed. The exact cut point is found by bisection, so curbs meet in clean L-shaped corners. Crosswalks and stop lines are added automatically where an open road meets another road.
- **Textures**: asphalt and paving are canvas-generated and use world-space UVs, so overlapping pieces at junctions line up seamlessly.
- **Street lights**: these are procedural poles with a glowing head and an additive light pool on the road, rather than real lights. That keeps the frame rate up, because about 150 real point lights would make the shaders very slow.
- **Buildings**: buildings are procedural, in four styles:
  - **Brick walk-ups**: brick courses, framed windows with sills and lintels, and sometimes a rooftop water tank.
  - **Plaster townhouses**: shuttered windows, tinted with each area's palette.
  - **Concrete offices**: ribbon windows over spandrel panels.
  - **Glass towers**: curtain-wall glass, often with a setback crown.

  Buildings can have ground-floor shops with lit windows, a door, an awning and a glowing sign. They also get a string course, cornice, parapet and rooftop AC units or stair housings. Window textures tile in units of bays (3 m) and floors (3.2 m), so windows stay the right size on any building. Lit windows are randomised, and office lights fade toward the floor with desk silhouettes.

  Each area has its own mix of styles: plaster and brick around the town square and along the spokes, offices and glass towers on each city's avenue, and a mix on the city ring roads. Every building of a material is merged into one mesh, so the whole town is about 20 draw calls.

  A building is only placed if all four corners of its footprint clear every sidewalk and other buildings. If the first size doesn't fit, smaller footprints are tried before the spot is skipped.
- **Collision**: the car stays on the union of all road surfaces. Its distance to the nearest centre-line is clamped so the wheels stay off the curb, and scraping a curb slows the car down.
- **Shops**: a shop opens its panel when the car is within 13 units of it.
- **Debug view**: add `?debug` to the URL, then use `__town.topDown(x, z, height)` in the console for a bird's-eye view of any area. `__town.follow()` returns to the chase camera.

## Credits & licences

These models are used under their Sketchfab licences. Credits also appear in the in-app page view under **Credits**.

- "Dodge Challenger – Muscle Car – Low-Poly" by Allay Design, Sketchfab Standard
- "Australian Traffic Light & Pedestrian Light" by JoTrain The Aussie, Sketchfab Standard

Each model folder has its own `license.txt`.

> ⚠️ The unused **Ford Mustang GT3**, **Ford 1934 Hot Rod** and **BMW R NineT Pure** models are **CC BY-NC-SA 4.0** (non-commercial, share-alike). Check those terms before you use them on a site that could count as commercial, such as one that promotes your services.
