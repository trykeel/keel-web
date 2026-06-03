'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useClerk, useUser } from '@clerk/nextjs'
import {
  LayoutDashboard, TrendingUp, DollarSign, Settings, Key,
  ChevronsLeft, ChevronDown, ChevronRight, LogOut, Search,
  Sparkles, Check, Zap, Loader2,
} from 'lucide-react'
import { Sparkline, DonutGauge, HealthRings, Heatmap, TrendsChart, type HeatCell } from './charts'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

/* ────────── types ────────── */
type TestRow = {
  testName: string
  filePath: string
  flakinessRate: number
  totalRuns: number
  estimatedCostUsd: number
  lastFailedAt: string | null
  hasAnalysis: boolean
}

/* ────────── mock fallback ────────── */
const MOCK_TESTS: TestRow[] = [
  { testName: 'UserAuth › login with SSO',   filePath: 'backend/api/auth/sso.test.ts',     flakinessRate: 0.34, totalRuns: 412, estimatedCostUsd: 18200, lastFailedAt: '2026-05-29T12:04:00Z', hasAnalysis: true },
  { testName: 'Checkout › payment timeout',  filePath: 'backend/checkout/payment.test.ts', flakinessRate: 0.33, totalRuns: 388, estimatedCostUsd: 11400, lastFailedAt: '2026-05-28T19:00:00Z', hasAnalysis: true },
  { testName: 'API › rate limit retry',      filePath: 'backend/api/ratelimit.test.ts',    flakinessRate: 0.10, totalRuns: 521, estimatedCostUsd:  6500, lastFailedAt: '2026-05-27T10:10:00Z', hasAnalysis: true },
  { testName: 'Email › delivery webhook',    filePath: 'backend/email/webhook.test.ts',    flakinessRate: 0.13, totalRuns: 277, estimatedCostUsd:  3800, lastFailedAt: '2026-05-26T19:00:00Z', hasAnalysis: false },
  { testName: 'Reports › PDF generation',    filePath: 'backend/reports/pdf.test.ts',      flakinessRate: 0.24, totalRuns: 198, estimatedCostUsd:  9100, lastFailedAt: '2026-05-25T07:30:00Z', hasAnalysis: false },
  { testName: 'Sync › realtime stream',      filePath: 'backend/sync/stream.test.ts',      flakinessRate: 0.26, totalRuns: 164, estimatedCostUsd:  7300, lastFailedAt: '2026-05-24T19:30:00Z', hasAnalysis: false },
  { testName: 'Search › fuzzy match',        filePath: 'backend/search/fuzzy.test.ts',     flakinessRate: 0.08, totalRuns: 142, estimatedCostUsd:  2100, lastFailedAt: '2026-05-20T09:12:00Z', hasAnalysis: true },
  { testName: 'Billing › invoice generator', filePath: 'backend/billing/invoice.test.ts',  flakinessRate: 0.04, totalRuns: 109, estimatedCostUsd:  1200, lastFailedAt: '2026-05-18T14:00:00Z', hasAnalysis: false },
]

const SPARK = [12, 18, 14, 22, 19, 28, 24, 33, 27, 38, 31, 44, 36, 48, 41, 52, 47, 58, 51, 62]

const HEAT: HeatCell[] = (() => {
  const seq: HeatCell[] = []
  for (let i = 0; i < 56; i++) {
    if (i < 14) seq.push(Math.random() < 0.75 ? 'high' : 'med')
    else if (i < 26) seq.push((['high', 'med', 'med', 'low'] as HeatCell[])[Math.floor(Math.random() * 4)])
    else if (i < 46) seq.push((['med', 'low', 'low', 'low'] as HeatCell[])[Math.floor(Math.random() * 4)])
    else seq.push(Math.random() < 0.5 ? 'low' : 'none')
  }
  return seq
})()

const RECO = [
  { strong: 'UserAuth › login with SSO', rest: ' — add waitForSelector before asserting (34% flaky)', done: false },
  { strong: 'Quarantine', rest: ' Checkout › payment timeout to unblock 3 stuck deploys', done: false },
  { strong: 'Resolved', rest: ' Search › fuzzy match is now stable across 40 runs', done: true },
  { strong: 'Review', rest: ' Reports › PDF generation — cost up 18% week-over-week', done: false },
]

