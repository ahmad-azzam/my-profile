import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { log, training } from './data'

type GameProps = { onClear: () => void; onHit: () => void }

// keep the latest callbacks without re-running animation loops
function useLatest<T>(v: T) {
  const r = useRef(v)
  r.current = v
  return r
}

const vars = (o: Record<string, string | number>) => o as CSSProperties

/* ---------- Level 1: hold to scan ---------- */
export function HoldScan({ onClear, onHit }: GameProps) {
  const [p, setP] = useState(0)
  const [on, setOn] = useState(false)
  const hold = useRef(false)
  const cb = useLatest({ onClear, onHit })

  useEffect(() => {
    let raf = 0
    let v = 0
    let last = performance.now()
    let done = false
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      if (!done) {
        v = Math.min(1, Math.max(0, v + (hold.current ? dt / 1.4 : -dt * 1.2)))
        setP(v)
        if (v >= 1) {
          done = true
          cb.current.onHit()
          cb.current.onClear()
        }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [cb])

  const start = () => ((hold.current = true), setOn(true))
  const stop = () => ((hold.current = false), setOn(false))
  const C = 2 * Math.PI * 54

  return (
    <div className="game scan">
      <button
        className={on ? 'scan-btn on' : 'scan-btn'}
        onPointerDown={start}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && (e.preventDefault(), start())}
        onKeyUp={stop}
        onContextMenu={(e) => e.preventDefault()}
        aria-label="Hold to scan the player file"
      >
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle className="track" cx="60" cy="60" r="54" />
          <circle className="fill" cx="60" cy="60" r="54" strokeDasharray={C} strokeDashoffset={C * (1 - p)} />
        </svg>
        <span className="print" aria-hidden="true"><i /><i /><i /><i /></span>
        <b>{p > 0.01 ? `${Math.round(p * 100)}%` : 'HOLD'}</b>
      </button>
      <p className="hint">{on ? 'Scanning… keep holding' : 'Press & hold the scanner'}</p>
    </div>
  )
}

/* ---------- Level 2: catch the skill orbs ---------- */
const ORBS = ['React', 'Next.js', 'TypeScript', 'Tailwind', 'Zustand', 'TanStack', 'Node.js', 'Supabase']

export function Collect({ onClear, onHit }: GameProps) {
  const [got, setGot] = useState<string[]>([])
  // ponytail: one cell per orb (2x4 mobile / 4x2 desktop) + jitter, so orbs never overlap
  const spots = useMemo(
    () =>
      ORBS.map((_, i) => {
        const j = () => Math.random()
        return vars({
          // orb centers: --mx/--my mobile, --dx/--dy desktop
          '--mx': `${(i % 2) * 50 + 25 + (j() - 0.5) * 16}%`,
          '--my': `${Math.floor(i / 2) * 23 + 15 + (j() - 0.5) * 4}%`,
          '--dx': `${(i % 4) * 25 + 12.5 + (j() - 0.5) * 8}%`,
          '--dy': `${Math.floor(i / 4) * 50 + 25 + (j() - 0.5) * 16}%`,
          '--fx': `${(j() - 0.5) * 44}px`,
          '--fy': `${(j() - 0.5) * 26}px`,
          '--dur': `${3 + j() * 3}s`,
          '--delay': `${-j() * 4}s`,
        })
      }),
    [],
  )

  const take = (s: string) => {
    if (got.includes(s)) return
    const next = [...got, s]
    setGot(next)
    onHit()
    if (next.length === ORBS.length) setTimeout(onClear, 500)
  }

  return (
    <div className="game collect">
      <p className="hud-count">SKILLS <b>{got.length}</b>/{ORBS.length}</p>
      <div className="arena">
        {ORBS.map((s, i) => (
          <button key={s} className={got.includes(s) ? 'orb got' : 'orb'} style={spots[i]} onClick={() => take(s)} disabled={got.includes(s)}>
            <span>{s}</span>
          </button>
        ))}
      </div>
      <ul className="inventory" aria-label="Collected skills">
        {ORBS.map((s) => <li key={s} className={got.includes(s) ? 'on' : ''}>{got.includes(s) ? s : '—'}</li>)}
      </ul>
    </div>
  )
}

/* ---------- Level 3: lockpick timing ---------- */
export function Lockpick({ onClear, onHit }: GameProps) {
  const needle = useRef<HTMLDivElement>(null)
  const pos = useRef(0)
  const [pins, setPins] = useState(0)
  const [zone, setZone] = useState({ at: 55, w: 30 })
  const [msg, setMsg] = useState({ text: 'STRIKE IN THE ZONE', n: 0 })
  const speed = useLatest(0.9 + pins * 0.2) // needle speed: slow, ramps up gently per pin

  useEffect(() => {
    let raf = 0
    let t = 0
    let last = performance.now()
    const loop = (now: number) => {
      t += Math.min((now - last) / 1000, 0.05) * speed.current
      last = now
      pos.current = ((1 - Math.cos(t)) / 2) * 100
      if (needle.current) needle.current.style.left = `${pos.current}%`
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [speed])

  const pick = () => {
    if (pins >= 3) return
    const p = pos.current
    if (p >= zone.at - 3 && p <= zone.at + zone.w + 3) { // 3% grace on each side: near-misses count
      const n = pins + 1
      setPins(n)
      onHit()
      setMsg((m) => ({ text: n === 3 ? 'VAULT OPEN' : `PIN ${n}/3 SET`, n: m.n + 1 }))
      setZone({ at: 8 + Math.random() * 60, w: 30 - n * 3 })
      if (n === 3) setTimeout(onClear, 600)
    } else setMsg((m) => ({ text: 'MISS — TRY AGAIN', n: m.n + 1 }))
  }

  return (
    <div className="game lock">
      <ul className="pins" aria-label={`${pins} of 3 pins set`}>
        {[0, 1, 2].map((i) => <li key={i} className={i < pins ? 'on' : ''} />)}
      </ul>
      <div className="track" onPointerDown={pick}>
        <div className="zone" style={{ left: `${zone.at}%`, width: `${zone.w}%` }} />
        <div className="needle" ref={needle} />
      </div>
      <p key={msg.n} className={msg.text.startsWith('MISS') ? 'lock-msg miss' : 'lock-msg'} aria-live="polite">{msg.text}</p>
      <button className="btn" onClick={pick}>Strike ▸</button>
    </div>
  )
}

/* ---------- Level 4: campaign trail (game and content in one) ---------- */
const TRAIL = [
  ...[...training].reverse().map((t) => ({ when: t.when, role: t.what.split(' — ')[1], at: t.what.split(' — ')[0], what: 'Training grounds.' })),
  ...[...log].reverse(),
]
// ponytail: relies on data.ts being newest-first; sort by date here if that changes

export function Trail({ onClear, onHit, cleared }: GameProps & { cleared: boolean }) {
  const [open, setOpen] = useState(cleared ? TRAIL.length : 0)
  const [sel, setSel] = useState(cleared ? TRAIL.length - 1 : -1)

  const tap = (i: number) => {
    if (i > open) return
    setSel(i)
    if (i === open && open < TRAIL.length) {
      setOpen(open + 1)
      onHit()
      if (open + 1 === TRAIL.length && !cleared) setTimeout(onClear, 1600)
    }
  }
  const e = TRAIL[sel]

  return (
    <div className="game trail">
      <ol className="nodes" style={vars({ '--p': Math.max(0, open - 1) / (TRAIL.length - 1) })}>
        {TRAIL.map((t, i) => (
          <li key={i} className={i < open ? 'done' : i === open ? 'next' : ''}>
            <button onClick={() => tap(i)} disabled={i > open} aria-current={i === sel} aria-label={`${t.when}: ${t.role}`}>
              <i />
              <span>{t.when.match(/\d{4}/)?.[0]}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="entry" aria-live="polite">
        {e ? (
          <article key={sel}>
            <p className="when">SAVE {String(sel + 1).padStart(2, '0')} · {e.when}</p>
            <h3>{e.role}</h3>
            <p className="at">@ {e.at}</p>
            <p>{e.what}</p>
          </article>
        ) : (
          <p className="hint">Tap the glowing save point to begin ▸</p>
        )}
      </div>
    </div>
  )
}

/* ---------- Level 5: boss fight ---------- */
const TAUNTS = ['Scope creep incoming!', 'Requirements changed!', 'Prod is down!', 'Can we ship it today?', 'Just one more revision…']

export function Boss({ onClear, onHit }: GameProps) {
  const [hp, setHp] = useState(100)
  const [pops, setPops] = useState<{ id: number; dmg: number; crit: boolean; x: number; y: number }[]>([])
  const root = useRef<HTMLDivElement>(null)
  const [taunt, setTaunt] = useState(0)
  const id = useRef(0)

  useEffect(() => {
    const t = setInterval(() => setTaunt((n) => (n + 1) % TAUNTS.length), 2400)
    return () => clearInterval(t)
  }, [])

  const attack = (x = 50, y = 45) => {
    if (hp <= 0) return
    const crit = Math.random() < 0.18
    const dmg = ((5 + Math.random() * 4) | 0) * (crit ? 2 : 1) // ~13 hits to win
    const left = Math.max(0, hp - dmg)
    setHp(left)
    onHit()
    root.current?.animate(
      [{ translate: '0 0' }, { translate: '-7px 3px' }, { translate: '6px -2px' }, { translate: '-3px 1px' }, { translate: '0 0' }],
      { duration: 260, easing: 'ease-out' },
    )
    const pid = ++id.current
    setPops((p) => [...p, { id: pid, dmg, crit, x: x + (Math.random() - 0.5) * 16, y: y + (Math.random() - 0.5) * 10 }])
    setTimeout(() => setPops((p) => p.filter((q) => q.id !== pid)), 900)
    if (left === 0) setTimeout(onClear, 1100)
  }

  return (
    <div className="game boss" ref={root}>
      <div className="boss-hud">
        <p><span>BOSS</span> THE DEADLINE</p>
        <div className="hp"><span style={{ width: `${hp}%` }} /><em style={{ width: `${hp}%` }} /></div>
      </div>
      <p className="taunt" key={taunt}>“{hp > 0 ? TAUNTS[taunt] : 'Noooo… shipped on time?!'}”</p>
      <div
        className="boss-arena"
        onPointerDown={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          attack(((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100)
        }}
        aria-hidden="true"
      >
        {pops.map((p) => (
          <span key={p.id} className={p.crit ? 'pop crit' : 'pop'} style={{ left: `${p.x}%`, top: `${p.y}%` }}>
            {p.crit ? `CRIT ${p.dmg}` : `-${p.dmg}`}
          </span>
        ))}
      </div>
      <button className="btn" onClick={() => attack()} disabled={hp <= 0}>⚔ Attack</button>
    </div>
  )
}
