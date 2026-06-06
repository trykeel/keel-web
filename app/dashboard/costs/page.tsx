'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useClerk, useUser } from '@clerk/nextjs'
import {
  ChevronDown, LogOut, DollarSign, TrendingUp,
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

export default function CostsPage() {
  const [tests, setTests] = useState<TestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  function load() {
    setLoading(true); setError(false)
    const repoId = localStorage.getItem('keelRepoId')
    fetch(`${API_URL}/repos/${repoId}/tests`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(json => setTests(Array.isArray(json) ? json : json.tests ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const sorted = [...tests].sort((a, b) => b.estimatedCostUsd - a.estimatedCostUsd)
  const totalCost = tests.reduce((s, t) => s + t.estimatedCostUsd, 0)
  const flakyTests = tests.filter(t => t.flakinessRate > 0.05)
  const flakyCost = flakyTests.reduce((s, t) => s + t.estimatedCostUsd, 0)
  const top = sorted[0]

  return (
    <div className="flex h-screen overflow-hidden bg-[#08080b] text-white">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <div className="flex-1 overflow-y-auto px-7 py-6">
          <div className="max-w-[1180px] mx-auto flex flex-col gap-5">

            <div>
              <h1 className="text-[22px] font-black tracking-tight">Cost Analysis</h1>
              <p className="text-[13px] text-zinc-500 mt-0.5">Estimated annual CI spend lost to flaky tests</p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-20 text-zinc-600">
                <Loader2 size={16} className="animate-spin" /><span className="text-[13px]">Loading…</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-4 py-20">
                <AlertCircle size={24} className="text-red-400" />
                <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.1] text-[13px] text-zinc-300 hover:bg-white/[0.05] transition-colors">
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
                      <DollarSign size={12} />Total wasted / yr
                    </div>
                    <div className="text-[44px] font-black tracking-[-0.05em] leading-none text-amber-300 tabular-nums">
                      ${Math.round(totalCost).toLocaleString()}
                    </div>
                    <div className="font-mono text-[11px] text-zinc-600 mt-2">across {tests.length} tracked tests</div>
                  </div>

                  <div className="rounded-2xl border border-white/[0.07] bg-[#0c0c11] p-5">
                    <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.16em] uppercase text-zinc-500 mb-3">
                      <TrendingUp size={12} />Flaky test cost
                    </div>
                    <div className="text-[44px] font-black tracking-[-0.05em] leading-none text-red-400 tabular-nums">
                      ${Math.round(flakyCost).toLocaleString()}
                    </div>
                    <div className="font-mono text-[11px] text-zinc-600 mt-2">from {flakyTests.length} flaky tests</div>
                  </div>

                  <div className="rounded-2xl border border-white/[0.07] bg-[#0c0c11] p-5">
                    <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-zinc-500 mb-3">Biggest offender</div>
                    {top ? (
                      <>
                        <Link href={`/dashboard/tests/${encodeURIComponent(top.testName)}?filePath=${encodeURIComponent(top.filePath)}`}
                          className="text-[15px] font-bold text-zinc-200 hover:text-white transition-colors leading-snug block truncate">
                          {top.testName}
                        </Link>
                        <div className="font-mono text-[11px] text-amber-300 font-semibold mt-2">
                          ${Math.round(top.estimatedCostUsd).toLocaleString()} / yr
                        </div>
                        <div className="font-mono text-[11px] text-zinc-600 mt-0.5">
                          {Math.round(top.flakinessRate * 100)}% flakiness rate
                        </div>
                      </>
                    ) : <span className="text-zinc-600 text-[13px]">—</span>}
                  </div>
                </div>

                {/* Cost table */}
                <div className="rounded-2xl border border-white/[0.07] bg-[#0c0c11] overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-white/[0.06]">
                    <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-zinc-400">Cost breakdown by test</span>
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        <th className="px-4 py-3 text-left font-mono text-[10px] tracking-[0.14em] uppercase text-zinc-600 font-normal">Test</th>
                        <th className="px-4 py-3 text-left font-mono text-[10px] tracking-[0.14em] uppercase text-zinc-600 font-normal w-[140px]">Flakiness</th>
                        <th className="px-4 py-3 text-left font-mono text-[10px] tracking-[0.14em] uppercase text-zinc-600 font-normal">Runs</th>
                        <th className="px-4 py-3 text-left font-mono text-[10px] tracking-[0.14em] uppercase text-zinc-600 font-normal">Cost / yr</th>
                        <th className="px-4 py-3 text-left font-mono text-[10px] tracking-[0.14em] uppercase text-zinc-600 font-normal w-[160px]">Share of total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map((t, i) => {
                        const pct = Math.round(t.flakinessRate * 100)
                        const share = totalCost > 0 ? Math.round((t.estimatedCostUsd / totalCost) * 100) : 0
                        const isFlaky = t.flakinessRate > 0.05
                        return (
                          <tr key={i} className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                            <td className="px-4 py-3">
                              <Link href={`/dashboard/tests/${encodeURIComponent(t.testName)}?filePath=${encodeURIComponent(t.filePath)}`}
                                className="font-mono text-[12px] text-zinc-200 hover:text-white transition-colors">{t.testName}</Link>
                              <div className="font-mono text-[10px] text-zinc-600 mt-0.5 truncate max-w-[280px]">{t.filePath}</div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`font-mono text-[12px] font-bold tabular-nums ${isFlaky ? 'text-red-400' : 'text-emerald-400'}`}>{pct}%</span>
                            </td>
                            <td className="px-4 py-3 font-mono text-[12px] text-zinc-500 tabular-nums">{t.totalRuns}</td>
                            <td className="px-4 py-3 font-mono text-[13px] font-semibold text-amber-300 tabular-nums">
                              ${Math.round(t.estimatedCostUsd).toLocaleString()}
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
                  Cost model: flakiness rate × 7 CI runs/week × 23 min avg × $1/min × 52 weeks
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
