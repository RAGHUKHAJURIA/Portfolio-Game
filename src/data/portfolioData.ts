/**
 * ─────────────────────────────────────────────────────────────
 *  ALL PORTFOLIO CONTENT LIVES HERE.
 *  Edit this file to change what the island shows. Nothing else
 *  needs to be touched for a content update.
 *
 *  ⚠ Items marked  // FILL IN  are placeholders — swap them for
 *    your real links before shipping.
 * ─────────────────────────────────────────────────────────────
 */

export type HouseId = 'about' | 'projects' | 'skills' | 'experience' | 'contact'

export const profile = {
  name: 'Raghu Khajuria',
  callsign: 'RAGHU',
  tagline: 'CS final-year · applied AI/ML · full-stack engineer',
  // One-line personal hook — the bit only you can write.
  hook: 'I build things that think: ML systems that actually ship, and the full-stack products that carry them.',
  location: 'Bangalore, India',
  email: 'khajuriaraghu41@gmail.com',
  github: 'https://github.com/RAGHUKHAJURIA',
  linkedin: 'https://www.linkedin.com/in/raghu-khajuria/',
  leetcode: 'https://leetcode.com/u/Raghu_khajuria/',
  gfg: 'https://www.geeksforgeeks.org/profile/khajuriaifv2',
  previousPortfolio: 'https://raghubuilds.vercel.app/',
  // Served from public/, the only directory Vite copies verbatim into the
  // build — a PDF left at the project root is not reachable at runtime.
  resumeUrl: '/resume.pdf',
  status: 'Actively interviewing · campus placement season 2026',
}

/* ── HOUSE 1 · ABOUT ─────────────────────────────────────── */

export const about = {
  title: 'About Me',
  subtitle: 'Operator Dossier',
  hook: profile.hook,
  paragraphs: [
    "I'm a final-year B.E. student in Computer Science & Engineering at Ramaiah Institute of Technology (MSRIT), Bangalore, carrying a CGPA of 9.06.",
    'My work sits at the intersection of applied AI/ML and full-stack engineering — I like problems where a model is only half the answer and the other half is the product around it: the API, the pipeline, the interface a real person actually touches.',
    "Most of what I've built lately falls into three buckets: computer-vision systems for agriculture, GenAI document pipelines, and full-stack platforms with the unglamorous parts (auth, payments, file storage, real-time sync, CI/CD) done properly.",
  ],
  stats: [
    { label: 'CGPA', value: '9.06', sub: '/ 10.0' },
    { label: 'Year', value: 'IV', sub: 'B.E. CSE' },
    { label: 'Projects', value: '7', sub: 'built' },
    { label: 'Base', value: 'BLR', sub: 'India' },
  ],
  interests: [
    { icon: '🧠', label: 'Applied AI / ML', note: 'CV, multimodal, RAG' },
    { icon: '⚡', label: 'Full-stack (MERN)', note: 'Node, React, Mongo' },
    { icon: '🔧', label: 'Systems & infra', note: 'queues, CI/CD, Postgres' },
  ],
}

/* ── HOUSE 2 · PROJECTS ──────────────────────────────────── */

export type Project = {
  id: string
  crate: string
  name: string
  short: string
  rarity: 'legendary' | 'epic' | 'rare' | 'common'
  summary: string
  bullets: string[]
  stack: string[]
  links: { label: string; url: string }[]
  /** Optional badge: not-yet-deployed, private repo, and so on. */
  status?: string
}