const TREND: Record<string, { health: number[]; cost: number[] }> = {
  '7d':  { health: [88, 86, 90, 87, 91, 93, 94], cost: [40, 44, 39, 47, 42, 38, 36] },
  '30d': { health: [72, 70, 75, 73, 78, 76, 80, 79, 83, 81, 85, 84, 88, 90, 94], cost: [62, 58, 60, 55, 57, 52, 54, 49, 51, 46, 48, 43, 41, 38, 36] },
  '90d': { health: [55, 60, 58, 64, 62, 68, 66, 72, 70, 76, 80, 84, 88, 92, 94], cost: [85, 80, 82, 76, 78, 70, 66, 60, 58, 52, 48, 44, 40, 38, 36] },
}

/* ────────── helpers ────────── */
function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function rateTone(r: number) {
  if (r >= 25) return { bar: 'bg-red-500', text: 'text-red-400', row: 'bg-red-500/[0.04]' }
  if (r >= 12) return { bar: 'bg-amber-500', text: 'text-amber-400', row: '' }
  return { bar: 'bg-emerald-500', text: 'text-emerald-400', row: '' }
}

/* ────────── sidebar ────────── */
const TRIAL_MS = 14 * 24 * 60 * 60 * 1000

function trialDaysLeft(trialStartedAt: string | undefined): number | null {
  if (!trialStartedAt) return null
  const end = new Date(new Date(trialStartedAt).getTime() + TRIAL_MS)
  const ms = end.getTime() - Date.now()
  return ms > 0 ? Math.ceil(ms / (24 * 60 * 60 * 1000)) : 0
}

