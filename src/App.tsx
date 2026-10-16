import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { levels, profile, quests, skills, stats } from './data'
import { Boss, Collect, HoldScan, Lockpick, Trail } from './games'

const Scene = lazy(() => import('./Scene'))
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches
const LAST = levels.length - 1
const SAVE_KEY = 'azzam.save.v1'
// level-change timing; keep WARP_MS in sync with --warp in styles.css
const WARP_MS = 2400 // shutters close (~0.45s), hold the level name (~1.5s), open
const SWAP_MS = 1800 // swap content just before the shutters open so its entrance is visible

// Lucide-style stroke icons
const PATHS: Record<string, string> = {
  mail: 'M4 4h16v16H4z M4 6l8 7 8-7',
  chat: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z',
  linkedin: 'M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z M2 9h4v12H2z M4 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4z',
  github: 'M9 19c-4 1.5-4-2-6-2.5m12 5v-3.5a3 3 0 0 0-1-2.5c3 0 6-2 6-5.5a4.5 4.5 0 0 0-1-3 4 4 0 0 0 0-3s-1 0-3 1.5a10 10 0 0 0-6 0C6 3 5 3 5 3a4 4 0 0 0 0 3 4.5 4.5 0 0 0-1 3c0 3.5 3 5.5 6 5.5a3 3 0 0 0-1 2.5V22',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M3 12h18 M12 3c3 3 3 15 0 18 M12 3c-3 3-3 15 0 18',
  download: 'M12 3v12 M7 10l5 5 5-5 M4 21h16',
  arrow: 'M5 12h14 M13 6l6 6-6 6',
  lock: 'M6 11h12v10H6z M8 11V7a4 4 0 0 1 8 0v4',
}
const Icon = ({ name }: { name: string }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={PATHS[name]} />
  </svg>
)
const idx = (i: number) => ({ '--i': i }) as CSSProperties

// "decode" effect: random glyphs resolve left-to-right into the real text
const GLYPHS = '!<>-_/[]{}=+*^?#01ABCDEFXZ'
function scramble(el: HTMLElement) {
  const text = (el.dataset.text ??= el.textContent ?? '')
  if (REDUCED) return
  let f = 0
  const frames = 22
  const step = () => {
    const done = (f / frames) * text.length
    el.textContent = [...text].map((c, i) => (i < done || c === ' ' ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join('')
    if (f++ < frames) setTimeout(step, 30) // ponytail: setTimeout, not rAF, so text never stays garbled in throttled tabs
    else el.textContent = text
  }
  step()
}

/* ---------- boot ---------- */
const BOOT = ['> BIOS v5.0 ... OK', '> LOADING PLAYER_01.SAV', '> MOUNTING REACT // NEXT // TS', '> SYNCING SUPABASE ... OK', '> READY.']

function Boot({ onDone }: { onDone: () => void }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    const end = n >= BOOT.length
    const t = setTimeout(end ? onDone : () => setN(n + 1), end ? 450 : 280)
    return () => clearTimeout(t)
    // ponytail: onDone is a fresh arrow each parent render; only n drives the sequence
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n])
  return (
    <div className="boot" role="status" aria-live="polite">
      <div className="boot-inner">
        {BOOT.slice(0, n).map((l) => <p key={l}>{l}</p>)}
        <div className="bar"><span style={{ width: `${(n / BOOT.length) * 100}%` }} /></div>
        <button className="btn ghost" onClick={onDone}>Skip ▸</button>
      </div>
    </div>
  )
}

