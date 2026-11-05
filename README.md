# Portfolio Town

An interactive 3D portfolio set in a small coastal town. Visitors start in the town square and drive to four districts. Each district is one section of the portfolio:

| Key | District | Where | Colour |
|-----|----------|-------|--------|
| `1` | Projects | west, along Market Street (glass towers) | blue |
| `2` | Skills | east, along Market Street (the market) | amber |
| `3` | Experience | south, up Main Street toward the hills | pink |
| `4` | Contact | the island, across Harbour Bridge (lighthouse) | violet |

Every project, job, skill group and contact method stands on its own billboard; pull up to one and press **E** to read it. If someone doesn't want to drive, **Read as a page** (or **L**) shows everything as an ordinary page, which also works on devices without WebGL.

Built with [Next.js](https://nextjs.org) (static export) and [three.js](https://threejs.org) r128.

---

## Run it locally

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
```

```bash
npm run dev
```

Then open <http://localhost:3000>.

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload. Saving `public/portfolio.json` also reloads the page. |
| `npm run build` | Checks `portfolio.json` against its schema, then writes the finished static site to `out/` |
| `npm start` | Serves the built `out/` folder locally, to preview exactly what gets deployed |
| `npm run validate-content` | Only checks `portfolio.json`, and counts the TODO placeholders left |
| `npm run typecheck` | TypeScript check |

## Edit your content

**All content lives in [`public/portfolio.json`](public/portfolio.json).** It's plain data. You never touch code to update the portfolio, and everything follows the file: the landing card, the section panels, the page view and the billboards in the 3D town.

```jsonc
{
  "profile":    { "name", "handle", "role", "tagline", "location", "resumeUrl", "highlights": [], "topSkills": [] },
  "projects":   { "title", "intro", "items":  [{ "name", "year", "summary", "details": [], "tags": [], "links": [{ "label", "url" }] }] },
  "skills":     { "title", "intro", "groups": [{ "name", "items": [] }] },
  "experience": { "title", "intro", "items":  [{ "role", "org", "period", "summary", "highlights": [] }] },
  "contact":    { "title", "intro", "links":  [{ "kind", "label", "value", "url" }] }
}
```

### Common edits

| To… | Do this |
|---|---|
| **Add** a project, job, skill group or contact | Copy an existing `{ … }` block in its list, paste it after a comma, and change the text. A new billboard appears in that city. |
| **Remove** one | Delete its `{ … }` block, and the comma before it if it was the last one. |
| **Reorder** | Move the blocks. Billboards follow the list order; put your best project and most recent job first. |
| **Hide a whole section** | Empty its list (`"items": []`) or delete the section. Its city stays, without billboards. |
| **Hide one field** | Set it to `""` or delete it. Empty fields simply don't show. |

There's practically **no limit** on items. Billboards fill each district's main street first, then continue on its cross streets (30 projects all get a billboard). Anything beyond that still appears in the panels and page view.

### Editing tips

- **Autocomplete and checking**: `portfolio.json` points at [`public/portfolio.schema.json`](public/portfolio.schema.json). VS Code and most editors use it to suggest field names, show descriptions on hover, and underline mistakes such as a misspelt `"nmae"` or a list where text should be.
- **Live preview**: with `npm run dev` running, **saving `portfolio.json` reloads the page automatically**.
- **Checked on every build**: `npm run build` (and the deploy workflow) refuses to publish a `portfolio.json` that doesn't match the schema, and prints exactly what's wrong.
- **Mistakes are explained, not silent**:
  - **Syntax errors**: a typo such as a missing or extra comma shows a red bar on the page naming the line and column, plus the usual causes.
  - **Wrong data**: an item of the wrong type, or one missing its name, is skipped, and the browser console lists what to fix. The rest of the site keeps working.
- **Placeholders**: any text containing `TODO` is highlighted in amber on the site and on the billboards, so you can see what's left to fill in.
- **Links**: buttons only show when `url` starts with `http(s)://`, `mailto:` or `tel:`. An email contact without a `url` gets a `mailto:` link automatically, and every contact gets a **Copy** button. Set `profile.resumeUrl` to add a Résumé button.
- **Special characters**: text is HTML-escaped, so `<`, `&` and similar characters are safe. Inside JSON strings, write a double quote as `\"`.

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

- `/#projects` (also `#skills`, `#experience`, `#contact`): after **Drive the town**, drops the car at that city and opens the section.
- `/#list`: opens the page view right away. Good for a résumé link.

## Deploy (GitHub Pages)

The site deploys automatically with GitHub Actions ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)).

1. **One-time setup**: on GitHub, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**. "Deploy from a branch" no longer works, because the site is now built.
2. Every push to `main` then does the following:
   1. Checks the content.
   2. Type-checks the code.
   3. Builds the static site with the `/town-protfolio` base path.
   4. Publishes it to `https://<user>.github.io/town-protfolio/`.
