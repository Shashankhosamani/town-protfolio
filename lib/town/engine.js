/* eslint-disable */
// ---------------------------------------------------------------
// Portfolio Town engine: the 3D world, driving, traffic, sky and all
// the DOM wiring for the panels. It's framework-agnostic vanilla JS:
// components/TownApp.tsx renders the markup (element ids below), then
// calls bootTown(THREE) once on the client.
// ---------------------------------------------------------------
let booted = false;

export function bootTown(THREE) {
  if (booted) return;   // React StrictMode mounts effects twice in dev
  booted = true;

// The whole app. Runs once portfolio.json has loaded (see bootstrap at the bottom).
function startTown(PORTFOLIO){
  "use strict";

  // ---------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------
  function $(id){ return document.getElementById(id); }

  function showFatalError(msg){
    var el = $('fatal-error');
    el.textContent = 'Something went wrong: ' + msg + '\n(Open devtools console for the full trace. You can still press L for the page view.)';
    el.style.display = 'block';
    var startBtn = $('start-btn');
    if (startBtn && !running && worldBuilt){ startBtn.textContent = 'Drive the town ▸'; startBtn.disabled = false; }
  }
  window.addEventListener('error', function(e){ showFatalError(e.message || 'unknown error'); });

  function esc(s){
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  // Escape + visually flag any "TODO" placeholder so it's obvious
  // what still needs real content.
  function txt(s){
    var e = esc(s);
    return /TODO/.test(s || '') ? '<span class="todo" title="Placeholder — edit portfolio.json">' + e + '</span>' : e;
  }
  function isRealUrl(u){ return typeof u === 'string' && /^(https?:|mailto:|tel:)/i.test(u); }

  var toastTimer = null;
  function toast(msg){
    var t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ t.classList.remove('show'); }, 1800);
  }

  // ---------------------------------------------------------------
  // Content (from portfolio.json) + section registry
  // ---------------------------------------------------------------
  var P = PORTFOLIO || {};
  var profile = P.profile || {};

  // Order here = fast-travel keys 1..4 and panel prev/next order.
  var SECTIONS = [
    { key:'projects',   label:'Projects',   color:'#4da6ff', num:'01', dir:'west'     },
    { key:'skills',     label:'Skills',     color:'#ffb84d', num:'02', dir:'east'     },
    { key:'experience', label:'Experience', color:'#ff6b9d', num:'03', dir:'hillside' },
    { key:'contact',    label:'Contact',    color:'#a685ff', num:'04', dir:'island'   }
  ];
  var SECTION_BY_KEY = {};
  SECTIONS.forEach(function(s, i){ s.index = i; SECTION_BY_KEY[s.key] = s; });

  function linkButtons(links){
    var out = (links || []).filter(function(l){ return isRealUrl(l.url); }).map(function(l){
      return '<a class="btn small" href="' + esc(l.url) + '" target="_blank" rel="noopener">' + esc(l.label || 'Link') + ' ↗</a>';
    });
    return out.length ? '<div class="card-links">' + out.join('') + '</div>' : '';
  }
  function bullets(arr){
    arr = (arr || []).filter(Boolean);
    return arr.length ? '<ul>' + arr.map(function(b){ return '<li>' + txt(b) + '</li>'; }).join('') + '</ul>' : '';
  }
  function chips(arr){
    arr = (arr || []).filter(Boolean);
    return arr.length ? '<ul class="chips">' + arr.map(function(c){ return '<li>' + txt(c) + '</li>'; }).join('') + '</ul>' : '';
  }

  var RENDERERS = {
    projects: function(d){
      return '<div class="cards">' + (d.items || []).map(function(p, i){
        return '<article class="card" data-item="' + i + '">' +
          '<div class="card-head"><h3>' + txt(p.name) + '</h3>' + (p.year ? '<span class="meta">' + txt(p.year) + '</span>' : '') + '</div>' +
          (p.summary ? '<p>' + txt(p.summary) + '</p>' : '') +
          bullets(p.details) + chips(p.tags) + linkButtons(p.links) +
        '</article>';
      }).join('') + '</div>';
    },
    skills: function(d){
      return '<div class="skill-groups">' + (d.groups || []).map(function(g, i){
        return '<div class="skill-group" data-item="' + i + '"><h3>' + txt(g.name) + '</h3>' + chips(g.items) + '</div>';
      }).join('') + '</div>';
    },
    experience: function(d){
      return '<ol class="timeline">' + (d.items || []).map(function(x, i){
        return '<li data-item="' + i + '">' +
          '<h3>' + txt(x.role) + (x.org ? ' <span class="org">· ' + txt(x.org) + '</span>' : '') + '</h3>' +
          (x.period ? '<div class="meta">' + txt(x.period) + '</div>' : '') +
          (x.summary ? '<p>' + txt(x.summary) + '</p>' : '') +
          bullets(x.highlights) +
        '</li>';
      }).join('') + '</ol>';
    },
    contact: function(d){
      var ICON = { email:'@', github:'GH', linkedin:'in', x:'X', website:'www', other:'→' };
      return '<ul class="contact-list">' + (d.links || []).map(function(l, i){
        var url = l.url;
        if (!url && l.kind === 'email' && l.value && !/TODO/.test(l.value)) url = 'mailto:' + l.value;
        var inner =
          '<span class="contact-icon">' + esc(ICON[l.kind] || ICON.other) + '</span>' +
          '<span><span class="label">' + esc(l.label || l.kind || '') + '</span><br><span class="value">' + txt(l.value || url || '') + '</span></span>';
        var copy = (l.value && !/TODO/.test(l.value))
          ? '<button class="btn small copy-btn" data-copy="' + esc(l.value) + '" aria-label="Copy ' + esc(l.label || '') + '">Copy</button>' : '';
        return '<li data-item="' + i + '">' + (isRealUrl(url)
          ? '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + inner + copy + '</a>'
          : '<div class="contact-row">' + inner + copy + '</div>') + '</li>';
      }).join('') + '</ul>';
    }
  };

  function renderSectionBody(key){
    var d = P[key] || {};
    var html = d.intro ? '<p class="section-intro">' + txt(d.intro) + '</p>' : '';
    return html + (RENDERERS[key] ? RENDERERS[key](d) : '');
  }
  function sectionTitle(key){ return (P[key] && P[key].title) || SECTION_BY_KEY[key].label; }

  // Copy buttons anywhere (event delegation)
  document.addEventListener('click', function(e){
    var b = e.target.closest && e.target.closest('[data-copy]');
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    var v = b.getAttribute('data-copy');
    var ok = function(){ b.textContent = 'Copied'; setTimeout(function(){ b.textContent = 'Copy'; }, 1400); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(v).then(ok, function(){});
    else ok();
  });

  // ---------------------------------------------------------------
  // Static text from profile
  // ---------------------------------------------------------------
  if (profile.name){
    $('intro-name').textContent = profile.name;
    $('list-title').textContent = profile.name;
    document.title = profile.name + ' — Portfolio Town';
  }
  $('intro-role').textContent = [profile.role, (profile.location && !/TODO/.test(profile.location)) ? profile.location : ''].filter(Boolean).join(' · ');
  if (profile.handle) $('hud-brand').textContent = profile.handle;
  $('hud-role').textContent = profile.role || '';
  $('list-intro').textContent = profile.tagline || '';

  // ---- landing card: who you are, before anyone has to drive ----
  $('intro-lede').innerHTML = txt(profile.tagline || '');
  $('intro-highlights').innerHTML = (profile.highlights || []).filter(Boolean).slice(0, 4)
    .map(function(h){ return '<li>' + txt(h) + '</li>'; }).join('');
  (function(){
    var top = (profile.topSkills || []).filter(Boolean);
    if (!top.length){                       // round-robin across skill groups
      var groups = ((P.skills && P.skills.groups) || []).map(function(g){ return (g.items || []).slice(); });
      for (var round = 0; top.length < 8 && round < 4; round++)
        groups.forEach(function(g){ if (g[round] && top.length < 8) top.push(g[round]); });
    }
    $('intro-skills').innerHTML = top.map(function(t){ return '<li>' + txt(t) + '</li>'; }).join('');
    var btns = [];
    ((P.contact && P.contact.links) || []).forEach(function(l){
      var url = l.url;
      if (!url && l.kind === 'email' && l.value && !/TODO/.test(l.value)) url = 'mailto:' + l.value;
      if (isRealUrl(url)) btns.push('<a class="btn small" href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(l.label || l.kind) + ' ↗</a>');
    });
    if (isRealUrl(profile.resumeUrl)) btns.unshift('<a class="btn small" href="' + esc(profile.resumeUrl) + '" target="_blank" rel="noopener">Résumé ↗</a>');
    $('intro-contact').innerHTML = btns.join('');
    if (!btns.length) $('intro-contact').style.display = 'none';
  })();

  // ---------------------------------------------------------------
  // Overlays: panel / help / list view. Only one open at a time.
  // ---------------------------------------------------------------
  var openOverlay = null;     // 'panel' | 'help' | 'list' | null
  var currentPanelKey = null;
  var lastFocus = null;
  var OVERLAY_EL = { panel: $('panel-overlay'), help: $('help-overlay'), list: $('list-view') };

  function showOverlay(name, focusEl){
    if (openOverlay && openOverlay !== name) OVERLAY_EL[openOverlay].classList.remove('open');
    if (!openOverlay) lastFocus = document.activeElement;
    openOverlay = name;
    OVERLAY_EL[name].classList.add('open');
    releaseInput();
    $('station-prompt').classList.remove('show');
    setTimeout(function(){ (focusEl || OVERLAY_EL[name].querySelector('.sheet-close')).focus(); }, 30);
  }
  function closeOverlay(){
    if (!openOverlay) return;
    OVERLAY_EL[openOverlay].classList.remove('open');
    openOverlay = null;
    currentPanelKey = null;
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    if (lastFocus && lastFocus.focus && document.body.contains(lastFocus)) lastFocus.focus();
    else if (renderer) renderer.domElement.focus && renderer.domElement.focus();
  }
  Object.keys(OVERLAY_EL).forEach(function(k){
    OVERLAY_EL[k].addEventListener('click', function(e){ if (e.target === OVERLAY_EL[k]) closeOverlay(); });
  });
  document.querySelectorAll('.sheet-close, [data-close]').forEach(function(b){ b.addEventListener('click', closeOverlay); });
  $('panel-back').addEventListener('click', closeOverlay);

  // Simple focus trap so keyboard users stay inside the open dialog.
  document.addEventListener('keydown', function(e){
    if (e.key !== 'Tab' || !openOverlay) return;
    var f = OVERLAY_EL[openOverlay].querySelectorAll('a[href], button:not([disabled])');
    if (!f.length) return;
    var first = f[0], last = f[f.length-1];
    if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
  });

  function openPanel(key, focusItem){
    var s = SECTION_BY_KEY[key];
    if (!s) return;
    currentPanelKey = key;
    var sheet = $('panel');
    sheet.style.setProperty('--sec', s.color);
    $('panel-eyebrow').textContent = 'STOP ' + s.num + ' — ' + s.label.toUpperCase();
    $('panel-eyebrow').style.color = s.color;
    $('panel-title').textContent = sectionTitle(key);
    $('panel-body').innerHTML = renderSectionBody(key);
    var prev = SECTIONS[(s.index + SECTIONS.length - 1) % SECTIONS.length];
    var next = SECTIONS[(s.index + 1) % SECTIONS.length];
    $('panel-prev').textContent = '← ' + prev.label;
    $('panel-prev').onclick = function(){ openPanel(prev.key); };
    $('panel-next').textContent = next.label + ' →';
    $('panel-next').onclick = function(){ openPanel(next.key); };
    sheet.scrollTop = 0;
    history.replaceState(null, '', '#' + key);
    showOverlay('panel');
    if (focusItem !== undefined){
      var el = $('panel-body').querySelector('[data-item="' + focusItem + '"]');
      if (el){
        el.classList.add('focus');
        setTimeout(function(){ sheet.scrollTop = Math.max(0, el.offsetTop - 90); }, 40);
      }
    }
  }

  function buildListView(){
    $('list-nav').innerHTML = SECTIONS.map(function(s){
      return '<a class="btn small" href="#list-' + s.key + '" style="border-color:' + s.color + '55">' + esc(s.label) + '</a>';
    }).join('') + '<a class="btn small" href="#list-credits">Credits</a>';
    $('list-body').innerHTML = SECTIONS.map(function(s){
      return '<section class="list-section" id="list-' + s.key + '" style="--sec:' + s.color + '">' +
        '<div class="eyebrow" style="color:' + s.color + '">' + s.num + ' — ' + s.label.toUpperCase() + '</div>' +
        '<h2>' + esc(sectionTitle(s.key)) + '</h2>' + renderSectionBody(s.key) +
      '</section>';
    }).join('') + creditsHtml();
    // in-sheet anchor nav without touching the page hash
    $('list-nav').addEventListener('click', function(e){
      var a = e.target.closest('a'); if (!a) return;
      e.preventDefault();
      var t = document.querySelector(a.getAttribute('href'));
      if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // 3D model credits — several of these are CC-BY, which REQUIRES
  // visible attribution wherever the work is shared.
  var CREDITS = [
    { title:'Car Kit (player cars and traffic)', author:'Kenney', url:'https://kenney.nl/assets/car-kit', license:'CC0', site:'kenney.nl' },
    { title:'Dodge Challenger – Muscle Car – Low-Poly', author:'Allay Design', url:'https://sketchfab.com/3d-models/dodge-challenger-muscle-car-low-poly-4c741c8d40c34ebe8b999e5a2823d80f', license:'Sketchfab Standard' },
    { title:'Australian Traffic Light & Pedestrian Light', author:'JoTrain The Aussie', url:'https://sketchfab.com/3d-models/australian-traffic-light-pedestrain-light-72b20af0bca44dfab473cbbd1f0af7a2', license:'Sketchfab Standard' }
  ];
  function creditsHtml(){
    return '<section class="list-section" id="list-credits">' +
      '<div class="eyebrow" style="color:var(--ink-dim)">CREDITS</div><h2>Built with</h2>' +
      '<ul class="credits">' +
        '<li>Rendering: <a href="https://threejs.org" target="_blank" rel="noopener">three.js</a> r128</li>' +
        CREDITS.map(function(c){
          return '<li>"' + esc(c.title) + '" by ' + esc(c.author) + ' — <a href="' + esc(c.url) + '" target="_blank" rel="noopener">' + esc(c.site || 'Sketchfab') + '</a> (' + esc(c.license) + ')</li>';
        }).join('') +
      '</ul></section>';
  }
  buildListView();

  function openList(scrollToKey){
    showOverlay('list');
    var sheet = OVERLAY_EL.list.querySelector('.sheet');
    if (scrollToKey){
      var t = $('list-' + scrollToKey);
      setTimeout(function(){ if (t) sheet.scrollTop = t.offsetTop - 70; }, 40);
    }
  }
  function openHelp(){ showOverlay('help'); }

  $('intro-list-btn').addEventListener('click', function(){ openList(); });
  $('hud-list-btn').addEventListener('click', function(){ openList(currentCity); });
  $('hud-help-btn').addEventListener('click', openHelp);

  // ---------------------------------------------------------------
  // Environment checks
  // ---------------------------------------------------------------
  function hasWebGL(){
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch(e){ return false; }
  }
  var webglOK = typeof THREE !== 'undefined' && hasWebGL();
  if (location.protocol === 'file:') $('file-notice').style.display = 'block';
  if (!webglOK){
    $('webgl-notice').style.display = 'block';
    $('start-btn').style.display = 'none';
    $('load-bar').style.display = 'none';
    $('load-status').style.display = 'none';
    $('intro').classList.add('no-3d');
    $('intro-controls').style.display = 'none';
    $('car-pick').style.display = 'none';
    document.querySelector('#intro .city-legend').style.display = 'none';
    document.querySelector('#intro .intro-explore-h').textContent = 'EXPLORE';
    var lb = $('intro-list-btn');
    lb.classList.add('primary'); lb.textContent = 'Read the portfolio';
    if (typeof THREE === 'undefined') $('webgl-notice').textContent = "The 3D library couldn't load (offline, or a blocker?). Everything is still readable in the page view.";
  }

  // Deep link: #list opens page view; #projects etc. opens that section after start.
  var initialHash = (location.hash || '').replace('#','');
  if (initialHash === 'list') setTimeout(function(){ openList(); }, 0);

  // ---------------------------------------------------------------
  // Input state shared by keyboard + touch
  // ---------------------------------------------------------------
  var input = { forward:false, backward:false, left:false, right:false, handbrake:false };
  function releaseInput(){
    input.forward = input.backward = input.left = input.right = input.handbrake = false;
    document.querySelectorAll('.tbtn.held').forEach(function(b){ b.classList.remove('held'); });
  }
  window.addEventListener('blur', releaseInput);
  document.addEventListener('visibilitychange', function(){ if (document.hidden) releaseInput(); });

  // These are assigned once the world exists.
  var running = false, renderer = null, currentCity = null;
  var teleportTo = function(){}, resetCar = function(){}, tryInteract = function(){};
  var changeCar = function(){}, toggleSound = function(){}, changeSky = function(){};

  window.addEventListener('keydown', function(e){
    var k = e.key.toLowerCase();
    if (k === 'escape'){ closeOverlay(); return; }
    if (openOverlay){
      if (openOverlay === 'panel' && (k === 'arrowleft' || k === 'arrowright')){
        (k === 'arrowleft' ? $('panel-prev') : $('panel-next')).click();
      }
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (k === 'l'){ openList(running ? currentCity : null); return; }
    if (k === 'h' || k === '?'){ openHelp(); return; }
    if (!running) return;
    switch(k){
      case 'w': case 'arrowup': input.forward = true; e.preventDefault(); break;
      case 's': case 'arrowdown': input.backward = true; e.preventDefault(); break;
      case 'a': case 'arrowleft': input.left = true; e.preventDefault(); break;
      case 'd': case 'arrowright': input.right = true; e.preventDefault(); break;
      case 'e': case 'enter': tryInteract(); break;
      case 'r': resetCar(); break;
      case ' ': input.handbrake = true; e.preventDefault(); break;
      case 'c': changeCar(1); break;
      case 'm': toggleSound(); break;
      case 't': changeSky(); break;
      case '1': case '2': case '3': case '4': teleportTo(SECTIONS[+k - 1].key); break;
    }
  });
  window.addEventListener('keyup', function(e){
    switch(e.key.toLowerCase()){
      case 'w': case 'arrowup': input.forward = false; break;
      case 's': case 'arrowdown': input.backward = false; break;
      case 'a': case 'arrowleft': input.left = false; break;
      case 'd': case 'arrowright': input.right = false; break;
      case ' ': input.handbrake = false; break;
    }
  });

  if (!webglOK) return;   // nothing 3D below this line can run

  // ---------------------------------------------------------------
  // Real 3D assets (GLTF), fetched in parallel with the intro screen
  // so they're usually ready before Start is even clicked. Every use
  // below degrades gracefully to a procedural version if an asset
  // fails to load — e.g. the file was opened as file:// instead of
  // served over http://, which blocks the fetch.
  // ---------------------------------------------------------------
  // ---------------------------------------------------------------
  // Cars you can drive. The Kenney models are CC0 (public domain);
  // each has separate wheel nodes, so wheels spin and steer.
  //   top   — top speed, m/s        accel — 0-to-speed punch, m/s²
  //   brake — m/s²                  grip  — how fast sideways slide dies
  //   steer — max front-wheel angle at low speed, radians
  // ---------------------------------------------------------------
  var CARS = [
    { id:'sedan-sports',     name:'Sports sedan',   url:'models/cars/sedan-sports.glb',     length:4.6, top:36, accel:10,  brake:15, grip:7.5, steer:0.55 },
    { id:'hatchback-sports', name:'Hot hatch',      url:'models/cars/hatchback-sports.glb', length:4.1, top:33, accel:11,  brake:15, grip:8.5, steer:0.62 },
    { id:'race',             name:'Race car',       url:'models/cars/race.glb',             length:4.7, top:44, accel:14,  brake:19, grip:10,  steer:0.5  },
    { id:'police',           name:'Police cruiser', url:'models/cars/police.glb',           length:5.0, top:38, accel:10.5,brake:15, grip:7,   steer:0.52 },
    { id:'taxi',             name:'Taxi',           url:'models/cars/taxi.glb',             length:4.7, top:30, accel:8,   brake:13, grip:6.5, steer:0.55 },
    { id:'suv-luxury',       name:'Luxury SUV',     url:'models/cars/suv-luxury.glb',       length:4.9, top:31, accel:8.5, brake:13, grip:6,   steer:0.5  },
    { id:'muscle',           name:'Muscle car',     url:'models/muscle-car/scene.gltf',
                             length:4.6, top:40, accel:12.5, brake:14, grip:5, steer:0.5, flip:true, noWheels:true }
  ];
  var CAR_BY_ID = {};
  CARS.forEach(function(c){ CAR_BY_ID[c.id] = c; });
  var carId = 'sedan-sports';
  try { var savedCar = localStorage.getItem('town.car'); if (CAR_BY_ID[savedCar]) carId = savedCar; } catch(e){}
  function saveCarChoice(){ try { localStorage.setItem('town.car', carId); } catch(e){} }

  function refreshCarLabels(){
    var name = CAR_BY_ID[carId].name;
    $('car-name').textContent = name;
    $('hud-car-btn').textContent = '⇄ ' + name;
  }
  function cycleCarId(dir){
    var i = CARS.indexOf(CAR_BY_ID[carId]);
    carId = CARS[(i + dir + CARS.length) % CARS.length].id;
    saveCarChoice();
    refreshCarLabels();
  }
  $('car-prev').addEventListener('click', function(){ cycleCarId(-1); });
  $('car-next').addEventListener('click', function(){ cycleCarId(1); });
  refreshCarLabels();

  var ASSETS = { cars: {}, trafficLight: null };
  var assetsSettled = false, gltfLoader = null;

  function setLoad(frac, msg){
    $('load-bar').firstElementChild.style.width = Math.round(frac*100) + '%';
    $('load-status').textContent = msg;
  }

  // Load (or reuse) one car model; cb(sceneOrNull)
  var carLoads = {};
  function loadCarModel(spec, cb, onProgress){
    if (ASSETS.cars[spec.id] !== undefined){ cb(ASSETS.cars[spec.id]); return; }
    if (!gltfLoader){ ASSETS.cars[spec.id] = null; cb(null); return; }
    if (carLoads[spec.id]){ carLoads[spec.id].push(cb); return; }
    carLoads[spec.id] = [cb];
    gltfLoader.load(spec.url, function(gltf){
      ASSETS.cars[spec.id] = gltf.scene;
      carLoads[spec.id].forEach(function(f){ f(gltf.scene); }); delete carLoads[spec.id];
    }, onProgress, function(err){
      console.warn('[assets] car "' + spec.id + '" failed to load — using a simple stand-in. ' +
        'If you opened this file directly, run it with `npm run dev` instead.', err);
      ASSETS.cars[spec.id] = null;
      carLoads[spec.id].forEach(function(f){ f(null); }); delete carLoads[spec.id];
    });
  }

  function loadAssets(){
    try {
      gltfLoader = new THREE.GLTFLoader();
    } catch(e){
      console.warn('[assets] GLTFLoader unavailable — using procedural fallback everywhere.', e);
      setLoad(1, 'Ready (simplified graphics)');
      assetsSettled = true;
      return;
    }
    // the chosen car + every small Kenney car (the muscle car only if chosen)
    var jobs = CARS.filter(function(c){ return c.id === carId || !c.noWheels; }).map(function(c){ return { key: 'car:' + c.id, car: c }; });
    jobs.push({ key: 'trafficLight', url: 'models/traffic-light/scene.gltf' });
    var progress = {}, failed = 0, remaining = jobs.length;
    function report(){
      var sum = 0;
      jobs.forEach(function(j){ sum += progress[j.key] || 0; });
      setLoad(sum / jobs.length, 'Loading 3D models… ' + Math.round(sum / jobs.length * 100) + '%');
    }
    function done(ok){
      if (!ok) failed++;
      remaining--;
      report();
      if (remaining <= 0){
        assetsSettled = true;
        setLoad(1, failed ? 'Ready — ' + failed + ' model(s) unavailable, using simple shapes' : 'Ready');
      }
    }
    function prog(job){ return function(xhr){
      if (xhr && xhr.lengthComputable && xhr.total){ progress[job.key] = Math.min(0.99, xhr.loaded / xhr.total); report(); }
    }; }
    jobs.forEach(function(job){
      if (job.car){
        loadCarModel(job.car, function(sceneObj){ progress[job.key] = 1; done(!!sceneObj); }, prog(job));
        return;
      }
      gltfLoader.load(job.url, function(gltf){
        ASSETS[job.key] = gltf.scene;
        progress[job.key] = 1;
        done(true);
      }, prog(job), function(err){
        console.warn('[assets] ' + job.key + ' failed to load — skipping.', err);
        progress[job.key] = 1;
        done(false);
      });
    });
  }
  loadAssets();


  // ---------------------------------------------------------------
  // Cheap, immediate setup: renderer / scene / camera / lights /
  // ground. Kept small on purpose so it can't be what breaks Start.
  // ---------------------------------------------------------------
  var wrap = $('canvas-wrap');
  var scene = new THREE.Scene();
  var SKY_COLOR = 0x141826;
  scene.background = new THREE.Color(SKY_COLOR);
  scene.fog = new THREE.FogExp2(SKY_COLOR, 0.006);

  var camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.5, 700);
  camera.position.set(0, 8, -20);

  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', failIfMajorPerformanceCaveat: false });
  } catch(e){
    renderer = new THREE.WebGLRenderer({ antialias:false, failIfMajorPerformanceCaveat:false });
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.domElement.style.cursor = 'grab';
  renderer.domElement.setAttribute('tabindex', '-1');
  wrap.appendChild(renderer.domElement);

  window.addEventListener('resize', function(){
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  var ambient = new THREE.AmbientLight(0x30405a, 0.9);
  var hemi = new THREE.HemisphereLight(0x6d7fa8, 0x1d2016, 0.55);
  scene.add(ambient); scene.add(hemi);
  var sun = new THREE.DirectionalLight(0xffb37a, 0.55);
  sun.position.set(-60, 40, -28);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048,2048);
  sun.shadow.camera.left = -210; sun.shadow.camera.right = 210;
  sun.shadow.camera.top = 210; sun.shadow.camera.bottom = -210;
  sun.shadow.camera.far = 500;
  sun.shadow.bias = -0.0006;
  scene.add(sun);
  var carBeam = null;
  // ---------------------------------------------------------------
  // Day & night that follow the visitor's real local time.
  //
  // The sun's elevation/azimuth come from a standard solar-position
  // formula (NOAA's approximation) using the visitor's clock and date.
  // Longitude is estimated from the timezone offset (15° per hour) and
  // latitude from the timezone's hemisphere, so no location permission
  // is ever requested. Everything — sky gradient, sun/moon, stars,
  // fog, sunlight direction and colour (shadows move through the day),
  // window lights, street lamps, headlights — is driven from that.
  // World orientation: −z is north, +x is east.
  // ---------------------------------------------------------------
  function smooth(a, b, x){ var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t*t*(3 - 2*t); }

  var GEO = (function(){
    var tz = '', lat = 28;
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch(e){}
    if (/^(Australia|Antarctica)|Pacific\/(Auckland|Fiji|Chatham)|America\/(Sao_Paulo|Argentina|Santiago|Montevideo|Asuncion|La_Paz|Lima)|Africa\/(Johannesburg|Maputo|Harare|Windhoek|Lusaka)|Indian\/(Mauritius|Reunion)/.test(tz)) lat = -30;
    else if (/^Europe|^Atlantic\/Reykjavik|America\/(Anchorage|Edmonton|Winnipeg|Toronto|Vancouver|Montreal|Halifax)/.test(tz)) lat = 50;
    else if (/^America\/(New_York|Chicago|Denver|Los_Angeles|Phoenix|Detroit)|Asia\/(Tokyo|Seoul|Shanghai|Beijing|Tehran)/.test(tz)) lat = 38;
    else if (/^Asia\/(Singapore|Jakarta|Kuala_Lumpur|Manila)|America\/(Bogota|Caracas|Panama)|Africa\/(Nairobi|Lagos|Accra)/.test(tz)) lat = 3;
    return { tz: tz, lat: lat };
  })();

  function solarPosition(date, latDeg, lonDeg){
    var rad = Math.PI/180;
    var start = Date.UTC(date.getUTCFullYear(), 0, 0);
    var doy = Math.floor((date.getTime() - start) / 864e5);
    var hr = date.getUTCHours() + date.getUTCMinutes()/60 + date.getUTCSeconds()/3600;
    var g = 2*Math.PI/365 * (doy - 1 + (hr - 12)/24);
    var eqt = 229.18*(0.000075 + 0.001868*Math.cos(g) - 0.032077*Math.sin(g) - 0.014615*Math.cos(2*g) - 0.040849*Math.sin(2*g));
    var decl = 0.006918 - 0.399912*Math.cos(g) + 0.070257*Math.sin(g) - 0.006758*Math.cos(2*g)
             + 0.000907*Math.sin(2*g) - 0.002697*Math.cos(3*g) + 0.00148*Math.sin(3*g);
    var tst = hr*60 + eqt + 4*lonDeg;
    var ha = (tst/4 - 180) * rad, lat = latDeg * rad;
    var cosZ = Math.sin(lat)*Math.sin(decl) + Math.cos(lat)*Math.cos(decl)*Math.cos(ha);
    var zen = Math.acos(Math.max(-1, Math.min(1, cosZ)));
    var az = Math.atan2(Math.sin(ha), Math.cos(ha)*Math.sin(lat) - Math.tan(decl)*Math.cos(lat)) + Math.PI;
    return { el: 90 - zen/rad, az: az/rad };   // az: degrees clockwise from north
  }

  var SKY_MODES = [
    { id:'auto',   label:'Real time' },
    { id:'day',    label:'Day',    el: 52,  az: 160 },
    { id:'sunset', label:'Sunset', el: 1.5, az: 290 },
    { id:'night',  label:'Night',  el: -32, az: 20 }
  ];
  var skyMode = 'auto';
  try { var sm = localStorage.getItem('town.sky'); if (SKY_MODES.some(function(m){ return m.id === sm; })) skyMode = sm; } catch(e){}

  var skyTarget = { el: 0, az: 0 }, skyCur = null, skyClockTimer = 0;
  function computeSkyTarget(){
    var m = SKY_MODES.filter(function(x){ return x.id === skyMode; })[0];
    if (m.id !== 'auto'){ skyTarget.el = m.el; skyTarget.az = m.az; return; }
    var now = new Date();
    var lon = -now.getTimezoneOffset() / 4;      // 15° per hour of UTC offset
    var p = solarPosition(now, GEO.lat, lon);
    skyTarget.el = p.el; skyTarget.az = p.az;
  }

  // sky dome: gradient + sun disc/glow + moon, follows the camera
  var skyUniforms = {
    top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() }, below: { value: new THREE.Color() },
    sunDir: { value: new THREE.Vector3(0,1,0) }, sunColor: { value: new THREE.Color() }, sunVis: { value: 1 },
    moonDir: { value: new THREE.Vector3(0,1,0) }, moonVis: { value: 0 }
  };
  var skyDome = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 20), new THREE.ShaderMaterial({
    uniforms: skyUniforms, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: [
      'uniform vec3 top, horizon, below, sunColor; uniform vec3 sunDir, moonDir; uniform float sunVis, moonVis;',
      'varying vec3 vDir;',
      'void main(){',
      '  vec3 d = normalize(vDir); float h = d.y;',
      '  vec3 col = h > 0.0 ? mix(horizon, top, pow(h, 0.5)) : mix(horizon, below, min(1.0, -h*5.0));',
      '  float s = max(dot(d, sunDir), 0.0);',
      '  col += sunColor * (smoothstep(0.9993, 0.9997, s) * 2.0 + pow(s, 14.0) * 0.35 + pow(s, 3.0) * 0.08) * sunVis;',
      '  float m = max(dot(d, moonDir), 0.0);',
      '  col += vec3(0.85, 0.88, 1.0) * (smoothstep(0.9995, 0.9998, m) * 1.2 + pow(m, 60.0) * 0.12) * moonVis;',
      '  gl_FragColor = vec4(col, 1.0);',
      '}'
    ].join('\n')
  }));
  skyDome.renderOrder = -10;
  skyDome.frustumCulled = false;
  scene.add(skyDome);

  var stars = (function(){
    var n = 1400, pos = new Float32Array(n*3);
    for (var i=0;i<n;i++){
      var u = Math.random(), v = Math.random()*0.92 + 0.06;      // upper hemisphere
      var th = u*Math.PI*2, y = v, r = Math.sqrt(1 - y*y);
      pos[i*3] = Math.cos(th)*r*560; pos[i*3+1] = y*560; pos[i*3+2] = Math.sin(th)*r*560;
    }
    var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    pts.renderOrder = -9; pts.frustumCulled = false;
    scene.add(pts);
    return pts;
  })();

  var C = function(h){ return new THREE.Color(h); };
  var SKY = {
    nightTop: C(0x04070f), dayTop: C(0x3a7bd0), duskTop: C(0x27315e),
    nightHor: C(0x0f1526), dayHor: C(0xb7d3ec), duskHor: C(0xee8a58),
    sunLow: C(0xffa865), sunHigh: C(0xfff4e2), moon: C(0x9fb4ff),
    ambNight: C(0x30405a), ambDay: C(0xa9b9cd),
    hemiSkyNight: C(0x6d7fa8), hemiSkyDay: C(0xcfe2ff), hemiGndNight: C(0x1d2016), hemiGndDay: C(0x5d5a46)
  };
  var _c1 = new THREE.Color(), _c2 = new THREE.Color();
  var lightLevel = { windows: 1, lamps: 1 };   // read by later code

  function applySky(el, az){
    var rad = Math.PI/180;
    var day = smooth(-4, 12, el);
    var dusk = smooth(-10, -1, el) * (1 - smooth(5, 18, el));
    var night = 1 - smooth(-12, -3, el);
    var sx = Math.sin(az*rad)*Math.cos(el*rad), sy = Math.sin(el*rad), sz = -Math.cos(az*rad)*Math.cos(el*rad);
    skyUniforms.sunDir.value.set(sx, sy, sz).normalize();
    var md = new THREE.Vector3(-sx, Math.max(0.45, -sy), -sz).normalize();
    skyUniforms.moonDir.value.copy(md);

    var top = skyUniforms.top.value, hor = skyUniforms.horizon.value;
    top.copy(SKY.nightTop).lerp(SKY.dayTop, day).lerp(SKY.duskTop, dusk*0.6);
    hor.copy(SKY.nightHor).lerp(SKY.dayHor, day).lerp(SKY.duskHor, dusk*0.85);
    skyUniforms.below.value.copy(hor).multiplyScalar(0.45);
    skyUniforms.sunColor.value.copy(SKY.sunLow).lerp(SKY.sunHigh, smooth(2, 25, el));
    skyUniforms.sunVis.value = smooth(-3, 1, el);
    skyUniforms.moonVis.value = night;
    stars.material.opacity = night * 0.85;

    scene.background = hor;
    scene.fog.color.copy(hor);
    scene.fog.density = 0.006 + (0.0026 - 0.006) * day;

    // key light: the sun by day, a faint moon at night. The light's own
    // elevation is clamped so low sun doesn't throw endless shadows.
    var sunI = 1.25*day + 0.45*dusk*(el > -2 ? 1 : 0), moonI = 0.16*night;
    var useSun = sunI >= moonI;
    var lx, ly, lz;
    if (useSun){ var le = Math.max(8, el) * rad; lx = Math.sin(az*rad)*Math.cos(le); ly = Math.sin(le); lz = -Math.cos(az*rad)*Math.cos(le); }
    else { lx = md.x; ly = md.y; lz = md.z; }
    sun.position.set(lx*220, ly*220, lz*220);
    sun.intensity = Math.max(sunI, moonI);
    sun.color.copy(useSun ? _c1.copy(SKY.sunLow).lerp(SKY.sunHigh, smooth(2, 25, el)) : SKY.moon);

    ambient.color.copy(SKY.ambNight).lerp(SKY.ambDay, day);
    ambient.intensity = 0.9 + (0.5 - 0.9) * day;
    hemi.color.copy(SKY.hemiSkyNight).lerp(SKY.hemiSkyDay, day);
    hemi.groundColor.copy(SKY.hemiGndNight).lerp(SKY.hemiGndDay, day);
    hemi.intensity = 0.55 + (0.8 - 0.55) * day;

    // people switch lights on as it gets dark
    lightLevel.windows = 0.07 + 0.93 * (1 - smooth(-3, 9, el));
    lightLevel.lamps = 1 - smooth(-1, 6, el);
    if (typeof BLD !== 'undefined' && BLD){
      Object.keys(BLD.facade).forEach(function(s){ BLD.facade[s].forEach(function(f){ f.mat.emissiveIntensity = f.mat.userData.baseEmissive * lightLevel.windows; }); });
      BLD.shop.forEach(function(f){ f.mat.emissiveIntensity = 0.9 * (0.35 + 0.65*lightLevel.windows); });
    }
    Object.keys(lampMatCache).forEach(function(k){
      var m = lampMatCache[k];
      m.bulb.color.copy(_c2.set(+k)).multiplyScalar(0.25 + 0.75*lightLevel.lamps);
      m.pool.opacity = 0.42 * lightLevel.lamps;
      m.pool.visible = lightLevel.lamps > 0.02;
    });
    if (carBeam) carBeam.intensity = 1.4 * lightLevel.lamps;
  }

  function skyLabel(){
    var m = SKY_MODES.filter(function(x){ return x.id === skyMode; })[0];
    var now = new Date(), hh = String(now.getHours()).padStart(2,'0'), mm = String(now.getMinutes()).padStart(2,'0');
    var el = skyTarget.el, phase = el > 12 ? 'day' : el > -1 ? (now.getHours() < 12 ? 'sunrise' : 'sunset') : el > -10 ? 'twilight' : 'night';
    return m.id === 'auto' ? '☀ ' + hh + ':' + mm + ' · ' + phase : '☀ ' + m.label + ' (fixed)';
  }
  function updateSky(dt){
    skyClockTimer -= dt;
    if (skyClockTimer <= 0){        // real clock: re-check twice a minute
      computeSkyTarget();
      skyClockTimer = 30;
      var btn = $('hud-sky-btn'); if (btn) btn.textContent = skyLabel();
    }
    if (!skyCur){ skyCur = { el: skyTarget.el, az: skyTarget.az }; }
    else {
      var k = Math.min(1, dt * 1.6);
      skyCur.el += (skyTarget.el - skyCur.el) * k;
      var daz = ((skyTarget.az - skyCur.az + 540) % 360) - 180;
      skyCur.az = (skyCur.az + daz * k + 360) % 360;
    }
    skyDome.position.copy(camera.position);
    stars.position.copy(camera.position);
    applySky(skyCur.el, skyCur.az);
  }
  function cycleSky(){
    var i = SKY_MODES.map(function(m){ return m.id; }).indexOf(skyMode);
    skyMode = SKY_MODES[(i + 1) % SKY_MODES.length].id;
    try { localStorage.setItem('town.sky', skyMode); } catch(e){}
    skyClockTimer = 0;
    updateSky(0);
    toast(skyMode === 'auto' ? 'Sky follows your local time' : 'Sky: ' + SKY_MODES.filter(function(x){ return x.id === skyMode; })[0].label);
  }

  function makeGroundTexture(){
    var size = 512;
    var c = document.createElement('canvas');
    c.width = c.height = size;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#20261c';
    ctx.fillRect(0,0,size,size);
    for (var i=0;i<2200;i++){
      ctx.fillStyle = 'rgba(255,255,255,' + (Math.random()*0.035) + ')';
      ctx.fillRect(Math.random()*size, Math.random()*size, 2, 2);
    }
    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(38,38);
    return tex;
  }

  var ground = new THREE.Mesh(
    new THREE.PlaneGeometry(600,600),
    new THREE.MeshStandardMaterial({ map: makeGroundTexture(), roughness:1 })
  );
  ground.rotation.x = -Math.PI/2;
  ground.receiveShadow = true;
  scene.add(ground);

  renderer.render(scene, camera);

  // ---------------------------------------------------------------
  // Mouse / touch drag to look around; spring-back happens in
  // updateCamera once the world is running.
  // ---------------------------------------------------------------
  var isDragging = false, lastPX = 0, lastPY = 0;
  var lookYaw = 0, lookPitch = 0;
  var LOOK_SENS = 0.006;
  var PITCH_MIN = -0.45, PITCH_MAX = 0.55;

  renderer.domElement.addEventListener('pointerdown', function(e){
    isDragging = true; lastPX = e.clientX; lastPY = e.clientY;
    renderer.domElement.style.cursor = 'grabbing';
    try { renderer.domElement.setPointerCapture(e.pointerId); } catch(err){}
  });
  renderer.domElement.addEventListener('pointermove', function(e){
    if (!isDragging) return;
    var dx = e.clientX - lastPX, dy = e.clientY - lastPY;
    lastPX = e.clientX; lastPY = e.clientY;
    lookYaw -= dx * LOOK_SENS;
    lookPitch = Math.max(PITCH_MIN, Math.min(PITCH_MAX, lookPitch - dy * LOOK_SENS));
  });
  function endDrag(){ isDragging = false; renderer.domElement.style.cursor = 'grab'; }
  renderer.domElement.addEventListener('pointerup', endDrag);
  renderer.domElement.addEventListener('pointercancel', endDrag);
  renderer.domElement.addEventListener('pointerleave', endDrag);

  // ---------------------------------------------------------------
  // World state — built lazily on Start so a slow or failing build
  // can't block the button itself from responding.
  // ---------------------------------------------------------------
  var roads = [];                    // see makeRoad()
  var stationMeshes = [], car, CITY_DEFS = [], spawn = null;
  var camOffset, camTarget, forwardVec;
  var mmCanvas, mmCtx, MM_SCALE;
  var promptEl, promptTextEl, nearestStation = null;
  var clock, worldBuilt = false;
  var speedEl = $('speed-val'), locEl = $('location-readout'), gearEl = $('gear-val'), rpmEl = $('rpm-bar').firstElementChild;

  // ---------------------------------------------------------------
  // Street cross-section (1 unit ≈ 1 metre):
  //
  //   grass | sidewalk | curb |   lane   |   lane   | curb | sidewalk | grass
  //                          -ROAD_HALF  0  +ROAD_HALF
  // ---------------------------------------------------------------
  var ROAD_HALF = 5.0, CURB_W = 0.35, CURB_H = 0.16, SIDEWALK_W = 3.0;
  var STREET_EDGE = ROAD_HALF + CURB_W;
  var SIDEWALK_OUTER = STREET_EDGE + SIDEWALK_W;

  // ---------------------------------------------------------------
  // Coast: town constants, land/sea, bridge, lighthouse, hills, boats
  // ---------------------------------------------------------------
  var PLAZA_C = new THREE.Vector3(0, 0, 25), PLAZA_R = 20;            // town square (roundabout)
  var ISLAND_C = new THREE.Vector3(0, 0, -178), ISLAND_R = 28;        // island loop road
  var ISLAND_LAND = 46;                                               // island shore radius
  var trafficLoops = [];
  function BOULEVARD_Z(x){ return -40 + 4*Math.sin(x/35); }           // waterfront road centre-line
  function SHORE_Z(x){ return BOULEVARD_Z(x) - 13; }                  // seawall, north of the promenade
  var SEA_Y = -1.6;
  function isLand(x, z){
    if (z > SHORE_Z(x) + 0.5) return true;
    var dx = x - ISLAND_C.x, dz = z - ISLAND_C.z;
    return dx*dx + dz*dz < (ISLAND_LAND - 0.5)*(ISLAND_LAND - 0.5);
  }

  var harbor = { water: null, boats: [], beam: null, beamLight: null, lampMat: null };

  function buildCoast(){
    ground.visible = false;
    // land: everything south of the shoreline, plus the island
    var tex = ground.material.map.clone();
    tex.needsUpdate = true;
    tex.repeat.set(1/16, 1/16);
    var landMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 1 });
    // the ground plane is rotated −90° about x, so shape y = −world z:
    // land runs from the shoreline south (world +z) to the map edge
    var shape = new THREE.Shape(), X = 700;
    shape.moveTo(-X, -X);
    for (var x = -X; x <= X; x += 10) shape.lineTo(x, -SHORE_Z(x));
    shape.lineTo(X, -X);
    var land = new THREE.Mesh(new THREE.ShapeGeometry(shape), landMat);
    land.rotation.x = -Math.PI/2; land.receiveShadow = true;
    scene.add(land);
    var isle = new THREE.Mesh(new THREE.CircleGeometry(ISLAND_LAND, 64), landMat);
    isle.rotation.x = -Math.PI/2; isle.position.set(ISLAND_C.x, 0, ISLAND_C.z); isle.receiveShadow = true;
    scene.add(isle);

    // seawall: stone face from the waterline up to the ground
    var wall = new GeoBatch(), stone = [0.55, 0.53, 0.49], top = [0.66, 0.64, 0.6];
    for (var wx = -X; wx < X; wx += 5){
      var z0 = SHORE_Z(wx), z1 = SHORE_Z(wx + 5);
      wall.quad([wx, SEA_Y, z0], [wx + 5, SEA_Y, z1], [wx + 5, 0.05, z1], [wx, 0.05, z0], [0, 0, -1], null, stone);
      wall.quad([wx, 0.05, z0 - 0.6], [wx + 5, 0.05, z1 - 0.6], [wx + 5, 0.05, z1], [wx, 0.05, z0], [0, 1, 0], null, top);
    }
    for (var k=0;k<96;k++){
      var a0 = k/96*Math.PI*2, a1 = (k+1)/96*Math.PI*2, r = ISLAND_LAND;
      var p0 = [ISLAND_C.x + Math.cos(a0)*r, ISLAND_C.z + Math.sin(a0)*r], p1 = [ISLAND_C.x + Math.cos(a1)*r, ISLAND_C.z + Math.sin(a1)*r];
      wall.quad([p0[0], SEA_Y, p0[1]], [p1[0], SEA_Y, p1[1]], [p1[0], 0.05, p1[1]], [p0[0], 0.05, p0[1]], [Math.cos(a0), 0, Math.sin(a0)], null, stone);
    }
    var wallMesh = wall.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide }));
    scene.add(wallMesh);

    // sea: a big plane with a slowly drifting ripple texture
    var c = document.createElement('canvas'); c.width = c.height = 256;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#1d5878'; ctx.fillRect(0,0,256,256);
    for (var i=0;i<260;i++){
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.03 + Math.random()*0.07) + ')';
      ctx.lineWidth = 1 + Math.random()*1.5;
      var sx = Math.random()*256, sy = Math.random()*256, len = 8 + Math.random()*26;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + len/2, sy - 2, sx + len, sy); ctx.stroke();
    }
    var wtex = new THREE.CanvasTexture(c);
    wtex.wrapS = wtex.wrapT = THREE.RepeatWrapping; wtex.repeat.set(60, 60);
    var water = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600),
      new THREE.MeshStandardMaterial({ map: wtex, roughness: 0.22, metalness: 0.15 }));
    water.rotation.x = -Math.PI/2; water.position.y = SEA_Y;
    scene.add(water);
    harbor.water = water;
  }

  // Bridge: deck, piers, railings and two portal towers over the water
  function buildBridge(road){
    var B = new GeoBatch(), deckC = [0.42, 0.41, 0.4], steel = [0.32, 0.36, 0.42], white = [0.86, 0.85, 0.82];
    var W = SIDEWALK_OUTER + 0.4;
    var wet = [];
    for (var s = 0; s <= road.length; s += 1){
      var p = frameAt(road, s).point;
      if (!isLand(p.x, p.z + 0) || !isLand(p.x, p.z)) wet.push(s);
    }
    if (!wet.length) return;
    var s0 = wet[0] - 3, s1 = wet[wet.length-1] + 3;
    var f0 = frameAt(road, s0), f1 = frameAt(road, s1);
    var mid = f0.point.clone().add(f1.point).multiplyScalar(0.5), len = f0.point.distanceTo(f1.point);
    var rot = Math.atan2(f0.tangent.x, f0.tangent.z);
    addBox(B, B, mid.x, -0.55, mid.z, W*2, 1.1, len, rot, null, deckC);                      // deck slab
    for (var s = s0 + 4; s < s1 - 2; s += 16){                                               // piers
      var f = frameAt(road, s);
      [-1, 1].forEach(function(side){
        var px = f.point.x + f.normal.x*side*4, pz = f.point.z + f.normal.z*side*4;
        addBox(B, null, px, -5, pz, 1.4, 8.8, 1.4, rot, null, deckC);
      });
    }
    for (var s2 = s0; s2 <= s1; s2 += 2.5){                                                  // railing posts
      var fr = frameAt(road, s2);
      [-1, 1].forEach(function(side){
        var rx = fr.point.x + fr.normal.x*side*(W - 0.15), rz = fr.point.z + fr.normal.z*side*(W - 0.15);
        addBox(B, B, rx, CURB_H + 0.55, rz, 0.12, 1.1, 0.12, rot, null, white);
      });
    }
    [-1, 1].forEach(function(side){                                                          // top rails
      var rx = mid.x + f0.normal.x*side*(W - 0.15), rz = mid.z + f0.normal.z*side*(W - 0.15);
      addBox(B, B, rx, CURB_H + 1.12, rz, 0.16, 0.1, len, rot, null, white);
    });
    [0.3, 0.7].forEach(function(t){                                                          // portal towers
      var ft = frameAt(road, s0 + (s1 - s0)*t);
      [-1, 1].forEach(function(side){
        var tx = ft.point.x + ft.normal.x*side*(W + 0.6), tz = ft.point.z + ft.normal.z*side*(W + 0.6);
        addBox(B, B, tx, 7.5, tz, 1.2, 15, 1.6, rot, null, steel);
      });
      addBox(B, B, ft.point.x, 14.4, ft.point.z, (W + 0.6)*2 + 1.2, 1.2, 1.6, rot, null, steel);
      addBox(B, B, ft.point.x, 11.8, ft.point.z, (W + 0.6)*2 + 1.2, 0.5, 1.0, rot, null, steel);
    });
    var m = B.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.2 }));
    m.castShadow = true;
    scene.add(m);
  }

  function buildLighthouse(c){
    var g = new THREE.Group(); g.position.set(c.x, 0, c.z);
    var white = new THREE.MeshStandardMaterial({ color: 0xeeeae2, roughness: 0.7 });
    var red = new THREE.MeshStandardMaterial({ color: 0xb8322a, roughness: 0.7 });
    var h = 0;
    [[2.4, 2.2, 4, white], [2.2, 2.0, 4, red], [2.0, 1.8, 4, white], [1.8, 1.6, 4, red]].forEach(function(t){
      var m = new THREE.Mesh(new THREE.CylinderGeometry(t[1], t[0], t[2], 20), t[3]);
      m.position.y = h + t[2]/2; m.castShadow = true; g.add(m); h += t[2];
    });
    var gallery = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.3, 20), new THREE.MeshStandardMaterial({ color: 0x2a2d33 }));
    gallery.position.y = h + 0.15; g.add(gallery);
    harbor.lampMat = new THREE.MeshBasicMaterial({ color: 0xfff1b0 });
    var lamp = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 2, 16), harbor.lampMat);
    lamp.position.y = h + 1.3; g.add(lamp);
    var roof = new THREE.Mesh(new THREE.ConeGeometry(1.8, 1.6, 16), red);
    roof.position.y = h + 3.1; roof.castShadow = true; g.add(roof);
    // rotating beam (visible at night)
    var beamGeo = new THREE.ConeGeometry(5, 70, 24, 1, true);
    beamGeo.translate(0, -35, 0); beamGeo.rotateZ(Math.PI/2);
    var beamMat = new THREE.MeshBasicMaterial({ color: 0xfff0b8, transparent: true, opacity: 0.12,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    var beam = new THREE.Group();
    var b1 = new THREE.Mesh(beamGeo, beamMat), b2 = new THREE.Mesh(beamGeo, beamMat);
    b2.rotation.y = Math.PI;
    beam.add(b1); beam.add(b2);
    beam.position.y = h + 1.3;
    g.add(beam);
    harbor.beam = beam;
    harbor.beamLight = new THREE.PointLight(0xfff0b8, 0, 40);
    harbor.beamLight.position.y = h + 1.3; g.add(harbor.beamLight);
    scene.add(g);
  }

  // Low-poly hills behind the town (and across the bay), scenery only
  function buildHills(){
    var mats = [0x3f5f3a, 0x46663e, 0x385534, 0x4d6b43].map(function(c){
      return new THREE.MeshStandardMaterial({ color: c, roughness: 1, flatShading: true });
    });
    // [x, z, radius] — kept well clear of the ring road (z ≤ 160, |x| ≤ 180)
    var spots = [[-250,330,120],[-90,320,110],[60,315,100],[200,330,120],[330,300,110],[-360,170,100],[370,150,100],
                 [-420,-260,140],[440,-300,160],[-20,400,140]];
    spots.forEach(function(sp, i){
      var geo = new THREE.IcosahedronGeometry(1, 2);
      var pos = geo.attributes.position;
      for (var v=0; v<pos.count; v++){ var k = 1 + (Math.sin(v*12.9898)*43758.5453 % 1) * 0.12; pos.setXYZ(v, pos.getX(v)*k, pos.getY(v)*k, pos.getZ(v)*k); }
      geo.computeVertexNormals();
      var m = new THREE.Mesh(geo, mats[i % mats.length]);
      var r = sp[2];
      m.scale.set(r, r*0.38, r*0.8);
      m.position.set(sp[0], sp[1] < 0 ? SEA_Y - r*0.12 : -r*0.12, sp[1]);
      m.receiveShadow = true;
      scene.add(m);
    });
  }

  function buildBoats(){
    var hullMats = [0xf2efe8, 0x2a4f7a, 0xb8322a, 0x2e2e33].map(function(c){ return new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 }); });
    var deck = new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.9 });
    var cabinMat = new THREE.MeshStandardMaterial({ color: 0xf5f3ee, roughness: 0.5 });
    var lightMat = new THREE.MeshBasicMaterial({ color: 0xffe2a0 });
    [[-150,-120,40,0.05],[140,-110,34,-0.06],[-70,-250,55,0.035],[110,-240,45,-0.04],[-260,-170,50,0.03]].forEach(function(b, i){
      var g = new THREE.Group();
      var hull = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.1, 7), hullMats[i % hullMats.length]);
      hull.position.y = 0.3; g.add(hull);
      var bow = new THREE.Mesh(new THREE.ConeGeometry(1.3, 2.2, 4), hullMats[i % hullMats.length]);
      bow.rotation.x = Math.PI/2; bow.rotation.y = Math.PI/4; bow.position.set(0, 0.3, 4.6); bow.scale.set(1, 1, 0.55); g.add(bow);
      var d = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 6.8), deck); d.position.y = 0.88; g.add(d);
      var cab = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 2.2), cabinMat); cab.position.set(0, 1.5, -0.6); g.add(cab);
      var lt = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), lightMat); lt.position.set(0, 2.2, -0.6); g.add(lt);
      g.traverse(function(o){ if (o.isMesh) o.castShadow = true; });
      scene.add(g);
      harbor.boats.push({ g: g, cx: b[0], cz: b[1], r: b[2], w: b[3], a: Math.random()*Math.PI*2, ph: Math.random()*6 });
    });
  }

  var harborT = 0;
  function updateHarbor(dt){
    harborT += dt;
    if (harbor.water){ harbor.water.material.map.offset.x = harborT * 0.004; harbor.water.material.map.offset.y = harborT * 0.0025; }
    harbor.boats.forEach(function(b){
      b.a += b.w * dt;
      var x = b.cx + Math.cos(b.a)*b.r, z = b.cz + Math.sin(b.a)*b.r;
      b.g.position.set(x, SEA_Y + 0.25 + Math.sin(harborT*1.3 + b.ph)*0.12, z);
      b.g.rotation.y = Math.atan2(-Math.sin(b.a)*Math.sign(b.w), Math.cos(b.a)*Math.sign(b.w));
      b.g.rotation.z = Math.sin(harborT*0.9 + b.ph)*0.04;
    });
    if (harbor.beam){
      harbor.beam.rotation.y += dt * 0.6;
      var on = lightLevel.lamps;
      harbor.beam.visible = on > 0.05;
      harbor.beam.children.forEach(function(m){ m.material.opacity = 0.12 * on; });
      harbor.beamLight.intensity = 1.6 * on;
      harbor.lampMat.color.setRGB(0.55 + 0.45*on, 0.53 + 0.41*on, 0.4 + 0.3*on);
    }
  }

  // Back lots: fill the inside of the blocks with buildings so the
  // town reads as dense, not as a single row along each street.
  function fillBlocks(palette){
    for (var x = -172; x <= 172; x += 12){
      for (var z = -26; z <= 152; z += 12){
        var jx = x + (Math.random()-0.5)*3, jz = z + (Math.random()-0.5)*3;
        if (!isLand(jx, jz)) continue;
        if (distToRoads(jx, jz, null) < SIDEWALK_OUTER + 9) continue;
        var dist = Infinity, near = null;
        CITY_DEFS.forEach(function(cd){ var d = Math.hypot(jx - cd.center.x, jz - cd.center.z); if (d < cd.radius && d < dist){ dist = d; near = cd; } });
        placeBuildingAt(V3(jx, 0, jz), V3(0, 0, 1), V3(1, 0, 0), {
          styles: near ? near.styles : { plaster: 3, brick: 3, office: 1 }, palette: near ? near.palette : palette,
          signColor: near ? near.color : undefined, fixedCenter: { x: jx, z: jz }, noShops: true
        });
      }
    }
  }
  function V3(x, y, z){ return new THREE.Vector3(x, y, z); }


  // ---------------------------------------------------------------
  // Polyline helpers
  // ---------------------------------------------------------------
  function computeNormals(pts, closed){
    var out = [];
    for (var i=0;i<pts.length;i++){
      var prev, next;
      if (closed){
        prev = pts[(i-1+pts.length)%pts.length];
        next = pts[(i+1)%pts.length];
      } else {
        prev = pts[Math.max(0,i-1)];
        next = pts[Math.min(pts.length-1,i+1)];
      }
      var tangent = next.clone().sub(prev).normalize();
      out.push(new THREE.Vector3(-tangent.z, 0, tangent.x).normalize());
    }
    return out;
  }

  function arcLengthTable(pts, closed){
    var cum = [0];
    for (var i=1;i<pts.length;i++) cum.push(cum[i-1] + pts[i].distanceTo(pts[i-1]));
    if (closed) cum.push(cum[cum.length-1] + pts[0].distanceTo(pts[pts.length-1]));
    return cum;
  }

  function sampleAtArcLength(pts, cum, dist){
    var n = pts.length;
    for (var i=1;i<cum.length;i++){
      if (cum[i] >= dist){
        var segLen = cum[i] - cum[i-1];
        var t = segLen > 1e-6 ? (dist - cum[i-1]) / segLen : 0;
        var a = pts[i-1], b = pts[i % n];
        return { point: a.clone().lerp(b, t), tangent: b.clone().sub(a).normalize() };
      }
    }
    var last = pts[n-1], prev = pts[Math.max(0,n-2)];
    return { point: last.clone(), tangent: last.clone().sub(prev).normalize() };
  }

  // Re-space a polyline so every road has an even ~1 sample per metre.
  function resample(pts, closed, spacing){
    var cum = arcLengthTable(pts, closed), total = cum[cum.length-1];
    var n = Math.max(1, Math.round(total / spacing));
    var out = [];
    for (var i=0; i < (closed ? n : n+1); i++) out.push(sampleAtArcLength(pts, cum, Math.min(total, i*total/n)).point);
    return out;
  }

  function makeRoad(key, pts, closed){
    var r = { key:key, centerPts: pts, closed: closed, normals: computeNormals(pts, closed) };
    r.cum = arcLengthTable(pts, closed);
    r.length = r.cum[r.cum.length-1];
    var b = { minX:Infinity, maxX:-Infinity, minZ:Infinity, maxZ:-Infinity };
    pts.forEach(function(p){
      if (p.x < b.minX) b.minX = p.x; if (p.x > b.maxX) b.maxX = p.x;
      if (p.z < b.minZ) b.minZ = p.z; if (p.z > b.maxZ) b.maxZ = p.z;
    });
    r.bbox = b;
    return r;
  }

  function frameAt(road, s){
    var f = sampleAtArcLength(road.centerPts, road.cum, s);
    f.normal = new THREE.Vector3(-f.tangent.z, 0, f.tangent.x);
    return f;
  }

  // Distance (xz) from a point to a road's centre-line. Roads further
  // than ~30m are rejected by bounding box and report Infinity, which
  // is fine: every caller only cares about nearby roads.
  // With flatEnds, a point lying beyond either end of an open road is
  // not "on" it: asphalt stops square at the end instead of being
  // rounded off, so a curb just past a T-junction stays intact.
  function closestOnRoad(road, x, z, out, flatEnds){
    var b = road.bbox, m = 30;
    if (x < b.minX-m || x > b.maxX+m || z < b.minZ-m || z > b.maxZ+m) return Infinity;
    var pts = road.centerPts, n = pts.length, segs = road.closed ? n : n-1, best = Infinity;
    for (var i=0;i<segs;i++){
      var a = pts[i], c = pts[(i+1)%n];
      var dx = c.x-a.x, dz = c.z-a.z, len2 = dx*dx + dz*dz;
      var t = len2 > 0 ? ((x-a.x)*dx + (z-a.z)*dz) / len2 : 0;
      if (flatEnds && !road.closed && ((i === 0 && t < 0) || (i === segs-1 && t > 1))) continue;
      t = t < 0 ? 0 : (t > 1 ? 1 : t);
      var px = a.x + dx*t, pz = a.z + dz*t;
      var d2 = (x-px)*(x-px) + (z-pz)*(z-pz);
      if (d2 < best){ best = d2; if (out){ out.x = px; out.z = pz; } }
    }
    return Math.sqrt(best);
  }
  function distToRoads(x, z, except, flatEnds){
    var best = Infinity;
    for (var i=0;i<roads.length;i++){
      if (roads[i] === except) continue;
      var d = closestOnRoad(roads[i], x, z, null, flatEnds);
      if (d < best) best = d;
    }
    return best;
  }
  function distanceToAnyRoad(pos){ return distToRoads(pos.x, pos.z, null); }

  // Which part of each segment survives on one side of a road: a
  // point is dropped when any probe offset lands on ANOTHER road's
  // asphalt. That single rule opens curbs, sidewalks and markings at
  // every T-junction and crossroads. Where a segment crosses the
  // boundary the exact cut point is found by bisection, so curbs end
  // precisely at the other road's edge instead of snapping to the
  // 1 m sample grid. Returns per segment null (dropped) or [t0, t1].
  function junctionMask(road, offsets, pad){
    var pts = road.centerPts, nrm = road.normals, n = pts.length, segs = road.closed ? n : n-1;
    var limit = ROAD_HALF + pad;
    function okAt(i, t){
      var j = (i+1) % n;
      var px = pts[i].x + (pts[j].x - pts[i].x)*t, pz = pts[i].z + (pts[j].z - pts[i].z)*t;
      var nx = nrm[i].x + (nrm[j].x - nrm[i].x)*t, nz = nrm[i].z + (nrm[j].z - nrm[i].z)*t;
      for (var k=0;k<offsets.length;k++){
        if (distToRoads(px + nx*offsets[k], pz + nz*offsets[k], road, true) < limit) return false;
      }
      return true;
    }
    var ok = [];
    for (var i=0;i<n;i++) ok.push(i < segs ? okAt(i, 0) : okAt(segs-1, 1));   // last point of an open road
    var out = [];
    for (var s=0;s<segs;s++){
      var a = ok[s], b = ok[(s+1)%n];
      if (a && b){ out.push([0,1]); continue; }
      if (!a && !b){ out.push(null); continue; }
      var lo = 0, hi = 1;                       // bisect for the boundary
      for (var it=0; it<12; it++){
        var mid = (lo+hi)/2;
        if (okAt(s, mid) === a) lo = mid; else hi = mid;
      }
      out.push(a ? [0, lo] : [hi, 1]);
    }
    return out;
  }

  // ---------------------------------------------------------------
  // Batched geometry: every road piece of one material goes into a
  // single mesh, so the whole network is a handful of draw calls.
  // ---------------------------------------------------------------
  function GeoBatch(){ this.pos = []; this.nrm = []; this.uv = []; this.idx = []; this.col = []; }
  // uv: number → world-space planar UVs at that scale; [u0,v0,u1,v1]
  // → that rect (a,b,c,d = bottom-left, bottom-right, top-right,
  // top-left); omitted → 0..1. col: optional [r,g,b] vertex colour.
  GeoBatch.prototype.quad = function(a, b, c, d, n, uv, col){
    var v = this.pos.length / 3, self = this;
    [a,b,c,d].forEach(function(p, k){
      self.pos.push(p[0], p[1], p[2]);
      self.nrm.push(n[0], n[1], n[2]);
      if (typeof uv === 'number') self.uv.push(p[0]/uv, p[2]/uv);
      else if (uv) self.uv.push(k===1||k===2 ? uv[2] : uv[0], k>=2 ? uv[3] : uv[1]);
      else self.uv.push(k===1||k===2 ? 1 : 0, k>=2 ? 1 : 0);
      if (col) self.col.push(col[0], col[1], col[2]);
      else if (self.col.length) self.col.push(1, 1, 1);
    });
    // wind so the face's geometric normal agrees with n (front-facing)
    var ux = b[0]-a[0], uy = b[1]-a[1], uz = b[2]-a[2], wx = c[0]-a[0], wy = c[1]-a[1], wz = c[2]-a[2];
    var fx = uy*wz - uz*wy, fy = uz*wx - ux*wz, fz = ux*wy - uy*wx;
    if (fx*n[0] + fy*n[1] + fz*n[2] >= 0) this.idx.push(v, v+1, v+2, v, v+2, v+3);
    else this.idx.push(v, v+2, v+1, v, v+3, v+2);
  };
  GeoBatch.prototype.mesh = function(mat){
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    if (this.col.length){
      while (this.col.length < this.pos.length) this.col.unshift(1);   // quads added before the first coloured one
      g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    }
    g.setIndex(this.idx);
    var m = new THREE.Mesh(g, mat);
    m.receiveShadow = true;
    return m;
  };

  // point at fraction t along segment i, pushed d sideways
  function offsetPt(road, i, t, d){
    var n = road.centerPts.length, j = (i+1) % n;
    var p = road.centerPts[i], q = road.centerPts[j], a = road.normals[i], b = road.normals[j];
    var nx = a.x + (b.x-a.x)*t, nz = a.z + (b.z-a.z)*t;
    return [p.x + (q.x-p.x)*t + nx*d, p.z + (q.z-p.z)*t + nz*d];
  }
  // flat strip between lateral offsets d0..d1 at height y
  function addStrip(B, road, d0, d1, y, keep, uvScale){
    var n = road.centerPts.length, segs = road.closed ? n : n-1;
    for (var i=0;i<segs;i++){
      var k = keep ? keep[i] : [0,1];
      if (!k) continue;
      var a = offsetPt(road, i, k[0], d0), b = offsetPt(road, i, k[0], d1), c = offsetPt(road, i, k[1], d1), d = offsetPt(road, i, k[1], d0);
      B.quad([a[0],y,a[1]], [b[0],y,b[1]], [c[0],y,c[1]], [d[0],y,d[1]], [0,1,0], uvScale);
    }
  }
  // vertical face at lateral offset d, facing ±normal
  function addWall(B, road, d, y0, y1, keep, facing){
    var n = road.centerPts.length, segs = road.closed ? n : n-1;
    for (var i=0;i<segs;i++){
      var k = keep ? keep[i] : [0,1];
      if (!k) continue;
      var nr = road.normals[i];
      var a = offsetPt(road, i, k[0], d), c = offsetPt(road, i, k[1], d);
      B.quad([a[0],y0,a[1]], [a[0],y1,a[1]], [c[0],y1,c[1]], [c[0],y0,c[1]], [nr.x*facing, 0, nr.z*facing]);
    }
  }
  // a road-aligned rectangle painted on the asphalt (dash, stripe…)
  function addPaint(B, road, s0, s1, l0, l1, y){
    var f0 = frameAt(road, Math.max(0, s0)), f1 = frameAt(road, Math.min(road.length, s1));
    var p = function(f, l){ return [f.point.x + f.normal.x*l, y, f.point.z + f.normal.z*l]; };
    B.quad(p(f0,l0), p(f0,l1), p(f1,l1), p(f1,l0), [0,1,0]);
  }

  // ---------------------------------------------------------------
  // Procedural surface textures (canvas → texture, world-space UVs so
  // overlapping pieces at junctions line up seamlessly)
  // ---------------------------------------------------------------
  function canvasTex(size, draw){
    var c = document.createElement('canvas');
    c.width = c.height = size;
    draw(c.getContext('2d'), size);
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return t;
  }
  function speckle(ctx, size, count, alphaMax, light){
    for (var i=0;i<count;i++){
      var a = Math.random()*alphaMax;
      ctx.fillStyle = light ? 'rgba(255,255,255,' + a + ')' : 'rgba(0,0,0,' + a + ')';
      var s = 1 + Math.random()*2;
      ctx.fillRect(Math.random()*size, Math.random()*size, s, s);
    }
  }
  var ROAD_TEX = null;
  function roadTextures(){
    if (ROAD_TEX) return ROAD_TEX;
    ROAD_TEX = {
      asphalt: canvasTex(256, function(ctx, s){
        ctx.fillStyle = '#2b2b30'; ctx.fillRect(0,0,s,s);
        speckle(ctx, s, 5000, 0.07, true);
        speckle(ctx, s, 3000, 0.25, false);
        for (var k=0;k<5;k++){   // faint patch repairs
          ctx.fillStyle = 'rgba(0,0,0,0.08)';
          ctx.fillRect(Math.random()*s, Math.random()*s, 20 + Math.random()*50, 14 + Math.random()*30);
        }
      }),
      sidewalk: canvasTex(256, function(ctx, s){
        ctx.fillStyle = '#7d796e'; ctx.fillRect(0,0,s,s);
        speckle(ctx, s, 2500, 0.06, true);
        speckle(ctx, s, 1500, 0.12, false);
        ctx.strokeStyle = 'rgba(40,38,34,0.55)'; ctx.lineWidth = 2;
        for (var g=0; g<=s; g += s/4){
          ctx.beginPath(); ctx.moveTo(g,0); ctx.lineTo(g,s); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0,g); ctx.lineTo(s,g); ctx.stroke();
        }
      }),
      glow: (function(){
        var c = document.createElement('canvas'); c.width = c.height = 128;
        var ctx = c.getContext('2d');
        var gr = ctx.createRadialGradient(64,64,0, 64,64,64);
        gr.addColorStop(0, 'rgba(255,255,255,0.9)');
        gr.addColorStop(0.35, 'rgba(255,255,255,0.35)');
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gr; ctx.fillRect(0,0,128,128);
        return new THREE.CanvasTexture(c);
      })()
    };
    return ROAD_TEX;
  }

  // ---------------------------------------------------------------
  // Build the whole street network: asphalt, curbs, sidewalks, lane
  // markings, crosswalks + stop lines at every junction.
  // ---------------------------------------------------------------
  function buildStreetNetwork(){
    var T = roadTextures();
    var asphalt = new GeoBatch(), curbTop = new GeoBatch(), walk = new GeoBatch(),
        wall = new GeoBatch(), paint = new GeoBatch();
    var PAINT_Y = 0.075;

    roads.forEach(function(road, ri){
      // asphalt: full width, never cut — overlaps at junctions share
      // world-space UVs, and a per-road height step avoids z-fighting
      addStrip(asphalt, road, -ROAD_HALF, ROAD_HALF, 0.02 + ri*0.002, null, 9);

      [1, -1].forEach(function(side){
        var keepEdge = junctionMask(road, [side*ROAD_HALF, side*SIDEWALK_OUTER], 0.02);
        var a = side*ROAD_HALF, b = side*STREET_EDGE, c = side*SIDEWALK_OUTER;
        // curb sits a hair above every sidewalk layer so corners read as one L
        addStrip(curbTop, road, Math.min(a,b), Math.max(a,b), CURB_H + 0.012, keepEdge);
        addWall(wall, road, a, 0, CURB_H + 0.012, keepEdge, -side);
        addStrip(walk, road, Math.min(b,c), Math.max(b,c), CURB_H + ri*0.0006, keepEdge, 6);
        addWall(wall, road, c, 0, CURB_H, keepEdge, side);

        // solid edge line, stopping at junction mouths
        var keepLine = junctionMask(road, [side*(ROAD_HALF-0.4)], 0.35);
        var l0 = side*(ROAD_HALF-0.48), l1 = side*(ROAD_HALF-0.33);
        addStrip(paint, road, Math.min(l0,l1), Math.max(l0,l1), PAINT_Y, keepLine);
      });

      // dashed centre line (skipped inside junction boxes)
      var DASH = 2.4, GAP = 3.2;
      for (var s = 0.5; s + DASH < road.length; s += DASH + GAP){
        var m0 = frameAt(road, s).point, m1 = frameAt(road, s + DASH).point;
        if (distToRoads(m0.x, m0.z, road) < ROAD_HALF + 1.2 || distToRoads(m1.x, m1.z, road) < ROAD_HALF + 1.2) continue;
        addPaint(paint, road, s, s + DASH, -0.08, 0.08, PAINT_Y);
      }

      // crosswalk + stop line at each end of an open road
      if (!road.closed){
        [0, 1].forEach(function(atEnd){
          // walk inward from the end until we leave the other road's asphalt
          var edge = null;
          for (var d = 0; d < 30; d += 0.25){
            var s = atEnd ? road.length - d : d;
            var p = frameAt(road, s).point;
            if (distToRoads(p.x, p.z, road) > ROAD_HALF + 0.05){ edge = d; break; }
          }
          if (edge === null) return;
          var dir = atEnd ? -1 : 1;             // pointing into this road
          var at = function(d){ return atEnd ? road.length - d : d; };
          var z0 = edge + CURB_W + 0.4, z1 = z0 + 2.6;
          for (var l = -ROAD_HALF + 0.7; l < ROAD_HALF - 0.5; l += 1.0){
            addPaint(paint, road, Math.min(at(z0), at(z1)), Math.max(at(z0), at(z1)), l, l + 0.5, PAINT_Y);
          }
          // stop line across the lane heading INTO the junction
          // (traffic drives on the right; +normal is the right-hand side
          // when travelling toward increasing arc length)
          var sl0 = z1 + 0.9, sl1 = sl0 + 0.45;
          var laneSide = atEnd ? 1 : -1;
          var la = laneSide * 0.25, lb = laneSide * (ROAD_HALF - 0.5);
          addPaint(paint, road, Math.min(at(sl0), at(sl1)), Math.max(at(sl0), at(sl1)), Math.min(la,lb), Math.max(la,lb), PAINT_Y);
          road['edge' + atEnd] = edge;
        });
      }
    });

    var DS = THREE.FrontSide;
    scene.add(asphalt.mesh(new THREE.MeshStandardMaterial({ map: T.asphalt, roughness: 0.92, metalness: 0, side: DS })));
    scene.add(curbTop.mesh(new THREE.MeshStandardMaterial({ color: 0xbdb8aa, roughness: 0.85, side: DS })));
    scene.add(walk.mesh(new THREE.MeshStandardMaterial({ map: T.sidewalk, roughness: 0.95, side: DS })));
    scene.add(wall.mesh(new THREE.MeshStandardMaterial({ color: 0x8f8a7e, roughness: 0.9, side: DS })));
    var paintMesh = paint.mesh(new THREE.MeshBasicMaterial({ color: 0xd9d5c9, side: DS }));
    paintMesh.material.color.multiplyScalar(0.62);   // painted, not glowing
    scene.add(paintMesh);
  }

  // ---------------------------------------------------------------
  // ---------------------------------------------------------------
  // Buildings
  //
  // Procedural, realistic-ish buildings in four styles. Facades use
  // tiling window textures whose UVs are measured in bays (3 m) and
  // floors (3.2 m), so windows are always the right size whatever the
  // building's dimensions. Every building of a material is merged into
  // one batched mesh — a whole town of buildings is ~20 draw calls.
  // ---------------------------------------------------------------
  var BAY = 3, FLOOR = 3.2, GROUND = 4.2;
  var CELLS = 8;   // facade textures hold an 8 × 8 grid of windows

  var STYLES = {
    //            floors      footprint (bays)       facade colours (brick/office/glass) | tinted (plaster)
    plaster: { floors:[2,4],  along:[2,4], across:[2,3], shop:0.55 },
    brick:   { floors:[3,7],  along:[2,4], across:[2,3], shop:0.6 },
    office:  { floors:[5,10], along:[3,4], across:[2,3], shop:1 },
    glass:   { floors:[9,18], along:[3,4], across:[3,3], shop:1 }
  };
  function randInt(a, b){ return a + Math.floor(Math.random()*(b - a + 1)); }
  function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

  function makeCanvas(w, h){ var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function finishTex(c, rx, ry){
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return t;
  }
  var WARM = ['#ffcf8a','#ffd9a6','#ffe2b8','#ffc77a','#ffdca0'], COOL = ['#b9c8de','#aebfd8','#d8ccb2','#c4cfdc'];
  // an office interior: brighter near the ceiling lights, darker desks below
  function officeGlow(ectx, x, y, w, h){
    var g = ectx.createLinearGradient(0, y, 0, y + h);
    var c = pick(COOL);
    g.addColorStop(0, c); g.addColorStop(0.55, c); g.addColorStop(1, 'rgba(40,40,40,1)');
    ectx.fillStyle = g; ectx.fillRect(x, y, w, h);
    ectx.fillStyle = 'rgba(0,0,0,0.35)';                 // desk / partition silhouettes
    for (var k=0;k<3;k++) ectx.fillRect(x + Math.random()*(w-14), y + h*0.62, 6 + Math.random()*12, h*0.38);
  }

  // window rect inside a 64px cell + the lit/unlit emissive for it
  function litWindow(ectx, x, y, w, h, palette, pLit){
    if (Math.random() > pLit) return;
    ectx.fillStyle = pick(palette);
    if (Math.random() < 0.3){   // half-drawn curtain
      var cut = h * (0.3 + Math.random()*0.4);
      ectx.fillRect(x, y + cut, w, h - cut);
      ectx.globalAlpha = 0.35; ectx.fillRect(x, y, w, cut); ectx.globalAlpha = 1;
    } else ectx.fillRect(x, y, w, h);
  }
  function glassGrad(ctx, x, y, w, h, top, bottom){
    var g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, top); g.addColorStop(1, bottom);
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  }

  var FACADE_DRAW = {
    brick: function(ctx, ectx, base){
      var S = 512;
      ctx.fillStyle = base; ctx.fillRect(0,0,S,S);
      for (var y=0; y<S; y+=4){            // brick courses
        var off = (y/4) % 2 ? 0 : 5;
        for (var x=-off; x<S; x+=10){
          ctx.fillStyle = 'rgba(' + (Math.random()<0.5 ? '0,0,0,' : '255,255,255,') + (Math.random()*0.09) + ')';
          ctx.fillRect(x, y, 9, 3);
        }
        ctx.fillStyle = 'rgba(30,22,18,0.35)'; ctx.fillRect(0, y+3, S, 1);
      }
      for (var r=0;r<CELLS;r++) for (var c=0;c<CELLS;c++){
        var cx = c*64, cy = r*64;
        ctx.fillStyle = '#b9b0a0'; ctx.fillRect(cx+12, cy+50, 40, 4);            // sill
        ctx.fillStyle = '#8a6c58'; ctx.fillRect(cx+14, cy+8, 36, 4);             // lintel
        ctx.fillStyle = '#e6dfd0'; ctx.fillRect(cx+15, cy+12, 34, 38);           // frame
        glassGrad(ctx, cx+18, cy+15, 28, 33, '#3a4558', '#121821');
        ctx.fillStyle = '#e6dfd0'; ctx.fillRect(cx+31, cy+15, 2, 33); ctx.fillRect(cx+18, cy+29, 28, 2);
        litWindow(ectx, cx+18, cy+15, 28, 33, WARM, 0.42);
      }
    },
    plaster: function(ctx, ectx){
      var S = 512;
      ctx.fillStyle = '#efebe3'; ctx.fillRect(0,0,S,S);
      speckle(ctx, S, 4000, 0.05, false);
      for (var r=0;r<CELLS;r++){
        ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fillRect(0, r*64 + 60, S, 4);      // floor band
        for (var c=0;c<CELLS;c++){
          var cx = c*64, cy = r*64;
          ctx.fillStyle = '#5d6b5a'; ctx.fillRect(cx+12, cy+12, 9, 38); ctx.fillRect(cx+43, cy+12, 9, 38);  // shutters
          ctx.fillStyle = 'rgba(0,0,0,0.25)';
          for (var k=0;k<38;k+=4){ ctx.fillRect(cx+12, cy+12+k, 9, 1); ctx.fillRect(cx+43, cy+12+k, 9, 1); }
          ctx.fillStyle = '#ffffff'; ctx.fillRect(cx+21, cy+11, 22, 40);
          glassGrad(ctx, cx+23, cy+13, 18, 36, '#3c4757', '#141a22');
          ctx.fillStyle = '#ffffff'; ctx.fillRect(cx+31, cy+13, 2, 36);
          ctx.fillStyle = '#d9d3c6'; ctx.fillRect(cx+19, cy+51, 26, 3);
          litWindow(ectx, cx+23, cy+13, 18, 36, WARM, 0.4);
        }
      }
    },
    office: function(ctx, ectx, base){
      var S = 512;
      ctx.fillStyle = base; ctx.fillRect(0,0,S,S);
      speckle(ctx, S, 3000, 0.06, true);
      for (var r=0;r<CELLS;r++){
        var cy = r*64;
        ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(0, cy+46, S, 18);         // spandrel
        glassGrad(ctx, 0, cy+6, S, 38, '#4a5a6e', '#18202b');                    // ribbon window
        for (var c=0;c<CELLS;c++){
          var cx = c*64;
          ctx.fillStyle = '#6e737a'; ctx.fillRect(cx, cy+6, 3, 38); ctx.fillRect(cx+32, cy+6, 2, 38);
          if (Math.random() < 0.34) officeGlow(ectx, cx+3, cy+6, 61, 38);
        }
      }
    },
    glass: function(ctx, ectx, base){
      var S = 512;
      for (var r=0;r<CELLS;r++){
        var run = Math.random() < 0.4;
        for (var c=0;c<CELLS;c++){
          var cx = c*64, cy = r*64;
          glassGrad(ctx, cx, cy, 64, 64, base, '#0b1118');
          ctx.fillStyle = 'rgba(255,255,255,0.05)';
          ctx.beginPath(); ctx.moveTo(cx, cy+64); ctx.lineTo(cx+40, cy); ctx.lineTo(cx+52, cy); ctx.lineTo(cx+12, cy+64); ctx.fill();
          ctx.fillStyle = '#3e4a56'; ctx.fillRect(cx, cy, 3, 64); ctx.fillRect(cx+31, cy, 2, 64); ctx.fillRect(cx, cy+56, 64, 8);
          if (Math.random() < 0.15) run = !run;                                 // lit floors come in runs
          if (run && Math.random() < 0.85){ ectx.globalAlpha = 0.45 + Math.random()*0.35; officeGlow(ectx, cx+3, cy, 61, 56); ectx.globalAlpha = 1; }
        }
      }
    }
  };
  var FACADE_COLORS = {
    brick:   ['#8e4a36','#7a3f30','#a0644a','#6f5145'],
    plaster: ['#efebe3'],
    office:  ['#9a978f','#85837d','#a7a39a'],
    glass:   ['#3f6280','#3a6a6c','#4a5470']
  };

  var BLD = null;
  function buildingKit(){
    if (BLD) return BLD;
    BLD = { facade:{}, shop:[], roof:new GeoBatch(), trim:new GeoBatch(), props:new GeoBatch(),
            awning:new GeoBatch(), sign:new GeoBatch(), tanks:[] };
    Object.keys(FACADE_COLORS).forEach(function(style){
      BLD.facade[style] = FACADE_COLORS[style].map(function(base){
        var c = makeCanvas(512,512), e = makeCanvas(512,512);
        var ectx = e.getContext('2d'); ectx.fillStyle = '#000'; ectx.fillRect(0,0,512,512);
        FACADE_DRAW[style](c.getContext('2d'), ectx, base);
        var mat = new THREE.MeshStandardMaterial({
          map: finishTex(c, 1/CELLS, 1/CELLS), emissiveMap: finishTex(e, 1/CELLS, 1/CELLS),
          emissive: 0xffffff, emissiveIntensity: { brick: 0.95, plaster: 0.95, office: 0.7, glass: 0.6 }[style],
          roughness: style === 'glass' ? 0.3 : 0.88, metalness: style === 'glass' ? 0.25 : 0,
          vertexColors: style === 'plaster'
        });
        mat.userData.baseEmissive = mat.emissiveIntensity;
        return { batch: new GeoBatch(), mat: mat };
      });
    });
    // ground-floor shopfronts: a 4-bay strip with one door
    ['#2b2f36','#4a3a2c','#e7e2d6'].forEach(function(frame){
      var c = makeCanvas(512, 160), e = makeCanvas(512, 160);
      var ctx = c.getContext('2d'), ectx = e.getContext('2d');
      ectx.fillStyle = '#000'; ectx.fillRect(0,0,512,160);
      ctx.fillStyle = frame; ctx.fillRect(0,0,512,160);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, 512, 26);          // fascia
      var door = randInt(0,3);
      for (var b=0;b<4;b++){
        var x = b*128;
        if (b === door){
          glassGrad(ctx, x+40, 40, 48, 118, '#3b4552', '#12161c');
          ectx.fillStyle = '#ffd9a0'; ectx.globalAlpha = 0.6; ectx.fillRect(x+40, 40, 48, 118); ectx.globalAlpha = 1;
        } else {
          glassGrad(ctx, x+10, 36, 108, 100, '#3d4756', '#11151b');
          ctx.fillStyle = frame; ctx.fillRect(x+62, 36, 4, 100);
          var g = ectx.createLinearGradient(0, 36, 0, 136);
          g.addColorStop(0, 'rgba(255,214,150,0.95)'); g.addColorStop(1, 'rgba(255,190,110,0.55)');
          ectx.fillStyle = g; ectx.fillRect(x+10, 36, 108, 100);
          ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x+10, 136, 108, 24);     // kick plate
        }
      }
      BLD.shop.push({ batch: new GeoBatch(), mat: new THREE.MeshStandardMaterial({
        map: finishTex(c, 1/4, 1), emissiveMap: finishTex(e, 1/4, 1), emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.6 }) });
    });
    BLD.tankGeo = new THREE.CylinderGeometry(1.1, 1.1, 1.8, 12);
    BLD.tankCap = new THREE.ConeGeometry(1.2, 0.6, 12);
    BLD.tankMat = new THREE.MeshStandardMaterial({ color: 0x6b5340, roughness: 0.95 });
    return BLD;
  }

  // Axis box rotated about Y, appended to batches. uv(h, v) maps a
  // side face (h wide, v tall) to [u0,v0,u1,v1]; col tints vertices.
  function addBox(sideB, topB, cx, cy, cz, sx, sy, sz, rot, uv, col, topCol){
    var hx = sx/2, hy = sy/2, hz = sz/2, cs = Math.cos(rot), sn = Math.sin(rot);
    function P(x, y, z){ return [cx + x*cs + z*sn, cy + y, cz - x*sn + z*cs]; }
    function N(x, z){ return [x*cs + z*sn, 0, -x*sn + z*cs]; }
    var faces = [
      [[ hx,-hy, hz],[ hx,-hy,-hz],[ hx,hy,-hz],[ hx,hy, hz], N(1,0),  sz],
      [[-hx,-hy,-hz],[-hx,-hy, hz],[-hx,hy, hz],[-hx,hy,-hz], N(-1,0), sz],
      [[-hx,-hy, hz],[ hx,-hy, hz],[ hx,hy, hz],[-hx,hy, hz], N(0,1),  sx],
      [[ hx,-hy,-hz],[-hx,-hy,-hz],[-hx,hy,-hz],[ hx,hy,-hz], N(0,-1), sx]
    ];
    if (sideB) faces.forEach(function(f){
      sideB.quad(P.apply(null,f[0]), P.apply(null,f[1]), P.apply(null,f[2]), P.apply(null,f[3]), f[4], uv ? uv(f[5], sy) : [0,0,1,1], col);
    });
    if (topB) topB.quad(P(-hx,hy,-hz), P(hx,hy,-hz), P(hx,hy,hz), P(-hx,hy,hz), [0,1,0], [0,0,sx/4,sz/4], topCol || col);
  }

  // A building set back behind the sidewalk, aligned with the street.
  // All four footprint corners must clear every road's sidewalk, so
  // nothing ends up on a road, in a junction, or inside a curve.
  function placeBuildingAt(pt, tangent, normal, o){
    var K = buildingKit();
    var weights = o.styles || { brick: 1 }, total = 0, key;
    for (key in weights) total += weights[key];
    var roll = Math.random()*total, style = 'brick';
    for (key in weights){ roll -= weights[key]; if (roll <= 0){ style = key; break; } }
    var S = STYLES[style];

    var floors = randInt(S.floors[0], S.floors[1]);
    var hasShop = !o.noShops && Math.random() < S.shop;
    var groundH = hasShop ? GROUND : 0;
    var upperH = floors * FLOOR, h = groundH + upperH;

    // try the chosen footprint, then smaller ones, before giving up
    var alongBays = randInt(S.along[0], S.along[1]), acrossBays = randInt(S.across[0], S.across[1]);
    var along, across, cx, cz, r, fits = false, clear = SIDEWALK_OUTER + 0.5;
    for (var attempt = 0; attempt < 3 && !fits; attempt++){
      along = alongBays * BAY; across = acrossBays * BAY;
      var off = SIDEWALK_OUTER + 0.9 + across/2;
      if (o.fixedCenter){ cx = o.fixedCenter.x; cz = o.fixedCenter.z; }
      else { cx = pt.x + normal.x*off; cz = pt.z + normal.z*off; }
      r = 0.5 * Math.sqrt(along*along + across*across);
      fits = footprintFree(cx, cz, r*0.8);
      for (var a=-1; a<=1 && fits; a+=2) for (var b=-1; b<=1 && fits; b+=2){
        var x = cx + tangent.x*along/2*a + normal.x*across/2*b;
        var z = cz + tangent.z*along/2*a + normal.z*across/2*b;
        if (distToRoads(x, z, null) < clear || !isLand(x, z)) fits = false;
      }
      if (alongBays > 2) alongBays--; else if (acrossBays > 2) acrossBays--; else break;
    }
    if (!fits) return;
    placedFootprints.push({ x: cx, z: cz, r: r*0.8 });

    var rot = Math.atan2(tangent.x, tangent.z);
    // which local ±x side faces the street
    var roadSide = (-normal.x*Math.cos(rot) + normal.z*Math.sin(rot)) > 0 ? 1 : -1;
    var lx = Math.cos(rot), lz = -Math.sin(rot);   // local +x in world

    var tint = null;
    if (style === 'plaster'){
      var c = new THREE.Color(pick(o.palette || ['#c9b79c'])).lerp(new THREE.Color(0xffffff), 0.35);
      tint = [c.r, c.g, c.b];
    }
    var fac = pick(K.facade[style]);
    var ou = randInt(0, CELLS-1), ov = randInt(0, CELLS-1);
    var facadeUV = function(hLen, vLen){ return [ou, ov, ou + hLen/BAY, ov + vLen/FLOOR]; };

    // upper floors (+ roof)
    addBox(fac.batch, K.roof, cx, groundH + upperH/2, cz, across, upperH, along, rot, facadeUV, tint, [0.21,0.2,0.19]);
    // ground floor: shopfront / lobby
    if (hasShop){
      var shop = pick(K.shop), su = randInt(0,3);
      addBox(shop.batch, null, cx, groundH/2, cz, across, groundH, along, rot,
        function(hLen){ return [su, 0, su + hLen/BAY, 1]; });
      // string course between shop and upper floors
      addBox(K.trim, K.trim, cx, groundH + 0.12, cz, across + 0.24, 0.24, along + 0.24, rot, null, [0.72,0.69,0.63]);
    }
    // cornice + parapet
    var trimCol = style === 'glass' ? [0.22,0.26,0.3] : style === 'office' ? [0.6,0.6,0.58] : [0.74,0.7,0.62];
    addBox(K.trim, K.trim, cx, h - 0.35, cz, across + 0.36, 0.3, along + 0.36, rot, null, trimCol);
    var pT = 0.25, pH = 0.7;
    [[ (across-pT)/2, 0, pT, along], [-(across-pT)/2, 0, pT, along], [0, (along-pT)/2, across, pT], [0, -(along-pT)/2, across, pT]].forEach(function(p){
      addBox(K.trim, K.trim, cx + lx*p[0] + tangent.x*p[1], h + pH/2, cz + lz*p[0] + tangent.z*p[1], p[2], pH, p[3], rot, null, trimCol);
    });

    // rooftop clutter
    function roofSpot(m){
      var u = (Math.random()-0.5)*(across - m*2), w = (Math.random()-0.5)*(along - m*2);
      return [cx + lx*u + tangent.x*w, cz + lz*u + tangent.z*w];
    }
    var nAC = randInt(1, 3);
    for (var i=0;i<nAC;i++){
      var sp = roofSpot(1.5);
      addBox(K.props, K.props, sp[0], h + 0.45, sp[1], 1.3, 0.9, 1.0, rot, null, [0.55,0.57,0.6]);
    }
    if (floors >= 5){
      var sp2 = roofSpot(2.2);
      addBox(K.trim, K.trim, sp2[0], h + 1.2, sp2[1], 2.6, 2.4, 2.6, rot, null, trimCol);
    }
    if (style === 'brick' && Math.random() < 0.35){
      var sp3 = roofSpot(2), tank = new THREE.Mesh(K.tankGeo, K.tankMat), cap = new THREE.Mesh(K.tankCap, K.tankMat);
      tank.position.set(sp3[0], h + 1.6, sp3[1]); cap.position.set(sp3[0], h + 2.8, sp3[1]);
      tank.castShadow = true;
      scene.add(tank); scene.add(cap);
      addBox(K.props, K.props, sp3[0], h + 0.35, sp3[1], 1.8, 0.7, 1.8, rot, null, [0.25,0.22,0.2]);
    }
    // glass towers step back near the top
    if (style === 'glass' && floors >= 12 && across >= 3*BAY && along >= 3*BAY && Math.random() < 0.7){
      var extra = randInt(2, 4)*FLOOR;
      addBox(fac.batch, K.roof, cx, h + extra/2, cz, across - BAY, extra, along - BAY, rot, facadeUV, null, [0.21,0.2,0.19]);
      addBox(K.trim, K.trim, cx, h + extra + 0.15, cz, across - BAY + 0.3, 0.3, along - BAY + 0.3, rot, null, trimCol);
    }

    // street-facing awning + lit sign over shops
    if (hasShop && (style === 'brick' || style === 'plaster')){
      var awn = new THREE.Color(pick(o.palette || ['#7a2e2e'])).lerp(new THREE.Color(0x000000), 0.1);
      var ax = cx + lx*roadSide*(across/2 + 0.7), az = cz + lz*roadSide*(across/2 + 0.7);
      addBox(K.awning, K.awning, ax, groundH - 0.75, az, 1.4, 0.14, along*0.86, rot, null, [awn.r, awn.g, awn.b]);
      addBox(K.awning, null, cx + lx*roadSide*(across/2 + 1.4), groundH - 1.05, cz + lz*roadSide*(across/2 + 1.4), 0.04, 0.45, along*0.86, rot, null, [awn.r*0.8, awn.g*0.8, awn.b*0.8]);
    }
    if (hasShop && Math.random() < 0.7){
      var sc = new THREE.Color(o.signColor !== undefined ? o.signColor : pick([0xffcf8a, 0xff6b9d, 0x7fd4ff, 0xb6ff8a]));
      if (Math.random() < 0.4) sc = new THREE.Color(pick([0xffcf8a, 0xffffff, 0x7fd4ff]));
      var sx = cx + lx*roadSide*(across/2 + 0.06), sz = cz + lz*roadSide*(across/2 + 0.06);
      addBox(K.sign, null, sx, groundH - 0.32, sz, 0.08, 0.42, Math.min(along*0.5, 5), rot, null, [sc.r, sc.g, sc.b]);
    }
  }

  // Turn the collected building batches into meshes (call once).
  function finishBuildings(){
    if (!BLD) return;
    function add(B, mat, shadows){
      if (!B.idx.length) return;
      var m = B.mesh(mat);
      m.castShadow = !!shadows;
      scene.add(m);
    }
    Object.keys(BLD.facade).forEach(function(s){ BLD.facade[s].forEach(function(f){ add(f.batch, f.mat, true); }); });
    BLD.shop.forEach(function(f){ add(f.batch, f.mat, true); });
    add(BLD.roof, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }), false);
    add(BLD.trim, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }), true);
    add(BLD.props, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.4 }), true);
    add(BLD.awning, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide }), true);
    add(BLD.sign, new THREE.MeshBasicMaterial({ vertexColors: true }), false);
  }

  var placedFootprints = [];   // {x, z, r} — buildings, shops, park, …
  function footprintFree(x, z, r){
    for (var i=0;i<placedFootprints.length;i++){
      var f = placedFootprints[i];
      var dx = f.x - x, dz = f.z - z;
      if (dx*dx + dz*dz < (f.r + r)*(f.r + r)) return false;
    }
    return true;
  }

  // ---------------------------------------------------------------
  // Street lights: procedural pole + arm + lamp head, with a soft
  // additive light pool on the road instead of a real PointLight
  // (dozens of real lights would make the shaders crawl).
  // ---------------------------------------------------------------
  var LAMP = null, lampMatCache = {};
  function lampKit(){
    if (LAMP) return LAMP;
    LAMP = {
      pole: new THREE.CylinderGeometry(0.07, 0.1, 5, 8),
      base: new THREE.CylinderGeometry(0.16, 0.18, 0.4, 8),
      arm: new THREE.BoxGeometry(0.07, 0.07, 1.5),
      head: new THREE.BoxGeometry(0.32, 0.12, 0.62),
      bulb: new THREE.PlaneGeometry(0.26, 0.5),
      pool: new THREE.CircleGeometry(4.2, 24),
      metal: new THREE.MeshStandardMaterial({ color: 0x2c2f36, roughness: 0.45, metalness: 0.7 })
    };
    return LAMP;
  }
  function lampMats(color){
    if (lampMatCache[color]) return lampMatCache[color];
    lampMatCache[color] = {
      bulb: new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide }),
      pool: new THREE.MeshBasicMaterial({
        map: roadTextures().glow, color: color, transparent: true, opacity: 0.42,
        blending: THREE.AdditiveBlending, depthWrite: false
      })
    };
    return lampMatCache[color];
  }
  // (x, z) = pole base; (fx, fz) = unit direction the arm reaches toward
  function placeStreetlight(x, z, fx, fz, color){
    var K = lampKit(), M = lampMats(color);
    var g = new THREE.Group();
    g.position.set(x, CURB_H, z);
    g.rotation.y = Math.atan2(fx, fz);
    var base = new THREE.Mesh(K.base, K.metal); base.position.y = 0.2; g.add(base);
    var pole = new THREE.Mesh(K.pole, K.metal); pole.position.y = 2.5; pole.castShadow = true; g.add(pole);
    var arm = new THREE.Mesh(K.arm, K.metal); arm.position.set(0, 4.92, 0.72); g.add(arm);
    var head = new THREE.Mesh(K.head, K.metal); head.position.set(0, 4.86, 1.45); g.add(head);
    var bulb = new THREE.Mesh(K.bulb, M.bulb); bulb.rotation.x = Math.PI/2; bulb.position.set(0, 4.79, 1.45); g.add(bulb);
    scene.add(g);
    var pool = new THREE.Mesh(K.pool, M.pool);
    pool.rotation.x = -Math.PI/2;
    pool.position.set(x + fx*1.45, 0.09, z + fz*1.45);
    scene.add(pool);
  }

  var TREE = null;
  function makeTree(pos, scale){
    if (!TREE){
      TREE = {
        trunk: new THREE.CylinderGeometry(0.12, 0.18, 1.4, 6),
        crown: new THREE.IcosahedronGeometry(1.1, 0),
        bark: new THREE.MeshStandardMaterial({ color: 0x4a3323, roughness: 1 }),
        leaves: [0x3f6b3a, 0x4f7a44, 0x355f37].map(function(c){ return new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: true }); })
      };
    }
    var s = scale || 1, y0 = pos.y || 0;
    var trunk = new THREE.Mesh(TREE.trunk, TREE.bark);
    trunk.scale.setScalar(s);
    trunk.position.set(pos.x, y0 + 0.7*s, pos.z);
    trunk.castShadow = true;
    scene.add(trunk);
    var crown = new THREE.Mesh(TREE.crown, TREE.leaves[Math.floor(Math.random()*TREE.leaves.length)]);
    crown.scale.set(s, s*(1.05 + Math.random()*0.25), s);
    crown.rotation.y = Math.random()*Math.PI;
    crown.position.set(pos.x, y0 + 1.9*s, pos.z);
    crown.castShadow = true;
    scene.add(crown);
  }

  // Line one road with buildings, staggered street lights and street
  // trees. Everything near a junction is skipped automatically.
  function populateRoad(road, o){
    var JUNCTION_CLEAR = SIDEWALK_OUTER + 2.5;
    if (o.buildStep){
      for (var s = o.buildStep/2; s < road.length; s += o.buildStep * (0.85 + Math.random()*0.3)){
        var f = frameAt(road, s);
        [1, -1].forEach(function(side){
          var n = f.normal.clone().multiplyScalar(side);
          if (o.exclude && o.exclude(f.point, n)) return;
          placeBuildingAt(f.point, f.tangent, n, o);
        });
      }
    }
    if (o.lampStep){
      var k = 0;
      for (var s2 = o.lampStep/2; s2 < road.length; s2 += o.lampStep, k++){
        var f2 = frameAt(road, s2), side = (k % 2) ? 1 : -1;
        var off = STREET_EDGE + 0.55;
        var px = f2.point.x + f2.normal.x*side*off, pz = f2.point.z + f2.normal.z*side*off;
        if (distToRoads(px, pz, road) < JUNCTION_CLEAR) continue;
        if (o.lampSide && o.lampSide(f2.point, f2.normal.clone().multiplyScalar(side)) === false) continue;
        placeStreetlight(px, pz, -f2.normal.x*side, -f2.normal.z*side, o.lampColor);
      }
    }
    if (o.treeStep){
      for (var s3 = o.treeStep/2 + 2; s3 < road.length; s3 += o.treeStep){
        var f3 = frameAt(road, s3);
        [1, -1].forEach(function(side){
          var off = SIDEWALK_OUTER - 0.9;
          var tx = f3.point.x + f3.normal.x*side*off, tz = f3.point.z + f3.normal.z*side*off;
          if (distToRoads(tx, tz, road) < JUNCTION_CLEAR) return;
          if (nearBillboard(tx, tz, 5.5)) return;
          if (!isLand(tx, tz)) return;
          makeTree(new THREE.Vector3(tx, CURB_H, tz), 0.75);
        });
      }
    }
  }

  function makeLabelSprite(text, colorHex){
    var c = document.createElement('canvas');
    c.width = 512; c.height = 128;
    var ctx = c.getContext('2d');
    ctx.font = '700 56px JetBrains Mono, monospace';
    ctx.fillStyle = colorHex;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = colorHex; ctx.shadowBlur = 18;
    ctx.fillText(text, 256, 64);
    var tex = new THREE.CanvasTexture(c);
    var mat = new THREE.SpriteMaterial({ map: tex, transparent:true, depthWrite:false, fog:false });
    var sprite = new THREE.Sprite(mat);
    sprite.scale.set(8, 2, 1);
    return sprite;
  }

  // ---------------------------------------------------------------
  // Car rig: the visual car (body that pitches/rolls, wheels that
  // spin and steer, brake/reverse lights) built from a model.
  // ---------------------------------------------------------------
  var carRig = null;

  function buildCarRig(spec){
    var model = ASSETS.cars[spec.id];
    var body = new THREE.Group();
    var rig = { spec: spec, body: body, wheels: [], wheelbase: 2.7, halfWidth: 1.0, radius: 0.35, lights: null };
    var V3 = THREE.Vector3;

    if (model){
      var m = model.clone(true);
      m.position.set(0,0,0); m.quaternion.identity(); m.scale.set(1,1,1);
      m.updateMatrixWorld(true);
      var raw = new THREE.Box3().setFromObject(m).getSize(new V3());
      if (raw.x > raw.z) m.rotation.y = Math.PI/2;
      if (spec.flip) m.rotation.y += Math.PI;
      m.updateMatrixWorld(true);
      var size = new THREE.Box3().setFromObject(m).getSize(new V3());
      m.scale.setScalar(spec.length / size.z);
      m.updateMatrixWorld(true);
      var box = new THREE.Box3().setFromObject(m), ctr = box.getCenter(new V3());
      m.position.x -= ctr.x; m.position.z -= ctr.z; m.position.y -= box.min.y;
      m.updateMatrixWorld(true);
      m.traverse(function(o){ if (o.isMesh){ o.castShadow = true; o.receiveShadow = true; } });

      if (!spec.noWheels){
        var found = [];
        m.traverse(function(o){ if (/^wheel/i.test(o.name)) found.push(o); });
        found.forEach(function(w){
          // re-parent each wheel under a pivot at its hub so it can
          // spin about the axle and steer about the vertical
          var pivot = new THREE.Group();
          pivot.position.copy(w.position);
          w.parent.add(pivot);
          pivot.add(w);
          w.position.set(0,0,0);
          rig.wheels.push({ pivot: pivot, front: /front/i.test(w.name) });
        });
        m.updateMatrixWorld(true);
        if (rig.wheels.length){
          var wb = new THREE.Box3().setFromObject(rig.wheels[0].pivot);
          rig.radius = Math.max(0.2, (wb.max.y - wb.min.y) / 2);
          var zf = [], zb = [];
          rig.wheels.forEach(function(w){
            var p = new V3(); w.pivot.getWorldPosition(p);
            (w.front ? zf : zb).push(p.z);
          });
          if (zf.length && zb.length) rig.wheelbase = Math.max(1.8, Math.abs(zf[0] - zb[0]));
        }
      }
      body.add(m);
      box = new THREE.Box3().setFromObject(m);
      rig.halfWidth = (box.max.x - box.min.x) / 2;
      rig.box = box;
    } else {
      // stand-in when models can't load (e.g. opened via file://)
      var paint = new THREE.MeshStandardMaterial({ color: 0xc23b2e, roughness: 0.35, metalness: 0.4 });
      var shell = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.6, 4.3), paint);
      shell.position.y = 0.65; shell.castShadow = true; body.add(shell);
      var cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 2.1), new THREE.MeshStandardMaterial({ color: 0x151a22, roughness: 0.2, metalness: 0.6 }));
      cabin.position.set(0, 1.2, -0.25); cabin.castShadow = true; body.add(cabin);
      var wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 16);
      wheelGeo.rotateZ(Math.PI/2);
      var wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
      [[-0.95,1.35,true],[0.95,1.35,true],[-0.95,-1.35,false],[0.95,-1.35,false]].forEach(function(p){
        var pivot = new THREE.Group(); pivot.position.set(p[0], 0.36, p[1]);
        var w = new THREE.Mesh(wheelGeo, wheelMat); w.castShadow = true;
        pivot.add(w); body.add(pivot);
        rig.wheels.push({ pivot: pivot, front: p[2] });
      });
      rig.radius = 0.36; rig.wheelbase = 2.7; rig.halfWidth = 1.0;
      rig.box = new THREE.Box3(new V3(-0.95, 0, -2.15), new V3(0.95, 1.5, 2.15));
    }

    // brake + reverse lights on the tail
    var b = rig.box, w = b.max.x - b.min.x, hgt = b.max.y - b.min.y;
    var brakeMat = new THREE.MeshBasicMaterial({ color: 0x4a0606 });
    var revMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
    var lampGeo = new THREE.PlaneGeometry(w*0.18, hgt*0.07);
    [-1, 1].forEach(function(s){
      var l = new THREE.Mesh(lampGeo, brakeMat);
      l.position.set(s*w*0.3, b.min.y + hgt*0.47, b.min.z - 0.02); l.rotation.y = Math.PI; body.add(l);
      var r = new THREE.Mesh(lampGeo, revMat);
      r.scale.set(0.45, 1, 1);
      r.position.set(s*w*0.12, b.min.y + hgt*0.47, b.min.z - 0.02); r.rotation.y = Math.PI; body.add(r);
    });
    var headMat = new THREE.MeshBasicMaterial({ color: 0xfff1cf });
    [-1, 1].forEach(function(s){
      var hl = new THREE.Mesh(lampGeo, headMat);
      hl.scale.set(0.9, 1.2, 1);
      hl.position.set(s*w*0.3, b.min.y + hgt*0.42, b.max.z + 0.02); body.add(hl);
    });
    rig.lights = { brake: brakeMat, reverse: revMat };
    return rig;
  }

  function installCarRig(spec){
    if (carRig) car.remove(carRig.body);
    carRig = buildCarRig(spec);
    car.add(carRig.body);
  }

  function switchCar(dir){
    cycleCarId(dir);
    var spec = CAR_BY_ID[carId];
    toast('Loading ' + spec.name + '…');
    loadCarModel(spec, function(){
      if (carId !== spec.id) return;          // user kept cycling meanwhile
      installCarRig(spec);
      toast(spec.name + ' — top speed ' + Math.round(spec.top * 3.6) + ' km/h');
    });
  }

  // ---------------------------------------------------------------
  // Driving physics — fixed 120 Hz steps, so the car behaves the same
  // at any frame rate.
  //
  //  • Engine force falls off toward top speed; rolling resistance +
  //    aero drag slow you when coasting.
  //  • Steering is a bicycle model: yaw rate = v·tan(steer)/wheelbase,
  //    with less steering lock at speed. No turning on the spot.
  //  • Velocity is tracked separately from heading; tyre grip bleeds
  //    off sideways slide. The handbrake (Space) drops rear grip so
  //    you can drift.
  //  • The car stays on the union of road surfaces; hitting a curb
  //    removes the velocity going into it, so you glance off & slide.
  // ---------------------------------------------------------------
  var CS = { vx:0, vz:0, vF:0, steer:0, angle:0, longAcc:0, latAcc:0, pitch:0, roll:0, spin:0,
             braking:false, reversing:false, gas:false, slip:0, impact:0, shake:0, rpm:0.12, gear:'N' };
  var STEP = 1/120, accum = 0;
  var _probe = { x:0, z:0 }, _best = { x:0, z:0 };

  function physicsStep(h){
    var sp = carRig.spec, locked = !!openOverlay;
    var th = car.rotation.y;
    var fx = Math.sin(th), fz = Math.cos(th);        // forward
    var rx = -Math.cos(th), rz = Math.sin(th);       // driver's right
    var vF = CS.vx*fx + CS.vz*fz, vR = CS.vx*rx + CS.vz*rz;
    var gas = !locked && input.forward, rev = !locked && input.backward, hand = !locked && input.handbrake;

    var a = 0, braking = false, reversing = false;
    if (gas){
      if (vF < -0.5){ a = sp.brake; braking = true; }
      else a = sp.accel * Math.max(0, 1 - Math.pow(Math.max(0, vF) / sp.top, 2));
    } else if (rev){
      if (vF > 0.5){ a = -sp.brake; braking = true; }
      else { var rTop = sp.top * 0.3; a = -sp.accel * 0.55 * Math.max(0, 1 - Math.pow(Math.min(0, vF) / rTop, 2)); reversing = true; }
    } else if (locked && Math.abs(vF) > 0.05){
      a = -Math.sign(vF) * sp.brake * 0.5; braking = true;
    }
    var drag = 0.8 + 0.0035 * vF * vF;               // rolling + aero
    if (hand){ drag += 6.5; braking = true; }
    var before = vF;
    vF += a * h;
    var dd = drag * h;
    if (Math.abs(vF) <= dd && !gas && !rev) vF = 0; else vF -= Math.sign(vF) * dd;
    if (braking && before !== 0 && vF !== 0 && Math.sign(vF) !== Math.sign(before)) vF = 0;   // brakes stop, never reverse

    // steering (self-centres faster than it turns in)
    var target = locked ? 0 : (input.left ? 1 : 0) - (input.right ? 1 : 0);
    CS.steer += (target - CS.steer) * Math.min(1, (target === 0 ? 8 : 4.5) * h);
    var lock = sp.steer / (1 + (vF*vF) / (17*17));
    var ang = CS.steer * lock;
    var yawRate = vF * Math.tan(ang) / carRig.wheelbase;
    // tyres can only give so much sideways force (≈ grip × 1.15 m/s²):
    // ask for more and the car understeers instead of pivoting
    var maxLat = sp.grip * 1.15 * (hand ? 1.7 : 1);
    if (Math.abs(vF) > 1){
      var cap = maxLat / Math.abs(vF);
      if (Math.abs(yawRate) > cap) yawRate = Math.sign(yawRate) * cap;
    }
    if (hand && Math.abs(vF) > 4) yawRate *= 1.25;     // handbrake: rear steps out

    // tyre grip
    vR *= Math.exp(-(hand ? 1.4 : sp.grip) * h);

    CS.vx = fx*vF + rx*vR; CS.vz = fz*vF + rz*vR;
    car.rotation.y = th + yawRate * h;
    car.position.x += CS.vx * h; car.position.z += CS.vz * h;

    // stay on the road
    var best = Infinity, px = car.position.x, pz = car.position.z;
    for (var i=0;i<roads.length;i++){
      var d = closestOnRoad(roads[i], px, pz, _probe);
      if (d < best){ best = d; _best.x = _probe.x; _best.z = _probe.z; }
    }
    var limit = ROAD_HALF - carRig.halfWidth - 0.12;
    if (best > limit && best < Infinity){
      var nx = (px - _best.x) / best, nz = (pz - _best.z) / best;
      car.position.x = _best.x + nx*limit; car.position.z = _best.z + nz*limit;
      var vn = CS.vx*nx + CS.vz*nz;
      if (vn > 0){
        CS.vx -= nx*vn*1.25; CS.vz -= nz*vn*1.25;     // small bounce off the curb
        if (vn > 2.5) CS.impact = Math.max(CS.impact, vn);
      }
      var scrape = Math.exp(-1.1*h);
      CS.vx *= scrape; CS.vz *= scrape;
      vF = CS.vx*fx + CS.vz*fz;
    }

    collideTraffic();
    if (traffic.length) vF = CS.vx*fx + CS.vz*fz;
    var la = (vF - CS.vF) / h;
    CS.longAcc += (la - CS.longAcc) * Math.min(1, 10*h);
    CS.latAcc += (vF*yawRate - CS.latAcc) * Math.min(1, 10*h);
    CS.vF = vF; CS.angle = ang; CS.slip = Math.abs(vR);
    CS.spin += vF * h / carRig.radius;
    CS.braking = braking; CS.reversing = reversing && vF < -0.2; CS.gas = gas;
  }

  var GEAR_TOPS = [0.2, 0.37, 0.55, 0.76, 1.0];    // fraction of top speed per gear
  function updateGear(dt){
    var sp = carRig.spec, v = CS.vF, rpm;
    if (v < -0.2){ CS.gear = 'R'; rpm = 0.2 + 0.7 * Math.min(1, -v / (sp.top*0.3)); }
    else if (Math.abs(v) < 0.3 && !CS.gas){ CS.gear = 'N'; rpm = 0.12; }
    else {
      var f = Math.max(0, v) / sp.top, g = 0;
      while (g < GEAR_TOPS.length-1 && f > GEAR_TOPS[g]) g++;
      var lo = g ? GEAR_TOPS[g-1] : 0, hi = GEAR_TOPS[g];
      rpm = 0.22 + 0.78 * Math.min(1, (f - lo) / (hi - lo));
      if (CS.gas && g === 0) rpm = Math.max(rpm, 0.38);
      CS.gear = String(g + 1);
    }
    CS.rpm += (rpm - CS.rpm) * Math.min(1, dt * 10);
  }

  function updateCar(dt){
    accum += Math.min(dt, 0.1);
    var n = 0;
    while (accum >= STEP && n < 14){ physicsStep(STEP); accum -= STEP; n++; }
    if (n === 14) accum = 0;
    updateGear(dt);

    // body pitches under braking/acceleration and rolls in corners
    var k = 1 - Math.exp(-dt * 7);
    var tp = THREE.MathUtils.clamp(-CS.longAcc * 0.0055, -0.045, 0.045);
    var tr = THREE.MathUtils.clamp(CS.latAcc * 0.0042, -0.065, 0.065);
    CS.pitch += (tp - CS.pitch) * k; CS.roll += (tr - CS.roll) * k;
    carRig.body.rotation.set(CS.pitch, 0, CS.roll);
    for (var i=0;i<carRig.wheels.length;i++){
      var w = carRig.wheels[i];
      w.pivot.rotation.set(CS.spin, w.front ? CS.angle : 0, 0, 'YXZ');
    }
    carRig.lights.brake.color.setHex(CS.braking ? 0xff2020 : 0x4a0606);
    carRig.lights.reverse.color.setHex(CS.reversing ? 0xf4f1e6 : 0x1a1a1a);

    speedEl.textContent = Math.round(Math.abs(CS.vF) * 3.6);
    gearEl.textContent = CS.gear;
    rpmEl.style.width = Math.round(CS.rpm * 100) + '%';
    rpmEl.style.background = CS.rpm > 0.88 ? '#ff6b6b' : 'var(--accent)';
    updateEngineAudio();
  }

  // ---------------------------------------------------------------
  // Engine sound: a tiny WebAudio synth (two detuned oscillators
  // through a low-pass filter) tracking RPM and throttle, plus filtered
  // noise for tyre squeal. Starts on the Start Engine click; M mutes.
  // ---------------------------------------------------------------
  var AUD = { ctx: null, on: true };
  try { AUD.on = localStorage.getItem('town.sound') !== 'off'; } catch(e){}
  function startEngineAudio(){
    if (AUD.ctx || !(window.AudioContext || window.webkitAudioContext)) return;
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var master = ctx.createGain(); master.gain.value = AUD.on ? 1 : 0; master.connect(ctx.destination);
      var filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 600; filter.Q.value = 4;
      var eng = ctx.createGain(); eng.gain.value = 0.0;
      filter.connect(eng); eng.connect(master);
      var o1 = ctx.createOscillator(); o1.type = 'sawtooth';
      var o2 = ctx.createOscillator(); o2.type = 'square'; o2.detune.value = -1200 + 8;
      var o3 = ctx.createOscillator(); o3.type = 'sine';
      [o1, o2, o3].forEach(function(o){ o.connect(filter); o.start(); });
      var len = ctx.sampleRate, buf = ctx.createBuffer(1, len, ctx.sampleRate), data = buf.getChannelData(0);
      for (var i=0;i<len;i++) data[i] = Math.random()*2 - 1;
      var noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true;
      var band = ctx.createBiquadFilter(); band.type = 'bandpass'; band.frequency.value = 1700; band.Q.value = 2.5;
      var squeal = ctx.createGain(); squeal.gain.value = 0;
      noise.connect(band); band.connect(squeal); squeal.connect(master); noise.start();
      AUD.ctx = ctx; AUD.master = master; AUD.filter = filter; AUD.eng = eng; AUD.o = [o1, o2, o3]; AUD.squeal = squeal;
    } catch(e){ console.warn('[audio] unavailable', e); }
  }
  function updateEngineAudio(){
    if (!AUD.ctx) return;
    var t = AUD.ctx.currentTime, rpm = CS.rpm;
    var f = 34 + rpm * 150;
    AUD.o[0].frequency.setTargetAtTime(f, t, 0.03);
    AUD.o[1].frequency.setTargetAtTime(f, t, 0.03);
    AUD.o[2].frequency.setTargetAtTime(f * 0.5, t, 0.03);
    AUD.filter.frequency.setTargetAtTime(300 + rpm * (CS.gas ? 2200 : 900), t, 0.05);
    var vol = openOverlay ? 0.015 : 0.035 + (CS.gas ? 0.06 : 0.015) + rpm * 0.03;
    AUD.eng.gain.setTargetAtTime(vol, t, 0.06);
    var sq = Math.max(0, Math.min(1, (CS.slip - 2.2) / 5)) * (Math.abs(CS.vF) > 3 ? 0.09 : 0);
    AUD.squeal.gain.setTargetAtTime(sq, t, 0.05);
  }
  function setSound(on){
    AUD.on = on;
    try { localStorage.setItem('town.sound', on ? 'on' : 'off'); } catch(e){}
    if (AUD.master) AUD.master.gain.setTargetAtTime(on ? 1 : 0, AUD.ctx.currentTime, 0.05);
    $('hud-sound-btn').textContent = on ? '♪ Sound on' : '♪ Sound off';
  }
  document.addEventListener('visibilitychange', function(){
    if (!AUD.ctx) return;
    if (document.hidden) AUD.ctx.suspend(); else AUD.ctx.resume();
  });

  // Where is the car? Shows "street · district" and greets you when
  // you enter a district (which also picks the page-view section).
  var lastLoc = '';
  function updateLocation(){
    var city = null, cdHere = null;
    for (var i=0;i<CITY_DEFS.length;i++){
      var cd = CITY_DEFS[i];
      if (car.position.distanceTo(cd.center) < cd.radius){ city = cd.key; cdHere = cd; break; }
    }
    var best = Infinity, road = null;
    for (var r=0;r<roads.length;r++){
      var d = closestOnRoad(roads[r], car.position.x, car.position.z);
      if (d < best){ best = d; road = roads[r]; }
    }
    var streetName = road ? (typeof road.label === 'function' ? road.label(car.position) : road.label) : '';
    var area = cdHere ? cdHere.district : (car.position.distanceTo(PLAZA_C) < 36 ? 'Old town' : '');
    var text = [streetName, area].filter(Boolean).join(' · ') || 'On the road';
    if (text !== lastLoc){ lastLoc = text; locEl.textContent = text; }
    if (city !== currentCity){
      currentCity = city;
      if (cdHere) toast('Welcome to ' + cdHere.district);
    }
  }

  function updateNearestStation(){
    var best = null, bestDist = Infinity;
    stationMeshes.forEach(function(s){
      var d = car.position.distanceTo(s.position);
      if (d < s.triggerRadius && d < bestDist){ best = s; bestDist = d; }
    });
    nearestStation = best;
    var ready = !!(best && !openOverlay);
    $('btn-interact').classList.toggle('ready', ready);
    if (ready){
      promptTextEl.textContent = best.kind === 'item'
        ? 'Read: ' + (best.title.length > 30 ? best.title.slice(0, 29) + '…' : best.title)
        : 'Explore ' + SECTION_BY_KEY[best.key].label;
      promptEl.classList.add('show');
    } else {
      promptEl.classList.remove('show');
    }
  }

  tryInteract = function(){
    if (openOverlay || !nearestStation) return;
    openPanel(nearestStation.key, nearestStation.item);
  };

  function placeCarAt(pt, nextPt){
    car.position.set(pt.x, 0, pt.z);
    car.rotation.y = Math.atan2(nextPt.x - pt.x, nextPt.z - pt.z);
    CS.vx = CS.vz = CS.vF = CS.steer = CS.longAcc = CS.latAcc = 0;
    lookYaw = 0; lookPitch = 0;
    var desired = camOffset.clone().applyQuaternion(car.quaternion).add(car.position);
    camera.position.copy(desired);
  }

  teleportTo = function(key){
    var cd = null;
    CITY_DEFS.forEach(function(c){ if (c.key === key) cd = c; });
    if (!cd) return;
    closeOverlay();
    var pts = cd.road.centerPts, n = pts.length;
    // drop the car on the road right beside the shop
    var i = (cd.stationIdx - 2 + n) % n;
    placeCarAt(pts[i], pts[(i+1) % n]);
    toast('Fast travel → ' + SECTION_BY_KEY[key].label);
  };

  resetCar = function(){
    closeOverlay();
    placeCarAt(spawn.pt, spawn.next);
    toast('Back at the town square');
  };

  // ---------------------------------------------------------------
  // Traffic: CC0 Kenney cars that drive on the right around the
  // roundabout and the four city ring roads. They keep a gap to the
  // car ahead, brake for the player, and are solid — bumping one
  // knocks you back (and stops them for a moment).
  // ---------------------------------------------------------------
  var TRAFFIC_MODELS = [
    { id:'sedan',            url:'models/cars/sedan.glb',            length:4.6 },
    { id:'van',              url:'models/cars/van.glb',              length:4.9 },
    { id:'suv',              url:'models/cars/suv.glb',              length:4.7 },
    { id:'delivery',         url:'models/cars/delivery.glb',         length:5.4 },
    { id:'truck',            url:'models/cars/truck.glb',            length:5.6 },
    { id:'taxi',             url:'models/cars/taxi.glb',             length:4.7 },
    { id:'hatchback-sports', url:'models/cars/hatchback-sports.glb', length:4.1 }
  ];
  var traffic = [];
  var LANE = ROAD_HALF / 2;   // centre of the right-hand lane

  function spawnTraffic(loops){
    var pending = TRAFFIC_MODELS.length;
    TRAFFIC_MODELS.forEach(function(spec){
      loadCarModel(spec, function(){ if (--pending === 0) build(); });
    });
    function build(){
      var k = 0;
      loops.forEach(function(road){
        var count = Math.max(2, Math.round(road.length / 95));
        for (var i=0;i<count;i++){
          var spec = TRAFFIC_MODELS[k++ % TRAFFIC_MODELS.length];
          var dir = i % 2 ? -1 : 1;
          var c = {
            road: road, dir: dir, lane: dir * LANE,
            s: (i / count) * road.length + Math.random()*6,
            v: 0, vmax: 8 + Math.random()*4, spin: 0, stopTimer: 0, hx: 0, hz: 1,
            rig: buildCarRig(spec), group: new THREE.Group(), spec: spec
          };
          c.group.add(c.rig.body);
          trafficPose(c);
          // never spawn on top of the player
          if (Math.hypot(c.group.position.x - car.position.x, c.group.position.z - car.position.z) < 18){
            c.s = (c.s + 25) % road.length; trafficPose(c);
          }
          scene.add(c.group);
          traffic.push(c);
        }
      });
    }
  }

  function trafficPose(c){
    var L = c.road.length;
    c.s = ((c.s % L) + L) % L;
    var f = frameAt(c.road, c.s);
    c.hx = f.tangent.x * c.dir; c.hz = f.tangent.z * c.dir;
    c.group.position.set(f.point.x + f.normal.x*c.lane, 0, f.point.z + f.normal.z*c.lane);
    c.group.rotation.y = Math.atan2(c.hx, c.hz);
  }

  function updateTraffic(dt){
    for (var i=0;i<traffic.length;i++){
      var c = traffic[i], L = c.road.length, target = c.vmax;
      // keep a gap to whoever is ahead in the same lane
      for (var j=0;j<traffic.length;j++){
        var o = traffic[j];
        if (o === c || o.road !== c.road || o.dir !== c.dir) continue;
        var gap = (((o.s - c.s) * c.dir) % L + L) % L;
        if (gap < 22) target = Math.min(target, Math.max(0, (gap - 8) * 0.9));
      }
      // brake for the player if they're in front, in (roughly) our lane
      var rx = car.position.x - c.group.position.x, rz = car.position.z - c.group.position.z;
      var ahead = rx*c.hx + rz*c.hz, lat = Math.abs(rx*c.hz - rz*c.hx);
      if (ahead > 0 && ahead < 18 && lat < 2.9) target = Math.min(target, Math.max(0, (ahead - 6.5) * 0.9));
      if (c.stopTimer > 0){ c.stopTimer -= dt; target = 0; }
      var accel = target > c.v ? 3 : 9;
      var dv = target - c.v;
      c.v += Math.sign(dv) * Math.min(Math.abs(dv), accel * dt);
      c.s += c.dir * c.v * dt;
      trafficPose(c);
      c.spin += c.v * dt / c.rig.radius;
      for (var w=0; w<c.rig.wheels.length; w++) c.rig.wheels[w].pivot.rotation.x = c.spin;
      c.rig.lights.brake.color.setHex(target < c.v - 0.3 || c.v < 0.2 ? 0xff2020 : 0x4a0606);
    }
  }

  // Player ↔ traffic collisions. Each car is approximated by three
  // circles along its length; overlapping circles push the player out
  // and cancel the velocity going into the other car.
  var _pc = [[0,0],[0,0],[0,0]], _tc = [[0,0],[0,0],[0,0]];
  function carCircles(out, x, z, hx, hz, len, hw){
    var off = Math.max(0, len/2 - hw);
    out[0][0] = x + hx*off; out[0][1] = z + hz*off;
    out[1][0] = x;          out[1][1] = z;
    out[2][0] = x - hx*off; out[2][1] = z - hz*off;
  }
  function collideTraffic(){
    if (!traffic.length) return;
    var th = car.rotation.y, phx = Math.sin(th), phz = Math.cos(th);
    var pr = carRig.halfWidth * 1.02;
    for (var i=0;i<traffic.length;i++){
      var c = traffic[i], gx = c.group.position.x, gz = c.group.position.z;
      var dxc = car.position.x - gx, dzc = car.position.z - gz;
      if (dxc*dxc + dzc*dzc > 100) continue;
      carCircles(_pc, car.position.x, car.position.z, phx, phz, carRig.spec.length, pr);
      carCircles(_tc, gx, gz, c.hx, c.hz, c.spec.length, c.rig.halfWidth);
      var tr = c.rig.halfWidth * 1.02;
      for (var a=0;a<3;a++) for (var b=0;b<3;b++){
        var dx = _pc[a][0] - _tc[b][0], dz = _pc[a][1] - _tc[b][1];
        var d = Math.sqrt(dx*dx + dz*dz), min = pr + tr;
        if (d >= min || d < 1e-4) continue;
        var nx = dx/d, nz = dz/d, pen = min - d;
        car.position.x += nx*pen; car.position.z += nz*pen;
        _pc[0][0] += nx*pen; _pc[1][0] += nx*pen; _pc[2][0] += nx*pen;
        _pc[0][1] += nz*pen; _pc[1][1] += nz*pen; _pc[2][1] += nz*pen;
        // relative velocity (traffic moves along its heading)
        var rvx = CS.vx - c.hx*c.v, rvz = CS.vz - c.hz*c.v;
        var vn = rvx*nx + rvz*nz;
        if (vn < 0){
          CS.vx -= nx*vn*1.3; CS.vz -= nz*vn*1.3;
          if (-vn > 2) { CS.impact = Math.max(CS.impact, -vn); playThud(-vn); }
          c.stopTimer = 1.6;
        }
      }
    }
  }

  var lastThud = 0;
  function playThud(strength){
    if (!AUD.ctx || !AUD.on) return;
    var t = AUD.ctx.currentTime;
    if (t - lastThud < 0.25) return;
    lastThud = t;
    var ctx = AUD.ctx, len = Math.floor(ctx.sampleRate * 0.25);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (var i=0;i<len;i++) d[i] = (Math.random()*2 - 1) * Math.pow(1 - i/len, 3);
    var src = ctx.createBufferSource(); src.buffer = buf;
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
    var g = ctx.createGain(); g.gain.value = Math.min(0.9, 0.15 + strength*0.06);
    src.connect(lp); lp.connect(g); g.connect(AUD.master); src.start();
  }

  // ---------------------------------------------------------------
  // Billboards: every portfolio item stands in the world. Each city's
  // avenue is lined with lit billboards — one per project, job, skill
  // group or contact method — so you can read the portfolio just by
  // driving past. Pull up and press E to open that exact item.
  // ---------------------------------------------------------------
  var billboardSpots = [];
  function sectionItems(key){
    var d = P[key] || {};
    if (key === 'skills') return d.groups || [];
    if (key === 'contact') return d.links || [];
    return d.items || [];
  }
  function billboardContent(key, i){
    var it = sectionItems(key)[i];
    if (!it) return null;
    var n = String(i + 1).padStart(2, '0');
    if (key === 'projects')   return { eyebrow: 'PROJECT ' + n + (it.year ? '  ·  ' + it.year : ''), title: it.name, sub: '', body: it.summary, chips: it.tags };
    if (key === 'experience') return { eyebrow: 'EXPERIENCE  ·  ' + (it.period || ''), title: it.org || it.role, sub: it.org ? it.role : '', body: it.summary, chips: [] };
    if (key === 'skills')     return { eyebrow: 'SKILLS  ·  ' + n, title: it.name, sub: '', body: '', chips: it.items };
    return { eyebrow: 'CONTACT', title: it.label || it.kind, sub: it.value || '', body: 'Pull over and press E to open', chips: [] };
  }

  function wrapLines(ctx, text, maxW, maxLines){
    var words = String(text || '').split(/\s+/), lines = [], line = '';
    for (var i=0;i<words.length;i++){
      var test = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxW && line){ lines.push(line); line = words[i]; }
      else line = test;
      if (lines.length === maxLines) break;
    }
    if (lines.length < maxLines && line) lines.push(line);
    if (lines.length === maxLines && words.join(' ') !== lines.join(' ')){
      var last = lines[maxLines-1];
      while (last.length && ctx.measureText(last + '…').width > maxW) last = last.slice(0, -1);
      lines[maxLines-1] = last.replace(/\s+\S*$/, '') + '…';
    }
    return lines;
  }
  function billboardTexture(c, color){
    var W = 1024, H = 640, cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var x = cv.getContext('2d'), pad = 60, maxW = W - pad*2;
    var g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#161c2b'); g.addColorStop(1, '#0a0d15');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.fillStyle = color; x.fillRect(0, 0, W, 18);
    x.globalAlpha = 0.12; x.fillRect(0, 18, W, 120); x.globalAlpha = 1;
    var SANS = '"Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif', MONO = '"JetBrains Mono", Consolas, monospace';
    var y = 92;
    x.textBaseline = 'alphabetic';
    x.font = '600 30px ' + MONO; x.fillStyle = color; x.fillText(c.eyebrow, pad, y);
    // title: shrink to fit, up to two lines
    var size = 92, lines;
    do { x.font = '700 ' + size + 'px ' + SANS; lines = wrapLines(x, c.title, maxW, 2); size -= 6; }
    while (size > 54 && lines.some(function(l){ return x.measureText(l).width > maxW; }));
    x.fillStyle = /TODO/.test(c.title) ? '#ffb84d' : '#f5f2ec';
    lines.forEach(function(l){ y += size + 10; x.fillText(l, pad, y); });
    if (c.sub){
      y += 50; x.font = '500 36px ' + MONO; x.fillStyle = /TODO/.test(c.sub) ? '#ffb84d' : '#a8aebd';
      x.fillText(wrapLines(x, c.sub, maxW, 1)[0] || '', pad, y);
    }
    if (c.body){
      x.font = '400 38px ' + SANS; x.fillStyle = /TODO/.test(c.body) ? '#ffb84d' : '#d9d5cc';
      y += 26;
      wrapLines(x, c.body, maxW, c.chips && c.chips.length ? 2 : 3).forEach(function(l){ y += 50; x.fillText(l, pad, y); });
    }
    var chips = (c.chips || []).filter(Boolean);
    if (chips.length){
      x.font = '500 30px ' + MONO;
      var cx = pad, cy = Math.max(y + 40, H - 150), rowH = 56;
      chips.forEach(function(t){
        var w = x.measureText(t).width + 40;
        if (cx + w > W - pad){ cx = pad; cy += rowH + 12; }
        if (cy + rowH > H - 24) return;
        x.strokeStyle = color; x.lineWidth = 3;
        var r = 26;
        x.beginPath();
        x.moveTo(cx + r, cy); x.lineTo(cx + w - r, cy); x.arc(cx + w - r, cy + r, r, -Math.PI/2, Math.PI/2);
        x.lineTo(cx + r, cy + rowH - 4); x.arc(cx + r, cy + r, r, Math.PI/2, Math.PI*1.5);
        x.closePath(); x.stroke();
        x.fillStyle = '#f0ece4'; x.fillText(t, cx + 20, cy + 38);
        cx += w + 14;
      });
    }
    var tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return tex;
  }

  var BB = null;
  function placeBillboard(cd, key, i, road, s, side){
    var c = billboardContent(key, i);
    if (!c) return false;
    var fChk = frameAt(road, s), offChk = SIDEWALK_OUTER + 1.7;
    if (!isLand(fChk.point.x + fChk.normal.x*side*offChk, fChk.point.z + fChk.normal.z*side*offChk)) return false;
    if (!BB){
      BB = {
        board: new THREE.PlaneGeometry(7.2, 4.5),
        frame: new THREE.BoxGeometry(7.6, 4.9, 0.3),
        post: new THREE.CylinderGeometry(0.13, 0.15, 4.9, 8),
        metal: new THREE.MeshStandardMaterial({ color: 0x23262d, roughness: 0.5, metalness: 0.6 })
      };
    }
    var f = frameAt(road, s);
    var n = f.normal.clone().multiplyScalar(side);                       // from road toward the lot
    var pos = f.point.clone().addScaledVector(n, SIDEWALK_OUTER + 1.7);
    // face the road, angled toward drivers arriving from the town square
    var face = n.clone().negate().addScaledVector(f.tangent, -0.6).normalize();
    var grp = new THREE.Group();
    grp.position.set(pos.x, 0, pos.z);
    grp.rotation.y = Math.atan2(face.x, face.z);
    var colorHex = '#' + new THREE.Color(cd.color).getHexString();
    var board = new THREE.Mesh(BB.board, new THREE.MeshBasicMaterial({ map: billboardTexture(c, colorHex) }));
    board.position.set(0, 5.0, 0.17);
    var frame = new THREE.Mesh(BB.frame, BB.metal); frame.position.set(0, 5.0, 0); frame.castShadow = true;
    grp.add(board); grp.add(frame);
    [-2.6, 2.6].forEach(function(px){
      var post = new THREE.Mesh(BB.post, BB.metal); post.position.set(px, 2.45, -0.05); post.castShadow = true; grp.add(post);
    });
    var accent = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.12, 0.34), new THREE.MeshBasicMaterial({ color: cd.color }));
    accent.position.set(0, 7.5, 0); grp.add(accent);
    scene.add(grp);
    placedFootprints.push({ x: pos.x, z: pos.z, r: 4.2 });   // board is 7.6 m wide
    billboardSpots.push({ x: pos.x, z: pos.z });
    stationMeshes.push({ key: key, item: i, kind: 'item', title: c.title, position: new THREE.Vector3(pos.x, 0, pos.z),
                         triggerRadius: 12.5, cityCenter: cd.center });
    return true;
  }
  function nearBillboard(x, z, r){
    for (var i=0;i<billboardSpots.length;i++){
      var b = billboardSpots[i];
      if ((b.x-x)*(b.x-x) + (b.z-z)*(b.z-z) < r*r) return true;
    }
    return false;
  }

  // Slow flyover behind the landing card, before the visitor drives.
  var attract = true, attractT = 0;
  function attractCamera(dt){
    attractT += dt;
    var a = attractT * 0.035 + 1.2;
    camera.position.set(Math.cos(a)*235, 105 + Math.sin(attractT*0.12)*8, -30 + Math.sin(a)*235);
    camera.lookAt(0, 0, -30);
    var W = window.innerWidth, H = window.innerHeight;
    if (W > 760) camera.setViewOffset(W, H, -W*0.2, 0, W, H);   // town sits right of the card
    else camera.clearViewOffset();
  }

  var _camFwd = new THREE.Vector3();
  function updateCamera(dt){
    if (!isDragging){
      lookYaw = THREE.MathUtils.lerp(lookYaw, 0, 1 - Math.pow(0.0005, dt));
      lookPitch = THREE.MathUtils.lerp(lookPitch, 0, 1 - Math.pow(0.0005, dt));
    }
    var v = Math.abs(CS.vF);
    // pull back, rise and widen the lens with speed
    camOffset.set(0, 3.5 + v*0.03, -(7.2 + v*0.085));
    var fov = 58 + Math.min(14, v*0.33);
    if (Math.abs(camera.fov - fov) > 0.05){ camera.fov += (fov - camera.fov) * Math.min(1, dt*3); camera.updateProjectionMatrix(); }
    var lookQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(lookPitch, lookYaw, 0, 'YXZ'));
    var desired = camOffset.clone().applyQuaternion(lookQuat).applyQuaternion(car.quaternion).add(car.position);
    camera.position.lerp(desired, 1 - Math.pow(0.0015, dt));
    // bump shake when you clip a curb hard
    if (CS.impact > 0){ CS.shake = Math.min(0.45, CS.shake + CS.impact*0.05); CS.impact = 0; }
    if (CS.shake > 0.001){
      camera.position.x += (Math.random()-0.5)*CS.shake;
      camera.position.y += (Math.random()-0.5)*CS.shake*0.6;
      CS.shake *= Math.pow(0.02, dt);
    }
    _camFwd.set(Math.sin(car.rotation.y), 0, Math.cos(car.rotation.y));
    camTarget.copy(car.position).addScaledVector(_camFwd, 2 + v*0.08);
    camTarget.y += 1.1;
    camera.lookAt(camTarget);
  }

  function drawMinimap(){
    var w = mmCanvas.width, h = mmCanvas.height;
    var k = MM_SCALE;
    mmCtx.clearRect(0,0,w,h);
    // town spans z ≈ −225 (island) … +165 (ring road): centre on that
    var cx = w/2, cy = h/2 + 30*k;
    mmCtx.fillStyle = 'rgba(38,96,138,0.55)';
    mmCtx.beginPath(); mmCtx.moveTo(0, 0);
    for (var sx = 0; sx <= w; sx += 6) mmCtx.lineTo(sx, cy + SHORE_Z((sx - cx)/k)*k);
    mmCtx.lineTo(w, 0); mmCtx.closePath(); mmCtx.fill();
    mmCtx.fillStyle = 'rgba(14,17,26,0.95)';
    mmCtx.beginPath(); mmCtx.arc(cx + ISLAND_C.x*k, cy + ISLAND_C.z*k, ISLAND_LAND*k, 0, Math.PI*2); mmCtx.fill();
    mmCtx.strokeStyle = 'rgba(205,200,188,0.42)';
    mmCtx.lineWidth = Math.max(3, ROAD_HALF*2*k);
    mmCtx.lineJoin = 'round'; mmCtx.lineCap = 'round';
    roads.forEach(function(road){
      mmCtx.beginPath();
      for (var i=0;i<road.centerPts.length;i++){
        var mx = cx + road.centerPts[i].x*k;
        var mz = cy + road.centerPts[i].z*k;
        if (i===0) mmCtx.moveTo(mx,mz); else mmCtx.lineTo(mx,mz);
      }
      if (road.closed) mmCtx.closePath();
      mmCtx.stroke();
    });
    mmCtx.font = '700 18px JetBrains Mono, monospace';
    mmCtx.textAlign = 'center'; mmCtx.textBaseline = 'middle';
    stationMeshes.forEach(function(s){
      var sec = SECTION_BY_KEY[s.key];
      var mx = cx + s.position.x*k;
      var mz = cy + s.position.z*k;
      mmCtx.fillStyle = sec.color;
      mmCtx.beginPath(); mmCtx.arc(mx, mz, s.kind === 'item' ? 3.5 : 6, 0, Math.PI*2); mmCtx.fill();
      if (s.kind === 'item') return;
      var lx = cx + s.cityCenter.x*k, lz = cy + s.cityCenter.z*k;
      mmCtx.fillText(String(sec.index + 1), lx, lz);
    });
    mmCtx.fillStyle = 'rgba(230,230,240,0.7)';
    for (var ti=0; ti<traffic.length; ti++){
      var tp = traffic[ti].group.position;
      mmCtx.fillRect(cx + tp.x*k - 2.5, cy + tp.z*k - 2.5, 5, 5);
    }
    var px = cx + car.position.x*k;
    var pz = cy + car.position.z*k;
    mmCtx.save();
    mmCtx.translate(px,pz);
    mmCtx.rotate(-car.rotation.y);
    mmCtx.fillStyle = '#39ff88';
    mmCtx.beginPath();
    mmCtx.moveTo(0,10); mmCtx.lineTo(7,-8); mmCtx.lineTo(-7,-8);
    mmCtx.closePath(); mmCtx.fill();
    mmCtx.restore();
  }

  function tick(){
    requestAnimationFrame(tick);
    if (!running){
      if (worldBuilt && attract){
        try {
          var adt = Math.min(clock.getDelta(), 0.1);
          updateTraffic(adt);
          updateSky(adt);
          updateHarbor(adt);
          attractCamera(adt);
          renderer.render(scene, camera);
        } catch(e){ attract = false; showFatalError(e.message || 'render loop error'); }
      }
      return;
    }
    try {
      var dt = Math.min(clock.getDelta(), 0.1);
      var t = clock.elapsedTime;
      updateTraffic(dt);
      updateCar(dt);
      updateSky(dt);
      updateHarbor(dt);
      updateNearestStation();
      updateLocation();
      if (!debugCam) updateCamera(dt);
      // gentle bob on shop labels so they read as interactive
      stationMeshes.forEach(function(s, i){
        if (!s.label) return;
        s.label.position.y = 6.6 + Math.sin(t*2 + i) * 0.18;
        s.ring.material.opacity = (s === nearestStation) ? 1 : 0.55 + Math.sin(t*3 + i)*0.2;
      });
      drawMinimap();
      renderer.render(scene, camera);
    } catch(e){
      running = false;
      showFatalError(e.message || 'render loop error');
    }
  }
  tick();

  // ?debug in the URL exposes a handle for inspecting the scene from
  // devtools, e.g. __town.topDown(0, 0, 420) for a bird's-eye view.
  var debugCam = false;
  if (/[?&]debug\b/.test(location.search)){
    window.__town = {
      scene: scene, camera: camera, renderer: renderer,
      get car(){ return car; },
      get state(){ return CS; },
      get traffic(){ return traffic; },
      get stations(){ return stationMeshes; },
      // force a sun position, e.g. __town.sky(30, 180) for mid-afternoon
      sky: function(el, az){ skyMode = 'debug'; skyTarget.el = el; skyTarget.az = az; skyCur = null; skyClockTimer = 1e9; updateSky(0); },
      solar: function(iso, lat, lon){ return solarPosition(new Date(iso), lat, lon); },
      // advance the physics by `sec` seconds of simulated time
      sim: function(sec){ for (var i=0, n=Math.round(sec/STEP); i<n; i++){ updateTraffic(STEP); physicsStep(STEP); } updateGear(1); return { kmh: Math.abs(CS.vF)*3.6, gear: CS.gear, slip: CS.slip, x: car.position.x, z: car.position.z, yaw: car.rotation.y }; },
      input: input,
      topDown: function(x, z, h){
        debugCam = true;
        camera.position.set(x, h, z + 0.01);
        camera.lookAt(x, 0, z);
        scene.fog.density = 0;
      },
      look: function(px, py, pz, tx, ty, tz){
        debugCam = true;
        camera.position.set(px, py, pz);
        camera.lookAt(tx, ty, tz);
      },
      follow: function(){ debugCam = false; }
    };
  }

  function initWorld(){
    if (worldBuilt) return;
    var _t0 = performance.now(), _tp = [];
    function lap(name){ _tp.push(name + ' ' + Math.round(performance.now() - _t0) + 'ms'); }
    // ================================================================
    // LAYOUT — a coastal town (−z is north, the sea; +x is east)
    //
    //              ~~~~~~~~~~~~~~ SEA ~~~~~~~~~~~~~~
    //                  ( ISLAND · Contact )  lighthouse
    //                          ║  Harbour Bridge
    //   ════════════════ Waterfront Boulevard ═════════════════
    //   ║           ║             │             ║            ║
    //   ║  PROJECTS ╬══ Market St ◯ Market St ══╬  SKILLS    ║
    //   ║   (west)  ║          PLAZA            ║   (east)   ║
    //   ║           ║             │             ║            ║
    //   ╠═══════════╬═══ Hill Rd ═╬═════════════╬════════════╣
    //   ║           ║   EXPERIENCE (Main St)    ║            ║
    //   ╚═══════════╩═════════════╩═════════════╩════════════╝
    //                    hills in the distance
    //
    // The ring road's north side is the waterfront. Every street is a
    // separate segment between junctions, so each junction gets cut
    // curbs, crosswalks and stop lines automatically.
    // ================================================================
    function V(x, z){ return new THREE.Vector3(x, 0, z); }
    function circlePts(c, r){
      var pts = [];
      for (var k=0;k<256;k++){ var a = k/256*Math.PI*2; pts.push(V(c.x + Math.cos(a)*r, c.z + Math.sin(a)*r)); }
      return pts;
    }
    function street(label, pts){ var r = makeRoad(label, resample(pts, false, 1), false); r.label = label; return r; }
    function nearestIdx(road, p){
      var best = 0, bd = Infinity;
      road.centerPts.forEach(function(q, i){ var d = q.distanceToSquared(p); if (d < bd){ bd = d; best = i; } });
      return best;
    }

    // ---- the ring road: waterfront to the north, hills to the south ----
    var ringCtl = [];
    for (var bx = -150; bx <= 150; bx += 25) ringCtl.push(V(bx, BOULEVARD_Z(bx)));
    [[172,-28],[180,0],[180,60],[180,120],[172,150],[150,160],[100,160],[50,160],[0,160],
     [-50,160],[-100,160],[-150,160],[-172,150],[-180,120],[-180,60],[-180,0],[-172,-28]]
      .forEach(function(p){ ringCtl.push(V(p[0], p[1])); });
    var ringRoad = makeRoad('ring', resample(new THREE.CatmullRomCurve3(ringCtl, true, 'centripetal').getSpacedPoints(1600), true, 1), true);
    ringRoad.label = function(p){ return p.z < -20 ? 'Waterfront Boulevard' : 'Ring Road'; };
    var onRing = function(x, z){ return ringRoad.centerPts[nearestIdx(ringRoad, V(x, z))].clone(); };

    var plazaRoad = makeRoad('plaza', resample(circlePts(PLAZA_C, PLAZA_R), true, 1), true);
    plazaRoad.label = 'Town Square';
    var islandRoad = makeRoad('island', resample(circlePts(ISLAND_C, ISLAND_R), true, 1), true);
    islandRoad.label = 'Island Loop';

    // junctions
    var Pw = V(PLAZA_C.x - PLAZA_R, PLAZA_C.z), Pe = V(PLAZA_C.x + PLAZA_R, PLAZA_C.z);
    var Pn = V(PLAZA_C.x, PLAZA_C.z - PLAZA_R), Ps = V(PLAZA_C.x, PLAZA_C.z + PLAZA_R);
    var A = V(-90, PLAZA_C.z), B = V(90, PLAZA_C.z), C = V(-90, 95), D = V(0, 95), E = V(90, 95);
    var Nw = onRing(-180, PLAZA_C.z), Ne = onRing(180, PLAZA_C.z), Nw2 = onRing(-180, 95), Ne2 = onRing(180, 95);
    var Nb0 = onRing(0, -40), Nbw = onRing(-90, -40), Nbe = onRing(90, -40);
    var Ns0 = onRing(0, 160), Nsw = onRing(-90, 160), Nse = onRing(90, 160);
    var Is = V(ISLAND_C.x, ISLAND_C.z + ISLAND_R);

    var marketW1 = street('Market Street', [Pw, A]), marketW2 = street('Market Street', [A, Nw]);
    var marketE1 = street('Market Street', [Pe, B]), marketE2 = street('Market Street', [B, Ne]);
    var mainS1 = street('Main Street', [Ps, D]), mainS2 = street('Main Street', [D, Ns0]);
    var mainN = street('Main Street', [Pn, Nb0]);
    var bridge = street('Harbour Bridge', [Nb0, Is]);
    var westAve = [street('West Avenue', [Nbw, A]), street('West Avenue', [A, C]), street('West Avenue', [C, Nsw])];
    var eastAve = [street('East Avenue', [Nbe, B]), street('East Avenue', [B, E]), street('East Avenue', [E, Nse])];
    var hillRd = [street('Hill Road', [Nw2, C]), street('Hill Road', [C, D]), street('Hill Road', [D, E]), street('Hill Road', [E, Ne2])];

    roads = [ringRoad, plazaRoad, islandRoad, marketW1, marketW2, marketE1, marketE2, mainS1, mainS2, mainN, bridge]
      .concat(westAve, eastAve, hillRd);

    // plaster tints and awning colours for the neighbourhood streets
    var HUB_PALETTE = ['#c9b79c','#a7b8a3','#c99d8c','#9fb3c4','#d4c08a','#8c5a4a'];
    CITY_DEFS = [
      { key:'projects',   color: 0x4da6ff, dir: V(-1,0), center: V(-105, PLAZA_C.z), radius: 72,
        streets: [marketW1, marketW2], extra: [westAve[0], westAve[1]], end: Nw, road: ringRoad, district: 'Projects district',
        styles: { glass: 3, office: 3, brick: 1 },
        palette: ['#3d5a80','#5a7ba0','#2f4761','#6f8db3','#1f3350','#4d6d8f'] },
      { key:'skills',     color: 0xffb84d, dir: V(1,0),  center: V(105, PLAZA_C.z), radius: 72,
        streets: [marketE1, marketE2], extra: [eastAve[0], eastAve[1]], end: Ne, road: ringRoad, district: 'Skills market',
        styles: { brick: 3, plaster: 2, office: 1 },
        palette: ['#a3652f','#c98a45','#8a5225','#d9a05c','#6b3d18','#b87a3a'] },
      { key:'experience', color: 0xff6b9d, dir: V(0,1),  center: V(0, 122), radius: 52,
        streets: [mainS1, mainS2], extra: [hillRd[1], hillRd[2]], end: Ns0, road: ringRoad, district: 'Experience hill',
        styles: { office: 3, brick: 2, glass: 1 },
        palette: ['#8a4a63','#a85e7d','#6b3548','#c47a98','#4f2536','#96567a'] },
      { key:'contact',    color: 0xa685ff, dir: V(0,-1), center: ISLAND_C.clone(), radius: 50,
        streets: [islandRoad], end: V(ISLAND_C.x, ISLAND_C.z - ISLAND_R), road: islandRoad, district: 'Contact island',
        styles: { plaster: 1 },
        palette: ['#5a4a8a','#7060a8','#3f3366','#8f7ac4','#2b2347','#6c5a9e'] }
    ];

    buildCoast();               // land, sea, seawall
    lap('coast');
    buildStreetNetwork();
    lap('streets');
    buildBridge(bridge);

    // ---- Park in the middle of the square ----
    var PARK_R = PLAZA_R - SIDEWALK_OUTER;
    placedFootprints.push({ x: PLAZA_C.x, z: PLAZA_C.z, r: PARK_R + 1 });
    placedFootprints.push({ x: ISLAND_C.x, z: ISLAND_C.z, r: 5 });     // lighthouse
    var lawn = new THREE.Mesh(
      new THREE.CircleGeometry(PARK_R, 48),
      new THREE.MeshStandardMaterial({ color: 0x2c3a26, roughness: 1 })
    );
    lawn.rotation.x = -Math.PI/2; lawn.position.set(PLAZA_C.x, 0.012, PLAZA_C.z); lawn.receiveShadow = true;
    scene.add(lawn);

    // ---- One shop per district, at the end of its street ----
    CITY_DEFS.forEach(function(cd){
      var sec = SECTION_BY_KEY[cd.key];
      cd.stationIdx = nearestIdx(cd.road, cd.end);
      var out = cd.dir.clone();
      var pos = cd.road.centerPts[cd.stationIdx].clone().addScaledVector(out, SIDEWALK_OUTER + 2.6);

      var group = new THREE.Group();
      group.position.copy(pos);
      group.rotation.y = Math.atan2(-out.x, -out.z);   // shopfront faces the street

      var shop = new THREE.Mesh(
        new THREE.BoxGeometry(4.2, 5.2, 3.2),
        new THREE.MeshStandardMaterial({ color: cd.color, emissive: cd.color, emissiveIntensity: 0.3, roughness:0.5 })
      );
      shop.position.y = 2.6;
      shop.castShadow = true;
      group.add(shop);

      var awning = new THREE.Mesh(
        new THREE.BoxGeometry(4.8, 0.3, 1.2),
        new THREE.MeshStandardMaterial({ color: cd.color, emissive: cd.color, emissiveIntensity:0.6, roughness:0.4 })
      );
      awning.position.set(0, 2.7, 1.9);
      group.add(awning);

      var ring = new THREE.Mesh(
        new THREE.TorusGeometry(3.6, 0.15, 8, 32),
        new THREE.MeshBasicMaterial({ color: cd.color, transparent: true, opacity: 0.8 })
      );
      ring.rotation.x = Math.PI/2;
      ring.position.set(0, 0.1, 0);
      group.add(ring);

      var label = makeLabelSprite(sec.label.toUpperCase(), sec.color);
      label.position.y = 6.6;
      group.add(label);

      var light = new THREE.PointLight(cd.color, 1.4, 22);
      light.position.set(0, 4, 3);
      group.add(light);

      scene.add(group);
      placedFootprints.push({ x: pos.x, z: pos.z, r: 7 });
      stationMeshes.push({ key: cd.key, position: pos, group: group, label: label, ring: ring, cityCenter: cd.center, triggerRadius: 13 });
    });

    // ---- Billboards: one per portfolio item, along the district's streets ----
    // Candidate lots are collected along every street of the district
    // (both sides, ~9 m apart); items are spread evenly over them, so a
    // short list is spaced out and a long list fills every lot.
    CITY_DEFS.forEach(function(cd){
      var n = sectionItems(cd.key).length;
      if (!n) return;
      var slots = [];
      cd.streets.concat(cd.extra || []).forEach(function(road){
        var isExtra = cd.streets.indexOf(road) < 0;
        var s0 = road.closed ? 4 : 14, s1 = road.closed ? road.length - 9 : road.length - 14, k = 0;
        for (var s = s0; s <= s1; s += 9, k++){
          var f = frameAt(road, s);
          var sides = k % 2 ? [1, -1] : [-1, 1];   // zig-zag first, the other side fills in after
          if (road.closed){   // island: inside of the loop only (the outside is shore)
            var toC = V(ISLAND_C.x - f.point.x, ISLAND_C.z - f.point.z);
            sides = [f.normal.dot(toC) > 0 ? 1 : -1];
          }
          sides.forEach(function(side, si){
            var off = SIDEWALK_OUTER + 1.7;
            var x = f.point.x + f.normal.x*side*off, z = f.point.z + f.normal.z*side*off;
            if (distToRoads(x, z, road) < SIDEWALK_OUTER + 5) return;     // junction mouths
            if (!isLand(x, z)) return;
            slots.push({ road: road, s: s, side: side, x: x, z: z, second: si > 0, extra: isExtra });
          });
        }
      });
      // primary lots (one side, zig-zag) first, then the opposite side
      slots.sort(function(a, b){ return (a.pri || 0) - (b.pri || 0); });
      // main street: one side zig-zag, then the other side; then the cross streets
      var primary = slots.filter(function(x){ return !x.second && !x.extra; });
      var secondary = slots.filter(function(x){ return x.second && !x.extra; }).concat(slots.filter(function(x){ return x.extra; }));
      var order = [];
      var nPrim = Math.min(n, primary.length);
      for (var i=0;i<nPrim;i++) order.push(primary[nPrim === 1 ? Math.floor(primary.length/2) : Math.round(i * (primary.length - 1) / (nPrim - 1))]);
      primary.concat(secondary).forEach(function(x){ if (order.indexOf(x) < 0) order.push(x); });   // fallbacks
      var placed = 0;
      for (var oi = 0; oi < order.length && placed < n; oi++){
        var slot = order[oi];
        if (!footprintFree(slot.x, slot.z, 4.2)) continue;
        if (placeBillboard(cd, cd.key, placed, slot.road, slot.s, slot.side)) placed++;
      }
      if (placed < n) console.warn('[portfolio] ' + (n - placed) + ' ' + cd.key + ' item(s) had no room for a billboard — they still appear in the panel and page view.');
    });

    lap('shops+billboards');
    // ---- Buildings, street lights and street trees ----
    var NEIGHBOURHOOD = { plaster: 3, brick: 3 };
    CITY_DEFS.forEach(function(cd){
      cd.streets.forEach(function(r){
        // the island keeps its lighthouse view: lamps and trees, no buildings
        populateRoad(r, { buildStep: r === islandRoad ? 0 : 8, lampStep: r.closed ? 12 : 14, treeStep: r.closed ? 0 : 14, palette: cd.palette,
                          signColor: cd.color, styles: cd.styles, lampColor: cd.color });
      });
    });
    populateRoad(plazaRoad, { buildStep: 6, lampStep: 12, palette: HUB_PALETTE, styles: { plaster: 3, brick: 2 }, lampColor: 0xffcf8a });
    populateRoad(ringRoad,  { buildStep: 8, lampStep: 15, palette: HUB_PALETTE, styles: { plaster: 3, brick: 3, office: 1 }, lampColor: 0xffcf8a });
    populateRoad(mainN,     { buildStep: 8, lampStep: 14, treeStep: 12, palette: HUB_PALETTE, styles: { plaster: 2, brick: 2 }, lampColor: 0xffcf8a });
    populateRoad(bridge,    { lampStep: 12, lampColor: 0xfff1d6 });
    westAve.concat(eastAve, hillRd).forEach(function(r){
      populateRoad(r, { buildStep: 8, lampStep: 16, treeStep: 16, palette: HUB_PALETTE, styles: NEIGHBOURHOOD, lampColor: 0xffcf8a });
    });
    lap('populate');
    fillBlocks(HUB_PALETTE);    // back lots inside the blocks
    lap('back lots');
    finishBuildings();
    lap('merge buildings');

    // ---- Park trees + fountain in the square ----
    var treesPlaced = 0, attempts = 0;
    while (treesPlaced < 8 && attempts < 300){
      attempts++;
      var ang = Math.random()*Math.PI*2, rad = 6 + Math.random()*(PARK_R - 7.5);
      makeTree(new THREE.Vector3(PLAZA_C.x + Math.cos(ang)*rad, 0, PLAZA_C.z + Math.sin(ang)*rad), 0.8 + Math.random()*0.3);
      treesPlaced++;
    }
    var FX = PLAZA_C.x, FZ = PLAZA_C.z;
    var plazaBase = new THREE.Mesh(new THREE.CylinderGeometry(4.5,4.5,0.15,32), new THREE.MeshStandardMaterial({ color:0x6a6558, roughness:0.9 }));
    plazaBase.position.set(FX, 0.08, FZ);
    plazaBase.receiveShadow = true;
    scene.add(plazaBase);
    var fountainRim = new THREE.Mesh(new THREE.CylinderGeometry(1.6,1.7,0.5,24), new THREE.MeshStandardMaterial({ color:0x8a8474, roughness:0.8 }));
    fountainRim.position.set(FX, 0.33, FZ);
    fountainRim.castShadow = true;
    scene.add(fountainRim);
    var fountainWater = new THREE.Mesh(new THREE.CylinderGeometry(1.3,1.3,0.45,24), new THREE.MeshStandardMaterial({ color:0x3a6d8f, emissive:0x1c4a63, emissiveIntensity:0.4, roughness:0.3 }));
    fountainWater.position.set(FX, 0.4, FZ);
    scene.add(fountainWater);
    var fountainSpout = new THREE.Mesh(new THREE.ConeGeometry(0.25,1.0,10), new THREE.MeshStandardMaterial({ color:0x8a8474, roughness:0.8 }));
    fountainSpout.position.set(FX, 1.1, FZ);
    scene.add(fountainSpout);
    var fountainLight = new THREE.PointLight(0x8fd6ff, 0.8, 14);
    fountainLight.position.set(FX, 1.5, FZ);
    scene.add(fountainLight);

    // island: trees around the lighthouse
    for (var ti=0; ti<40; ti++){
      var outer = ti % 2;   // inside the loop, and along the shore outside it
      var ta = Math.random()*Math.PI*2, tr = outer ? ISLAND_R + SIDEWALK_OUTER + 2 + Math.random()*5 : 7 + Math.random()*9;
      var tx = ISLAND_C.x + Math.cos(ta)*tr, tz = ISLAND_C.z + Math.sin(ta)*tr;
      if (footprintFree(tx, tz, 2)) makeTree(new THREE.Vector3(tx, 0, tz), 0.7 + Math.random()*0.3);
    }
    buildLighthouse(ISLAND_C);
    buildHills();
    buildBoats();

    // ---- Signposts where each street leaves the square ----
    CITY_DEFS.forEach(function(cd){
      var sec = SECTION_BY_KEY[cd.key];
      var side = new THREE.Vector3(-cd.dir.z, 0, cd.dir.x);
      var at = PLAZA_C.clone().addScaledVector(cd.dir, PLAZA_R + SIDEWALK_OUTER + 9).addScaledVector(side, -(STREET_EDGE + 1.6));
      var post = new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,3,6), lampKit().metal);
      post.position.set(at.x, CURB_H + 1.5, at.z);
      scene.add(post);
      var sign = makeLabelSprite((sec.index+1) + ' ' + sec.label.toUpperCase() + ' →', sec.color);
      sign.scale.set(5, 1.25, 1);
      sign.position.set(at.x, CURB_H + 3.3, at.z);
      scene.add(sign);
    });

    // ---- Traffic lights on the corners where streets leave the square ----
    if (ASSETS.trafficLight){
      var tlProto = ASSETS.trafficLight.clone(true);
      tlProto.updateMatrixWorld(true);
      var tlBox = new THREE.Box3().setFromObject(tlProto);
      var tlSize = tlBox.getSize(new THREE.Vector3()), tlCenter = tlBox.getCenter(new THREE.Vector3());
      var tlScale = 5.2 / tlSize.y;
      var tlPivot = new THREE.Group();
      tlProto.position.set(-tlCenter.x, -tlBox.min.y, -tlCenter.z);
      tlPivot.add(tlProto);
      tlPivot.scale.setScalar(tlScale);
      tlPivot.traverse(function(o){ if (o.isMesh){ o.castShadow = true; } });

      CITY_DEFS.forEach(function(cd){
        var side = new THREE.Vector3(-cd.dir.z, 0, cd.dir.x);
        // right-hand corner for traffic arriving at the square
        var at = PLAZA_C.clone().addScaledVector(cd.dir, PLAZA_R + STREET_EDGE + 1.3).addScaledVector(side, -(STREET_EDGE + 1.0));
        var tl = tlPivot.clone(true);
        tl.position.set(at.x, CURB_H, at.z);
        tl.rotation.y = Math.atan2(cd.dir.x, cd.dir.z);   // faces drivers heading into the square
        scene.add(tl);
      });
    }

    // spawn on the square, between two streets
    (function(){
      var pts = plazaRoad.centerPts, n = pts.length;
      var want = PLAZA_C.clone().add(new THREE.Vector3(1,0,1).normalize().multiplyScalar(PLAZA_R));
      var i = nearestIdx(plazaRoad, want);
      spawn = { pt: pts[i], next: pts[(i+1) % n] };
    })();
    trafficLoops = [ringRoad, plazaRoad, islandRoad];


    // ---- Car ----
    car = new THREE.Group();
    installCarRig(CAR_BY_ID[carId]);
    // headlight beam so the road ahead is readable at dusk
    var beam = carBeam = new THREE.SpotLight(0xfff1d6, 1.4, 38, 0.5, 0.6, 1);
    beam.position.set(0, 1.0, 2.0);
    beam.target.position.set(0, 0, 14);
    car.add(beam); car.add(beam.target);

    forwardVec = new THREE.Vector3();
    camOffset = new THREE.Vector3(0, 4.2, -8.5);
    camTarget = new THREE.Vector3();
    scene.add(car);
    placeCarAt(spawn.pt, spawn.next);
    spawnTraffic(trafficLoops);

    // ---- Touch controls ----
    function bindHold(id, onFlag){
      var el = $(id);
      var on = function(ev){ ev.preventDefault(); if (!openOverlay){ onFlag(true); el.classList.add('held'); } };
      var off = function(ev){ ev.preventDefault(); onFlag(false); el.classList.remove('held'); };
      el.addEventListener('pointerdown', on);
      el.addEventListener('pointerup', off);
      el.addEventListener('pointercancel', off);
      el.addEventListener('pointerleave', off);
      el.addEventListener('contextmenu', function(ev){ ev.preventDefault(); });
    }
    bindHold('btn-accel', function(v){ input.forward = v; });
    bindHold('btn-brake', function(v){ input.backward = v; });
    bindHold('btn-left', function(v){ input.left = v; });
    bindHold('btn-right', function(v){ input.right = v; });
    bindHold('btn-hand', function(v){ input.handbrake = v; });
    $('btn-interact').addEventListener('click', function(){ tryInteract(); });
    var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (coarse || 'ontouchstart' in window) $('touch-controls').classList.add('active');

    // ---- HUD wiring ----
    promptEl = $('station-prompt');
    promptTextEl = $('station-prompt-text');
    promptEl.addEventListener('click', function(){ tryInteract(); });
    $('hud-reset-btn').addEventListener('click', function(){ resetCar(); });
    changeCar = switchCar;
    toggleSound = function(){ startEngineAudio(); setSound(!AUD.on); toast(AUD.on ? 'Sound on' : 'Sound off'); };
    $('hud-car-btn').addEventListener('click', function(e){ changeCar(1); e.currentTarget.blur(); });
    $('hud-sound-btn').addEventListener('click', function(e){ toggleSound(); e.currentTarget.blur(); });
    changeSky = cycleSky;
    $('hud-sky-btn').addEventListener('click', function(e){ cycleSky(); e.currentTarget.blur(); });
    setSound(AUD.on);
    $('fast-travel').innerHTML = SECTIONS.map(function(s, i){
      return '<button data-go="' + s.key + '" style="color:' + s.color + '" title="Fast travel to ' + s.label + ' (' + (i+1) + ')">' +
        '<i style="background:' + s.color + '"></i><span style="color:var(--ink)">' + s.label + '</span><kbd>' + (i+1) + '</kbd></button>';
    }).join('');
    $('fast-travel').addEventListener('click', function(e){
      var b = e.target.closest('[data-go]'); if (b){ teleportTo(b.getAttribute('data-go')); b.blur(); }
    });

    mmCanvas = $('minimap');
    mmCtx = mmCanvas.getContext('2d');
    MM_SCALE = 0.6;    // world units → minimap px (canvas is 272px, drawn at 136px)

    clock = new THREE.Clock();
    lap('total');
    if (/[?&]debug\b/.test(location.search)) console.info('[town] build: ' + _tp.join(' · '));
    worldBuilt = true;
  }

  // Build the town as soon as the models are in, so it can fly by
  // behind the landing card; Start then just hands over the wheel.
  var startBtn = $('start-btn');
  (function prebuild(){
    if (!assetsSettled){ setTimeout(prebuild, 100); return; }
    var assetMsg = $('load-status').textContent;      // keep any "model unavailable" note
    setLoad(1, 'Building the town…');
    setTimeout(function(){
      try {
        initWorld();
        setLoad(1, assetMsg || 'Ready');
        startBtn.disabled = false;
        startBtn.textContent = 'Drive the town ▸';
      } catch(e){
        showFatalError(e.message || String(e));
      }
    }, 30);
  })();

  startBtn.addEventListener('click', function(){
    if (!worldBuilt) return;
    startBtn.disabled = true;
    startEngineAudio();          // needs this user click to be allowed
    $('fatal-error').style.display = 'none';
    attract = false;
    camera.clearViewOffset();
    placeCarAt(spawn.pt, spawn.next);
    $('intro').style.display = 'none';
    $('hud').classList.add('active');
    running = true;
    clock.getDelta();
    if (SECTION_BY_KEY[initialHash]){
      teleportTo(initialHash);
      setTimeout(function(){ openPanel(initialHash); }, 400);
    } else {
      toast('Every billboard is part of the portfolio — or press 1–4 to fast travel');
    }
  });

}

