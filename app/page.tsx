'use client'

import type { ReactNode } from 'react'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'motion/react'
import {
  Check, X, ChevronRight, ArrowRight, Zap, Brain, DollarSign,
  GitPullRequest, TrendingUp, Shield, BookOpen, ScrollText,
  Github, FileText, Users, Mail, ChevronDown,
} from 'lucide-react'

/* ─────────────────────── animation helper ─────────────────────── */
function FadeUp({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.55, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ─────────────────────── nav data ─────────────────────── */
const NAV_MENUS = [
  {
    label: 'Features',
    items: [
      { icon: TrendingUp, label: 'Flaky test detection', desc: 'Find non-deterministic tests across all CI runs' },
      { icon: Brain,      label: 'AI root cause analysis', desc: 'Claude explains exactly why each test flakes' },
      { icon: DollarSign, label: 'Cost estimator', desc: 'Annual CI-minute cost per flaky test, in dollars' },
      { icon: GitPullRequest, label: 'Auto-quarantine PR', desc: 'Fix PRs opened automatically when threshold crossed' },
    ],
  },
  {
    label: 'Resources',
    items: [
      { icon: BookOpen,   label: 'Documentation', desc: 'Setup guides, API reference, examples' },
      { icon: Github,     label: 'GitHub', desc: 'Open-source keel-action and examples' },
      { icon: ScrollText, label: 'Changelog', desc: "What's new in Keel" },
      { icon: FileText,   label: 'Blog', desc: 'Team updates and deep-dives' },
    ],
  },
  {
    label: 'Company',
    items: [
      { icon: Users, label: 'About', desc: 'Who we are and why we built Keel' },
      { icon: Mail,  label: 'Contact', desc: 'Get in touch with the team' },
    ],
  },
]

/* ─────────────────────── nav dropdown ─────────────────────── */
function NavDropdown({ label, items }: { label: string; items: typeof NAV_MENUS[0]['items'] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = () => { if (timer.current) clearTimeout(timer.current); setOpen(true) }
  const hide = () => { timer.current = setTimeout(() => setOpen(false), 120) }

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  return (
    <div ref={ref} onMouseEnter={show} onMouseLeave={hide} className="relative">
      <button
        className={`flex items-center gap-1 text-sm transition-colors py-1 ${open ? 'text-white' : 'text-zinc-400 hover:text-white'}`}
      >
        {label}
        <ChevronDown size={13} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-72 bg-[#111] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden z-50"
          >
            <div className="p-2">
              {items.map((item) => (
                <Link
                  key={item.label}
                  href="#"
                  className="flex items-start gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.06] transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-blue-500/10 transition-colors">
                    <item.icon size={14} className="text-zinc-400 group-hover:text-blue-400 transition-colors" />
                  </div>
                  <div>
                    <div className="text-sm text-white font-medium leading-tight">{item.label}</div>
                    <div className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{item.desc}</div>
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

/* ─────────────────────── page data ─────────────────────── */
const FEATURES = [
  {
    icon: Brain,
    tag: 'AI Analysis',
    title: 'Understand exactly why tests flake',
    desc: 'Claude reads your failure logs and classifies the root cause — race condition, timing issue, network dependency, or environmental drift. Not just "this test is flaky."',
  },
  {
    icon: DollarSign,
    tag: 'Cost Estimator',
    title: 'Put a dollar value on every flaky test',
    desc: 'Keel calculates the annual cost of each failing test in wasted CI minutes. Filter by cost and tackle the $10,000/year tests first.',
  },
  {
    icon: GitPullRequest,
    tag: 'Auto-Fix',
    title: 'Quarantine PRs opened automatically',
    desc: 'When a test crosses your flakiness threshold, Keel opens a GitHub PR that quarantines it — unblocking deploys while your team addresses the root cause.',
  },
  {
    icon: Zap,
    tag: '2-min setup',
    title: 'One line. Works with any test runner.',
    desc: 'Add one step to your existing GitHub Actions workflow. No agent, no new infrastructure. Works with Jest, pytest, RSpec, Go test — anything.',
  },
]

const COMPARISON = [
  { label: 'Flaky test detection',    bp: true,  keel: true },
  { label: 'Flakiness rate score',    bp: true,  keel: true },
  { label: 'Dollar cost per test',    bp: false, keel: true },
  { label: 'AI root cause analysis',  bp: false, keel: true },
  { label: 'Auto-quarantine PR',      bp: false, keel: true },
  { label: 'Free tier',               bp: true,  keel: true },
  { label: 'Works with any runner',   bp: true,  keel: true },
]

const PLANS = [
  {
    name: 'Starter', price: '$0', period: '/mo',
    desc: 'For solo devs and small projects.',
    highlight: false,
    features: ['1 repo', 'Up to 500 tests', '14-day history', 'Flakiness dashboard', 'Email alerts'],
    cta: 'Start free', href: '/signup',
  },
  {
    name: 'Team', price: '$199', period: '/mo',
    desc: 'Eliminate flaky tests across your team.',
    highlight: true,
    features: ['20 repos', 'Unlimited tests', '90-day history', 'AI root cause analysis', 'Auto-quarantine PR', 'Cost estimator', 'Slack digest'],
    cta: 'Start 14-day trial', href: '/signup',
  },
  {
    name: 'Enterprise', price: 'Custom', period: '',
    desc: 'For large orgs with compliance needs.',
    highlight: false,
    features: ['Unlimited repos', 'SSO + audit logs', 'SOC2 Type II', 'SLA 99.9%', 'Dedicated support', 'Custom integrations'],
    cta: 'Talk to us', href: 'mailto:hi@trykeel.com',
  },
]

const FAKE_TESTS = [
  { name: 'UserAuth › login with SSO',   rate: 34, cost: 18200, sev: 'high' },
  { name: 'Checkout › payment timeout',  rate: 21, cost: 11400, sev: 'high' },
  { name: 'API › rate limit retry',      rate: 12, cost:  6500, sev: 'med'  },
  { name: 'Email › delivery webhook',    rate:  7, cost:  3800, sev: 'low'  },
  { name: 'Reports › PDF generation',    rate:  4, cost:  2100, sev: 'low'  },
]

/* ─────────────────────── dashboard mockup ─────────────────────── */
function DashboardMockup() {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0a0a0a] overflow-hidden shadow-[0_0_120px_rgba(59,130,246,0.07)]">
      {/* browser chrome */}
      <div className="flex items-center gap-2 px-4 py-3 bg-[#111] border-b border-white/[0.06]">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
          <div className="w-3 h-3 rounded-full bg-[#28C840]" />
        </div>
        <div className="flex-1 mx-4 bg-[#1a1a1a] rounded py-1 px-3 text-[11px] text-zinc-600 font-mono text-center">
          app.trykeel.com/dashboard
        </div>
      </div>

      {/* app body */}
      <div className="flex" style={{ height: 340 }}>
        {/* sidebar */}
        <div className="w-44 bg-[#0d0d0d] border-r border-white/[0.05] p-3 flex flex-col gap-1 shrink-0">
          <div className="text-white font-extrabold text-base tracking-tighter px-2 py-2 mb-2">Keel</div>
          <div className="px-2 py-1.5 rounded-md bg-blue-500/10 text-blue-400 text-xs font-medium">Dashboard</div>
          <div className="px-2 py-1.5 text-zinc-600 text-xs">Tests</div>
          <div className="px-2 py-1.5 text-zinc-600 text-xs">Settings</div>
          <div className="mt-auto pt-3 border-t border-white/[0.04]">
            <div className="text-zinc-700 text-[10px] truncate">acme-corp / api-service</div>
          </div>
        </div>

        {/* main content */}
        <div className="flex-1 p-5 overflow-hidden flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { label: 'Flaky tests',  val: '5',       color: 'text-red-400'   },
              { label: 'Tracked',      val: '1,284',    color: 'text-blue-400'  },
              { label: 'Annual cost',  val: '$42,000',  color: 'text-amber-400' },
            ].map(c => (
              <div key={c.label} className="bg-[#111] border border-white/[0.05] rounded-xl p-3">
                <div className="text-zinc-600 text-[10px] mb-1.5 uppercase tracking-wider">{c.label}</div>
                <div className={`text-lg font-bold ${c.color}`}>{c.val}</div>
              </div>
            ))}
          </div>

          <div className="bg-[#111] border border-white/[0.05] rounded-xl overflow-hidden flex-1">
            <div className="px-4 py-2.5 border-b border-white/[0.05] flex items-center justify-between">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Flaky tests — sorted by cost</span>
              <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">5 flaky</span>
            </div>
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  <th className="px-4 py-2 text-left text-zinc-600 font-normal">Test name</th>
                  <th className="px-4 py-2 text-left text-zinc-600 font-normal">Rate</th>
                  <th className="px-4 py-2 text-left text-zinc-600 font-normal">Cost / yr</th>
                </tr>
              </thead>
              <tbody>
                {FAKE_TESTS.map((t, i) => (
                  <tr key={i} className="border-t border-white/[0.03]">
                    <td className="px-4 py-2 text-zinc-300 font-mono truncate max-w-[180px]">{t.name}</td>
                    <td className="px-4 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        t.sev === 'high' ? 'bg-red-500/10 text-red-400'
                          : t.sev === 'med' ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-green-500/10 text-green-400'
                      }`}>{t.rate}%</span>
                    </td>
                    <td className="px-4 py-2 text-amber-400 font-semibold">${t.cost.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────── page ─────────────────────── */
export default function LandingPage() {
  return (
    <div className="bg-black text-white antialiased min-h-screen">

      {/* ── NAV ── */}
      <nav className="fixed top-0 inset-x-0 z-50 h-14 flex items-center border-b border-white/[0.06] bg-black/75 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 w-full flex items-center justify-between gap-8">

          {/* logo */}
          <Link href="/" className="font-extrabold text-2xl tracking-tighter shrink-0">Keel</Link>

          {/* center nav */}
          <div className="hidden md:flex items-center gap-6">
            {NAV_MENUS.map(m => (
              <NavDropdown key={m.label} label={m.label} items={m.items} />
            ))}
            <Link href="#pricing" className="text-sm text-zinc-400 hover:text-white transition-colors">Pricing</Link>
          </div>

          {/* right CTA */}
          <div className="flex items-center gap-3 shrink-0">
            <Link href="https://github.com/trykeel" className="hidden md:flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors">
              <Github size={15} />
              GitHub
            </Link>
            <Link href="/login" className="text-sm text-zinc-400 hover:text-white transition-colors hidden md:block">
              Sign in
            </Link>
            <Link href="/signup"
              className="text-sm bg-white text-black font-semibold px-4 py-1.5 rounded-lg hover:bg-zinc-100 transition-colors">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative pt-36 pb-20 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 flex items-start justify-center overflow-hidden">
          <div className="w-[900px] h-[600px] bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.13)_0%,transparent_65%)] shrink-0" />
        </div>

        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <span className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/[0.1] rounded-full px-3.5 py-1 text-xs text-zinc-400 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
              AI-powered flaky test detection for GitHub Actions
              <ChevronRight size={12} className="text-zinc-600" />
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.07, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="text-6xl sm:text-7xl font-extrabold tracking-[-0.04em] leading-[1.03] mb-6"
          >
            Stop flaky tests from<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-400">
              stealing $200k a year.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg text-zinc-400 max-w-[480px] mx-auto mb-9 leading-relaxed"
          >
            Keel detects flaky tests, uses AI to explain exactly why they fail,
            and automatically opens the fix PR — in 2 minutes.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.28 }}
            className="flex items-center justify-center gap-3 flex-wrap mb-4"
          >
            <Link href="/signup"
              className="inline-flex items-center gap-2 bg-white text-black font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-zinc-100 transition-colors">
              Start for free <ArrowRight size={14} />
            </Link>
            <Link href="https://github.com/trykeel/keel-action"
              className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/[0.1] text-white font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-white/[0.1] transition-colors">
              View on GitHub <Github size={14} />
            </Link>
          </motion.div>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.38 }}
            className="text-xs text-zinc-600">
            Free for 1 repo · No credit card required
          </motion.p>
        </div>
      </section>

      {/* ── CODE BLOCK ── */}
      <section className="pb-28">
        <div className="max-w-xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.44 }}
          >
            <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d0d] overflow-hidden shadow-[0_0_80px_rgba(59,130,246,0.07)]">
              <div className="flex items-center gap-2 px-4 py-3 bg-[#131313] border-b border-white/[0.06]">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                </div>
                <span className="text-[11px] text-zinc-600 font-mono ml-2">.github/workflows/ci.yml</span>
              </div>
              <pre className="p-6 text-sm leading-7 font-mono overflow-x-auto">
                <span className="text-zinc-700">{'# paste after your test step\n'}</span>
                <span className="text-zinc-500">{'- '}</span>
                <span className="text-blue-300">uses</span>
                <span className="text-zinc-300">{': trykeel/keel-action@v1\n'}</span>
                <span className="text-zinc-500">{'  '}</span>
                <span className="text-blue-300">if</span>
                <span className="text-zinc-300">{': always()\n'}</span>
                <span className="text-zinc-500">{'  '}</span>
                <span className="text-blue-300">with</span>
                <span className="text-zinc-300">{':\n'}</span>
                <span className="text-zinc-500">{'    '}</span>
                <span className="text-green-300">api-key</span>
                <span className="text-zinc-300">{': '}</span>
                <span className="text-amber-300">{'${{ secrets.KEEL_API_KEY }}'}</span>
              </pre>
              <div className="px-5 py-3 border-t border-white/[0.06] bg-[#131313] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <span className="text-[11px] text-zinc-600">Keel starts detecting flaky tests on your next CI run.</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── DASHBOARD PREVIEW ── */}
      <section className="py-28 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto px-6">
          <FadeUp className="text-center mb-14">
            <p className="text-xs font-medium text-zinc-600 uppercase tracking-widest mb-4">Dashboard</p>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-[-0.03em] mb-5">
              Everything flaky — in one place.
            </h2>
            <p className="text-zinc-500 max-w-md mx-auto text-base leading-relaxed">
              Tests sorted by dollar cost. See which ones are bleeding your budget most,
              with AI analysis one click away.
            </p>
          </FadeUp>
          <FadeUp delay={0.1}><DashboardMockup /></FadeUp>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="py-28 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto px-6">
          <FadeUp className="text-center mb-16">
            <p className="text-xs font-medium text-zinc-600 uppercase tracking-widest mb-4">Setup</p>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-[-0.03em] mb-5">Up and running in minutes.</h2>
            <p className="text-zinc-500 text-base">No agent. No infrastructure. One workflow change.</p>
          </FadeUp>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { n: '01', title: 'Add one step to CI', desc: 'Paste one block into your GitHub Actions workflow. Works with Jest, pytest, RSpec, Go test — any runner.' },
              { n: '02', title: 'Keel tracks every run', desc: "Every result is stored. Keel scores flakiness across commits — flagging tests that pass on one run but fail on another with the same code." },
              { n: '03', title: 'AI explains. Keel fixes.', desc: 'Get a plain-English root cause. Keel opens a quarantine PR so deploys keep moving while your team fixes it.' },
            ].map((s, i) => (
              <FadeUp key={s.n} delay={i * 0.08}>
                <div className="bg-[#0d0d0d] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-7 h-full transition-colors">
                  <div className="text-xs font-mono text-zinc-700 mb-5 tracking-widest">{s.n}</div>
                  <h3 className="text-base font-semibold mb-3 tracking-tight">{s.title}</h3>
                  <p className="text-zinc-500 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-28 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto px-6">
          <FadeUp className="text-center mb-16">
            <p className="text-xs font-medium text-zinc-600 uppercase tracking-widest mb-4">Features</p>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-[-0.03em] mb-5">More than flaky test detection.</h2>
            <p className="text-zinc-500 text-base max-w-sm mx-auto">
              BuildPulse tells you which tests are flaky. Keel tells you why — and fixes them.
            </p>
          </FadeUp>
          <div className="grid sm:grid-cols-2 gap-4">
            {FEATURES.map((f, i) => (
              <FadeUp key={f.title} delay={i * 0.06}>
                <div className="bg-[#0d0d0d] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-7 h-full transition-colors">
                  <div className="inline-flex items-center gap-1.5 bg-blue-500/10 text-blue-400 text-xs font-medium px-2.5 py-1 rounded-full mb-5">
                    <f.icon size={11} />{f.tag}
                  </div>
                  <h3 className="text-base font-semibold mb-2.5 tracking-tight">{f.title}</h3>
                  <p className="text-zinc-500 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPARISON ── */}
      <section className="py-28 border-t border-white/[0.04]">
        <div className="max-w-3xl mx-auto px-6">
          <FadeUp className="text-center mb-12">
            <p className="text-xs font-medium text-zinc-600 uppercase tracking-widest mb-4">Comparison</p>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-[-0.03em] mb-5">Keel vs BuildPulse</h2>
            <p className="text-zinc-500 text-base">Both detect flaky tests. Only one tells you why and fixes them.</p>
          </FadeUp>
          <FadeUp>
            <div className="border border-white/[0.06] rounded-2xl overflow-hidden">
              <div className="grid grid-cols-3 bg-[#0d0d0d] border-b border-white/[0.06]">
                <div className="px-6 py-4 text-sm font-medium text-zinc-600">Feature</div>
                <div className="px-6 py-4 text-sm font-medium text-zinc-500 text-center">BuildPulse</div>
                <div className="px-6 py-4 text-sm font-semibold text-blue-400 text-center">Keel</div>
              </div>
              {COMPARISON.map((row, i) => (
                <div key={i} className={`grid grid-cols-3 border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors ${i % 2 !== 0 ? 'bg-white/[0.01]' : ''}`}>
                  <div className="px-6 py-4 text-sm text-zinc-300">{row.label}</div>
                  <div className="px-6 py-4 flex justify-center items-center">
                    {row.bp ? <Check size={15} className="text-zinc-500" /> : <X size={15} className="text-zinc-800" />}
                  </div>
                  <div className="px-6 py-4 flex justify-center items-center">
                    <Check size={15} className="text-green-400" />
                  </div>
                </div>
              ))}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-28 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto px-6">
          <FadeUp className="text-center mb-16">
            <p className="text-xs font-medium text-zinc-600 uppercase tracking-widest mb-4">Pricing</p>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-[-0.03em] mb-5">Simple pricing.</h2>
            <p className="text-zinc-500 text-base">Start free. Upgrade when your tests start costing you money.</p>
          </FadeUp>
          <div className="grid sm:grid-cols-3 gap-4">
            {PLANS.map((plan, i) => (
              <FadeUp key={plan.name} delay={i * 0.07}>
                <div className={`relative rounded-2xl border p-7 flex flex-col h-full ${plan.highlight ? 'bg-[#0c1728] border-blue-500/40' : 'bg-[#0d0d0d] border-white/[0.06]'}`}>
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[11px] font-semibold px-3 py-0.5 rounded-full whitespace-nowrap">
                      Most popular
                    </div>
                  )}
                  <div className="mb-5">
                    <h3 className="text-sm font-semibold mb-1">{plan.name}</h3>
                    <p className="text-zinc-600 text-xs">{plan.desc}</p>
                  </div>
                  <div className="flex items-baseline gap-1 mb-7">
                    <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                    {plan.period && <span className="text-zinc-500 text-sm">{plan.period}</span>}
                  </div>
                  <ul className="space-y-2.5 mb-8 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2.5 text-xs text-zinc-400">
                        <Check size={12} className="text-green-400 shrink-0" />{f}
                      </li>
                    ))}
                  </ul>
                  <Link href={plan.href} className={`block text-center py-2.5 rounded-xl text-sm font-semibold transition-colors ${plan.highlight ? 'bg-blue-500 hover:bg-blue-400 text-white' : 'bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.08]'}`}>
                    {plan.cta}
                  </Link>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-28 border-t border-white/[0.04]">
        <FadeUp className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-5xl sm:text-6xl font-extrabold tracking-[-0.04em] leading-[1.05] mb-6">
            Stop the bleeding.<br />Start today.
          </h2>
          <p className="text-zinc-400 text-base mb-10 leading-relaxed max-w-md mx-auto">
            Install Keel in 2 minutes and see which tests are costing your team the most — for free.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/signup" className="inline-flex items-center gap-2 bg-white text-black font-semibold px-8 py-3 rounded-xl hover:bg-zinc-100 transition-colors">
              Start for free <ArrowRight size={15} />
            </Link>
            <Link href="mailto:hi@trykeel.com" className="text-sm text-zinc-500 hover:text-white transition-colors">
              or talk to us →
            </Link>
          </div>
        </FadeUp>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/[0.04] py-14">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-12 mb-12">
            <div className="max-w-[200px]">
              <div className="font-extrabold text-2xl tracking-tighter mb-3">Keel</div>
              <p className="text-zinc-600 text-sm leading-relaxed">
                AI-powered flaky test detection for GitHub Actions teams.
              </p>
            </div>
            <div className="flex flex-wrap gap-12">
              <div>
                <div className="text-[11px] font-medium text-zinc-600 uppercase tracking-widest mb-4">Product</div>
                <div className="flex flex-col gap-3 text-sm text-zinc-500">
                  <Link href="#how" className="hover:text-white transition-colors">How it works</Link>
                  <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
                  <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
                </div>
              </div>
              <div>
                <div className="text-[11px] font-medium text-zinc-600 uppercase tracking-widest mb-4">Resources</div>
                <div className="flex flex-col gap-3 text-sm text-zinc-500">
                  <Link href="#" className="hover:text-white transition-colors">Documentation</Link>
                  <Link href="#" className="hover:text-white transition-colors">Changelog</Link>
                  <Link href="#" className="hover:text-white transition-colors">Blog</Link>
                </div>
              </div>
              <div>
                <div className="text-[11px] font-medium text-zinc-600 uppercase tracking-widest mb-4">Company</div>
                <div className="flex flex-col gap-3 text-sm text-zinc-500">
                  <Link href="https://github.com/trykeel" className="hover:text-white transition-colors">GitHub</Link>
                  <Link href="mailto:hi@trykeel.com" className="hover:text-white transition-colors">Contact</Link>
                  <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-white/[0.04] pt-7 flex items-center justify-between">
            <span className="text-xs text-zinc-700">© 2026 Keel. All rights reserved.</span>
            <span className="text-xs text-zinc-700">Built to eliminate flaky tests.</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
