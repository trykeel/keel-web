'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import {
  DollarSign, Clock, TrendingUp, Download,
  Loader2, AlertCircle, RefreshCw, GitBranch,
  ChevronUp, ChevronDown,
} from 'lucide-react'
import Sidebar from '../sidebar'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

type TestRow = {
  testName: string
  filePath: string
  flakinessRate: number
  totalRuns: number
  failedRuns: number
  estimatedCostUsd: number
  lastFailedAt: string | null
}

type ScaledRow = TestRow & { cost: number }
type SortCol = 'testName' | 'flakinessRate' | 'failedRuns' | 'cost' | 'share'
type SortDir = 'asc' | 'desc'

const RANGES: { label: string; suffix: string; scale: number }[] = [
  { label: 'All time', suffix: '/ yr',  scale: 1 },
  { label: '90d',      suffix: '/ 90d', scale: 90 / 365 },
  { label: '30d',      suffix: '/ 30d', scale: 30 / 365 },
  { label: '7d',       suffix: '/ 7d',  scale: 7 / 365 },
]

function SortIndicator({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronDown size={10} className="ml-1 text-zinc-700" />
  return dir === 'desc'
    ? <ChevronDown size={10} className="ml-1 text-amber-400" />
    : <ChevronUp size={10} className="ml-1 text-amber-400" />
}

export default function CostsPage() {
  const [tests, setTests]       = useState<TestRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(false)
  const [rangeIdx, setRangeIdx] = useState(0)
  const [sort, setSort]         = useState<{ col: SortCol; dir: SortDir }>({ col: 'cost', dir: 'desc' })
  const { getToken } = useAuth()

  const load = useCallback(async () => {
    setLoading(true); setError(false)
    try {
      const token = await getToken()
      const planRes = await fetch(`${API_URL}/billing/plan`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!planRes.ok) throw new Error()
      const { repoId } = await planRes.json()
      const testsRes = await fetch(`${API_URL}/repos/${repoId}/tests`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!testsRes.ok) throw new Error()
      const json = await testsRes.json()
      setTests(Array.isArray(json) ? json : (json.tests ?? []))
    } catch { setError(true) }
    finally { setLoading(false) }
  }, [getToken])

  useEffect(() => { load() }, [load])

  const { scale, suffix } = RANGES[rangeIdx]

  const scaled: ScaledRow[] = tests.map(t => ({ ...t, cost: t.estimatedCostUsd * scale }))
  const totalCost    = scaled.reduce((s, t) => s + t.cost, 0)
  const totalMinutes = Math.round(totalCost)
  const flakyCount   = tests.filter(t => t.flakinessRate > 0.05).length

  function toggleSort(col: SortCol) {
    setSort(prev =>
      prev.col === col
        ? { col, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
        : { col, dir: col === 'testName' ? 'asc' : 'desc' }
    )
  }

  const sorted = [...scaled].sort((a, b) => {
    const aShare = totalCost > 0 ? a.cost / totalCost : 0
    const bShare = totalCost > 0 ? b.cost / totalCost : 0
    let diff: number
    switch (sort.col) {
      case 'testName':     diff = a.testName.localeCompare(b.testName); break
      case 'flakinessRate':diff = a.flakinessRate - b.flakinessRate; break
      case 'failedRuns':   diff = (a.failedRuns ?? 0) - (b.failedRuns ?? 0); break
      case 'cost':         diff = a.cost - b.cost; break
      case 'share':        diff = aShare - bShare; break
      default:             diff = 0
    }
    return sort.dir === 'asc' ? diff : -diff
  })

  const top = sorted[0]

  function exportCSV() {
    const header = `Test Name,File Path,Flakiness %,Failed Runs,Cost ${suffix} ($),Share of Total (%)`
    const rows = sorted.map(t => {
      const share = totalCost > 0 ? ((t.cost / totalCost) * 100).toFixed(1) : '0'
      return [
        `"${t.testName.replace(/"/g, '""')}"`,
        `"${t.filePath.replace(/"/g, '""')}"`,
        (t.flakinessRate * 100).toFixed(1),
        t.failedRuns ?? 0,
        Math.round(t.cost),
        share,
      ].join(',')
    })
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `keel-costs-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const COLS: { col: SortCol; label: string }[] = [
    { col: 'testName',     label: 'Test' },
    { col: 'flakinessRate',label: 'Flakiness' },
    { col: 'failedRuns',   label: 'Failed runs' },
    { col: 'cost',         label: `Cost ${suffix}` },
    { col: 'share',        label: 'Share' },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-[#08080b] text-white">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <div className="h-16 shrink-0 border-b border-white/[0.06] flex items-center justify-between px-7 bg-[#08080b]">
          <div>
            <span className="text-[18px] font-black tracking-tight">Cost Analysis</span>
            <span className="ml-3 font-mono text-[11px] text-zinc-600">estimated CI spend lost to flaky tests</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Range picker */}
            <div className="flex items-center gap-1 bg-[#0c0c11] border border-white/[0.07] rounded-xl p-1">
              {RANGES.map((r, i) => (
                <button key={r.label} onClick={() => setRangeIdx(i)}
                  className={`px-3 py-1.5 rounded-lg font-mono text-[11px] transition-colors ${
                    rangeIdx === i
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}>
                  {r.label}
                </button>
              ))}
            </div>
            {!loading && !error && tests.length > 0 && (
              <button onClick={exportCSV}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/[0.09] font-mono text-[11px] text-zinc-400 hover:text-zinc-200 hover:border-white/[0.15] transition-colors">
                <Download size={13} />Export CSV
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-7 py-6">
          <div className="max-w-[1180px] mx-auto flex flex-col gap-5">

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-20 text-zinc-600">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-[13px]">Loading…</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-4 py-20">
                <AlertCircle size={24} className="text-red-400" />
                <button onClick={load}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.1] text-[13px] text-zinc-300 hover:bg-white/[0.05] transition-colors">
                  <RefreshCw size={13} />Retry
                </button>
              </div>
            ) : tests.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-20 text-center">
                <GitBranch size={24} className="text-zinc-700" />
                <p className="text-[13px] text-zinc-500">No cost data yet — run some CI builds first.</p>
              </div>
            ) : (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-white/[0.07] bg-[#0c0c11] p-5">
                    <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.16em] uppercase text-zinc-500 mb-3">
                      <Clock size={12} />CI minutes wasted {suffix}
                    </div>
                    <div className="text-[44px] font-black tracking-[-0.05em] leading-none text-amber-300 tabular-nums">
                      {totalMinutes.toLocaleString()}
                    </div>
                    <div className="font-mono text-[11px] text-zinc-600 mt-2">at $1 / min CI rate</div>
                  </div>

                  <div className="rounded-2xl border border-white/[0.07] bg-[#0c0c11] p-5">
                    <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.16em] uppercase text-zinc-500 mb-3">
                      <DollarSign size={12} />Estimated cost {suffix}
                    </div>
                    <div className="text-[44px] font-black tracking-[-0.05em] leading-none text-red-400 tabular-nums">
                      ${Math.round(totalCost).toLocaleString()}
                    </div>
                    <div className="font-mono text-[11px] text-zinc-600 mt-2">{flakyCount} flaky tests contributing</div>
                  </div>

                  <div className="rounded-2xl border border-white/[0.07] bg-[#0c0c11] p-5">
                    <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.16em] uppercase text-zinc-500 mb-3">
                      <TrendingUp size={12} />Biggest offender
                    </div>
                    {top ? (
                      <>
                        <div className="text-[15px] font-bold text-zinc-200 leading-snug truncate">{top.testName}</div>
                        <div className="font-mono text-[11px] text-amber-300 font-semibold mt-2">
                          ${Math.round(top.cost).toLocaleString()} {suffix}
                        </div>
                        <div className="font-mono text-[11px] text-zinc-600 mt-0.5">
                          {Math.round(top.flakinessRate * 100)}% flakiness rate
                        </div>
                      </>
                    ) : (
                      <span className="text-zinc-600 text-[13px]">—</span>
                    )}
                  </div>
                </div>

                {/* Cost table */}
                <div className="rounded-2xl border border-white/[0.07] bg-[#0c0c11] overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
                    <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-zinc-400">
                      Cost breakdown by test
                    </span>
                    <span className="font-mono text-[10px] text-zinc-600">{tests.length} tests</span>
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        {COLS.map(({ col, label }) => (
                          <th key={col} onClick={() => toggleSort(col)}
                            className="px-4 py-3 text-left font-mono text-[10px] tracking-[0.14em] uppercase font-normal cursor-pointer select-none text-zinc-600 hover:text-zinc-400 transition-colors">
                            <span className="inline-flex items-center">
                              {label}
                              <SortIndicator active={sort.col === col} dir={sort.dir} />
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map((t, i) => {
                        const pct   = Math.round(t.flakinessRate * 100)
                        const share = totalCost > 0 ? Math.round((t.cost / totalCost) * 100) : 0
                        const isFlaky = t.flakinessRate > 0.05
                        return (
                          <tr key={i} className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-mono text-[12px] text-zinc-200">{t.testName}</div>
                              <div className="font-mono text-[10px] text-zinc-600 mt-0.5 truncate max-w-[300px]">{t.filePath}</div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`font-mono text-[12px] font-bold tabular-nums ${isFlaky ? 'text-red-400' : 'text-emerald-400'}`}>
                                {pct}%
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-[12px] text-zinc-500 tabular-nums">
                              {t.failedRuns ?? '—'}
                            </td>
                            <td className="px-4 py-3 font-mono text-[13px] font-semibold text-amber-300 tabular-nums">
                              ${Math.round(t.cost).toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                                  <div className="h-full rounded-full bg-amber-500/60" style={{ width: `${share}%` }} />
                                </div>
                                <span className="font-mono text-[10px] text-zinc-600 w-8 text-right tabular-nums">{share}%</span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <p className="text-[11px] text-zinc-700 font-mono text-center pb-2">
                  Cost model: flakiness rate × 7 CI runs/week × 23 min avg × $1/min × 52 weeks · Period filters scale proportionally
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