// ---------------------------------------------------------------
// Bootstrap: load portfolio.json, check it, start the town.
//  • A JSON typo is reported with its line and column.
//  • Missing sections/fields are tolerated (they simply don't show);
//    likely mistakes are listed in the console.
//  • On localhost the file is watched: save it and the page reloads.
// ---------------------------------------------------------------
(function bootstrap(){
  "use strict";
  var URL_ = 'portfolio.json';

  function fail(title, detail){
    var bar = document.getElementById('fatal-error');
    bar.textContent = title + (detail ? '\n' + detail : '');
    bar.style.display = 'block';
    var lede = document.getElementById('intro-lede');
    if (lede) lede.textContent = title;
    var btn = document.getElementById('start-btn');
    if (btn){ btn.disabled = true; btn.textContent = "Content didn't load"; }
    var st = document.getElementById('load-status');
    if (st) st.textContent = '';
    // nothing else on the card can work without content
    ['intro-list-btn', 'car-pick', 'intro-controls', 'load-bar'].forEach(function(id){
      var el = document.getElementById(id); if (el) el.style.display = 'none';
    });
    var legend = document.querySelector('#intro .city-legend'); if (legend) legend.style.display = 'none';
    var ex = document.querySelector('#intro .intro-explore-h'); if (ex) ex.style.display = 'none';
  }

  function lineCol(text, pos){
    var before = text.slice(0, pos), line = before.split('\n').length;
    return { line: line, col: pos - before.lastIndexOf('\n') };
  }
  function parse(text){
    try { return JSON.parse(text); }
    catch(e){
      var m = /position (\d+)/.exec(e.message), where = '';
      var lc = /line (\d+) column (\d+)/.exec(e.message);
      if (lc) where = ' (line ' + lc[1] + ', column ' + lc[2] + ')';
      else if (m){ var p = lineCol(text, +m[1]); where = ' (line ' + p.line + ', column ' + p.col + ')'; }
      throw new Error('portfolio.json has a syntax error' + where + ': ' + e.message +
        '\nCommon causes: a missing comma between items, a trailing comma after the last item, or an unescaped " inside text.');
    }
  }

  // Fill in missing pieces so the app never trips over absent data,
  // and point out likely mistakes.
  function normalize(d){
    var warn = [];
    function obj(x){ return x && typeof x === 'object' && !Array.isArray(x) ? x : {}; }
    function arr(x, where){
      if (x === undefined) return [];
      if (!Array.isArray(x)){ warn.push(where + ' should be a list [ … ]'); return []; }
      return x.filter(function(v, i){
        if (v && typeof v === 'object') return true;
        warn.push(where + '[' + i + '] should be an object { … } — skipped'); return false;
      });
    }
    d = obj(d);
    d.profile = obj(d.profile);
    if (!d.profile.name) warn.push('profile.name is empty');
    ['projects', 'skills', 'experience', 'contact'].forEach(function(k){ d[k] = obj(d[k]); });
    d.projects.items = arr(d.projects.items, 'projects.items');
    d.skills.groups = arr(d.skills.groups, 'skills.groups');
    d.experience.items = arr(d.experience.items, 'experience.items');
    d.contact.links = arr(d.contact.links, 'contact.links');
    d.projects.items.forEach(function(p, i){ if (!p.name) warn.push('projects.items[' + i + '] has no "name"'); });
    d.skills.groups.forEach(function(g, i){ if (!g.name) warn.push('skills.groups[' + i + '] has no "name"'); });
    d.experience.items.forEach(function(x, i){ if (!x.role && !x.org) warn.push('experience.items[' + i + '] has no "role" or "org"'); });
    d.contact.links.forEach(function(l, i){ if (!l.label) warn.push('contact.links[' + i + '] has no "label"'); });
    if (warn.length) console.warn('[portfolio.json]\n  • ' + warn.join('\n  • '));
    return d;
  }

  function watch(lastText){
    if (!/^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/.test(location.hostname)) return;
    setInterval(function(){
      fetch(URL_, { cache: 'no-store' }).then(function(r){ return r.ok ? r.text() : null; }).then(function(t){
        if (t !== null && t !== lastText){ console.info('[portfolio.json] changed — reloading'); location.reload(); }
      }).catch(function(){});
    }, 1500);
  }

  fetch(URL_, { cache: 'no-cache' })
    .then(function(r){
      if (!r.ok) throw new Error("Couldn't load portfolio.json (HTTP " + r.status + ').');
      return r.text();
    })
    .then(function(text){
      startTown(normalize(parse(text)));
      watch(text);
    })
    .catch(function(err){
      var fileHint = location.protocol === 'file:'
        ? 'Browsers block reading portfolio.json when the page is opened as a file. Run  npm run dev  and open http://localhost:3000'
        : '';
      console.error(err);
      fail(String(err.message || err), fileHint);
    });
})();
}
