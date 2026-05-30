'use client'

import type { ReactNode } from 'react'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'motion/react'
import {
  Check, X, ChevronDown, ArrowRight,
  Zap, Brain, DollarSign, GitPullRequest, TrendingUp,
  BookOpen, ScrollText, Github, FileText, Users, Mail,
  LayoutDashboard, Settings,
} from 'lucide-react'

/* ─────────────────────── helpers ─────────────────────── */

function FadeUp({
  children, delay = 0, className = '',
}: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/** Animated count-up — eases up to `to` on mount */
function CountUp({
  to, duration = 1800, prefix = '', suffix = '', className = '',
}: { to: number; duration?: number; prefix?: string; suffix?: string; className?: string }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    const start = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(to * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, duration])
  return <span className={className}>{prefix}{val.toLocaleString()}{suffix}</span>
}

/** Cursor-following spotlight (used in hero) */
function Spotlight() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect()
      el.style.setProperty('--mx', `${e.clientX - r.left}px`)
      el.style.setProperty('--my', `${e.clientY - r.top}px`)
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])
  return (
    <div
      ref={ref}
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{
        background:
          'radial-gradient(600px circle at var(--mx,50%) var(--my,30%), rgba(96,165,250,0.18), transparent 60%),' +
          'radial-gradient(900px circle at 50% 0%, rgba(59,130,246,0.16) 0%, transparent 55%)',
      }}
    />
  )
}

/* ─────────────────────── nav ─────────────────────── */
const NAV_MENUS = [
  { label: 'Product', items: [
    { icon: TrendingUp,     label: 'Flaky detection',    desc: 'Find non-deterministic tests across CI' },
    { icon: Brain,          label: 'AI root cause',      desc: 'Claude explains why every test flakes' },
    { icon: DollarSign,     label: 'Cost estimator',     desc: 'Dollar cost per flake, per year' },
    { icon: GitPullRequest, label: 'Auto-quarantine PR', desc: 'Fix PRs opened automatically' },
  ]},
  { label: 'Resources', items: [
    { icon: BookOpen,   label: 'Documentation', desc: 'Setup guides, API reference, examples' },
    { icon: Github,     label: 'GitHub',        desc: 'Open-source keel-action and examples' },
    { icon: ScrollText, label: 'Changelog',     desc: "What's new in Keel" },
    { icon: FileText,   label: 'Blog',          desc: 'Team updates and deep-dives' },
  ]},
  { label: 'Company', items: [
    { icon: Users, label: 'About',   desc: 'Who we are and why we built Keel' },
    { icon: Mail,  label: 'Contact', desc: 'Get in touch with the team' },
  ]},
]

