'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useClerk, useUser, useAuth } from '@clerk/nextjs'
import {
  ChevronDown, LogOut, Search, Sparkles, ArrowUpDown,
  Loader2, AlertCircle, RefreshCw, GitBranch,
} from 'lucide-react'
import Sidebar from '../sidebar'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

type TestRow = {
  testName: string
  filePath: string
  flakinessRate: number
  totalRuns: number
  estimatedCostUsd: number
  lastFailedAt: string | null
  hasAnalysis: boolean
}

type SortKey = 'flakinessRate' | 'estimatedCostUsd' | 'totalRuns' | 'lastFailedAt' | 'testName'
type Filter = 'all' | 'flaky' | 'stable'

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function rateTone(r: number) {
  if (r >= 25) return { bar: 'bg-red-500', text: 'text-red-400', row: 'bg-red-500/[0.04]' }
  if (r >= 12) return { bar: 'bg-amber-500', text: 'text-amber-400', row: '' }
  return { bar: 'bg-emerald-500', text: 'text-emerald-400', row: '' }
}

function TopBar() {
  const { signOut } = useClerk()
  const { user } = useUser()
  const [orgName, setOrgName] = useState('')
  const [repoName, setRepoName] = useState('')
  useEffect(() => {
    setOrgName(localStorage.getItem('keelOrgName') || 'your-org')
    setRepoName(localStorage.getItem('keelRepoName') || 'your-repo')
  }, [])
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
          : <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500" />}
        <button onClick={() => signOut({ redirectUrl: '/' })}
          className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors">
          <LogOut size={13} />Sign out
        </button>
      </div>
    </div>
  )
}

export default function TestsPage() {
  const [tests, setTests] = useState<TestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('flakinessRate')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const { getToken } = useAuth()

  async function load() {
    setLoading(true); setError(false)
    try {
      const repoId = localStorage.getItem('keelRepoId')
      const token = await getToken()
      const r = await fetch(`${API_URL}/repos/${repoId}/tests`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!r.ok) throw new Error()
      const json = await r.json()
      setTests(Array.isArray(json) ? json : json.tests ?? [])
    } catch { setError(true) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const filtered = useMemo(() => {
    let rows = tests
    if (filter === 'flaky') rows = rows.filter(t => t.flakinessRate > 0.05)
    if (filter === 'stable') rows = rows.filter(t => t.flakinessRate <= 0.05)
    if (query) rows = rows.filter(t => t.testName.toLowerCase().includes(query.toLowerCase()) || t.filePath.toLowerCase().includes(query.toLowerCase()))
    return [...rows].sort((a, b) => {
      const v = (t: TestRow) => sortKey === 'lastFailedAt'
        ? (t.lastFailedAt ? new Date(t.lastFailedAt).getTime() : 0)
        : sortKey === 'testName' ? t.testName.localeCompare(a.testName)
        : (t[sortKey] as number)
      const diff = v(a) - v(b)
      return sortDir === 'desc' ? -diff : diff
    })
  }, [tests, filter, query, sortKey, sortDir])

  const flaky = tests.filter(t => t.flakinessRate > 0.05).length
  const stable = tests.length - flaky

  const Th = ({ children, k, className = '' }: { children: React.ReactNode; k: SortKey; className?: string }) => (
    <th onClick={() => toggleSort(k)}
      className={`px-4 py-3 text-left font-mono text-[10px] tracking-[0.14em] uppercase text-zinc-600 font-normal cursor-pointer hover:text-zinc-400 transition-colors select-none ${className}`}>
      <span className="flex items-center gap-1">{children}<ArrowUpDown size={10} className={sortKey === k ? 'text-blue-400' : ''} /></span>
    </th>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-[#08080b] text-white">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <div className="flex-1 overflow-y-auto px-7 py-6">
          <div className="max-w-[1180px] mx-auto flex flex-col gap-5">

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-[22px] font-black tracking-tight">All Tests</h1>
                <p className="text-[13px] text-zinc-500 mt-0.5">
                  {tests.length} tracked · <span className="text-red-400">{flaky} flaky</span> · <span className="text-emerald-400">{stable} stable</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                {(['all', 'flaky', 'stable'] as Filter[]).map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-lg font-mono text-[10px] tracking-[0.1em] uppercase transition-colors ${
                      filter === f ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30' : 'text-zinc-500 hover:text-zinc-300 border border-white/[0.06]'
                    }`}>{f}</button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-20 text-zinc-600">
                <Loader2 size={16} className="animate-spin" /><span className="text-[13px]">Loading tests…</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-4 py-20">
                <AlertCircle size={24} className="text-red-400" />
                <p className="text-[13px] text-zinc-500">Could not load tests.</p>
                <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.1] text-[13px] text-zinc-300 hover:bg-white/[0.05] transition-colors">
                  <RefreshCw size={13} />Retry
                </button>
              </div>
            ) : tests.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-20 text-center">
                <GitBranch size={24} className="text-zinc-700" />
                <p className="text-[13px] text-zinc-500">No tests tracked yet.</p>
              </div>
            ) : (
              <>
                {/* Search */}
                <div className="relative">
                  <Search size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                  <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search test name or file path…"
                    className="w-full bg-[#0c0c11] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 font-mono text-[12px] text-white placeholder:text-zinc-600 outline-none focus:border-blue-500/40 transition-colors" />
                </div>

                {/* Table */}
                <div className="rounded-2xl border border-white/[0.07] bg-[#0c0c11] overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        <Th k="testName">Test name</Th>
                        <th className="px-4 py-3 text-left font-mono text-[10px] tracking-[0.14em] uppercase text-zinc-600 font-normal">File</th>
                        <Th k="flakinessRate" className="w-[180px]">Flakiness</Th>
                        <Th k="totalRuns">Runs</Th>
                        <Th k="estimatedCostUsd">Cost / yr</Th>
                        <Th k="lastFailedAt">Last failed</Th>
                        <th className="px-4 py-3 text-center font-mono text-[10px] tracking-[0.14em] uppercase text-zinc-600 font-normal">AI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((t, i) => {
                        const pct = Math.round(t.flakinessRate * 100)
                        const tone = rateTone(pct)
                        return (
                          <tr key={i} className={`border-t border-white/[0.04] hover:bg-white/[0.025] transition-colors ${tone.row}`}>
                            <td className="px-4 py-3">
                              <Link href={`/dashboard/tests/${encodeURIComponent(t.testName)}?filePath=${encodeURIComponent(t.filePath)}`}
                                className="font-mono text-[12px] text-zinc-200 hover:text-white transition-colors">{t.testName}</Link>
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
                  {filtered.length === 0 && (
                    <div className="py-12 text-center font-mono text-[12px] text-zinc-600">No tests match your filter.</div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
