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
  github: 'https://github.com/raghukhajuria', // FILL IN
  linkedin: 'https://linkedin.com/in/raghukhajuria', // FILL IN
  resumeUrl: '/resume.pdf', // FILL IN — drop your PDF at public/resume.pdf
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
    "Most of what I've built lately falls into three buckets: computer-vision systems for agriculture, GenAI-powered learning tools, and MERN platforms with the unglamorous parts (auth, payments, file storage, CI/CD) done properly.",
  ],
  stats: [
    { label: 'CGPA', value: '9.06', sub: '/ 10.0' },
    { label: 'Year', value: 'IV', sub: 'B.E. CSE' },
    { label: 'Projects', value: '7', sub: 'shipped' },
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
}

export const projects: Project[] = [
  {
    id: 'mern-learning',
    crate: 'AIRDROP',
    name: 'MERN Learning Platform',
    short: 'GenAI mock tests, end to end',
    rarity: 'legendary',
    summary:
      'A full-stack learning platform where the assessment layer builds itself. Instructors upload material; a GenAI pipeline turns it into mock tests, then grades free-text answers and returns structured feedback.',
    bullets: [
      'Automated mock-test generation from source material using an LLM pipeline, with schema-validated question output so malformed generations never reach a student.',
      'Automated evaluation of submitted answers — scoring plus per-question written feedback, not just a number.',
      'Full MERN stack: MongoDB for content and attempt history, Express/Node API, React front end with a role-split instructor/student experience.',
      'Attempt history and per-topic breakdowns so a learner can see which concepts are actually weak.',
    ],
    stack: ['MongoDB', 'Express', 'React', 'Node.js', 'GenAI / LLM', 'JWT'],
    links: [], // FILL IN — repo / live demo
  },
  {
    id: 'dragonfruit-suite',
    crate: 'SUPPLY',
    name: 'Dragon Fruit Disease AI Suite',
    short: 'Multi-model plant pathology system',
    rarity: 'legendary',
    summary:
      'A deployed, multi-model system for dragon fruit crop disease — detection, classification, visual question answering, and a retrieval-backed advisory chatbot, all served from one Hugging Face Space.',
    bullets: [
      'YOLOv8 lesion detection that localises diseased regions on the plant rather than only labelling the whole image.',
      'Agrobot — a RAG chatbot over an agronomy knowledge base, so farmer queries get grounded answers instead of hallucinated ones.',
      'Integrates the ConViTx classifier and DragonFruitVQA modules below into a single interface.',
      'Deployed publicly on Hugging Face Spaces — usable from a phone in the field, not just a notebook.',
    ],
    stack: ['YOLOv8', 'PyTorch', 'RAG', 'Vector DB', 'Gradio', 'Hugging Face Spaces'],
    links: [], // FILL IN — HF Space URL
  },
  {
    id: 'convitx',
    crate: 'WEAPON',
    name: 'ConViTx',
    short: 'Hybrid CNN + ViT classifier',
    rarity: 'epic',
    summary:
      'A hybrid image classifier that fuses convolutional and transformer feature extraction — CNN branches capture local lesion texture, the ViT branch captures global leaf-level context, and the two are combined before the classification head.',
    bullets: [
      'Dual-branch architecture: CNN feature maps for fine-grained local texture, Vision Transformer tokens for long-range spatial context.',
      'Learned fusion of both representations rather than naive concatenation, so the head sees a joint feature space.',
      'Targeted at plant disease classification where symptoms are simultaneously local (lesion detail) and global (distribution across the plant).',
      'Trained and benchmarked against CNN-only and ViT-only baselines.',
    ],
    stack: ['PyTorch', 'Vision Transformer', 'CNN', 'timm', 'NumPy'],
    links: [], // FILL IN
  },
  {
    id: 'dragonfruit-vqa',
    crate: 'MEDKIT',
    name: 'DragonFruitVQA',
    short: 'Multimodal VQA + Grad-CAM',
    rarity: 'epic',
    summary:
      'A visual question answering system for crop imagery: ask a natural-language question about a photo of a plant and get an answer, plus a Grad-CAM heatmap showing which pixels drove it.',
    bullets: [
      'Bilinear fusion of image and text embeddings to model interaction between the two modalities, instead of simple concatenation.',
      'Grad-CAM interpretability layer — every answer ships with a visual explanation of where the model looked.',
      'Built for a domain where a black-box answer is not actionable: an agronomist needs to see the evidence.',
      'Integrated as a module of the wider Dragon Fruit Disease AI Suite.',
    ],
    stack: ['PyTorch', 'Multimodal', 'Bilinear Fusion', 'Grad-CAM', 'Transformers'],
    links: [], // FILL IN
  },
  {
    id: 'ankur-portal',
    crate: 'AMMO',
    name: 'Ankur School Portal',
    short: 'MERN school management system',
    rarity: 'rare',
    summary:
      'A production-shaped school management portal — the kind of project where the interesting work is auth, money, and files rather than the CRUD.',
    bullets: [
      'Clerk authentication with role-based access across admin, staff, and parent surfaces.',
      'PhonePe payment gateway integration for fee collection, including callback verification.',
      'MongoDB GridFS for document and media storage, so large files never bloat the primary collections.',
      'Full MERN stack with a React admin dashboard.',
    ],
    stack: ['MongoDB', 'GridFS', 'Express', 'React', 'Node.js', 'Clerk', 'PhonePe'],
    links: [], // FILL IN
  },
  {
    id: 'autosettings',
    crate: 'SCOPE',
    name: 'AutoSettings AI',
    short: 'Secure OAuth + session platform',
    rarity: 'rare',
    summary:
      'A web application built around getting the security boring-correct: session-based auth, third-party OAuth, encrypted token storage at rest, and verified email flows.',
    bullets: [
      'Session-based authentication with server-side session storage rather than stateless-token shortcuts.',
      'GitHub OAuth integration for repository-scoped access.',
      'Access tokens encrypted at rest with AES-256-GCM — authenticated encryption, so tampering is detectable, not just unreadable.',
      'Transactional email confirmation flow powered by Resend.',
    ],
    stack: ['Node.js', 'OAuth 2.0', 'AES-256-GCM', 'Resend', 'React'],
    links: [], // FILL IN
  },
  {
    id: 'cicd-intel',
    crate: 'FUEL',
    name: 'CI/CD Reliability Intelligence',
    short: 'Pipeline analytics backend',
    rarity: 'rare',
    summary:
      'A backend platform that ingests CI/CD pipeline events and turns them into reliability signal — flaky-test detection, failure clustering, and trend analysis over build history.',
    bullets: [
      'Node.js 22 + TypeScript service with a strictly typed domain layer.',
      'PostgreSQL for durable build/run history, Redis for hot state and caching.',
      'BullMQ job queues for asynchronous ingestion and analysis so webhook handlers stay fast.',
      'Deployed on Railway with managed Postgres and Redis.',
    ],
    stack: ['Node.js 22', 'TypeScript', 'PostgreSQL', 'Redis', 'BullMQ', 'Railway'],
    links: [], // FILL IN
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
    value: profile.github.replace(/^https?:\/\//, ''),
    href: profile.github,
    icon: 'GH',
    freq: '146.520',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    value: profile.linkedin.replace(/^https?:\/\//, ''),
    href: profile.linkedin,
    icon: 'in',
    freq: '147.000',
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
