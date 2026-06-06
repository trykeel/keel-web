'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useClerk, useUser, useAuth } from '@clerk/nextjs'
import {
  ChevronDown, ChevronRight, LogOut, Search,
  Sparkles, Check, Loader2, AlertCircle, RefreshCw, GitBranch,
} from 'lucide-react'
import { DonutGauge, HealthRings } from './charts'
import Sidebar from './sidebar'

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
  const flakyPct = Math.round((flaky / Math.max(1, tests.length)) * 100)

  const stable = tests.filter(t => t.flakinessRate < 0.12).length
  const mid    = tests.filter(t => t.flakinessRate >= 0.12 && t.flakinessRate < 0.25).length
  const high   = tests.filter(t => t.flakinessRate >= 0.25).length
  const n = Math.max(1, tests.length)
  const rings = [
    { value: Math.round((stable / n) * 100), color: '#34d399' },
    { value: Math.round(((stable + mid) / n) * 100), color: '#60a5fa' },
    { value: Math.round(((n - high) / n) * 100), color: '#f87171' },
  ]

  return (
    <div className="grid grid-cols-3 gap-4">
      <StatCard>
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-zinc-500 mb-2">Flaky tests</div>
        <span className="text-[44px] font-black tracking-[-0.05em] leading-none text-red-400">{flaky}</span>
        <div className="font-mono text-[11px] text-zinc-600 mt-1.5">of {tests.length} tracked</div>
      </StatCard>

      <StatCard>
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-zinc-500 mb-2">Wasted per year</div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[40px] font-black tracking-[-0.05em] leading-none text-amber-300 tabular-nums">${Math.round(totalCost).toLocaleString()}</div>
            <div className="font-mono text-[11px] text-zinc-600 mt-1.5">estimated CI cost</div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <DonutGauge value={flakyPct} />
            <span className="font-mono text-[9px] text-zinc-600 uppercase tracking-wide">flaky</span>
          </div>
        </div>
      </StatCard>

      <StatCard>
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-zinc-500 mb-2">Health score</div>
        <div className="flex items-center gap-4">
          <HealthRings rings={rings} />
          <div className="flex flex-col gap-2">
            {([['Stable', stable, '#34d399'], ['Medium', mid, '#60a5fa'], ['High risk', high, '#f87171']] as const).map(([l, v, c]) => (
              <div key={l} className="flex items-center gap-2 font-mono text-[11px]">
                <span className="w-2 h-2 rounded-full" style={{ background: c }} />
                <span className="text-zinc-400">{l}</span>
                <span className="text-zinc-200 ml-auto tabular-nums">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </StatCard>
    </div>
  )
}

function Tabs({ flakyCount }: { flakyCount: number }) {
  const [active, setActive] = useState('flaky')
  const tabs: [string, string, string][] = [
    ['flaky', 'Flaky tests', flakyCount > 0 ? String(flakyCount) : ''],
    ['stability', 'CI stability', ''],
    ['cost', 'Cost trends', ''],
  ]
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

function Recommendations({ tests }: { tests: TestRow[] }) {
  const [open, setOpen] = useState(true)
  const withAnalysis = [...tests]
    .filter(t => t.hasAnalysis)
    .sort((a, b) => b.flakinessRate - a.flakinessRate)
    .slice(0, 4)

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
          {withAnalysis.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center px-4">
              <Sparkles size={20} className="text-zinc-700" />
              <p className="text-[12px] text-zinc-500 leading-relaxed">
                No AI analysis yet.<br />Click <span className="text-zinc-300">Run AI</span> on any flaky test to generate recommendations.
              </p>
            </div>
          ) : (
            withAnalysis.map((t, i) => (
              <Link key={i}
                href={`/dashboard/tests/${encodeURIComponent(t.testName)}?filePath=${encodeURIComponent(t.filePath)}`}
                className={`flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors ${i === 0 ? 'bg-blue-500/[0.07]' : 'hover:bg-white/[0.03]'}`}>
                {i === 0
                  ? <Sparkles size={13} className="mt-0.5 shrink-0 text-blue-300" />
                  : <ChevronRight size={13} className="mt-0.5 shrink-0 text-zinc-600" />}
                <span className="text-[12px] leading-relaxed text-zinc-400">
                  <span className="text-zinc-200 font-medium">{t.testName}</span>
                  {' — '}{Math.round(t.flakinessRate * 100)}% flaky · view AI analysis
                </span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function StabilityTrends() {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0c0c11] p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[14px] font-bold tracking-tight">Stability trends</h3>
          <p className="text-[12px] text-zinc-600 mt-1">Historical health and cost over time</p>
        </div>
        <div className="flex items-center gap-1 bg-[#08080b] border border-white/[0.08] rounded-lg p-0.5 opacity-40 pointer-events-none">
          {['7d', '30d', '90d'].map(r => (
            <button key={r} className={`px-2.5 py-1 rounded-md font-mono text-[10px] text-zinc-500`}>{r}</button>
          ))}
        </div>
      </div>
      <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <GitBranch size={22} className="text-zinc-700" />
        <p className="text-[12px] text-zinc-500 leading-relaxed max-w-[200px]">
          Trend data available after<br />7 days of CI runs.
        </p>
      </div>
    </div>
  )
}

/* ────────── loading / empty / error states ────────── */
function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-5 animate-pulse">
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-white/[0.04]" />
        ))}
      </div>
      <div className="h-8 rounded-xl bg-white/[0.04] w-64" />
      <div className="h-64 rounded-2xl bg-white/[0.04]" />
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
        <GitBranch size={24} className="text-blue-400" />
      </div>
      <div>
        <h2 className="text-[20px] font-bold tracking-tight mb-2">No flaky tests detected yet</h2>
        <p className="text-[13px] text-zinc-500 leading-relaxed max-w-[340px]">
          Add the Keel action to your CI workflow and push a commit to start seeing flakiness data.
        </p>
      </div>
      <div className="w-full max-w-[480px] rounded-xl bg-[#0c0c12] border border-white/[0.08] overflow-hidden text-left">
        <div className="px-4 py-2 border-b border-white/[0.06] font-mono text-[10px] text-zinc-600 tracking-wider">.GITHUB/WORKFLOWS/CI.YML</div>
        <pre className="p-4 font-mono text-[11.5px] leading-[1.7] overflow-x-auto text-zinc-300">
{`- name: Report to Keel
  uses: trykeel/keel-action@v1
  with:
    api-key: \${{ secrets.KEEL_API_KEY }}
    test-results-path: ./test-results/**/*.xml`}
        </pre>
      </div>
    </div>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <AlertCircle size={24} className="text-red-400" />
      </div>
      <div>
        <h2 className="text-[18px] font-bold tracking-tight mb-2">Could not load test data</h2>
        <p className="text-[13px] text-zinc-500">Check your API connection and try again.</p>
      </div>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/[0.1] text-[13px] text-zinc-300 hover:bg-white/[0.05] transition-colors"
      >
        <RefreshCw size={13} />Retry
      </button>
    </div>
  )
}

