'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useClerk, useUser, useAuth } from '@clerk/nextjs'
import {
  ChevronDown, ChevronRight, LogOut, Search,
  Sparkles, Check, Loader2, AlertCircle, RefreshCw, GitBranch, Plus, X, ArrowUpRight,
} from 'lucide-react'
import { DonutGauge, HealthRings, Heatmap } from './charts'
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
  quarantineStatus?: 'pending' | 'open' | null
  quarantinePrUrl?: string | null
}

type RepoOption = { id: string; name: string }

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


function repoLimit(plan: string) {
  return plan === 'starter' ? 1 : 3
}

function TopBar({ orgName, repoName, repos, plan, onRepoChange, onAddRepo }: {
  orgName: string
  repoName: string
  repos: RepoOption[]
  plan: string
  onRepoChange: (repo: RepoOption) => void
  onAddRepo: () => void
}) {
  const { signOut } = useClerk()
  const { user } = useUser()
  const [open, setOpen] = useState(false)

  const canAdd = repos.length < repoLimit(plan)
  const atLimit = !canAdd && plan === 'starter'
  const showDropdown = open && (repos.length > 1 || canAdd || atLimit)

  const planBadge = plan === 'team'
    ? { label: 'Team', cls: 'text-blue-300 border-blue-500/30 bg-blue-500/10' }
    : plan === 'trialing'
    ? { label: 'Trial', cls: 'text-amber-300 border-amber-500/30 bg-amber-500/10' }
    : { label: 'Starter', cls: 'text-zinc-400 border-white/[0.1] bg-white/[0.04]' }

  return (
    <div className="h-16 shrink-0 border-b border-white/[0.06] flex items-center justify-between px-7 bg-[#08080b]">
      <span className={`font-mono text-[9px] tracking-[0.18em] uppercase border rounded-full px-2.5 py-1 ${planBadge.cls}`}>
        {planBadge.label}
      </span>
      <div className="relative">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 font-mono text-[12px] bg-[#101016] border border-white/[0.08] hover:border-white/[0.16] rounded-lg px-3.5 py-1.5 transition-colors"
        >
          <span className="text-zinc-400">{orgName}</span>
          <span className="text-zinc-700">/</span>
          <span className="text-white font-medium">{repoName}</span>
          <ChevronDown size={12} className={`text-zinc-600 ml-1 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {showDropdown && (
          <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 min-w-[200px] bg-[#13131a] border border-white/[0.1] rounded-xl shadow-xl overflow-hidden z-50">
            {repos.map(r => (
              <button
                key={r.id}
                onClick={() => { onRepoChange(r); setOpen(false) }}
                className={`w-full text-left px-4 py-2.5 font-mono text-[12px] hover:bg-white/[0.05] transition-colors flex items-center gap-2 ${
                  r.name === repoName ? 'text-white' : 'text-zinc-400'
                }`}
              >
                {r.name === repoName && <Check size={11} className="text-blue-400 shrink-0" />}
                {r.name !== repoName && <span className="w-[11px] shrink-0" />}
                {r.name}
              </button>
            ))}
            <div className="border-t border-white/[0.06]">
              {canAdd ? (
                <button
                  onClick={() => { setOpen(false); onAddRepo() }}
                  className="w-full text-left px-4 py-2.5 font-mono text-[12px] text-blue-400 hover:bg-white/[0.05] transition-colors flex items-center gap-2"
                >
                  <Plus size={11} className="shrink-0" />Add repo
                </button>
              ) : (
                <a
                  href="/upgrade"
                  className="w-full text-left px-4 py-2.5 font-mono text-[12px] text-zinc-500 hover:bg-white/[0.05] transition-colors flex items-center gap-2"
                >
                  <ArrowUpRight size={11} className="shrink-0" />Upgrade for more repos
                </a>
              )}
            </div>
          </div>
        )}
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

type GHRepo = { id: number; name: string; fullName: string; defaultBranch: string }

function AddRepoModal({ token, orgId, onDone, onClose }: {
  token: string
  orgId: string
  onDone: (repo: RepoOption, apiKey: string) => void
  onClose: () => void
}) {
  const [step, setStep] = useState<'pick' | 'confirm' | 'done'>('pick')
  const [ghRepos, setGhRepos] = useState<GHRepo[]>([])
  const [loadingRepos, setLoadingRepos] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<GHRepo | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [newRepo, setNewRepo] = useState<RepoOption | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}/api/github/repos`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error()
        const data = await res.json()
        setGhRepos(data.repos ?? [])
      } catch {
        setError('Failed to load GitHub repos. Try refreshing.')
      } finally {
        setLoadingRepos(false)
      }
    }
    load()
  }, [token])

  async function submit() {
    if (!selected) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/repos`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          githubRepoId: selected.id,
          repoName: selected.name,
          repoFullName: selected.fullName,
          defaultBranch: selected.defaultBranch,
          watchedBranches: [selected.defaultBranch],
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error === 'repo_limit_reached') setError('Plan limit reached — upgrade to add more repos.')
        else if (data.error === 'repo already connected to another account') setError('This repo is already connected to another Keel account.')
        else setError(data.error ?? 'Something went wrong.')
        return
      }
      setApiKey(data.apiKey ?? '')
      setNewRepo({ id: data.repoId, name: selected.name })
      setStep('done')
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = ghRepos.filter(r => r.fullName.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#13131a] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <span className="font-mono text-[12px] tracking-[0.14em] uppercase text-zinc-400">Add repository</span>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors"><X size={16} /></button>
        </div>

        {step === 'pick' && (
          <div className="p-5 flex flex-col gap-3">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search repositories…"
                className="w-full bg-[#0c0c11] border border-white/[0.08] rounded-lg pl-9 pr-3 py-2 font-mono text-[11px] text-white placeholder:text-zinc-600 outline-none focus:border-blue-500/40 transition-colors"
              />
            </div>
            <div className="max-h-64 overflow-y-auto flex flex-col gap-0.5">
              {loadingRepos ? (
                <div className="flex justify-center py-8"><Loader2 size={16} className="text-zinc-600 animate-spin" /></div>
              ) : filtered.length === 0 ? (
                <p className="text-center font-mono text-[11px] text-zinc-600 py-8">No repositories found</p>
              ) : filtered.map(r => (
                <button
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg font-mono text-[12px] transition-colors flex items-center gap-2 ${
                    selected?.id === r.id ? 'bg-blue-500/10 text-white border border-blue-500/20' : 'hover:bg-white/[0.04] text-zinc-300'
                  }`}
                >
                  {selected?.id === r.id && <Check size={11} className="text-blue-400 shrink-0" />}
                  {selected?.id !== r.id && <span className="w-[11px] shrink-0" />}
                  <span className="truncate">{r.fullName}</span>
                  <span className="ml-auto font-mono text-[10px] text-zinc-600 shrink-0">{r.defaultBranch}</span>
                </button>
              ))}
            </div>
            {error && <p className="font-mono text-[11px] text-red-400">{error}</p>}
            <button
              onClick={submit}
              disabled={!selected || submitting}
              className="mt-1 w-full py-2.5 rounded-xl font-mono text-[12px] font-medium text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(120deg, rgba(59,130,246,0.9), rgba(139,92,246,0.9))' }}
            >
              {submitting ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Connect repository'}
            </button>
          </div>
        )}

        {step === 'done' && newRepo && (
          <div className="p-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <p className="font-mono text-[12px] text-zinc-300"><span className="text-white font-medium">{newRepo.name}</span> connected.</p>
              <p className="font-mono text-[11px] text-zinc-500">Save your API key — it won't be shown again.</p>
            </div>
            <div className="rounded-xl bg-[#0c0c11] border border-white/[0.08] p-3 flex items-center gap-2">
              <code className="flex-1 font-mono text-[11px] text-emerald-300 break-all">{apiKey}</code>
              <button
                onClick={() => navigator.clipboard.writeText(apiKey)}
                className="shrink-0 font-mono text-[10px] text-zinc-500 hover:text-zinc-300 border border-white/[0.08] rounded-lg px-2 py-1 transition-colors"
              >copy</button>
            </div>
            <button
              onClick={() => { if (newRepo) onDone(newRepo, apiKey) }}
              className="w-full py-2.5 rounded-xl font-mono text-[12px] font-medium text-white"
              style={{ background: 'linear-gradient(120deg, rgba(59,130,246,0.9), rgba(139,92,246,0.9))' }}
            >
              Go to dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-white/[0.07] bg-[#0c0c11] p-5">{children}</div>
}

function StatsRow({ tests, loading, error }: { tests: TestRow[]; loading?: boolean; error?: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-4 animate-pulse">
        {[0, 1, 2].map(i => (
          <div key={i} className="rounded-2xl border border-white/[0.07] bg-[#0c0c11] p-5">
            <div className="h-2.5 w-24 rounded-md bg-white/[0.06] mb-4" />
            <div className="h-9 w-20 rounded-md bg-white/[0.06] mb-2" />
            <div className="h-2 w-16 rounded-md bg-white/[0.04]" />
          </div>
        ))}
      </div>
    )
  }
  if (error) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {(['Flaky tests', 'Wasted per year', 'Health score'] as const).map(label => (
          <StatCard key={label}>
            <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-zinc-500 mb-2">{label}</div>
            <span className="text-[44px] font-black tracking-[-0.05em] leading-none text-zinc-700">–</span>
            <div className="font-mono text-[11px] text-zinc-700 mt-1.5">unavailable</div>
          </StatCard>
        ))}
      </div>
    )
  }
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