/* ---------- crosshair cursor (fine pointers only) ---------- */
function Cursor() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (REDUCED || !matchMedia('(pointer: fine)').matches) return
    const el = ref.current!
    const pos = { x: -100, y: -100 }
    const cur = { ...pos }
    const move = (e: PointerEvent) => {
      pos.x = e.clientX
      pos.y = e.clientY
      el.classList.toggle('hot', !!(e.target as Element).closest('a, button:not(:disabled), .card, .track, .boss-arena'))
    }
    const down = () => el.classList.add('press')
    const up = () => el.classList.remove('press')
    addEventListener('pointermove', move, { passive: true })
    addEventListener('pointerdown', down)
    addEventListener('pointerup', up)
    let raf = 0
    const loop = () => {
      cur.x += (pos.x - cur.x) * 0.22
      cur.y += (pos.y - cur.y) * 0.22
      el.style.transform = `translate(${cur.x}px, ${cur.y}px)`
      raf = requestAnimationFrame(loop)
    }
    loop()
    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('pointermove', move)
      removeEventListener('pointerdown', down)
      removeEventListener('pointerup', up)
    }
  }, [])
  return <div ref={ref} className="cursor" aria-hidden="true"><i /></div>
}

/* ---------- RPG dialogue box with typewriter (click to finish) ---------- */
function Dialogue({ text, children }: { text: string; children?: ReactNode }) {
  const [n, setN] = useState(REDUCED ? text.length : 0)
  useEffect(() => {
    if (n >= text.length) return
    const t = setTimeout(() => setN(n + 2), 22)
    return () => clearTimeout(t)
  }, [n, text])
  return (
    <aside className="dialog" onClick={() => setN(text.length)}>
      <p className="speaker"><span className="dot" /> SYS // GUIDE</p>
      <p className="sr-only">{text}</p>
      <p className="line" aria-hidden="true">
        {text.slice(0, n)}
        {n < text.length && <span className="caret">▌</span>}
      </p>
      {children && <div className="dialog-actions">{children}</div>}
    </aside>
  )
}

/* ---------- level content (shown once a level is cleared) ---------- */
function Title({ onStart, onReset, onSkip, saved }: { onStart: () => void; onReset: () => void; onSkip: () => void; saved: boolean }) {
  return (
    <div className="title">
      <p className="tag enter" style={idx(0)}><span className="dot" /> PLAYER 01 · ONLINE</p>
      <h1 className="glitch enter" style={idx(1)} data-text={profile.name} data-scramble>{profile.name}</h1>
      <p className="role enter" style={idx(2)} data-scramble>{profile.role}</p>
      <div className="xp enter" style={idx(3)}>
        <div className="xp-row"><span>LVL 05</span><span>EXP 5 YRS</span></div>
        <div className="bar"><span /></div>
      </div>
      <div className="ctas enter" style={idx(4)}>
        <button className="btn start" onClick={onStart}>{saved ? 'Continue' : 'Press Start'} <Icon name="arrow" /></button>
        <button className="btn ghost" onClick={onSkip}>Skip Games ⏭</button>
        <a href="/cv-ahmad-azzam.pdf" download className="btn ghost"><Icon name="download" /> Save CV</a>
      </div>
      {saved && <button className="skip-lv new-game enter" style={idx(5)} onClick={onReset}>↺ New Game — reset progress</button>}
    </div>
  )
}

