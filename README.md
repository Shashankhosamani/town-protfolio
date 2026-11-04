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
| Handbrake / drift         | `Space`                     | **DRIFT**                |
| Change car                | `C` (or pick on the intro)  | ⇄ Car                    |
| Engine sound on / off     | `M`                         | ♪ Sound                  |
| Time of day               | `T`                         | ☀ button                 |
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
models/cars/                                    Kenney cars (CC0): 6 drivable + 5 traffic-only, shared texture
dodge_challenger_-_muscle_car_-_low-poly/       "Muscle car" option, loaded only if chosen
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
- **Collision**: the car stays on the union of all road surfaces, with its distance from the nearest centre-line limited so the wheels stay off the curb. Hitting the curb removes the part of the velocity going into it, so the car glances off and slides along. A hard hit shakes the camera.
- **Shops**: a shop opens its panel when the car is within 13 units of it.
- **Debug view**: add `?debug` to the URL, then use `__town.topDown(x, z, height)` in the console for a bird's-eye view of any area. `__town.follow()` returns to the chase camera.

### Day and night (`applySky` in `index.html`)

The sky follows **the visitor's real local time**. Someone in London at 4:30 pm in November sees the sunset, someone in India at 10 pm sees a starry night, and someone in California at 8 am sees morning.

- **Sun position**: computed with NOAA's solar-position approximation from the visitor's date and clock. Longitude is estimated from the timezone offset (15° per hour). Latitude is a rough guess from the timezone's region (e.g. Europe ≈ 50°N, Australia ≈ 30°S). **No location permission is asked for.** Results match reference values: for example, London at noon on the winter solstice gives 15.1° elevation with the sun due south. North is −z and east is +x, so the sun rises over the Projects city side and sets over Contact.
- **What follows the sun**:
  - A shader sky dome (gradient, sun disc and glow, orange horizon at dusk), stars and a moon.
  - Fog colour and density.
  - Sunlight direction and colour, so shadows swing round through the day. A dim bluish moonlight takes over at night.
  - Ambient and sky light levels.
  - Window lights, shopfronts, street lamps and car headlights, which turn on as it gets dark.
- **Updates**: the sky re-checks the clock every 30 s and blends smoothly, so a visitor who stays through sunset watches it happen.
- **Override**: **T** or the ☀ button cycles *Real time → Day → Sunset → Night*. The choice is remembered.
- **Debug**: with `?debug`, `__town.sky(elevation, azimuth)` forces any sun position, and `__town.solar(isoDate, lat, lon)` exposes the formula.

### How the driving works (`physicsStep` / `updateCar` in `index.html`)

The physics runs in fixed **120 Hz steps**, so the car behaves the same at any frame rate. One unit is one metre.

- **Cars**: there are seven, defined in `CARS`. Each one has its own top speed, acceleration, braking, tyre grip and steering lock. The Kenney models have separate wheel nodes, so each wheel is placed on a pivot at its hub, where it spins with distance travelled and the front wheels turn with the steering.
- **Engine**: force tapers off toward top speed. Rolling resistance and aerodynamic drag slow the car when you lift off. Braking stops the car without reversing; keep holding `S` once stopped to reverse.
- **Steering**: this uses a bicycle model, where turn rate = speed × tan(steering angle) ÷ wheelbase. The car can't turn on the spot, and there's less steering lock at speed. Turn rate is also capped by tyre grip (about 0.9 g for the sedan). Steering too hard at speed makes the car **understeer** wide instead of turning impossibly tight.
- **Drift**: velocity is tracked separately from heading, and grip bleeds off sideways slide. The handbrake drops grip and lets the rear step out.
- **Feel**: the body pitches under braking and acceleration and rolls in corners, and there are brake and reverse lights. The chase camera pulls back and widens with speed and looks ahead.
- **HUD**: shows real km/h, the gear (R/N/1–5 from simulated gear ratios) and an RPM bar.
- **Sound**: a small WebAudio synth (detuned oscillators through a low-pass filter) follows RPM and throttle, with filtered noise for tyre squeal. It starts when you click *Start Engine*, and the on/off setting is remembered.

- **Traffic**: 20 cars from the same CC0 kit drive on the right around the roundabout and the four city ring roads, at 30–45 km/h.
  - They keep a gap to the car ahead (never closer than about 12 m bumper to bumper in testing).
  - They brake to a stop behind you if you block their lane.
  - They show brake lights and headlights.
  - They're solid: each car is three circles along its length, so bumping one pushes you out and cancels the speed going into it, with a thud and a camera shake. The car you hit pauses for a moment. Traffic appears as white dots on the minimap.

With `?debug` in the URL, `__town.sim(seconds)` advances the physics instantly, and `__town.input` / `__town.state` let you script or inspect a drive.

## Credits & licences

These models are used under their Sketchfab licences. Credits also appear in the in-app page view under **Credits**.

- **Car Kit** by [Kenney](https://kenney.nl/assets/car-kit): sports sedan, hot hatch, race car, police cruiser, taxi and luxury SUV, plus sedan, van, SUV, delivery van and truck for traffic. **CC0 (public domain)**: free for any use, no attribution required. See `models/cars/License.txt`.
- "Dodge Challenger – Muscle Car – Low-Poly" by Allay Design, Sketchfab Standard
- "Australian Traffic Light & Pedestrian Light" by JoTrain The Aussie, Sketchfab Standard

Each model folder has its own `license.txt`.

> ⚠️ The unused **Ford Mustang GT3**, **Ford 1934 Hot Rod** and **BMW R NineT Pure** models are **CC BY-NC-SA 4.0** (non-commercial, share-alike). Check those terms before you use them on a site that could count as commercial, such as one that promotes your services.