function TestTable({ tests, query, loading, error, onRetry }: {
  tests: TestRow[]
  query: string
  loading?: boolean
  error?: boolean
  onRetry?: () => void
}) {
  const rows = useMemo(() => tests.filter(t => t.testName.toLowerCase().includes(query.toLowerCase())), [tests, query])
  const Th = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <th className={`px-4 py-3 text-left font-mono text-[10px] tracking-[0.14em] uppercase text-zinc-600 font-normal ${className}`}>{children}</th>
  )
  if (loading) {
    return (
      <div className="rounded-2xl border border-white/[0.07] bg-[#0c0c11] overflow-hidden animate-pulse">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <Th>Test name</Th><Th>File</Th><Th className="w-[180px]">Flakiness</Th>
              <Th>Runs</Th><Th>Cost / yr</Th><Th>Last failed</Th><Th className="text-center">AI</Th>
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2, 3, 4].map(i => (
              <tr key={i} className="border-t border-white/[0.04]">
                <td className="px-4 py-3"><div className="h-3 w-36 rounded bg-white/[0.06]" /></td>
                <td className="px-4 py-3"><div className="h-3 w-28 rounded bg-white/[0.04]" /></td>
                <td className="px-4 py-3"><div className="h-1.5 rounded-full bg-white/[0.06]" /></td>
                <td className="px-4 py-3"><div className="h-3 w-8 rounded bg-white/[0.04]" /></td>
                <td className="px-4 py-3"><div className="h-3 w-10 rounded bg-white/[0.04]" /></td>
                <td className="px-4 py-3"><div className="h-3 w-24 rounded bg-white/[0.04]" /></td>
                <td className="px-4 py-3 flex justify-center"><div className="h-6 w-12 rounded-lg bg-white/[0.04]" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  if (error) {
    return (
      <div className="rounded-2xl border border-white/[0.07] bg-[#0c0c11] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-red-500/[0.06] border-b border-red-500/20">
          <div className="flex items-center gap-2">
            <AlertCircle size={13} className="text-red-400 shrink-0" />
            <span className="font-mono text-[11px] text-red-400">Could not load test data</span>
          </div>
          {onRetry && (
            <button onClick={onRetry} className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors">
              <RefreshCw size={11} />Retry
            </button>
          )}
        </div>
        <div className="px-4 py-10 text-center font-mono text-[12px] text-zinc-600">
          No data to display — check your connection and retry.
        </div>
      </div>
    )
  }
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
                  <div className="flex items-center gap-2">
                    <Link href={`/dashboard/tests/${encodeURIComponent(t.testName)}?filePath=${encodeURIComponent(t.filePath)}`} className="font-mono text-[12px] text-zinc-200 hover:text-white transition-colors">{t.testName}</Link>
                    {t.quarantineStatus === 'pending' && (
                      <span className="font-mono text-[9px] tracking-[0.12em] uppercase px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-500 border border-zinc-700 shrink-0">PR opening…</span>
                    )}
                    {t.quarantineStatus === 'open' && t.quarantinePrUrl && (
                      <a href={t.quarantinePrUrl} target="_blank" rel="noreferrer"
                        className="font-mono text-[9px] tracking-[0.12em] uppercase px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/25 hover:border-amber-500/50 transition-colors shrink-0">
                        Quarantined ↗
                      </a>
                    )}
                  </div>
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

function Recommendations({ tests, loading, error }: { tests: TestRow[]; loading?: boolean; error?: boolean }) {
  const [open, setOpen] = useState(true)
  const withAnalysis = [...tests]
    .filter(t => t.hasAnalysis)
    .sort((a, b) => b.flakinessRate - a.flakinessRate)
    .slice(0, 4)

  const header = (
    <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
      <span className="flex items-center gap-2 font-mono text-[10px] tracking-[0.16em] uppercase text-zinc-400">
        <Sparkles size={13} className="text-blue-300" />AI Recommendations
      </span>
      <ChevronDown size={14} className={`text-zinc-600 transition-transform ${open ? '' : '-rotate-90'}`} />
    </button>
  )

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/[0.07] bg-[#0c0c11] overflow-hidden">
        {header}
        {open && (
          <div className="p-3 flex flex-col gap-1 animate-pulse">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                <div className="w-3 h-3 rounded-full bg-white/[0.06] shrink-0" />
                <div className={`h-3 rounded bg-white/[0.06] ${i === 0 ? 'w-3/4' : i === 1 ? 'w-2/3' : 'w-1/2'}`} />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-white/[0.07] bg-[#0c0c11] overflow-hidden">
        {header}
        {open && (
          <div className="flex flex-col items-center gap-2 py-8 text-center px-4">
            <AlertCircle size={20} className="text-zinc-700" />
            <p className="text-[12px] text-zinc-600">Analysis unavailable</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0c0c11] overflow-hidden">
      {header}
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

function StabilityTrends({ loading, error }: { loading?: boolean; error?: boolean }) {
  const header = (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="text-[14px] font-bold tracking-tight">Stability trends</h3>
        <p className="text-[12px] text-zinc-600 mt-1">Historical health and cost over time</p>
      </div>
      <div className="flex items-center gap-1 bg-[#08080b] border border-white/[0.08] rounded-lg p-0.5 opacity-40 pointer-events-none">
        {['7d', '30d', '90d'].map(r => (
          <button key={r} className="px-2.5 py-1 rounded-md font-mono text-[10px] text-zinc-500">{r}</button>
        ))}
      </div>
    </div>
  )
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0c0c11] p-5 flex flex-col justify-between">
      {header}
      {loading ? (
        <div className="rounded-xl bg-white/[0.03] animate-pulse" style={{ height: 120 }} />
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
          <AlertCircle size={20} className="text-zinc-700" />
          <p className="text-[12px] text-zinc-600">Could not load trend data</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <GitBranch size={22} className="text-zinc-700" />
          <p className="text-[12px] text-zinc-500 leading-relaxed max-w-[200px]">
            Trend data available after<br />7 days of CI runs.
          </p>
        </div>
      )}
    </div>
  )
}

function HeatmapStrip({ tests, loading, error }: { tests: TestRow[]; loading?: boolean; error?: boolean }) {
  if (error) return null
  const cells: ('high' | 'med' | 'low' | 'none')[] = loading
    ? Array(28).fill('none')
    : tests.slice(0, 28).map(t => {
        const r = t.flakinessRate
        if (r >= 0.25) return 'high'
        if (r >= 0.12) return 'med'
        if (r > 0) return 'low'
        return 'none'
      })

  return (
    <div className={`rounded-2xl border border-white/[0.07] bg-[#0c0c11] p-5 ${loading ? 'animate-pulse' : ''}`}>
      <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-zinc-500 mb-3">Run heatmap</div>
      <Heatmap cells={cells} />
    </div>
  )
}

/* ────────── loading / empty / error states ────────── */
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

/* ────────── page ────────── */
export default function DashboardPage() {
  const router = useRouter()
  const { getToken } = useAuth()
  const [checking, setChecking] = useState(true)
  const [initRetry, setInitRetry] = useState(0)
  const [tests, setTests] = useState<TestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [query, setQuery] = useState('')
  const [orgName, setOrgName] = useState('')
  const [repoName, setRepoName] = useState('')
  const [repoId, setRepoId] = useState('')
  const [orgId, setOrgId] = useState('')
  const [plan, setPlan] = useState('')
  const [repos, setRepos] = useState<RepoOption[]>([])
  const [clerkToken, setClerkToken] = useState('')
  const [showAddRepo, setShowAddRepo] = useState(false)

  async function load(repoId: string) {
    setLoading(true)
    setError(false)
    try {
      const token = await getToken()
      const res = await fetch(`${API_URL}/repos/${repoId}/tests`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      const json = await res.json()
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

        if (!data.repoId || !data.orgName || !data.repoName) {
          throw new Error('incomplete org data from server')
        }
        setOrgName(data.orgName)
        setRepoName(data.repoName)
        setRepoId(data.repoId)
        setOrgId(data.orgId ?? '')
        setPlan(data.plan ?? '')
        setRepos(data.repos ?? [])
        setClerkToken(token)
        setChecking(false)
        load(data.repoId)
      } catch {
        // Keep checking=true so the checking guard shows the retry UI.
        // Per-section error tiles only fire on load() failures (after init succeeds).
        setLoading(false)
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
        <TopBar
          orgName={orgName}
          repoName={repoName}
          repos={repos}
          plan={plan}
          onRepoChange={repo => { setRepoName(repo.name); setRepoId(repo.id); load(repo.id) }}
          onAddRepo={() => setShowAddRepo(true)}
        />
        {showAddRepo && (
          <AddRepoModal
            token={clerkToken}
            orgId={orgId}
            onDone={(repo, _key) => {
              setShowAddRepo(false)
              setRepos(prev => [...prev, repo])
              setRepoName(repo.name)
              setRepoId(repo.id)
              load(repo.id)
            }}
            onClose={() => setShowAddRepo(false)}
          />
        )}
        <div className="flex-1 overflow-y-auto px-7 py-6">
          <div className="max-w-[1180px] mx-auto flex flex-col gap-5">
            <Tabs flakyCount={flakyCount} />
            {!loading && !error && tests.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                <StatsRow tests={tests} loading={loading} error={error} />
                <HeatmapStrip tests={tests} loading={loading} error={error} />
                {!loading && !error && (
                  <DetectedRow tests={tests} query={query} setQuery={setQuery} />
                )}
                <TestTable tests={tests} query={query} loading={loading} error={error} onRetry={() => load(repoId)} />
                <div className="grid grid-cols-[1fr_1.4fr] gap-5 pb-4">
                  <Recommendations tests={tests} loading={loading} error={error} />
                  <StabilityTrends loading={loading} error={error} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