3. Pull requests run the same checks and build without deploying, so mistakes show up before merging.

The workflow only checks out the folders the site needs, skipping the large unused model folders. The output is a plain static site, so any static host (Netlify, Vercel, Cloudflare Pages, S3) can serve the `out/` folder too.

The old `portfolio-track-demo.html` URL redirects to the home page.

## Project layout

```
app/                    Next.js App Router: layout.tsx (metadata, fonts), page.tsx, globals.css
components/TownApp.tsx  the page markup; boots the engine once on the client
lib/town/engine.js      the engine: 3D world, driving, traffic, sky, panels (framework-agnostic JS)
public/
  portfolio.json        ← all portfolio content (edit this)
  portfolio.schema.json   field descriptions + validation for editors and the build
  models/cars/          Kenney cars (CC0): 6 drivable + 5 traffic-only, shared texture
  models/muscle-car/    "Muscle car" option, loaded only if chosen
  models/traffic-light/ traffic lights at the town-square exits
scripts/validate-content.mjs   schema check run before every build
.github/workflows/deploy.yml   build + deploy to GitHub Pages
next.config.mjs         static export, base path for Pages

dodge_challenger_…/, australian_traffic_light_…/   original high-res sources of the two models above
road_modular/, city_scene/, neighbourhood_city_modular_lowpoly/, modular_bridge…/,
1998_ducati_748/, 2018_bmw_r_ninet_pure/, ford_*/  unused source models (not part of the site)
```

The engine is plain JavaScript and doesn't depend on React. `TownApp` renders the markup once, then calls `bootTown(THREE)`. The engine finds elements by id and drives them directly, and three.js comes from npm (`three@0.128.0`), so there's no CDN to go down. Models load in the background while the landing card shows; if one fails, the engine falls back to procedural geometry.

### How visitors see your portfolio

- **Landing card**: the first screen is a summary of you over a live flyover of the town: name, role, tagline, up to 4 `highlights`, top skills (from `topSkills`, or picked automatically from your skill groups), and buttons for every contact link with a real URL plus `resumeUrl`. A recruiter gets the essentials without driving. From there it's **Drive the town** or **Read as a page**.
- **Billboards**: every portfolio item stands in the world. Each district's main street is lined with lit billboards, one per project, job, skill group or contact method, so the portfolio can be read just by driving past. Pull up to one and press **E** to open the section scrolled to that exact item, which is highlighted. The shop at the end of each district's street opens the whole section.
- **Fast travel, page view and deep links** work as before (`1`–`4`, `L`, `#projects`, `#list`).

### How the world is built (`initWorld` in `lib/town/engine.js`)

```
              ~~~~~~~~~~~~~~~ SEA ~~~~~~~~~~~~~~~
                  ( ISLAND · Contact )  lighthouse
                          ║  Harbour Bridge
   ═══════════════ Waterfront Boulevard ════════════════
   ║           ║             │             ║            ║
   ║  PROJECTS ╬══ Market St ◯ Market St ══╬  SKILLS    ║
   ║   (west)  ║        town square        ║   (east)   ║
   ╠═══════════╬═══ Hill Rd ═╬═════════════╬════════════╣
   ║           ║  EXPERIENCE (Main Street) ║            ║
   ╚═══════════╩═════════════╩═════════════╩════════════╝
                    hills in the distance
```

North is −z and east is +x.

- **Layout**:
  - A ring road encloses the town. Its north side is the curving **Waterfront Boulevard** along a stone seawall.
  - Inside it, a street grid: **Market Street** east–west through the **town square** roundabout, **Main Street** north–south, plus **West Avenue**, **East Avenue** and **Hill Road**.
  - Main Street continues north over **Harbour Bridge**, which has piers, railings and portal towers, to the **island**. The island has its own loop road and a lighthouse with a rotating beam at night.
  - Low hills sit behind the town and across the bay, and boats circle in the harbour.
  - Each district's shop sits where its main street meets the ring road, or at the far side of the island loop.