export const projects: Project[] = [
  {
    id: 'attainers',
    crate: 'AIRDROP',
    name: 'Attainers',
    short: 'Full-stack AI document platform',
    rarity: 'legendary',
    // FILL IN — product framing. Everything below is read off the repo's two
    // package.json files (client + server); what Attainers is *for* is the one
    // thing the dependency list can't tell me.
    summary:
      'A full-stack application built around an AI document pipeline: users sign in, upload PDFs, and the server extracts their text — falling back to OCR when a document is scanned rather than digital — before handing it to an LLM.',
    bullets: [
      'Express 5 + MongoDB (Mongoose) API with Clerk-backed authentication across both the server and the React client.',
      'Document ingestion via multer, with pdf-parse for digital PDFs and a Tesseract/pdf2pic OCR path for scanned ones.',
      'Dual LLM integration — both the Google Generative AI and OpenAI SDKs — with zod schemas validating model output before it is trusted.',
      'Scheduled background work via node-cron, so long-running processing happens off the request path.',
    ],
    stack: ['React 19', 'Vite', 'Express 5', 'MongoDB', 'Clerk', 'Gemini + OpenAI', 'Tesseract OCR', 'Tailwind 4'],
    links: [
      { label: 'Live', url: 'https://attainers.vercel.app/' },
      { label: 'Code', url: 'https://github.com/RAGHUKHAJURIA/Attainers' },
    ],
  },
  {
    id: 'retrofit-engine',
    crate: 'SUPPLY',
    name: 'Retrofit-First Feasibility Engine',
    short: 'UK retrofit assessment platform',
    rarity: 'legendary',
    status: 'Client project · private repo',
    summary:
      'A UK residential retrofit feasibility platform, built as primary architect. A rules-based pipeline of assessment engines takes a property and returns whether — and in what order — retrofit measures make sense for it.',
    bullets: [
      'Multi-engine, rules-based assessment pipeline: property archetype, climate, safety, moisture, retrofit measure, decision, sequencing and EPC-uplift engines.',
      'Sequencing matters as much as selection — the engine reasons about the order measures should be applied in, not just which ones qualify.',
      'Built on Next.js and delivered as a client engagement, with the author as primary architect of the engine design.',
    ],
    stack: ['Next.js', 'TypeScript', 'Rules engines', 'Vercel'],
    links: [{ label: 'Live', url: 'https://retrofit-engine.vercel.app/' }],
  },
  {
    id: 'dragonfruit-suite',
    crate: 'WEAPON',
    name: 'Dragon Fruit Disease AI Suite',
    short: 'Multi-model plant pathology system',
    rarity: 'legendary',
    summary:
      'A multi-model plant disease detection system for dragon fruit crops, combining detection, classification, visual question answering and a retrieval-backed advisory chatbot.',
    bullets: [
      'ConViTx — a hybrid CNN-ViT classifier, pairing convolutional features for local lesion texture with transformer tokens for whole-plant context.',
      'YOLOv8 lesion detection that localises diseased regions rather than only labelling the image as a whole.',
      'DragonFruitVQA — multimodal visual question answering with Grad-CAM, so every answer ships with a heatmap of the evidence behind it.',
      'Agrobot — a RAG chatbot over an agronomy knowledge base, so farmer queries get grounded answers instead of hallucinated ones.',
    ],
    stack: ['PyTorch', 'YOLOv8', 'Vision Transformer', 'Grad-CAM', 'RAG', 'Hugging Face Spaces'],
    links: [], // FILL IN — Hugging Face Spaces URL
  },
  {
    id: 'thynklly',
    crate: 'MEDKIT',
    name: 'Thynklly',
    short: 'Real-time collaborative whiteboard',
    rarity: 'epic',
    // FILL IN — product framing. The stack below is read off package.json,
    // where the package is literally named "whiteboard"; confirm the pitch.
    summary:
      'A real-time collaborative whiteboard. Yjs CRDTs over a websocket provider keep every participant’s canvas in sync without a central lock, so two people can draw on the same board at once without stepping on each other.',
    bullets: [
      'Conflict-free collaborative editing with Yjs and y-websocket, plus a socket.io channel for presence and live cursors.',
      'Hand-drawn feel from perfect-freehand and Rough.js rather than plain vector strokes.',
      'R-tree spatial index (rbush) for hit-testing, so selection and erase stay fast as the board fills up.',
      'Export to PDF via jsPDF, keyboard-shortcut driven tooling, and undo/redo backed by immer and zustand.',
    ],
    stack: ['Next.js', 'TypeScript', 'Yjs / CRDT', 'Socket.IO', 'Rough.js', 'Tailwind', 'zustand'],
    links: [
      { label: 'Live', url: 'https://thynklly.vercel.app/board' },
      { label: 'Code', url: 'https://github.com/RAGHUKHAJURIA/Board' },
    ],
  },
  {
    id: 'ankur-portal',
    crate: 'AMMO',
    name: 'Ankur School Management System',
    short: 'MERN school portal with payments',
    rarity: 'epic',
    summary:
      'A MERN-stack school management portal — the kind of project where the interesting work is auth, money and files rather than the CRUD.',
    bullets: [
      'PhonePe payment gateway integration for fee collection, including callback verification.',
      'MongoDB GridFS for document and media storage, so large files never bloat the primary collections.',
      'Role-separated surfaces for administrators, staff and parents.',
      'Full MERN stack with a React admin dashboard.',
    ],
    stack: ['MongoDB', 'GridFS', 'Express', 'React', 'Node.js', 'PhonePe'],
    links: [
      { label: 'Live', url: 'https://ankur-school-xi.vercel.app/' },
      { label: 'Code', url: 'https://github.com/RAGHUKHAJURIA/AnkurSchool' },
    ],
  },
  {
    id: 'cicd-intel',
    crate: 'SCOPE',
    name: 'CI/CD Reliability Prediction Platform',
    short: 'Pipeline reliability backend',
    rarity: 'rare',
    status: 'In progress · not yet deployed',
    summary:
      'A Node.js/TypeScript backend for predicting CI/CD pipeline reliability, using PostgreSQL, Redis and BullMQ for job processing.',
    bullets: [
      'TypeScript service over PostgreSQL for durable build and run history.',
      'Redis for hot state and caching alongside the primary store.',
      'BullMQ job queues for asynchronous ingestion and analysis, so webhook handlers stay fast.',
    ],
    stack: ['Node.js', 'TypeScript', 'PostgreSQL', 'Redis', 'BullMQ'],
    links: [{ label: 'Code', url: 'https://github.com/RAGHUKHAJURIA/cicd-prediction' }],
  },
  {
    id: 'frontend-showcase',
    crate: 'FUEL',
    name: 'Front-end / UI Showcase',
    short: 'Interface experiments',
    rarity: 'common',
    summary:
      'Standalone front-end and UI experiments, focused on interface design rather than full-stack functionality. Bundled together here because they are studies, not products.',
    bullets: [
      'Interface and interaction studies built front-end only, with no backend behind them.',
      'Deployed so the work can be looked at rather than described.',
    ],
    // FILL IN — I did not verify what these two are built with, and guessing
    // a framework on a portfolio is the kind of thing an interviewer checks.
    stack: ['Front-end only', 'Vercel'],
    links: [
      { label: 'Kropitch', url: 'https://kropitch.vercel.app/' },
      { label: 'UI work', url: 'https://frontend-work-eight.vercel.app/' },
    ],
  },
]