/* ────────── page ────────── */
export default function DashboardPage() {
  const router = useRouter()
  const { getToken } = useAuth()
  const [plan, setPlan] = useState<'starter' | 'team' | 'trialing'>('trialing')
  const [trialDaysLeft, setTrialDaysLeft] = useState(0)
  const [checking, setChecking] = useState(true)
  const [initRetry, setInitRetry] = useState(0)
  const [tests, setTests] = useState<TestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [query, setQuery] = useState('')
  const [orgName, setOrgName] = useState('')
  const [repoName, setRepoName] = useState('')
  const [repoId, setRepoId] = useState('')

  async function load(rid: string) {
    setLoading(true)
    setError(false)
    try {
      const token = await getToken()
      const r = await fetch(`${API_URL}/repos/${rid}/tests`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!r.ok) throw new Error()
      const json = await r.json()
      setTests(Array.isArray(json) ? json : json.tests ?? [])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    async function init() {
      try {
        const token = await getToken()
        if (!token) { router.replace('/sign-in'); return }

        const res = await fetch(`${API_URL}/billing/plan`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error(`${res.status}`)
        const data = await res.json()

        if (!data.onboarded) { router.replace('/onboarding'); return }

        const hasAccess = data.plan === 'team' || (data.plan === 'trialing' && data.trialDaysLeft > 0)
        if (!hasAccess) { router.replace('/upgrade'); return }

        if (!data.repoId || !data.orgName || !data.repoName) {
          throw new Error('incomplete org data from server')
        }
        if (data.plan === 'trialing' && typeof data.trialDaysLeft !== 'number') {
          throw new Error('missing trialDaysLeft for trialing plan')
        }
        setPlan(data.plan)
        setTrialDaysLeft(data.trialDaysLeft)
        setOrgName(data.orgName)
        setRepoName(data.repoName)
        setRepoId(data.repoId)
        setChecking(false)
        load(data.repoId)
      } catch {
        setChecking(false)
        setError(true)
      }
    }
    init()
  }, [getToken, router, initRetry])

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#08080b]">
        {error
          ? <div className="flex flex-col items-center gap-3 text-center">
              <AlertCircle size={20} className="text-red-400" />
              <p className="text-[13px] text-zinc-500">Could not reach the server.</p>
              <button onClick={() => { setError(false); setChecking(true); setInitRetry(n => n + 1) }}
                className="text-[12px] text-zinc-400 hover:text-zinc-200 underline underline-offset-2">
                Retry
              </button>
            </div>
          : <Loader2 size={20} className="text-zinc-600 animate-spin" />
        }
      </div>
    )
  }

  const flakyCount = tests.filter(t => t.flakinessRate > 0.05).length

  return (
    <div className="flex h-screen overflow-hidden bg-[#08080b] text-white">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar orgName={orgName} repoName={repoName} />
        <div className="flex-1 overflow-y-auto px-7 py-6">
          <div className="max-w-[1180px] mx-auto flex flex-col gap-5">
            <Tabs flakyCount={flakyCount} />
            {loading ? (
              <LoadingSkeleton />
            ) : error ? (
              <ErrorState onRetry={() => load(repoId)} />
            ) : tests.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                <StatsRow tests={tests} />
                <DetectedRow tests={tests} query={query} setQuery={setQuery} />
                <TestTable tests={tests} query={query} />
                <div className="grid grid-cols-[1fr_1.4fr] gap-5 pb-4">
                  <Recommendations tests={tests} />
                  <StabilityTrends />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
