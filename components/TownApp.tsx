"use client";

import { useEffect } from "react";

// The page markup. The engine (lib/town/engine.js) finds these elements
// by id and drives them directly, so this component never re-renders:
// it renders once, then hands over to the engine.
export default function TownApp() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [THREE, { GLTFLoader }, { bootTown }] = await Promise.all([
        import("three"),
        import("three/examples/jsm/loaders/GLTFLoader.js"),
        import("@/lib/town/engine"),
      ]);
      if (cancelled) return;
      // the engine expects one THREE namespace that includes the loader
      bootTown({ ...THREE, GLTFLoader });
    })().catch((err) => {
      console.error(err);
      const bar = document.getElementById("fatal-error");
      if (bar) {
        bar.textContent = "Something went wrong loading the 3D engine: " + String(err?.message ?? err);
        bar.style.display = "block";
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <div id="fatal-error" role="alert"></div>
      <div id="canvas-wrap" aria-hidden="true"></div>

      {/* ============ Intro ============ */}
      <div id="intro">
       <div className="intro-card">
        <div className="kicker">{'// portfolio town'}</div>
        <h1 id="intro-name">Shashank Hosamani</h1>
        <div className="role" id="intro-role"></div>
        <p className="lede" id="intro-lede"></p>
        <ul className="intro-highlights" id="intro-highlights"></ul>
        <ul className="chips" id="intro-skills"></ul>
        <div className="intro-contact" id="intro-contact"></div>
        <div className="intro-divider"></div>
        <div className="intro-explore-h">EXPLORE — drive a little town where every billboard is part of my portfolio, or just read it.</div>
        <div className="actions">
          <button className="btn primary" id="start-btn" disabled>Building the town…</button>
          <button className="btn" id="intro-list-btn">Read as a page</button>
        </div>
        <div className="city-legend">
          <span><i style={{ background: 'var(--blue)' }}></i>Projects · west</span>
          <span><i style={{ background: 'var(--amber)' }}></i>Skills · east</span>
          <span><i style={{ background: 'var(--pink)' }}></i>Experience · hillside</span>
          <span><i style={{ background: 'var(--violet)' }}></i>Contact · island</span>
        </div>
        <div className="car-pick" id="car-pick">
          Your car
          <button id="car-prev" aria-label="Previous car">‹</button>
          <span id="car-name" aria-live="polite">Sports sedan</span>
          <button id="car-next" aria-label="Next car">›</button>
        </div>
        <div id="load-bar" aria-hidden="true"><div></div></div>
        <div id="load-status" aria-live="polite">Loading 3D models…</div>
        <details id="intro-controls">
          <summary>Controls</summary>
          <div className="controls-hint">
            <span><kbd>W</kbd>/<kbd>↑</kbd> drive</span>
            <span><kbd>S</kbd>/<kbd>↓</kbd> brake / reverse</span>
            <span><kbd>A</kbd> <kbd>D</kbd> steer</span>
            <span><kbd>Space</kbd> handbrake / drift</span>
            <span><kbd>E</kbd> read a billboard / enter a shop</span>
            <span><kbd>1</kbd>–<kbd>4</kbd> fast travel</span>
            <span><kbd>C</kbd> change car</span>
            <span><kbd>T</kbd> time of day</span>
            <span><kbd>H</kbd> help</span>
            <span>drag to look around</span>
          </div>
        </details>
        <div className="notice" id="file-notice">
          You opened this page straight from disk, so the browser blocks the 3D models and content.
          Run <code>npm run dev</code> in the project folder and open <code>http://localhost:3000</code>.
        </div>
        <div className="notice" id="webgl-notice">
          Your browser or device can't run WebGL, so the 3D town is unavailable. Everything is still readable in the page view.
        </div>
       </div>
      </div>

      {/* ============ HUD ============ */}
      <div id="hud">
        <div id="hud-top-left">
          <div className="brand" id="hud-brand">SHASHANK.DEV</div>
          <div id="hud-role"></div>
          <div id="fast-travel" className="hud-interactive" aria-label="Fast travel"></div>
          <div id="hud-actions" className="hud-interactive">
            <button className="btn small" id="hud-help-btn" title="Controls (H)">? Help</button>
            <button className="btn small" id="hud-list-btn" title="Read as a page (L)">≡ Page view</button>
            <button className="btn small" id="hud-reset-btn" title="Back to the town square (R)">⟲ Reset</button>
            <button className="btn small" id="hud-car-btn" title="Change car (C)">⇄ Car</button>
            <button className="btn small" id="hud-sound-btn" title="Engine sound (M)">♪ Sound on</button>
            <button className="btn small" id="hud-sky-btn" title="Sky follows your local time — click (or T) to force day / sunset / night">☀ Real time</button>
          </div>
        </div>

        <div id="minimap-wrap" aria-hidden="true"><canvas id="minimap" width="272" height="272"></canvas></div>

        <div id="toast" role="status" aria-live="polite"></div>

        <div id="station-prompt" className="hud-interactive"><kbd>E</kbd><span id="station-prompt-text">Explore Projects</span></div>

        <div id="touch-controls">
          <div className="tbtn" id="btn-left" aria-label="Steer left">◀</div>
          <div className="tbtn" id="btn-right" aria-label="Steer right">▶</div>
          <div className="tbtn" id="btn-accel" aria-label="Accelerate">▲</div>
          <div className="tbtn" id="btn-brake" aria-label="Brake">▼</div>
          <div className="tbtn" id="btn-hand" aria-label="Handbrake">DRIFT</div>
          <div className="tbtn" id="btn-interact" aria-label="Enter shop">ENTER</div>
        </div>

        <div id="speed-readout"><b id="speed-val">0</b> km/h<span id="gear-val" title="Gear">N</span><div id="rpm-bar" aria-hidden="true"><div></div></div><span id="location-readout">Town square</span></div>
      </div>

      {/* ============ Station panel ============ */}
      <div id="panel-overlay" className="overlay">
        <div id="panel" className="sheet" role="dialog" aria-modal="true" aria-labelledby="panel-title">
          <button className="sheet-close" id="panel-close" aria-label="Close">✕</button>
          <div className="eyebrow" id="panel-eyebrow">STATION</div>
          <h2 id="panel-title">Title</h2>
          <div id="panel-body"></div>
          <div className="panel-footer">
            <button className="btn small" id="panel-prev">←</button>
            <button className="btn small" id="panel-back">Back to driving <kbd>Esc</kbd></button>
            <button className="btn small" id="panel-next">→</button>
          </div>
        </div>
      </div>

      {/* ============ Help ============ */}
      <div id="help-overlay" className="overlay">
        <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="help-title">
          <button className="sheet-close" data-close="help" aria-label="Close">✕</button>
          <div className="eyebrow" style={{ color: 'var(--accent)' }}>HOW TO PLAY</div>
          <h2 id="help-title">Controls</h2>
          <p className="section-intro">Drive to a city and pull up next to its glowing shop. When the prompt appears, press <kbd>E</kbd> to open that section.</p>
          <div className="help-h">DRIVING</div>
          <dl className="help-grid">
            <dt><kbd>W</kbd> / <kbd>↑</kbd></dt><dd>Accelerate</dd>
            <dt><kbd>S</kbd> / <kbd>↓</kbd></dt><dd>Brake, then reverse</dd>
            <dt><kbd>A</kbd> <kbd>D</kbd> / <kbd>←</kbd> <kbd>→</kbd></dt><dd>Steer (less lock at speed, like a real car)</dd>
            <dt><kbd>Space</kbd></dt><dd>Handbrake — tap it mid-corner to drift</dd>
            <dt>Drag</dt><dd>Look around (camera springs back)</dd>
          </dl>
          <div className="help-h">SHORTCUTS</div>
          <dl className="help-grid">
            <dt><kbd>E</kbd> / <kbd>Enter</kbd></dt><dd>Enter the nearby shop</dd>
            <dt><kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> <kbd>4</kbd></dt><dd>Fast travel to Projects, Skills, Experience, Contact</dd>
            <dt><kbd>R</kbd></dt><dd>Reset to the town square</dd>
            <dt><kbd>C</kbd></dt><dd>Change car (7 to choose from)</dd>
            <dt><kbd>M</kbd></dt><dd>Engine sound on / off</dd>
            <dt><kbd>T</kbd></dt><dd>Sky: real local time → day → sunset → night</dd>
            <dt><kbd>L</kbd></dt><dd>Read everything as a normal page</dd>
            <dt><kbd>H</kbd> / <kbd>?</kbd></dt><dd>This help</dd>
            <dt><kbd>Esc</kbd></dt><dd>Close any window</dd>
          </dl>
          <div className="help-h">ON A PHONE</div>
          <p className="body-copy" style={{ margin: '0' }}>Use the on-screen arrows to drive and <b>DRIFT</b> for the handbrake; tap <b>ENTER</b> when it lights up. The fast-travel chips at the top left take you straight to a city.</p>
        </div>
      </div>

      {/* ============ List view ============ */}
      <div id="list-view" className="overlay">
        <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="list-title">
          <button className="sheet-close" data-close="list" aria-label="Close">✕</button>
          <div className="eyebrow" style={{ color: 'var(--accent)' }} id="list-eyebrow">PORTFOLIO</div>
          <h2 id="list-title">Shashank Hosamani</h2>
          <p className="section-intro" id="list-intro"></p>
          <nav className="list-nav" id="list-nav" aria-label="Sections"></nav>
          <div id="list-body"></div>
        </div>
      </div>
    </>
  );
}