/* ── HOUSE 3 · SKILLS (the "loadout") ────────────────────── */

export type LoadoutSlot = {
  slot: string
  icon: string
  category: string
  items: { name: string; level: number }[] // level 1–5
}

export const loadout: LoadoutSlot[] = [
  {
    slot: 'PRIMARY',
    icon: '🔫',
    category: 'Languages',
    items: [
      { name: 'Python', level: 5 },
      { name: 'JavaScript', level: 5 },
      { name: 'TypeScript', level: 4 },
      { name: 'C++', level: 4 },
      { name: 'Java', level: 3 },
      { name: 'SQL', level: 4 },
    ],
  },
  {
    slot: 'SECONDARY',
    icon: '🎯',
    category: 'AI / ML',
    items: [
      { name: 'PyTorch', level: 5 },
      { name: 'YOLOv8', level: 4 },
      { name: 'Transformers', level: 4 },
      { name: 'RAG / LLM apps', level: 4 },
      { name: 'OpenCV', level: 4 },
      { name: 'scikit-learn', level: 4 },
    ],
  },
  {
    slot: 'TACTICAL',
    icon: '⚙️',
    category: 'Web & Backend',
    items: [
      { name: 'React', level: 5 },
      { name: 'Node / Express', level: 5 },
      { name: 'MongoDB', level: 4 },
      { name: 'PostgreSQL', level: 4 },
      { name: 'Redis / BullMQ', level: 3 },
      { name: 'REST APIs', level: 5 },
    ],
  },
  {
    slot: 'UTILITY',
    icon: '🎒',
    category: 'Tools & Infra',
    items: [
      { name: 'Git / GitHub', level: 5 },
      { name: 'Docker', level: 3 },
      { name: 'Linux', level: 4 },
      { name: 'Vercel', level: 4 },
      { name: 'Railway', level: 4 },
      { name: 'Hugging Face', level: 4 },
      { name: 'CI/CD', level: 4 },
    ],
  },
  {
    slot: 'THROWABLE',
    icon: '💣',
    category: 'Foundations',
    items: [
      { name: 'DSA', level: 5 },
      { name: 'OS', level: 4 },
      { name: 'DBMS', level: 4 },
      { name: 'Computer Networks', level: 4 },
      { name: 'OOP / Design', level: 4 },
    ],
  },
]