function Sidebar() {
  const { user } = useUser()
  const [upgrading, setUpgrading] = useState(false)

  const meta = user?.publicMetadata as { plan?: string; trialStartedAt?: string } | undefined
  const plan = meta?.plan === 'team' ? 'team' : 'starter'
  const daysLeft = plan !== 'team' ? trialDaysLeft(meta?.trialStartedAt) : null

  async function handleUpgrade() {
    const orgId = localStorage.getItem('keelOrgId')
    if (!orgId) return
    setUpgrading(true)
    try {
      const res = await fetch(`${API_URL}/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, email: user?.primaryEmailAddress?.emailAddress ?? '' }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      setUpgrading(false)
    }
  }

  const items = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', active: true },
    { icon: TrendingUp, label: 'Tests', href: '#' },
    { icon: DollarSign, label: 'Costs', href: '#' },
    { icon: Settings, label: 'Settings', href: '#' },
  ]
  return (
    <aside className="w-[212px] shrink-0 bg-[#0a0a0e] border-r border-white/[0.06] flex flex-col">
      <div className="flex items-center justify-between px-5 h-16 border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center font-black text-blue-300 text-[15px]">K</span>
          <span className="font-black text-[19px] tracking-[-0.05em]">Keel</span>
        </Link>
        <ChevronsLeft size={15} className="text-zinc-600 hover:text-zinc-300 cursor-pointer transition-colors" />
      </div>
      <nav className="flex-1 p-3 flex flex-col gap-1">
        {items.map(it => (
          <Link key={it.label} href={it.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-mono text-[11px] tracking-[0.12em] uppercase transition-colors ${
              it.active ? 'bg-blue-500/10 text-blue-300' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
            }`}>
            <it.icon size={15} />{it.label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-white/[0.05] flex flex-col gap-3">
        <Link href="#" className="flex items-center gap-2 font-mono text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors">
          <Key size={13} />Manage API keys
        </Link>
        {plan === 'team' ? (
          <span className="font-mono text-[9px] tracking-[0.18em] uppercase text-blue-300 border border-blue-500/30 bg-blue-500/10 rounded-full px-2.5 py-1 w-fit">★ Team</span>
        ) : (
          <>
            {daysLeft !== null && (
              <div className={`rounded-lg px-3 py-2 text-[11px] font-mono border ${
                daysLeft <= 3
                  ? 'bg-amber-500/10 border-amber-500/25 text-amber-400'
                  : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
              }`}>
                {daysLeft === 0
                  ? 'Trial expired'
                  : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left in trial`}
              </div>
            )}
            <button
              onClick={handleUpgrade}
              disabled={upgrading}
              className="flex items-center justify-center gap-1.5 w-full rounded-lg py-2 text-[11px] font-semibold text-white disabled:opacity-60 transition-opacity"
              style={{ background: 'linear-gradient(120deg, rgba(59,130,246,0.85), rgba(139,92,246,0.85))' }}
            >
              {upgrading
                ? <><Loader2 size={11} className="animate-spin" />Redirecting…</>
                : <><Zap size={11} />Upgrade to Team</>
              }
            </button>
          </>
        )}
      </div>
    </aside>
  )
}

function TopBar({ orgName, repoName }: { orgName: string; repoName: string }) {
  const { signOut } = useClerk()
  const { user } = useUser()
  return (
    <div className="h-16 shrink-0 border-b border-white/[0.06] flex items-center justify-between px-7 bg-[#08080b]">
      <div />
      <div className="flex items-center gap-2 font-mono text-[12px] bg-[#101016] border border-white/[0.08] rounded-lg px-3.5 py-1.5">
        <span className="text-zinc-400">{orgName}</span>
        <span className="text-zinc-700">/</span>
        <span className="text-white font-medium">{repoName}</span>
        <ChevronDown size={12} className="text-zinc-600 ml-1" />
      </div>
      <div className="flex items-center gap-4">
        {user?.imageUrl
          ? <img src={user.imageUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
          : <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500" />
        }
        <button
          onClick={() => signOut({ redirectUrl: '/' })}
          className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <LogOut size={13} />Sign out
        </button>
      </div>
    </div>
  )
}

function StatCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-white/[0.07] bg-[#0c0c11] p-5">{children}</div>
}

function StatsRow({ tests }: { tests: TestRow[] }) {
  const flaky = tests.filter(t => t.flakinessRate > 0.05).length
  const totalCost = tests.reduce((s, t) => s + t.estimatedCostUsd, 0)
  return (
    <div className="grid grid-cols-3 gap-4">
      <StatCard>
        <div className="flex items-start justify-between">
          <div>
            <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-zinc-500 mb-2">Flaky tests</div>
            <span className="text-[44px] font-black tracking-[-0.05em] leading-none text-red-400">{flaky}</span>
            <div className="font-mono text-[11px] text-zinc-600 mt-1.5">of {tests.length} tracked</div>
          </div>
          <div className="mt-1"><Sparkline data={SPARK} /></div>
        </div>
      </StatCard>

      <StatCard>
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-zinc-500 mb-2">Wasted per year</div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[40px] font-black tracking-[-0.05em] leading-none text-amber-300 tabular-nums">${Math.round(totalCost).toLocaleString()}</div>
            <div className="font-mono text-[11px] text-zinc-600 mt-1.5">of cloud budget</div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <DonutGauge value={12} />
            <span className="font-mono text-[9px] text-zinc-600 uppercase tracking-wide">wasted</span>
          </div>
        </div>
      </StatCard>

      <StatCard>
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-zinc-500 mb-2">Health score</div>
        <div className="flex items-center gap-4">
          <HealthRings rings={[
            { value: 96, color: '#34d399' },
            { value: 92, color: '#60a5fa' },
            { value: 89, color: '#f87171' },
          ]} />
          <div className="flex flex-col gap-2">
            {([['Frontend', 96, '#34d399'], ['Backend', 92, '#60a5fa'], ['Core', 89, '#f87171']] as const).map(([l, v, c]) => (
              <div key={l} className="flex items-center gap-2 font-mono text-[11px]">
                <span className="w-2 h-2 rounded-full" style={{ background: c }} />
                <span className="text-zinc-400">{l}</span>
                <span className="text-zinc-200 ml-auto tabular-nums">{v}%</span>
              </div>
            ))}
          </div>
        </div>
      </StatCard>
    </div>
  )
}

function Tabs() {
  const [active, setActive] = useState('flaky')
  const tabs: [string, string, string][] = [['flaky', 'Flaky tests', '81'], ['stability', 'CI stability', '94%'], ['cost', 'Cost trends', '']]
  return (
    <div className="flex items-center gap-7 border-b border-white/[0.06] px-1">
      {tabs.map(([id, label, badge]) => (
        <button key={id} onClick={() => setActive(id)}
          className={`relative flex items-center gap-2 py-3 font-mono text-[11px] tracking-[0.14em] uppercase transition-colors ${
            active === id ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
          }`}>
          {label}{badge && <span className={active === id ? 'text-blue-300' : 'text-zinc-600'}>({badge})</span>}
          {active === id && <span className="absolute bottom-0 inset-x-0 h-0.5 bg-blue-400 rounded-full" />}
        </button>
      ))}
    </div>
  )
}

function DetectedRow({ tests, query, setQuery }: { tests: TestRow[]; query: string; setQuery: (v: string) => void }) {
  const chips = [...tests].sort((a, b) => b.flakinessRate - a.flakinessRate).slice(0, 3)
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-zinc-500 shrink-0">Recently detected</span>
      <div className="flex items-center gap-2 flex-1 flex-wrap">
        {chips.map(c => (
          <Link key={c.testName} href={`/dashboard/tests/${encodeURIComponent(c.testName)}?filePath=${encodeURIComponent(c.filePath)}`}
            className="group flex items-center gap-2.5 bg-[#0c0c11] border border-white/[0.08] hover:border-red-500/30 rounded-lg pl-3 pr-2 py-1.5 transition-colors">
            <span className="font-mono text-[11px] text-zinc-300 truncate max-w-[150px]">{c.testName}</span>
            <span className="font-mono text-[10px] text-zinc-600">sev</span>
            <span className="font-mono text-[11px] font-bold text-red-400">{Math.round(c.flakinessRate * 174)}</span>
            <span className="font-mono text-[10px] text-blue-400 group-hover:text-blue-300 border-l border-white/[0.08] pl-2.5">investigate →</span>
          </Link>
        ))}
      </div>
      <div className="relative shrink-0">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Filter test names…"
          className="w-52 bg-[#0c0c11] border border-white/[0.08] rounded-lg pl-9 pr-3 py-2 font-mono text-[11px] text-white placeholder:text-zinc-600 outline-none focus:border-blue-500/40 transition-colors" />
      </div>
    </div>
  )
}

function TestTable({ tests, query }: { tests: TestRow[]; query: string }) {
  const rows = useMemo(() => tests.filter(t => t.testName.toLowerCase().includes(query.toLowerCase())), [tests, query])
  const Th = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <th className={`px-4 py-3 text-left font-mono text-[10px] tracking-[0.14em] uppercase text-zinc-600 font-normal ${className}`}>{children}</th>
  )
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0c0c11] overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/[0.06]">
            <Th>Test name</Th><Th>File</Th><Th className="w-[180px]">Flakiness</Th>
            <Th>Runs</Th><Th>Cost / yr</Th><Th>Last failed</Th><Th className="text-center">AI</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t, i) => {
            const pct = Math.round(t.flakinessRate * 100)
            const tone = rateTone(pct)
            return (
              <tr key={i} className={`border-t border-white/[0.04] hover:bg-white/[0.025] transition-colors ${tone.row}`}>
                <td className="px-4 py-3">
                  <Link href={`/dashboard/tests/${encodeURIComponent(t.testName)}?filePath=${encodeURIComponent(t.filePath)}`} className="font-mono text-[12px] text-zinc-200 hover:text-white transition-colors">{t.testName}</Link>
                </td>
                <td className="px-4 py-3 font-mono text-[11px] text-zinc-600 truncate max-w-[180px]">{t.filePath}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${Math.min(100, pct * 2.4)}%` }} />
                    </div>
                    <span className={`font-mono text-[11px] font-bold tabular-nums w-9 text-right ${tone.text}`}>{pct}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-[11px] text-zinc-500 tabular-nums">{t.totalRuns}</td>
                <td className="px-4 py-3 font-mono text-[12px] font-semibold text-amber-300 tabular-nums">${Math.round(t.estimatedCostUsd).toLocaleString()}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-zinc-500">{fmtDate(t.lastFailedAt)}</td>
                <td className="px-4 py-3">
                  {t.hasAnalysis ? (
                    <Link href={`/dashboard/tests/${encodeURIComponent(t.testName)}?filePath=${encodeURIComponent(t.filePath)}`}
                      className="flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-white text-[11px] font-medium"
                      style={{ background: 'linear-gradient(120deg, rgba(59,130,246,0.9), rgba(139,92,246,0.9))' }}>
                      <Sparkles size={12} />view
                    </Link>
                  ) : (
                    <Link href={`/dashboard/tests/${encodeURIComponent(t.testName)}?filePath=${encodeURIComponent(t.filePath)}`}
                      className="flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-zinc-300 text-[11px] font-medium border border-white/[0.1] hover:bg-white/[0.05] transition-colors">
                      Run AI
                    </Link>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Recommendations() {
  const [open, setOpen] = useState(true)
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0c0c11] overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
        <span className="flex items-center gap-2 font-mono text-[10px] tracking-[0.16em] uppercase text-zinc-400">
          <Sparkles size={13} className="text-blue-300" />AI Recommendations
        </span>
        <ChevronDown size={14} className={`text-zinc-600 transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && (
        <div className="p-3 flex flex-col">
          {RECO.map((r, i) => (
            <Link key={i} href="#" className={`flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors ${i === 0 ? 'bg-blue-500/[0.07]' : 'hover:bg-white/[0.03]'}`}>
              {r.done ? <Check size={13} className="mt-0.5 shrink-0 text-emerald-400" />
                : i === 0 ? <Sparkles size={13} className="mt-0.5 shrink-0 text-blue-300" />
                : <ChevronRight size={13} className="mt-0.5 shrink-0 text-zinc-600" />}
              <span className="text-[12px] leading-relaxed text-zinc-400">
                <span className={r.done ? 'text-emerald-300 font-medium' : 'text-zinc-200 font-medium'}>{r.strong}</span>{r.rest}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function StabilityTrends() {
  const [range, setRange] = useState('30d')
  const t = TREND[range]
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0c0c11] p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[14px] font-bold tracking-tight">Stability trends</h3>
          <div className="flex items-center gap-4 mt-1.5 font-mono text-[10px]">
            <span className="flex items-center gap-1.5 text-zinc-500"><span className="w-2.5 h-0.5 rounded-full bg-emerald-400" />health</span>
            <span className="flex items-center gap-1.5 text-zinc-500"><span className="w-2.5 h-0.5 rounded-full bg-amber-400" />cost index</span>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-[#08080b] border border-white/[0.08] rounded-lg p-0.5">
          {['7d', '30d', '90d'].map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-2.5 py-1 rounded-md font-mono text-[10px] transition-colors ${range === r ? 'bg-white/[0.1] text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>{r}</button>
          ))}
        </div>
      </div>
      <TrendsChart series={[
        { data: t.health, color: '#34d399' },
        { data: t.cost, color: '#f59e0b' },
      ]} />
    </div>
  )
}

/* ────────── page ────────── */
export default function DashboardPage() {
  const [tests, setTests] = useState<TestRow[]>([])
  const [query, setQuery] = useState('')
  const [orgName, setOrgName] = useState('')
  const [repoName, setRepoName] = useState('')

  useEffect(() => {
    if (!localStorage.getItem('keelOrgId')) {
      window.location.replace('/onboarding')
      return
    }
    setOrgName(localStorage.getItem('keelOrgName') || 'your-org')
    setRepoName(localStorage.getItem('keelRepoName') || 'your-repo')
    const repoId = localStorage.getItem('keelRepoId')
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`${API_URL}/repos/${repoId}/tests`)
        if (!res.ok) throw new Error()
        const json = await res.json()
        if (!cancelled) setTests(Array.isArray(json) ? json : json.tests ?? MOCK_TESTS)
      } catch {
        if (!cancelled) setTests(MOCK_TESTS)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-[#08080b] text-white">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar orgName={orgName} repoName={repoName} />
        <div className="flex-1 overflow-y-auto px-7 py-6">
          <div className="max-w-[1180px] mx-auto flex flex-col gap-5">
            <Tabs />
            <StatsRow tests={tests} />
            <div className="rounded-2xl border border-white/[0.07] bg-[#0c0c11] p-3">
              <Heatmap cells={HEAT} />
            </div>
            <DetectedRow tests={tests} query={query} setQuery={setQuery} />
            <TestTable tests={tests} query={query} />
            <div className="grid grid-cols-[1fr_1.4fr] gap-5 pb-4">
              <Recommendations />
              <StabilityTrends />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
