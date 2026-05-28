'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LayoutDashboard, Settings, Key, Activity, DollarSign, AlertCircle, TrendingUp, ChevronRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

type FlakyTest = {
  testName: string
  filePath: string
  flakinessRate: number
  totalRuns: number
  estimatedCostUsd: number
  lastFailedAt: string | null
}

export default function DashboardPage() {
  const [tests, setTests] = useState<FlakyTest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!localStorage.getItem('keelOrgId')) {
      window.location.replace('/onboarding')
      return
    }
    const repoId = localStorage.getItem('keelRepoId') || 'demo'
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/repos/${repoId}/tests`)
      .then(r => r.json())
      .then(d => { setTests(d.tests || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const totalCost = tests.reduce((s, t) => s + (t.estimatedCostUsd || 0), 0)
  const flakyCount = tests.filter(t => t.flakinessRate > 0.05).length
  const chartData = tests.slice(0, 8).map(t => ({
    name: t.testName.split(/[\s.]+/).pop() ?? t.testName,
    rate: Math.round(t.flakinessRate * 100),
  }))

  return (
    <div className="flex min-h-screen bg-[#0a0a0a] text-white">
      {/* Sidebar */}
      <aside className="w-56 bg-[#0f0f0f] border-r border-white/5 flex flex-col shrink-0">
        <div className="px-5 py-4 border-b border-white/5">
          <Link href="/" className="text-white font-bold text-lg tracking-tighter">keel</Link>
        </div>

        <nav className="flex-1 p-3 flex flex-col gap-1">
          {[
            { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', active: true },
            { label: 'Settings', icon: Settings, href: '/settings', active: false },
          ].map(item => (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                item.active
                  ? 'bg-blue-500/10 text-blue-400'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`}>
              <item.icon size={15} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <Link href="/settings" className="flex items-center gap-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
            <Key size={12} />
            Manage API keys
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <header className="border-b border-white/5 px-8 py-5">
          <h1 className="text-base font-semibold">Flakiness Dashboard</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Tests sorted by estimated annual cost to your team</p>
        </header>

        <div className="p-8 space-y-5">
          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Flaky tests', value: String(flakyCount), icon: AlertCircle, color: 'text-red-400' },
              { label: 'Tests tracked', value: String(tests.length), icon: Activity, color: 'text-blue-400' },
              { label: 'Est. annual cost', value: `$${Math.round(totalCost).toLocaleString()}`, icon: DollarSign, color: 'text-amber-400' },
            ].map(card => (
              <div key={card.label} className="bg-[#111] border border-white/5 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-zinc-500 text-xs font-medium uppercase tracking-wider">{card.label}</span>
                  <card.icon size={14} className={card.color} />
                </div>
                <div className={`text-3xl font-bold tabular-nums ${card.color}`}>{card.value}</div>
              </div>
            ))}
          </div>

          {/* Bar chart — only when data exists */}
          {chartData.length > 0 && (
            <div className="bg-[#111] border border-white/5 rounded-xl p-5">
              <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-4">Flakiness rate by test</h2>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#52525b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#52525b' }} axisLine={false} tickLine={false} unit="%" />
                  <Tooltip
                    contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                    formatter={(v: number) => [`${v}%`, 'Flakiness']}
                  />
                  <Bar dataKey="rate" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Tests table */}
          <div className="bg-[#111] border border-white/5 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Flaky tests</h2>
              {flakyCount > 0 && (
                <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full font-medium">
                  {flakyCount} flaky
                </span>
              )}
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  {['Test name', 'File', 'Flakiness', 'Runs', 'Annual cost', 'Last failed', ''].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-medium text-zinc-600 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-14 text-center">
                      <div className="flex items-center justify-center gap-2 text-zinc-600">
                        <Activity size={15} className="animate-pulse" />
                        <span className="text-sm">Loading...</span>
                      </div>
                    </td>
                  </tr>
                ) : tests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <TrendingUp size={28} className="text-zinc-700 mx-auto mb-3" />
                      <p className="text-zinc-400 text-sm font-medium mb-1">No tests tracked yet</p>
                      <p className="text-zinc-600 text-xs mb-4">Install the GitHub Action to start detecting flaky tests.</p>
                      <Link href="https://github.com/trykeel/keel-action"
                        className="inline-flex items-center gap-1 text-blue-400 text-xs hover:text-blue-300 transition-colors">
                        View setup guide <ChevronRight size={11} />
                      </Link>
                    </td>
                  </tr>
                ) : tests.map((t, i) => (
                  <tr key={i} className="border-t border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs text-zinc-200 max-w-[200px] truncate">{t.testName}</td>
                    <td className="px-5 py-3.5 text-zinc-600 text-xs max-w-[140px] truncate">{t.filePath || '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        t.flakinessRate > 0.2
                          ? 'bg-red-500/10 text-red-400'
                          : t.flakinessRate > 0.1
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-green-500/10 text-green-400'
                      }`}>
                        {(t.flakinessRate * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-zinc-500 tabular-nums">{t.totalRuns}</td>
                    <td className="px-5 py-3.5 font-semibold text-amber-400 tabular-nums">
                      ${Math.round(t.estimatedCostUsd).toLocaleString()}/yr
                    </td>
                    <td className="px-5 py-3.5 text-zinc-600 text-xs">
                      {t.lastFailedAt ? new Date(t.lastFailedAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <Link href={`/dashboard/tests/${encodeURIComponent(t.testName)}`}
                        className="flex items-center gap-1 text-blue-400 text-xs hover:text-blue-300 transition-colors">
                        View <ChevronRight size={11} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