- **Street cross-section**: there are two lanes (`ROAD_HALF` each side of centre), a raised curb (`CURB_W` × `CURB_H`) and a tiled sidewalk (`SIDEWALK_W`). Every street is a centre-line resampled to about 1 point per metre, split at every junction. Asphalt, curbs, sidewalks and walls are generated from it and batched into one mesh per material.
- **Junctions**: no junction is placed by hand. On each street, any stretch of curb, sidewalk or edge line that would land on *another* street's asphalt is removed. The exact cut point is found by bisection, so curbs meet in clean L-shaped corners. Crosswalks and stop lines are added automatically where a street ends at another.
- **Land and sea**: `isLand(x, z)` decides what's ground. Buildings, billboards and trees are only placed on land, so nothing ends up in the water. The coast's shape and position are set by `BOULEVARD_Z`, `SHORE_Z`, `ISLAND_C`, `PLAZA_C` and friends at the top of the coast section.
- **Textures**: asphalt and paving are canvas-generated and use world-space UVs, so overlapping pieces at junctions line up seamlessly.
- **Street lights**: these are procedural poles with a glowing head and an additive light pool on the road, rather than real lights. That keeps the frame rate up.
- **Buildings**: buildings line every street, and the back lots inside each block are filled too, so the town reads as dense. Each district has its own mix of styles: glass and office towers for Projects, brick and plaster for the Skills market, and offices and brick for Experience. A building is only placed if all four corners of its footprint clear every sidewalk, other buildings and the shoreline.
- **Billboards**: items go along the district's main street, first zig-zagging along one side, then the other side. If there are still more, they continue on the district's cross streets. A test with 30 projects placed all 30.
- **Collision**: the car stays on the union of all road surfaces, with its distance from the nearest centre-line limited so the wheels stay off the curb. Hitting the curb removes the part of the velocity going into it, so the car glances off and slides along. A hard hit shakes the camera.
- **Location readout**: the HUD shows the street name and the district, for example "Market Street · Projects district".
- **Debug view**: add `?debug` to the URL, then use `__town.topDown(x, z, height)` in the console for a bird's-eye view. `__town.follow()` returns to the chase camera.

### Day and night (`applySky` in `lib/town/engine.js`)

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

### How the driving works (`physicsStep` / `updateCar` in `lib/town/engine.js`)

The physics runs in fixed **120 Hz steps**, so the car behaves the same at any frame rate. One unit is one metre.

- **Cars**: there are seven, defined in `CARS`. Each one has its own top speed, acceleration, braking, tyre grip and steering lock. The Kenney models have separate wheel nodes, so each wheel is placed on a pivot at its hub, where it spins with distance travelled and the front wheels turn with the steering.
- **Engine**: force tapers off toward top speed. Rolling resistance and aerodynamic drag slow the car when you lift off. Braking stops the car without reversing; keep holding `S` once stopped to reverse.
- **Steering**: this uses a bicycle model, where turn rate = speed × tan(steering angle) ÷ wheelbase. The car can't turn on the spot, and there's less steering lock at speed. Turn rate is also capped by tyre grip (about 0.9 g for the sedan). Steering too hard at speed makes the car **understeer** wide instead of turning impossibly tight.
- **Drift**: velocity is tracked separately from heading, and grip bleeds off sideways slide. The handbrake drops grip and lets the rear step out.
- **Feel**: the body pitches under braking and acceleration and rolls in corners, and there are brake and reverse lights. The chase camera pulls back and widens with speed and looks ahead.
- **HUD**: shows real km/h, the gear (R/N/1–5 from simulated gear ratios) and an RPM bar.
- **Sound**: a small WebAudio synth (detuned oscillators through a low-pass filter) follows RPM and throttle, with filtered noise for tyre squeal. It starts when you click *Start Engine*, and the on/off setting is remembered.

- **Traffic**: Cars from the same CC0 kit drive on the right around the ring road, the town square and the island loop, at 30–45 km/h. The number of cars scales with road length (about 15 in total).
  - They keep a gap to the car ahead (never closer than about 12 m bumper to bumper in testing).
  - They brake to a stop behind you if you block their lane.
  - They show brake lights and headlights.
  - They're solid: each car is three circles along its length, so bumping one pushes you out and cancels the speed going into it, with a thud and a camera shake. The car you hit pauses for a moment. Traffic appears as white dots on the minimap.

With `?debug` in the URL, `__town.sim(seconds)` advances the physics instantly, and `__town.input` / `__town.state` let you script or inspect a drive.

## Credits & licences

These models are used under their licences. Credits also appear in the in-app page view under **Credits**.

- **Car Kit** by [Kenney](https://kenney.nl/assets/car-kit): sports sedan, hot hatch, race car, police cruiser, taxi and luxury SUV, plus sedan, van, SUV, delivery van and truck for traffic. **CC0 (public domain)**: free for any use, no attribution required. See `public/models/cars/License.txt`.
- "Dodge Challenger – Muscle Car – Low-Poly" by Allay Design, Sketchfab Standard
- "Australian Traffic Light & Pedestrian Light" by JoTrain The Aussie, Sketchfab Standard

Each model folder has its own `license.txt`.

> ⚠️ The unused **Ford Mustang GT3**, **Ford 1934 Hot Rod** and **BMW R NineT Pure** models are **CC BY-NC-SA 4.0** (non-commercial, share-alike). Check those terms before you use them on a site that could count as commercial, such as one that promotes your services.