/* ── HOUSE 4 · EXPERIENCE / EDUCATION ────────────────────── */

export type TimelineEntry = {
  kind: 'education' | 'experience' | 'achievement'
  period: string
  title: string
  org: string
  location?: string
  points: string[]
  tags?: string[]
}

export const timeline: TimelineEntry[] = [
  {
    kind: 'education',
    period: '2022 — 2026',
    title: 'B.E. Computer Science & Engineering',
    org: 'Ramaiah Institute of Technology (MSRIT)',
    location: 'Bangalore, India',
    points: [
      'CGPA 9.06 / 10.0 — final year, currently in campus placement season.',
      'Core coursework: Data Structures & Algorithms, Operating Systems, DBMS, Computer Networks, Machine Learning, Software Engineering.',
      'Focus electives and self-directed work in deep learning, computer vision, and multimodal systems.',
    ],
    tags: ['CGPA 9.06', 'CSE', 'Final year'],
  },
  {
    kind: 'achievement',
    period: '2024 — 2026',
    title: 'Applied ML research & deployment',
    org: 'Dragon Fruit Disease AI Suite',
    points: [
      'Designed and deployed a four-model agricultural AI system (detection, classification, VQA, RAG chatbot) live on Hugging Face Spaces.',
      'Authored ConViTx, a hybrid CNN-ViT architecture, and DragonFruitVQA, a bilinear-fusion multimodal VQA model with Grad-CAM interpretability.',
    ],
    tags: ['YOLOv8', 'ViT', 'RAG', 'Deployed'],
  },
  {
    kind: 'achievement',
    period: '2025 — 2026',
    title: 'Full-stack product engineering',
    org: 'Independent / freelance builds',
    points: [
      'Shipped the Ankur School Portal with Clerk auth, PhonePe payments, and GridFS document storage.',
      'Built AutoSettings AI with session auth, GitHub OAuth, and AES-256-GCM encrypted token storage.',
      'Built a CI/CD Reliability Intelligence backend on Node 22 / TypeScript with Postgres, Redis, and BullMQ, deployed to Railway.',
    ],
    tags: ['MERN', 'OAuth', 'Payments', 'Queues'],
  },
  // FILL IN — add internships / hackathons here as they land:
  // {
  //   kind: 'experience',
  //   period: 'Jun 2025 — Aug 2025',
  //   title: 'Software Engineering Intern',
  //   org: 'Company name',
  //   location: 'City',
  //   points: ['What you built', 'Measurable impact'],
  //   tags: ['Tag'],
  // },
]

/* ── HOUSE 5 · CONTACT ───────────────────────────────────── */

export type ContactChannel = {
  id: string
  label: string
  value: string
  href: string
  icon: string
  freq: string
}

/** Display form of a profile URL: no scheme, no www, no trailing slash. */
const stripScheme = (url: string) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')

export const contactChannels: ContactChannel[] = [
  {
    id: 'email',
    label: 'Email',
    value: profile.email,
    href: `mailto:${profile.email}`,
    icon: '✉',
    freq: '145.500',
  },
  {
    id: 'github',
    label: 'GitHub',
    value: stripScheme(profile.github),
    href: profile.github,
    icon: 'GH',
    freq: '146.520',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    value: stripScheme(profile.linkedin),
    href: profile.linkedin,
    icon: 'in',
    freq: '147.000',
  },
  {
    id: 'leetcode',
    label: 'LeetCode',
    value: stripScheme(profile.leetcode),
    href: profile.leetcode,
    icon: 'LC',
    freq: '147.420',
  },
  {
    id: 'gfg',
    label: 'GeeksforGeeks',
    value: stripScheme(profile.gfg),
    href: profile.gfg,
    icon: 'GG',
    freq: '148.000',
  },
]

/* ── HOUSE METADATA (labels, colors, map positions) ──────── */

