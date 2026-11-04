/*
 * ============================================================
 *  PORTFOLIO CONTENT — edit this file, not index.html.
 * ============================================================
 *
 *  Everything a visitor reads in the town lives here. The 3D
 *  scene reads this object at start-up, so you never need to
 *  touch the rendering code to update your portfolio.
 *
 *  Rules of thumb:
 *   - Plain strings only. Text is HTML-escaped when rendered, so
 *     "<" and "&" are safe to type.
 *   - Any field marked TODO is a placeholder — replace it.
 *   - Leave a field out (or set it to "") and it simply won't show.
 *   - Links: use full URLs ("https://…", "mailto:…").
 *
 *  The four sections map to the four cities in the town:
 *      projects   → east   (blue)
 *      skills     → north  (amber)
 *      experience → south  (pink)
 *      contact    → west   (violet)
 */
window.PORTFOLIO = {

  profile: {
    name: "Shashank Hosamani",
    handle: "SHASHANK.DEV",
    role: "Software Engineer — AI agents, web & mobile",
    tagline: "I build always-on AI agents and the products around them.",
    location: "TODO: City, Country",
    // Optional — shown as a button on the intro screen and in list view.
    resumeUrl: "",
    // 2–4 one-liners shown on the landing card. Lead with outcomes.
    highlights: [
      "Building AI agents for ledger reconciliation at OneCap",
      "Created AgentRealm — a platform for always-on AI agents",
      "Shipped Costiq, an SMS-based expense tracker for Android"
    ],
    // Optional — chips on the landing card. Leave empty to pick
    // automatically from the skills section below.
    topSkills: []
  },

  projects: {
    title: "Things I've built",
    intro: "A few projects I'm proud of. Each card links to code or a live demo where available.",
    items: [
      {
        name: "AgentRealm",
        year: "2026",
        summary: "Platform for always-on AI agents built around a goal → check-in → feedback loop.",
        details: [
          "Agents hold a long-running goal and check in on a schedule instead of waiting for prompts.",
          "Feedback from each check-in is folded back into the agent's next plan.",
          "TODO: one line on scale, users, or the hardest technical problem you solved."
        ],
        tags: ["AI agents", "Tool use", "TypeScript"],
        links: [
          { label: "Code", url: "" },
          { label: "Live", url: "" }
        ]
      },
      {
        name: "Costiq",
        year: "2025",
        summary: "SMS-based personal expense tracker with an extraction + categorization pipeline.",
        details: [
          "Parses bank/UPI SMS messages into structured transactions automatically.",
          "Categorizes spend so the app can show where money actually goes.",
          "TODO: accuracy numbers, number of users, or a design decision worth mentioning."
        ],
        tags: ["Android", "Kotlin", "NLP"],
        links: [
          { label: "Code", url: "" }
        ]
      },
      {
        name: "Portfolio Town",
        year: "2026",
        summary: "This site — a drivable 3D town built with Three.js where every billboard is part of my portfolio.",
        details: [
          "Procedural streets with clean junctions, procedural buildings, and day/night that follows the visitor's real local time.",
          "Car physics (bicycle-model steering, tyre grip, drifting), AI traffic, and engine sound synthesised with WebAudio.",
          "All content is data-driven from one file, with a plain page view for anyone who'd rather not drive."
        ],
        tags: ["Three.js", "WebGL", "JavaScript"],
        links: [
          { label: "Code", url: "https://github.com/shashankhosamani/town-protfolio" }
        ]
      }
    ]
  },

  skills: {
    title: "Stack",
    intro: "What I reach for, grouped by where it sits in a product.",
    groups: [
      { name: "Web",      items: ["Next.js", "React", "TypeScript", "Three.js"] },
      { name: "Backend",  items: ["Cloudflare Workers", "Supabase", "Postgres", "Node.js"] },
      { name: "Mobile",   items: ["Android", "Kotlin"] },
      { name: "AI",       items: ["Agent infrastructure", "Tool-use systems", "LLM evals"] },
      { name: "Practices",items: ["System design", "Testing", "CI/CD"] }
    ]
  },

  experience: {
    title: "Where I've worked",
    intro: "Most recent first.",
    items: [
      {
        role: "Software Engineer",
        org: "OneCap",
        period: "TODO: 2025 — Present",
        summary: "Building AI agents for ledger reconciliation.",
        highlights: [
          "TODO: a concrete outcome (e.g. hours saved, accuracy, volume handled).",
          "TODO: something you owned end-to-end."
        ]
      },
      {
        role: "TODO: Earlier role",
        org: "TODO: Company",
        period: "TODO: Years",
        summary: "TODO: one line on scope and impact.",
        highlights: []
      }
    ]
  },

  contact: {
    title: "Get in touch",
    intro: "The fastest way to reach me is email. I'm happy to talk about agents, side projects, or roles.",
    // kind: email | github | linkedin | x | website | other  (only changes the icon)
    links: [
      { kind: "email",    label: "Email",    value: "TODO: you@example.com",       url: "" },
      { kind: "github",   label: "GitHub",   value: "github.com/shashankhosamani", url: "https://github.com/shashankhosamani" },
      { kind: "linkedin", label: "LinkedIn", value: "TODO: linkedin.com/in/…",      url: "" }
    ]
  }
};