function NavDropdown({ label, items }: { label: string; items: typeof NAV_MENUS[0]['items'] }) {
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const show = () => { if (timer.current) clearTimeout(timer.current); setOpen(true) }
  const hide = () => { timer.current = setTimeout(() => setOpen(false), 120) }
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  return (
    <div onMouseEnter={show} onMouseLeave={hide} className="relative">
      <button className={`flex items-center gap-1 text-[13px] tracking-tight transition-colors py-1 ${open ? 'text-white' : 'text-zinc-400 hover:text-white'}`}>
        {label}
        <ChevronDown size={12} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-72 bg-[#0c0c10]/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden z-50"
          >
            <div className="p-2">
              {items.map((item) => (
                <Link key={item.label} href="#"
                  className="flex items-start gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.06] transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-blue-500/15 transition-colors">
                    <item.icon size={14} className="text-zinc-400 group-hover:text-blue-300 transition-colors" />
                  </div>
                  <div>
                    <div className="text-[13px] text-white font-medium leading-tight">{item.label}</div>
                    <div className="text-[11px] text-zinc-500 mt-1 leading-relaxed">{item.desc}</div>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Nav() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
      scrolled ? 'h-14 bg-black/70 backdrop-blur-xl border-b border-white/[0.06]' : 'h-16 bg-transparent border-b border-transparent'
    }`}>
      <div className="max-w-[1240px] mx-auto px-8 w-full h-full flex items-center justify-between gap-8">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="font-black text-[26px] tracking-[-0.06em] leading-none">Keel</span>
          <span className="font-mono text-[9px] tracking-[0.18em] text-zinc-500 mt-1.5 uppercase">v.1</span>
        </Link>
        <div className="hidden md:flex items-center gap-7">
          {NAV_MENUS.map(m => <NavDropdown key={m.label} {...m} />)}
          <Link href="#pricing" className="text-[13px] text-zinc-400 hover:text-white transition-colors tracking-tight">Pricing</Link>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <Link href="https://github.com/trykeel" className="hidden md:flex items-center gap-1.5 text-[13px] text-zinc-400 hover:text-white transition-colors tracking-tight">
            <Github size={14} />GitHub
          </Link>
          <Link href="/sign-in" className="text-[13px] text-zinc-400 hover:text-white transition-colors tracking-tight">Sign in</Link>
          <Link href="/sign-up" className="text-[13px] bg-white text-black font-semibold px-4 py-1.5 rounded-full hover:bg-zinc-100 transition-colors tracking-tight">
            Get started →
          </Link>
        </div>
      </div>
    </nav>
  )
}

/* ─────────────────────── hero ─────────────────────── */
function Hero() {
  return (
    <section className="relative pt-32 pb-24 overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-60"
        style={{ maskImage: 'radial-gradient(ellipse at 50% 30%, #000 30%, transparent 75%)',
                 WebkitMaskImage: 'radial-gradient(ellipse at 50% 30%, #000 30%, transparent 75%)' }} />
      <Spotlight />

      <div className="relative max-w-[1240px] mx-auto px-8">
        {/* live eyebrow */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
          className="flex items-center justify-center mb-10"
        >
          <div className="flex items-center gap-3 font-mono text-[11px] tracking-[0.16em] uppercase text-zinc-400 border border-white/[0.08] rounded-full px-4 py-1.5 bg-white/[0.02]">
            <span className="relative flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 pulse-dot" />
            </span>
            <span><CountUp to={1284} className="text-white font-medium" /> flakes detected this week</span>
            <span className="text-zinc-700">·</span>
            <span className="text-zinc-500">live</span>
          </div>
        </motion.div>

        {/* editorial headline */}
        <h1 className="text-center mb-10">
          {['Flaky tests', null, null].map((_, i) => null)}
          <motion.span
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.06, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="block text-[clamp(56px,10vw,150px)] font-black tracking-[-0.055em] leading-[0.92]"
          >
            Flaky tests
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.14, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="block text-[clamp(56px,10vw,150px)] font-black tracking-[-0.055em] leading-[0.92]"
          >
            cost you{' '}
            <span className="serif-italic text-transparent bg-clip-text"
              style={{ backgroundImage: 'linear-gradient(120deg, #fff 0%, #93c5fd 50%, #fff 100%)' }}>
              two hundred
            </span>
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.22, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="block text-[clamp(56px,10vw,150px)] font-black tracking-[-0.055em] leading-[0.92]"
          >
            <span className="serif-italic text-transparent bg-clip-text"
              style={{ backgroundImage: 'linear-gradient(120deg, #93c5fd, #fff 70%)' }}>thousand</span>
            <span> dollars.</span>
          </motion.span>
        </h1>

        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.38 }}
          className="grid sm:grid-cols-[1fr_auto_1fr] items-start gap-8 max-w-4xl mx-auto"
        >
          <p className="text-[15px] text-zinc-400 leading-relaxed sm:text-right sm:pr-4 sm:border-r sm:border-white/[0.08]">
            Keel watches every CI run, flags non-deterministic tests, and uses Claude to explain exactly why they fail.
          </p>
          <div className="hidden sm:block w-px h-full bg-white/[0.06] -mx-3" />
          <p className="text-[15px] text-zinc-400 leading-relaxed sm:pl-4">
            Then it opens the quarantine PR — so deploys keep moving while your team fixes the root cause.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }}
          className="flex items-center justify-center gap-3 flex-wrap mt-12"
        >
          <Link href="/sign-up" className="group inline-flex items-center gap-2 bg-white text-black font-semibold px-7 py-3 rounded-full text-[14px] hover:bg-zinc-100 transition-all hover:gap-3">
            Start free <ArrowRight size={14} />
          </Link>
          <Link href="https://github.com/trykeel/keel-action" className="inline-flex items-center gap-2 text-white font-medium px-7 py-3 rounded-full text-[14px] hover:bg-white/[0.06] transition-colors border border-white/[0.1]">
            <Github size={14} />
            <span>trykeel/keel-action</span>
            <span className="text-zinc-500 font-mono text-[11px] ml-1">★ 4.2k</span>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.62 }}
          className="flex items-center justify-center gap-6 mt-6 text-[11px] font-mono tracking-wider uppercase text-zinc-600"
        >
          <span className="flex items-center gap-1.5"><Check size={11} className="text-green-500" />Free for 1 repo</span>
          <span className="flex items-center gap-1.5"><Check size={11} className="text-green-500" />No card</span>
          <span className="flex items-center gap-1.5"><Check size={11} className="text-green-500" />2-min setup</span>
        </motion.div>
      </div>
    </section>
  )
}

/* ─────────────────────── flake marquee ─────────────────────── */
const FLAKE_NAMES = [
  'UserAuth › login with SSO', 'Checkout › payment timeout', 'API › rate limit retry',
  'Email › delivery webhook', 'Reports › PDF generation', 'Search › fuzzy match',
  'Notifications › push delivery', 'Billing › invoice generator', 'Sync › realtime stream',
  'Onboarding › step 3 race', 'Storage › upload chunked', 'Auth › refresh token',
  'GraphQL › subscription dedupe', 'Cron › nightly retention', 'Webhook › signature verify',
]

function FlakeMarquee() {
  const items = [...FLAKE_NAMES, ...FLAKE_NAMES]
  return (
    <section className="relative py-8 border-y border-white/[0.05] bg-[#08080b] overflow-hidden">
      <div className="flex w-max marquee">
        {items.map((n, i) => (
          <div key={i} className="flex items-center gap-3 px-8 shrink-0 font-mono text-[13px] text-zinc-500">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500/60" />
            <span className="line-through decoration-red-500/60 decoration-1">{n}</span>
            <span className="text-zinc-700">flaked</span>
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#08080b] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#08080b] to-transparent" />
    </section>
  )
}

/* ─────────────────────── typewriter terminal ─────────────────────── */
function useTypewriter(lines: string[], speed = 22, lineDelay = 280) {
  const [out, setOut] = useState<string[]>([''])
  const [done, setDone] = useState(false)
  useEffect(() => {
    let cancelled = false
    let li = 0, ci = 0
    const acc = ['']
    const next = () => {
      if (cancelled) return
      if (li >= lines.length) { setDone(true); return }
      if (ci > lines[li].length) {
        li += 1; ci = 0
        acc.push('')
        setOut([...acc])
        setTimeout(next, lineDelay)
        return
      }
      acc[acc.length - 1] = lines[li].slice(0, ci)
      setOut([...acc])
      ci += 1
      setTimeout(next, speed)
    }
    setTimeout(next, 400)
    return () => { cancelled = true }
  }, [lines, speed, lineDelay])
  return [out, done] as const
}

const TERMINAL_LINES = [
  '$ cat .github/workflows/ci.yml',
  '',
  '- uses: trykeel/keel-action@v1',
  '  if: always()',
  '  with:',
  '    api-key: ${{ secrets.KEEL_API_KEY }}',
  '',
  '$ git commit -am "add keel" && git push',
  '',
  '✓ keel: tracking 1,284 tests',
  '✓ keel: 5 flaky tests detected',
  '✓ keel: opened PR #428 (quarantine UserAuth › SSO)',
]

function colorLine(line: string): ReactNode {
  if (line.startsWith('$ '))
    return <><span className="text-blue-400">$</span><span className="text-zinc-300">{line.slice(1)}</span></>
  if (line.startsWith('✓'))
    return <><span className="text-green-400">✓</span><span className="text-zinc-300">{line.slice(1)}</span></>
  if (line.startsWith('- uses') || /^\s+(if|with|api-key):/.test(line)) {
    const m = line.match(/^(\s*)(- )?(uses|if|with|api-key)(:)(.*)$/)
    if (m) return <><span>{m[1]}{m[2] || ''}</span><span className="text-blue-300">{m[3]}</span><span className="text-zinc-300">{m[4]}{m[5]}</span></>
  }
  return <span className="text-zinc-400">{line}</span>
}

function SetupSection() {
  const [lines, done] = useTypewriter(TERMINAL_LINES)
  return (
    <section className="py-32 border-t border-white/[0.04]">
      <div className="max-w-[1240px] mx-auto px-8">
        <FadeUp className="mb-16">
          <div className="grid sm:grid-cols-[1fr_2fr] gap-8 items-end">
            <div>
              <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-zinc-500 mb-4">01 — Setup</p>
              <h2 className="text-[56px] font-black tracking-[-0.045em] leading-[0.95]">
                One line.<br />
                <span className="serif-italic font-normal text-zinc-400">that&apos;s it.</span>
              </h2>
            </div>
            <p className="text-[17px] text-zinc-400 leading-relaxed max-w-md justify-self-end">
              Paste one block into your existing GitHub Actions workflow. No agent, no new infrastructure.
              Works with Jest, pytest, RSpec, Go test — anything that writes JUnit XML.
            </p>
          </div>
        </FadeUp>

        <FadeUp>
          <div className="rounded-2xl border border-white/[0.08] bg-[#0c0c10] overflow-hidden shadow-[0_0_120px_-20px_rgba(59,130,246,0.25)]">
            <div className="flex items-center gap-2 px-4 py-3 bg-[#101015] border-b border-white/[0.06]">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                <div className="w-3 h-3 rounded-full bg-[#28C840]" />
              </div>
              <div className="flex-1 text-center font-mono text-[11px] text-zinc-500">
                ~/acme-corp/api-service · main
              </div>
              <div className="font-mono text-[11px] text-zinc-700">⌘+K</div>
            </div>
            <pre className="p-7 text-[13.5px] leading-[1.85] m-0 min-h-[330px] font-mono">
              {lines.map((line, i) => (
                <div key={i}>
                  {colorLine(line)}
                  {i === lines.length - 1 && !done && <span className="blink text-blue-400 ml-1">▍</span>}
                </div>
              ))}
            </pre>
            <div className="px-7 py-3 border-t border-white/[0.06] bg-[#101015] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <span className="font-mono text-[11px] text-zinc-500">Keel will detect flakes on your next CI run</span>
              </div>
              <span className="font-mono text-[10px] text-zinc-600 tracking-wider">.GITHUB/WORKFLOWS/CI.YML</span>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  )
}

/* ─────────────────────── dashboard preview ─────────────────────── */
type FakeTest = { name: string; rate: number; cost: number; sev: 'high' | 'med' | 'low'; runs: number }

const FAKE_TESTS: FakeTest[] = [
  { name: 'UserAuth › login with SSO',  rate: 34, cost: 18200, sev: 'high', runs: 412 },
  { name: 'Checkout › payment timeout', rate: 21, cost: 11400, sev: 'high', runs: 388 },
  { name: 'API › rate limit retry',     rate: 12, cost:  6500, sev: 'med',  runs: 521 },
  { name: 'Email › delivery webhook',   rate:  7, cost:  3800, sev: 'low',  runs: 277 },
  { name: 'Reports › PDF generation',   rate:  4, cost:  2100, sev: 'low',  runs: 198 },
]

function AnimatedBars({ data }: { data: FakeTest[] }) {
  const max = Math.max(...data.map(d => d.rate))
  return (
    <div className="flex items-end gap-3 h-32 px-1">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2">
          <div className="w-full flex flex-col-reverse" style={{ height: 110 }}>
            <motion.div
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.12, ease: [0.21, 0.85, 0.32, 0.99] }}
              className="w-full rounded-t origin-bottom"
              style={{
                height: `${(d.rate / max) * 100}%`,
                background:
                  d.sev === 'high' ? 'linear-gradient(180deg,#f87171,#ef4444)'
                  : d.sev === 'med' ? 'linear-gradient(180deg,#fbbf24,#f59e0b)'
                                    : 'linear-gradient(180deg,#34d399,#10b981)',
              }}
            />
          </div>
          <span className="font-mono text-[10px] text-zinc-600">{d.rate}%</span>
        </div>
      ))}
    </div>
  )
}

function DashboardPreview() {
  return (
    <section className="py-32 border-t border-white/[0.04]">
      <div className="max-w-[1240px] mx-auto px-8">
        <FadeUp className="mb-12">
          <div className="grid sm:grid-cols-[1fr_2fr] gap-8 items-end">
            <div>
              <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-zinc-500 mb-4">02 — Triage</p>
              <h2 className="text-[56px] font-black tracking-[-0.045em] leading-[0.95]">
                Every flake,<br />
                <span className="serif-italic font-normal text-zinc-400">priced.</span>
              </h2>
            </div>
            <p className="text-[17px] text-zinc-400 leading-relaxed max-w-md justify-self-end">
              Tests sorted by dollar cost. See which ones bleed your budget most, with AI root-cause one click away.
            </p>
          </div>
        </FadeUp>

        <FadeUp>
          <div className="rounded-3xl border border-white/[0.08] bg-[#0a0a0d] overflow-hidden shadow-[0_30px_120px_-30px_rgba(59,130,246,0.25)]">
            {/* chrome */}
            <div className="flex items-center gap-3 px-5 py-3 bg-[#0e0e12] border-b border-white/[0.06]">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                <div className="w-3 h-3 rounded-full bg-[#28C840]" />
              </div>
              <div className="flex-1 mx-4 bg-[#16161c] rounded-md py-1.5 px-3 text-[11px] text-zinc-500 font-mono text-center">
                app.trykeel.com/dashboard
              </div>
              <div className="w-3 h-3 rounded-full bg-zinc-800" />
            </div>

            <div className="grid grid-cols-[180px_1fr]">
              {/* sidebar */}
              <div className="border-r border-white/[0.05] p-4 flex flex-col gap-1 bg-[#0b0b0f]">
                <div className="flex items-center gap-2 px-2 py-2 mb-3">
                  <span className="font-black text-[18px] tracking-tighter">Keel</span>
                </div>
                {([
                  [LayoutDashboard, 'Dashboard', true],
                  [TrendingUp,      'Tests',     false],
                  [DollarSign,      'Costs',     false],
                  [Settings,        'Settings',  false],
                ] as const).map(([Ic, label, active]) => (
                  <div key={label} className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] ${active ? 'bg-blue-500/10 text-blue-300' : 'text-zinc-600'}`}>
                    <Ic size={13} />{label}
                  </div>
                ))}
                <div className="mt-auto pt-4 border-t border-white/[0.04] font-mono text-[10px] text-zinc-700 truncate">acme-corp / api-service</div>
              </div>

              <div className="p-7 flex flex-col gap-5">
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Flaky',       val: 5,     color: 'text-red-400',   tone: 'rgba(239,68,68,0.08)' },
                    { label: 'Tracked',     val: 1284,  color: 'text-blue-300',  tone: 'rgba(59,130,246,0.08)' },
                    { label: 'Annual cost', val: 42000, color: 'text-amber-300', tone: 'rgba(245,158,11,0.08)', prefix: '$' },
                  ].map(c => (
                    <div key={c.label} className="rounded-xl p-4 border border-white/[0.05]" style={{ background: c.tone }}>
                      <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-zinc-500 mb-2">{c.label}</div>
                      <div className={`text-[28px] font-black tabular-nums ${c.color}`}>
                        <CountUp to={c.val} prefix={c.prefix || ''} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl p-5 border border-white/[0.05] bg-[#0d0d12]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-zinc-500">Flakiness rate by test</div>
                    <div className="flex items-center gap-3 font-mono text-[10px] text-zinc-600">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500" />HIGH</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-500" />MED</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500" />LOW</span>
                    </div>
                  </div>
                  <AnimatedBars data={FAKE_TESTS} />
                </div>

                <div className="rounded-xl border border-white/[0.05] bg-[#0d0d12] overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/[0.05] flex items-center justify-between">
                    <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-zinc-500">Flaky tests · sorted by cost</div>
                    <div className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full font-mono">5 FLAKY</div>
                  </div>
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="border-b border-white/[0.04] font-mono text-[10px] tracking-[0.16em] uppercase text-zinc-600">
                        <th className="px-5 py-2.5 text-left font-normal">Test</th>
                        <th className="px-5 py-2.5 text-left font-normal">Rate</th>
                        <th className="px-5 py-2.5 text-left font-normal">Runs</th>
                        <th className="px-5 py-2.5 text-left font-normal">Cost / yr</th>
                      </tr>
                    </thead>
                    <tbody>
                      {FAKE_TESTS.map((t, i) => (
                        <tr key={i} className="border-t border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                          <td className="px-5 py-2.5 font-mono text-zinc-300 truncate max-w-[260px]">{t.name}</td>
                          <td className="px-5 py-2.5">
                            <span className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${
                              t.sev === 'high' ? 'bg-red-500/10 text-red-400'
                              : t.sev === 'med' ? 'bg-amber-500/10 text-amber-400'
                              : 'bg-emerald-500/10 text-emerald-400'
                            }`}>{t.rate}%</span>
                          </td>
                          <td className="px-5 py-2.5 font-mono text-zinc-500 tabular-nums">{t.runs}</td>
                          <td className="px-5 py-2.5 font-mono text-amber-300 font-semibold tabular-nums">${t.cost.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </FadeUp>

        <div className="text-center mt-10">
          <Link href="/sign-up" className="inline-flex items-center gap-2 text-[13px] font-mono tracking-wide text-blue-400 hover:text-blue-300 transition-colors">
            ▸ get started free
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────── stats wall ─────────────────────── */
function StatsWall() {
  const stats = [
    { n: '23min', label: 'average human time per flaky test investigation' },
    { n: '7×',    label: 'CI re-runs per week on a single flake' },
    { n: '$200k', label: 'annual cost to a 40-engineer team', highlight: true },
    { n: '2min',  label: 'to install Keel in your repo' },
  ]
  return (
    <section className="py-32 border-t border-white/[0.04] relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-30" />
      <div className="relative max-w-[1240px] mx-auto px-8">
        <FadeUp className="mb-14">
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-zinc-500 mb-4">The math</p>
          <h2 className="text-[56px] font-black tracking-[-0.045em] leading-[0.95] max-w-2xl">
            Every flake is{' '}
            <span className="serif-italic font-normal text-zinc-400">an invoice</span>{' '}
            you haven&apos;t seen.
          </h2>
        </FadeUp>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/[0.06] border border-white/[0.06] rounded-2xl overflow-hidden">
          {stats.map((s, i) => (
            <FadeUp key={s.label} delay={i * 0.08}>
              <div className={`p-8 h-full ${s.highlight ? 'bg-[#0a0d1e]' : 'bg-[#08080b]'}`}>
                <div className={`text-[64px] font-black tracking-[-0.05em] leading-none mb-4 ${s.highlight ? 'text-blue-300' : 'text-white'}`}>
                  {s.n}
                </div>
                <div className="text-[13px] text-zinc-500 leading-relaxed max-w-[220px]">{s.label}</div>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────── how it works ─────────────────────── */
const STEPS = [
  { n: '01', title: 'Add one step',           desc: 'Paste one block into your GitHub Actions workflow. Works with Jest, pytest, RSpec, Go test — any runner.', accent: 'sans' },
  { n: '02', title: 'Keel watches',           desc: 'Every result is stored. Keel scores flakiness across commits — flagging tests that pass on one run but fail on another with the same code.', accent: 'serif' },
  { n: '03', title: 'AI explains. Keel fixes.', desc: 'Plain-English root cause. Keel opens a quarantine PR so deploys keep moving while your team fixes it.', accent: 'sans' },
]

function HowItWorks() {
  return (
    <section id="how" className="py-32 border-t border-white/[0.04]">
      <div className="max-w-[1240px] mx-auto px-8">
        <FadeUp className="mb-16">
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-zinc-500 mb-4">How it works</p>
          <h2 className="text-[56px] font-black tracking-[-0.045em] leading-[0.95] max-w-3xl">
            Three steps.<br />
            <span className="serif-italic font-normal text-zinc-400">no agents, no infra.</span>
          </h2>
        </FadeUp>
        <div className="grid sm:grid-cols-3 gap-px bg-white/[0.06] border border-white/[0.06] rounded-2xl overflow-hidden">
          {STEPS.map((s, i) => (
            <FadeUp key={s.n} delay={i * 0.08}>
              <div className="bg-[#08080b] p-8 h-full">
                <div className="flex items-baseline gap-3 mb-8">
                  <span className="font-mono text-[12px] text-zinc-600 tracking-wider">{s.n}</span>
                  <span className="flex-1 h-px bg-white/[0.05]" />
                </div>
                <h3 className={`text-[32px] font-black tracking-[-0.03em] leading-tight mb-4 ${s.accent === 'serif' ? 'serif-italic font-normal' : ''}`}>
                  {s.title}
                </h3>
                <p className="text-[14px] text-zinc-500 leading-relaxed">{s.desc}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────── features bento ─────────────────────── */
function FeaturesBento() {
  return (
    <section className="py-32 border-t border-white/[0.04]">
      <div className="max-w-[1240px] mx-auto px-8">
        <FadeUp className="mb-16">
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-zinc-500 mb-4">Features</p>
          <h2 className="text-[56px] font-black tracking-[-0.045em] leading-[0.95] max-w-3xl">
            More than detection.<br />
            <span className="serif-italic font-normal text-zinc-400">we fix them too.</span>
          </h2>
        </FadeUp>

        <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
          {/* AI analysis — wide */}
          <FadeUp className="sm:col-span-4">
            <div className="bg-[#0a0a0e] border border-white/[0.06] rounded-2xl p-8 h-full overflow-hidden relative">
              <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(96,165,250,0.18), transparent 70%)' }} />
              <div className="relative">
                <div className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.18em] uppercase text-blue-300 mb-5">
                  <Brain size={11} />AI root cause
                </div>
                <h3 className="text-[28px] font-black tracking-[-0.03em] leading-tight mb-3">Understand exactly why tests flake.</h3>
                <p className="text-[14px] text-zinc-500 leading-relaxed mb-6 max-w-md">
                  Claude reads your failure logs and classifies the root cause — race condition, timing issue,
                  network dependency, or environmental drift. Not just &ldquo;this test is flaky.&rdquo;
                </p>
                <div className="rounded-xl bg-black/40 border border-white/[0.06] p-4 font-mono text-[12px] leading-relaxed">
                  <div className="text-zinc-600 mb-1.5"># claude on UserAuth › login with SSO</div>
                  <div className="text-zinc-300">
                    <span className="text-blue-300">→</span> race condition: cookie write
                    races with redirect on slow CI runners
                  </div>
                  <div className="text-zinc-300 mt-1">
                    <span className="text-blue-300">→</span> suggested fix: await{' '}
                    <span className="text-amber-300">page.waitForCookie</span>()
                    before <span className="text-amber-300">expect</span>(...)
                  </div>
                </div>
              </div>
            </div>
          </FadeUp>

          {/* Cost estimator */}
          <FadeUp delay={0.05} className="sm:col-span-2">
            <div className="bg-[#0a0a0e] border border-white/[0.06] rounded-2xl p-8 h-full flex flex-col">
              <div className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.18em] uppercase text-amber-300 mb-5">
                <DollarSign size={11} />Cost estimator
              </div>
              <h3 className="text-[24px] font-black tracking-[-0.03em] leading-tight mb-3">Dollar cost per test.</h3>
              <p className="text-[13px] text-zinc-500 leading-relaxed flex-1">
                Annual CI-minute cost per flake. Filter by cost and tackle the $10k/yr tests first.
              </p>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-[42px] font-black tracking-[-0.04em] text-amber-300 tabular-nums">$18.2k</span>
                <span className="font-mono text-[11px] text-zinc-600">/ year</span>
              </div>
              <div className="font-mono text-[10px] text-zinc-600 mt-1">top offender</div>
            </div>
          </FadeUp>

          {/* Auto quarantine */}
          <FadeUp delay={0.1} className="sm:col-span-3">
            <div className="bg-[#0a0a0e] border border-white/[0.06] rounded-2xl p-8 h-full">
              <div className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.18em] uppercase text-green-300 mb-5">
                <GitPullRequest size={11} />Auto-quarantine
              </div>
              <h3 className="text-[24px] font-black tracking-[-0.03em] leading-tight mb-3">PRs opened for you.</h3>
              <p className="text-[13px] text-zinc-500 leading-relaxed mb-5">
                When a test crosses your flakiness threshold, Keel opens a GitHub PR that quarantines it —
                unblocking deploys while your team fixes the root cause.
              </p>
              <div className="rounded-lg border border-white/[0.06] bg-black/30 p-3 flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-green-500/15 flex items-center justify-center">
                  <GitPullRequest size={11} className="text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-[12px] text-zinc-300 truncate">chore(test): quarantine UserAuth › SSO</div>
                  <div className="font-mono text-[10px] text-zinc-600">#428 · opened by keel-bot · 2m ago</div>
                </div>
                <span className="font-mono text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded">OPEN</span>
              </div>
            </div>
          </FadeUp>

          {/* 2-min setup */}
          <FadeUp delay={0.15} className="sm:col-span-3">
            <div className="bg-[#0a0a0e] border border-white/[0.06] rounded-2xl p-8 h-full">
              <div className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.18em] uppercase text-zinc-300 mb-5">
                <Zap size={11} />2-minute setup
              </div>
              <h3 className="text-[24px] font-black tracking-[-0.03em] leading-tight mb-3">Any runner. Any language.</h3>
              <p className="text-[13px] text-zinc-500 leading-relaxed mb-5">
                One step in your existing workflow. No agent. No new infrastructure.
              </p>
              <div className="flex flex-wrap gap-2">
                {['Jest', 'Vitest', 'pytest', 'RSpec', 'Go test', 'JUnit', 'Cypress', 'Playwright'].map(t => (
                  <span key={t} className="font-mono text-[11px] px-2.5 py-1 rounded-md border border-white/[0.08] text-zinc-400">{t}</span>
                ))}
              </div>
            </div>
          </FadeUp>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────── comparison ─────────────────────── */
const COMPARISON = [
  { label: 'Flaky test detection',   bp: true,  keel: true },
  { label: 'Flakiness rate score',   bp: true,  keel: true },
  { label: 'Dollar cost per test',   bp: false, keel: true },
  { label: 'AI root cause analysis', bp: false, keel: true },
  { label: 'Auto-quarantine PR',     bp: false, keel: true },
  { label: 'Free tier',              bp: true,  keel: true },
  { label: 'Works with any runner',  bp: true,  keel: true },
]

function Comparison() {
  return (
    <section className="py-32 border-t border-white/[0.04]">
      <div className="max-w-3xl mx-auto px-8">
        <FadeUp className="mb-12 text-center">
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-zinc-500 mb-4">vs.</p>
          <h2 className="text-[64px] font-black tracking-[-0.045em] leading-[0.95] mb-5">
            Keel <span className="serif-italic font-normal text-zinc-500">vs</span> BuildPulse
          </h2>
          <p className="text-zinc-500 text-[15px]">Both detect flaky tests. Only one tells you why and fixes them.</p>
        </FadeUp>
        <FadeUp>
          <div className="border border-white/[0.08] rounded-2xl overflow-hidden">
            <div className="grid grid-cols-[1.4fr_1fr_1fr] bg-[#0a0a0e] border-b border-white/[0.06]">
              <div className="px-6 py-4 font-mono text-[10px] tracking-[0.18em] uppercase text-zinc-600">Feature</div>
              <div className="px-6 py-4 font-mono text-[10px] tracking-[0.18em] uppercase text-zinc-500 text-center">BuildPulse</div>
              <div className="px-6 py-4 font-mono text-[10px] tracking-[0.18em] uppercase text-blue-300 text-center">Keel</div>
            </div>
            {COMPARISON.map((row, i) => (
              <div key={i} className="grid grid-cols-[1.4fr_1fr_1fr] border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                <div className="px-6 py-4 text-[14px] text-zinc-300">{row.label}</div>
                <div className="px-6 py-4 flex justify-center items-center">
                  {row.bp ? <Check size={16} className="text-zinc-500" /> : <X size={16} className="text-zinc-800" />}
                </div>
                <div className={`px-6 py-4 flex justify-center items-center ${row.bp ? '' : 'bg-blue-500/[0.04]'}`}>
                  <Check size={16} className="text-green-400" />
                </div>
              </div>
            ))}
          </div>
        </FadeUp>
      </div>
    </section>
  )
}

/* ─────────────────────── pricing ─────────────────────── */
const PLANS = [
  { name: 'Starter', price: '0', period: '/mo', desc: 'Solo devs and small projects.', highlight: false,
    features: ['1 repo', 'Up to 500 tests', '14-day history', 'Flakiness dashboard', 'Email alerts'],
    cta: 'Start free', href: '/sign-up' },
  { name: 'Team', price: '199', period: '/mo', desc: 'Eliminate flakes across your team.', highlight: true,
    features: ['20 repos', 'Unlimited tests', '90-day history', 'AI root cause', 'Auto-quarantine PR', 'Cost estimator', 'Slack digest'],
    cta: 'Start 14-day trial', href: '/sign-up' },
  { name: 'Enterprise', price: '∞', period: '', desc: 'Large orgs, compliance needs.', highlight: false,
    features: ['Unlimited repos', 'SSO + audit logs', 'SOC2 Type II', 'SLA 99.9%', 'Dedicated support', 'Custom integrations'],
    cta: 'Talk to us', href: 'mailto:hi@trykeel.com' },
]

function Pricing() {
  return (
    <section id="pricing" className="py-32 border-t border-white/[0.04]">
      <div className="max-w-[1240px] mx-auto px-8">
        <FadeUp className="mb-16 text-center">
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-zinc-500 mb-4">Pricing</p>
          <h2 className="text-[64px] font-black tracking-[-0.045em] leading-[0.95] mb-5">
            Pay only when<br />
            <span className="serif-italic font-normal text-zinc-400">tests cost you money.</span>
          </h2>
          <p className="text-zinc-500 text-[15px]">Free for 1 repo. Forever.</p>
        </FadeUp>
        <div className="grid sm:grid-cols-3 gap-5 items-stretch">
          {PLANS.map((plan, i) => (
            <FadeUp key={plan.name} delay={i * 0.07}>
              <div className={`relative rounded-3xl border p-8 flex flex-col h-full ${
                plan.highlight
                  ? 'bg-gradient-to-br from-[#0f1a2e] to-[#0a0a0f] border-blue-500/40 shadow-[0_30px_120px_-30px_rgba(59,130,246,0.5)]'
                  : 'bg-[#0a0a0e] border-white/[0.08]'
              }`}>
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white font-mono text-[10px] font-semibold px-3 py-1 rounded-full tracking-[0.16em] uppercase">
                    Most popular
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-[22px] font-black tracking-tight mb-1.5">{plan.name}</h3>
                  <p className="text-zinc-500 text-[13px]">{plan.desc}</p>
                </div>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-[16px] text-zinc-500 self-start mt-3">$</span>
                  <span className="text-[64px] font-black tracking-[-0.05em] leading-none">{plan.price}</span>
                  {plan.period && <span className="text-zinc-500 text-[14px] font-mono">{plan.period}</span>}
                </div>
                <ul className="space-y-3 mb-8 flex-1 list-none p-0">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-[13px] text-zinc-300">
                      <Check size={13} className={plan.highlight ? 'text-blue-300 shrink-0' : 'text-green-400 shrink-0'} />{f}
                    </li>
                  ))}
                </ul>
                <Link href={plan.href} className={`block text-center py-3 rounded-full text-[13px] font-semibold transition-all tracking-tight ${
                  plan.highlight
                    ? 'bg-white text-black hover:bg-zinc-100'
                    : 'bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.08]'
                }`}>{plan.cta}</Link>
              </div>
            </FadeUp>
          ))}
        </div>
        <FadeUp className="text-center mt-10">
          <Link href="/calculator" className="inline-flex items-center gap-2 font-mono text-[12px] tracking-wide text-blue-400 hover:text-blue-300 transition-colors">
            ▸ calculate your flaky test cost
          </Link>
        </FadeUp>
      </div>
    </section>
  )
}

/* ─────────────────────── final cta ─────────────────────── */
function FinalCTA() {
  return (
    <section className="py-40 border-t border-white/[0.04] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(59,130,246,0.18), transparent 70%)'
      }} />
      <div className="absolute inset-0 grid-bg opacity-40"
        style={{ maskImage: 'radial-gradient(ellipse at 50% 50%, #000 30%, transparent 75%)',
                 WebkitMaskImage: 'radial-gradient(ellipse at 50% 50%, #000 30%, transparent 75%)' }} />
      <FadeUp className="relative max-w-4xl mx-auto px-8 text-center">
        <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-zinc-500 mb-6">Get started</p>
        <h2 className="text-[clamp(56px,9vw,128px)] font-black tracking-[-0.05em] leading-[0.9] mb-8">
          Stop the<br />
          <span className="serif-italic font-normal text-transparent bg-clip-text"
            style={{ backgroundImage: 'linear-gradient(120deg, #fff, #93c5fd 60%, #fff)' }}>
            bleeding.
          </span>
        </h2>
        <p className="text-zinc-400 text-[17px] mb-12 leading-relaxed max-w-md mx-auto">
          Install Keel in 2 minutes and see which tests are bleeding your team — for free.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/sign-up" className="inline-flex items-center gap-2 bg-white text-black font-semibold px-8 py-3.5 rounded-full hover:bg-zinc-100 transition-colors text-[14px]">
            Start free <ArrowRight size={15} />
          </Link>
          <Link href="mailto:hi@trykeel.com" className="text-[14px] text-zinc-400 hover:text-white transition-colors">
            or talk to a human →
          </Link>
        </div>
      </FadeUp>
    </section>
  )
}

/* ─────────────────────── footer ─────────────────────── */
function Footer() {
  return (
    <footer className="border-t border-white/[0.04] py-16 bg-[#06060a]">
      <div className="max-w-[1240px] mx-auto px-8">
        <div className="grid sm:grid-cols-[1.5fr_1fr_1fr_1fr] gap-12 mb-12">
          <div className="max-w-[280px]">
            <div className="flex items-baseline gap-2 mb-4">
              <span className="font-black text-[28px] tracking-[-0.06em]">Keel</span>
              <span className="font-mono text-[10px] tracking-[0.18em] text-zinc-600 uppercase">est. 2026</span>
            </div>
            <p className="text-zinc-500 text-[13px] leading-relaxed">
              AI-powered flaky test detection<br />for teams shipping every day.
            </p>
          </div>
          {([
            ['Product',   [['How it works','#how'],['Pricing','#pricing'],['Dashboard','/dashboard'],['Calculator','/calculator']]],
            ['Resources', [['Documentation','#'],['Changelog','#'],['Blog','#']]],
            ['Company',   [['GitHub','https://github.com/trykeel'],['Contact','mailto:hi@trykeel.com'],['Privacy','/privacy']]],
          ] as const).map(([title, links]) => (
            <div key={title}>
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-zinc-600 mb-5">{title}</div>
              <div className="flex flex-col gap-3 text-[13px] text-zinc-400">
                {links.map(([l, h]) => <Link key={l} href={h} className="hover:text-white transition-colors">{l}</Link>)}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-white/[0.04] pt-8 flex items-center justify-between flex-wrap gap-4">
          <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-zinc-600">© 2026 Keel · all rights reserved</span>
          <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-zinc-600">built to eliminate flaky tests</span>
        </div>
      </div>
    </footer>
  )
}

/* ─────────────────────── page ─────────────────────── */
export default function LandingPage() {
  return (
    <div className="min-h-screen relative bg-[#07070a] text-white">
      <Nav />
      <Hero />
      <FlakeMarquee />
      <SetupSection />
      <DashboardPreview />
      <StatsWall />
      <HowItWorks />
      <FeaturesBento />
      <Comparison />
      <Pricing />
      <FinalCTA />
      <Footer />
    </div>
  )
}
