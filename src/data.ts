export const profile = {
  name: 'Ahmad Azzam',
  fullName: 'Ahmad Azzam Shibghotallah',
  role: 'Frontend & Full-Stack Developer',
  summary:
    'Frontend-focused software engineer with 5 years of experience building web apps for banking and financial services, and founder of Hakode — a software house building web products for Indonesian small businesses (UMKM). I take projects from a Figma file or a rough brief to a deployed Next.js or React app: dashboards, internal tools, landing pages, and SaaS features.',
  email: 'contact.ahmadazzam@gmail.com',
  phone: '6281238950193',
  location: 'Depok, Indonesia',
  links: {
    linkedin: 'https://linkedin.com/in/ahmad-azzam-s',
    github: 'https://github.com/ahmad-azzam',
    site: 'https://hakode.id',
  },
}

export const stats = [
  { k: 'LEVEL', v: '05', note: 'years exp' },
  { k: 'CLASS', v: 'FE / FS', note: 'frontend · full-stack' },
  { k: 'GUILD', v: 'HAKODE', note: 'founder' },
  { k: 'AVAIL', v: '20–24h', note: 'per week · remote' },
]

export const skills = [
  { tree: 'Frontend', items: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'Ant Design', 'Angular'] },
  { tree: 'State & Data', items: ['Redux Toolkit', 'RTK Query', 'Zustand', 'TanStack Query', 'TanStack Router'] },
  { tree: 'Backend & DB', items: ['Node.js', 'Express.js', 'REST API', 'PostgreSQL', 'Supabase'] },
  { tree: 'Deploy & Flow', items: ['Vercel', 'Git', 'Figma-to-code', 'Remote collab'] },
]

export const quests = [
  {
    title: 'Ozzy Clothing',
    type: 'Design Application',
    desc: "Built a Trello-style board for designers to manage clothing designs for customer orders, replacing their Trello workflow with Ozzy's own app.",
    tags: ['React', 'Kanban', 'Internal tool'],
  },
  {
    title: 'The Sign Pack',
    type: 'Application Delivery',
    desc: 'Finished long-stalled applications on the agreed deadlines and redesigned the design review flow for better usability.',
    tags: ['Frontend', 'UX redesign', 'Delivery'],
  },
  {
    title: 'BNI CXO',
    type: 'Back Office & IAM',
    desc: 'Internal systems for partner management, exchange-rate monitoring, and role-based access control.',
    tags: ['Banking', 'RBAC', 'Dashboard'],
  },
  {
    title: 'Mandiri Notional Pooling',
    type: 'Finance Module',
    desc: "Interest calculation module inside Mandiri's Kopra platform.",
    tags: ['Banking', 'Next.js', 'TypeScript'],
  },
]

export const log = [
  { when: 'Jan 2026 — Now', role: 'Founder & Developer', at: 'Hakode', what: 'Software house shipping landing pages, company profiles, and custom web apps for UMKM with Next.js, Supabase, and Node.js.' },
  { when: 'Apr 2025 — Now', role: 'Frontend Developer', at: 'The Sign Pack · remote', what: 'Rescued stalled apps on deadline, redesigned the design review feature, and refined UI/UX across the product.' },
  { when: 'Jul — Dec 2025', role: 'Freelance Frontend Dev', at: 'Ozzy Clothing · remote', what: 'Built an in-house Trello-style board and improved stability and performance of the internal app.' },
  { when: 'Jan — May 2024', role: 'Freelance Frontend Dev', at: 'JuraganCOD · remote', what: 'Shipped features, fixed bugs, and kept the UI in sync with Figma across devices.' },
  { when: 'Oct 2022 — Apr 2025', role: 'Frontend Developer', at: 'PT Inti Corpora Teknologi', what: 'React/Next.js apps for BNI CXO, Mandiri Notional Pooling, and IFG Life — financial dashboards, access management, reusable components.' },
  { when: 'Oct 2021 — Oct 2022', role: 'Software Engineer', at: 'Sprout Digital Labs', what: 'Features from Figma for Back Office Generali (Angular), Iklanmu (Next.js, Redux), and Comeby.' },
]

export const training = [
  { when: '2021', what: 'Hacktiv8 Indonesia — JavaScript Full Stack Bootcamp' },
  { when: '2016 — 2021', what: 'Sumbawa University of Technology — Bachelor of Technology' },
]

// One entry per level: what the guide says before (intro) and after (clear) the challenge.
export const levels = [
  {
    tab: 'Start', title: 'Title Screen',
    intro: 'Welcome, traveler. This world belongs to Ahmad Azzam — a developer who turns Figma files and rough briefs into real apps. Clear 5 levels to learn his story.',
    clear: '',
  },
  {
    tab: 'ID', title: 'Identity',
    intro: 'Level 1 — Identity. A sealed player file sits in front of you. Hold the scanner to decrypt it.',
    clear: 'Identity confirmed. Five years in the field, now leading his own guild: Hakode.',
  },
  {
    tab: 'Skills', title: 'Skill Tree',
    intro: 'Level 2 — Skill Tree. Skill orbs are leaking out of the system. Catch all 8 of them!',
    clear: 'Inventory full. These are the tools he fights with every single day.',
  },
  {
    tab: 'Vault', title: 'The Vault',
    intro: 'Level 3 — The Vault. Mission files are locked behind 3 pins. Strike when the needle is inside the bright zone.',
    clear: 'Vault cracked. From banking giants to clothing studios — quests he has already cleared.',
  },
  {
    tab: 'Log', title: 'Campaign Log',
    intro: 'Level 4 — Campaign Log. Follow the trail: tap each glowing save point to replay his journey.',
    clear: 'From bootcamp recruit in 2021 to founding his own guild in 2026. Only one thing remains…',
  },
  {
    tab: 'Boss', title: 'Final Boss',
    intro: 'Final Level — THE DEADLINE. Every project has one. Ahmad has beaten it many times. Your turn: attack!',
    clear: 'VICTORY! Ahmad is open for new quests — 20–24 hours per week, remote. Recruit him to your party.',
  },
]