function Profile() {
  return (
    <div className="panel profile">
      <figure className="avatar enter" style={idx(0)}>
        <img src="/me.jpg" alt={`Photo of ${profile.fullName}`} width="960" height="1280" />
        <figcaption><span>{profile.fullName}</span><span>{profile.location}</span></figcaption>
      </figure>
      <div>
        <h2 className="enter" style={idx(1)} data-scramble>Player Profile</h2>
        <p className="lead enter" style={idx(2)}>{profile.summary}</p>
        <dl className="stats">
          {stats.map((s, i) => (
            <div key={s.k} className="stat enter" style={idx(3 + i)}>
              <dt>{s.k}</dt>
              <dd data-scramble>{s.v}</dd>
              <small>{s.note}</small>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}

function SkillTree() {
  return (
    <div className="panel">
      <h2 className="enter" style={idx(0)} data-scramble>Skill Tree</h2>
      <div className="grid-2">
        {skills.map((s, i) => (
          <article key={s.tree} className="card enter" style={idx(i + 1)}>
            <p className="card-k">TREE_0{i + 1}</p>
            <h3>{s.tree}</h3>
            <ul className="chips">{s.items.map((x, j) => <li key={x} style={idx(j)}>{x}</li>)}</ul>
          </article>
        ))}
      </div>
    </div>
  )
}

function Quests() {
  return (
    <div className="panel">
      <h2 className="enter" style={idx(0)} data-scramble>Cleared Quests</h2>
      <div className="grid-2">
        {quests.map((q, i) => (
          <article key={q.title} className="card quest enter" style={idx(i + 1)}>
            <div className="quest-top">
              <span className="card-k">QUEST_{String(i + 1).padStart(2, '0')}</span>
              <span className="badge">✓ CLEARED</span>
            </div>
            <h3 data-scramble>{q.title}</h3>
            <p className="q-type">{q.type}</p>
            <p>{q.desc}</p>
            <ul className="chips">{q.tags.map((t, j) => <li key={t} style={idx(j)}>{t}</li>)}</ul>
          </article>
        ))}
      </div>
    </div>
  )
}

const LINKS = [
  { href: `mailto:${profile.email}`, icon: 'mail', label: 'Email' },
  { href: `https://wa.me/${profile.phone}`, icon: 'chat', label: 'WhatsApp' },
  { href: profile.links.linkedin, icon: 'linkedin', label: 'LinkedIn' },
  { href: profile.links.github, icon: 'github', label: 'GitHub' },
  { href: profile.links.site, icon: 'globe', label: 'Hakode' },
  { href: '/cv-ahmad-azzam.pdf', icon: 'download', label: 'Save CV' },
]

function Contact() {
  return (
    <div className="panel contact">
      <p className="victory enter" style={idx(0)} data-scramble>VICTORY</p>
      <h2 className="enter" style={idx(1)}>Join My Party</h2>
      <a className="big-mail enter" style={idx(2)} href={`mailto:${profile.email}`}>{profile.email}</a>
      <div className="links">
        {LINKS.map((l, i) => (
          <a
            key={l.label}
            className="enter"
            style={idx(3 + i)}
            href={l.href}
            {...(l.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}
            {...(l.icon === 'download' ? { download: true } : {})}
          >
            <Icon name={l.icon} />{l.label}
          </a>
        ))}
      </div>
    </div>
  )
}

/* ---------- save file (localStorage is a convenience; it may be unavailable) ---------- */
function load(): boolean[] {
  try {
    const v = JSON.parse(localStorage.getItem(SAVE_KEY) ?? '[]')
    if (Array.isArray(v)) return levels.map((_, i) => !!v[i])
  } catch { /* private mode / blocked storage: start fresh */ }
  return levels.map(() => false)
}
function save(v: boolean[]) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(v)) } catch { /* ignore */ }
}

export default function App() {
  const [booting, setBooting] = useState(!REDUCED)
  const [stage, setStage] = useState(0)
  const [cleared, setCleared] = useState(load)
  const [warp, setWarp] = useState<number | null>(null)
  const [flash, setFlash] = useState(false)
  const [pulse, setPulse] = useState(0)
  const body = useRef<HTMLElement>(null)

  const unlocked = (i: number) => i === 0 || cleared[i - 1]
  const done = cleared[stage]

  const go = (to: number, force = false) => {
    if (to === stage || warp !== null || to < 0 || to > LAST || !(force || unlocked(to))) return
    if (REDUCED) return setStage(to)
    setWarp(to)
    setTimeout(() => setStage(to), SWAP_MS)
    setTimeout(() => setWarp(null), WARP_MS)
  }

  const clear = (i: number) => {
    const next = cleared.map((c, j) => c || j === i)
    const commit = () => (setCleared(next), save(next), setFlash(false))
    if (REDUCED || i === 0) return commit()
    setFlash(true)
    setTimeout(commit, 1100)
  }

  const hit = () => setPulse((p) => p + 1)
  // continue from the first unfinished level (or level 1 on a fresh save)
  const start = () => {
    const next = cleared.findIndex((c, i) => i > 0 && !c)
    clear(0)
    go(next === -1 ? 1 : next, true)
  }

  // wipe the save and return to the title; content swaps under the warp so no level flashes back to its game
  // unlock everything and jump straight to the content, no games
  const skipAll = () => {
    const all = levels.map(() => true)
    setCleared(all)
    save(all)
    go(stage === 0 ? 1 : stage, true)
  }

  const reset = () => {
    const fresh = levels.map(() => false)
    save(fresh)
    if (stage === 0 || REDUCED) return (setCleared(fresh), setStage(0))
    go(0, true)
    setTimeout(() => setCleared(fresh), SWAP_MS)
  }

  // decode headings whenever new content mounts
  useEffect(() => {
    if (booting) return
    body.current?.querySelectorAll<HTMLElement>('[data-scramble]').forEach(scramble)
  }, [booting, stage, done])

  // keyboard: arrows move between unlocked levels
  const goRef = useRef(go)
  goRef.current = go
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goRef.current(stage + 1)
      if (e.key === 'ArrowLeft') goRef.current(stage - 1)
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [stage])

  const lv = levels[stage]
  const view = stage === 0 || done
    ? [<Title onStart={start} onReset={reset} onSkip={skipAll} saved={cleared.some((c, i) => i > 0 && c)} />, <Profile />, <SkillTree />, <Quests />, <Trail onClear={() => {}} onHit={hit} cleared />, <Contact />][stage]
    : [null,
        <HoldScan onClear={() => clear(1)} onHit={hit} />,
        <Collect onClear={() => clear(2)} onHit={hit} />,
        <Lockpick onClear={() => clear(3)} onHit={hit} />,
        <Trail onClear={() => clear(4)} onHit={hit} cleared={false} />,
        <Boss onClear={() => clear(5)} onHit={hit} />][stage]

  return (
    <div className={booting ? 'app' : 'app go'} data-stage={stage}>
      {booting && <Boot onDone={() => setBooting(false)} />}
      <div className="fx" aria-hidden="true" />
      <Cursor />
      <Suspense fallback={null}>
        <Scene ready={!booting} stage={stage} pulse={pulse} won={cleared[LAST] && stage === LAST} />
      </Suspense>

      <header className="topbar">
        <button className="logo" onClick={() => go(0)} aria-label="Back to title screen">AZZAM<span>.EXE</span></button>
        <p className="lv-title" key={stage}>
          <span>LV.{String(stage).padStart(2, '0')}</span> {lv.title}
        </p>
        <a href="/cv-ahmad-azzam.pdf" download className="btn sm ghost" aria-label="Download CV"><Icon name="download" /><span className="hide-sm">CV</span></a>
      </header>

      <main className="stage" key={stage} ref={body}>
        <div className="stage-body" key={String(done)}>{view}</div>
        <Dialogue key={`${stage}-${done}`} text={stage > 0 && done ? lv.clear : lv.intro}>
          {stage === 0 ? null : done ? (
            stage < LAST ? (
              <button className="btn next" onClick={() => go(stage + 1)}>Next Level <Icon name="arrow" /></button>
            ) : (
              <>
                <button className="btn ghost" onClick={() => go(0)}>Title Screen</button>
                <button className="btn" onClick={reset}>↺ New Game</button>
              </>
            )
          ) : (
            <>
              <button className="skip-lv" onClick={skipAll} disabled={flash}>Skip all games ⏭</button>
              <button className="skip-lv" onClick={() => clear(stage)} disabled={flash}>Skip level ▸</button>
            </>
          )}
        </Dialogue>
      </main>

      <nav className="map" aria-label="Levels">
        {levels.map((l, i) => (
          <button
            key={l.tab}
            onClick={() => go(i)}
            disabled={!unlocked(i)}
            aria-current={i === stage ? 'step' : undefined}
            className={cleared[i] ? 'clear' : ''}
          >
            <small>{unlocked(i) ? String(i).padStart(2, '0') : <Icon name="lock" />}</small>
            <span>{l.tab}</span>
          </button>
        ))}
      </nav>

      {warp !== null && (
        <div className="warp" aria-hidden="true">
          <i /><i />
          <p><small>LEVEL {String(warp).padStart(2, '0')}</small>{levels[warp].title}</p>
        </div>
      )}
      {flash && <div className="flash" role="status"><p>LEVEL CLEAR</p></div>}
    </div>
  )
}
