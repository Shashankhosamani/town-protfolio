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

If you do open `index.html` straight from disk, it still works, but it uses simple procedural shapes instead of the real road, car and traffic-light models, and shows a notice saying so.

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
road_modular/                                   road tiles + light poles   (used)
dodge_challenger_-_muscle_car_-_low-poly/       player car                 (used)
australian_traffic_light__pedestrain_light/     traffic light prop         (used)
city_scene/, neighbourhood_city_modular_lowpoly/, modular_bridge…/,
1998_ducati_748/, 2018_bmw_r_ninet_pure/, ford_*/                          (not used yet)
```

The page loads only the `scene.web.gltf` files, which use small textures from `textures_web/`. Each model loads in the background while the intro screen shows. If a model fails, the page falls back to procedural geometry.

### How the world is built (`initWorld` in `index.html`)

- **Roads**: a circular hub, four spline spokes, and four looping city roads. Each one is a centre-line point list. The road-kit GLTF tile is stretched along it, or a flat ribbon is used if the model didn't load. Curbs and sidewalks are ribbons offset along the normals.
- **Collision**: the car's sideways offset from the nearest road centre-line is clamped to the curb. Hitting the edge slows the car down.
- **Cities**: each one has its own building palette, streetlight colour and tinted ground disc. Its shop sits on the far side of the loop from the hub.
- **Shops**: a shop opens its panel when the car is within 13 units of it.

## Credits & licences

These models are used under their Sketchfab licences. The **CC BY 4.0** licence requires visible attribution, which the in-app page view shows under **Credits**.

- "Road Modular" by mortalityrexotable, CC BY 4.0
- "Dodge Challenger – Muscle Car – Low-Poly" by Allay Design, Sketchfab Standard
- "Australian Traffic Light & Pedestrian Light" by JoTrain The Aussie, Sketchfab Standard

Each model folder has its own `license.txt`.

> ⚠️ The unused **Ford Mustang GT3**, **Ford 1934 Hot Rod** and **BMW R NineT Pure** models are **CC BY-NC-SA 4.0** (non-commercial, share-alike). Check those terms before you use them on a site that could count as commercial, such as one that promotes your services.