type HouseDef = {
  id: HouseId
  label: string
  sublabel: string
  icon: string
  color: string
  /** World-space [x, z] of the building centre. */
  position: [number, number]
  /** Y-rotation of the building, radians. Every building's door is on its local +Z. */
  rotation: number
  /** How far in front of the door the interaction marker sits. */
  doorDistance: number
  /** Radius of the exterior marker ring. Signage only — the [E] prompt now
   *  lives indoors, see `interior` below. */
  radius: number
  /** Local [x, z] of the content object inside the building, before rotation. */
  interior: [number, number]
  /** Local Y of the floor that content object stands on. */
  interiorY: number
  /** Radius around the content object in which the [E] prompt appears. */
  interiorRadius: number
}

export type HouseMeta = HouseDef & {
  /** Derived: world offset from building centre to the door marker. */
  markerOffset: [number, number]
  /** Derived: world offset from building centre to the content object. */
  interiorOffset: [number, number]
}

const HOUSE_DEFS: HouseDef[] = [
  {
    id: 'about',
    label: 'ABOUT',
    sublabel: 'Operator Dossier',
    icon: '👤',
    color: '#f0a92e',
    position: [0, -62],
    rotation: 0,
    doorDistance: 7.2,
    radius: 4.4,
    interior: [2.2, -3.4],
    interiorY: 3.25,
    interiorRadius: 2.6,
  },
  {
    id: 'projects',
    label: 'PROJECTS',
    sublabel: 'Supply Warehouse',
    icon: '📦',
    color: '#5fd3a0',
    position: [-68, 5],
    rotation: 1.05,
    doorDistance: 9.4,
    radius: 4.8,
    interior: [2.2, -3.4],
    interiorY: 3.25,
    interiorRadius: 2.6,
  },
  {
    id: 'skills',
    label: 'SKILLS',
    sublabel: 'Armory',
    icon: '🎯',
    color: '#e05c5c',
    position: [65, -24],
    rotation: -2.05,
    doorDistance: 6.2,
    radius: 4.4,
    interior: [2.2, -3.4],
    interiorY: 3.25,
    interiorRadius: 2.6,
  },
  {
    id: 'experience',
    label: 'EXPERIENCE',
    sublabel: 'Training Ground',
    icon: '🎖',
    color: '#8f7fe0',
    position: [49, 57],
    rotation: -2.9,
    doorDistance: 7.0,
    radius: 4.6,
    interior: [2.2, -3.4],
    interiorY: 3.25,
    interiorRadius: 2.6,
  },
  {
    id: 'contact',
    label: 'CONTACT',
    sublabel: 'Comms Tower',
    icon: '📡',
    color: '#3fa9f5',
    position: [-52, 68],
    rotation: 0.35,
    doorDistance: 6.4,
    radius: 4.6,
    interior: [2.2, -3.4],
    interiorY: 3.25,
    interiorRadius: 2.6,
  },
]

/**
 * Both offsets are derived from `rotation` so nothing can drift out of sync:
 * every building is authored with its door on local +Z, and a local point
 * (lx, lz) lands at world (lx·cos + lz·sin, −lx·sin + lz·cos).
 */
export const houses: HouseMeta[] = HOUSE_DEFS.map((h) => {
  const c = Math.cos(h.rotation)
  const s = Math.sin(h.rotation)
  return {
    ...h,
    markerOffset: [s * h.doorDistance, c * h.doorDistance],
    interiorOffset: [h.interior[0] * c + h.interior[1] * s, -h.interior[0] * s + h.interior[1] * c],
  }
})

export const houseById = Object.fromEntries(houses.map((h) => [h.id, h])) as Record<
  HouseId,
  HouseMeta
>

/**
 * Island tuning constants shared by terrain, minimap and boundary logic.
 *
 * Sized so the landmass fits inside roughly 300×300 world units. Everything
 * downstream derives from these — the minimap scale, the boundary fence, the
 * prop scatter radius — so this is the only place the island's size is set.
 */
export const ISLAND = {
  /** Visual extent of the landmass, including the beach ring. Minimap only. */
  radius: 140,
  /** Where the player is turned back. Comfortably inside the beach. */
  boundary: 132,
  /** Half-size of the terrain mesh. Must clear the shore's underwater skirt. */
  half: 186,
  /** Sea level, world Y. */
  seaLevel: -1.2,
}
