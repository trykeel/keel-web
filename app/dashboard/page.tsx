'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

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
    // TODO: get repoId from user session/org
    const repoId = localStorage.getItem('repoId') || 'demo'
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/repos/${repoId}/tests`)
      .then(r => r.json())
      .then(d => { setTests(d.tests || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const totalCost = tests.reduce((s, t) => s + (t.estimatedCostUsd || 0), 0)
  const flakyCount = tests.filter(t => t.flakinessRate > 0.05).length

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{ width: 220, background: '#111827', borderRight: '1px solid #1F2937', padding: '24px 16px', flexShrink: 0 }}>
        <Link href="/" style={{ color: '#3B82F6', fontWeight: 700, fontSize: 18, textDecoration: 'none', display: 'block', marginBottom: 32 }}>Keel</Link>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            { label: 'Dashboard', href: '/dashboard', active: true },
            { label: 'Settings', href: '/settings', active: false },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{
              padding: '8px 12px', borderRadius: 6, textDecoration: 'none', fontSize: 14,
              background: item.active ? '#1D3461' : 'transparent',
              color: item.active ? '#3B82F6' : '#6B7280',
            }}>{item.label}</Link>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: 32, overflow: 'auto' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Flakiness Dashboard</h1>
        <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 32 }}>Tests sorted by estimated annual cost to your team</p>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'Flaky tests', value: flakyCount, color: '#EF4444' },
            { label: 'Total tests tracked', value: tests.length, color: '#3B82F6' },
            { label: 'Est. annual cost', value: `$${Math.round(totalCost).toLocaleString()}`, color: '#F59E0B' },
          ].map(card => (
            <div key={card.label} style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 10, padding: 20 }}>
              <div style={{ color: '#6B7280', fontSize: 13, marginBottom: 8 }}>{card.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: card.color }}>{card.value}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1F2937' }}>
                {['Test name', 'File', 'Flakiness', 'Runs', 'Annual cost', 'Last failed', ''].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#6B7280', fontWeight: 500, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>Loading...</td></tr>
              ) : tests.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>
                  No tests yet. Install the GitHub Action to start tracking.
                </td></tr>
              ) : tests.map((t, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #1F2937' }}>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 13 }}>{t.testName}</td>
                  <td style={{ padding: '12px 16px', color: '#6B7280', fontSize: 12 }}>{t.filePath || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      background: t.flakinessRate > 0.2 ? '#7F1D1D' : t.flakinessRate > 0.1 ? '#78350F' : '#14532D',
                      color: t.flakinessRate > 0.2 ? '#FCA5A5' : t.flakinessRate > 0.1 ? '#FCD34D' : '#86EFAC',
                      padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 700
                    }}>
                      {(t.flakinessRate * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#6B7280' }}>{t.totalRuns}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#F59E0B' }}>
                    ${Math.round(t.estimatedCostUsd).toLocaleString()}/yr
                  </td>
                  <td style={{ padding: '12px 16px', color: '#6B7280', fontSize: 12 }}>
                    {t.lastFailedAt ? new Date(t.lastFailedAt).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <Link href={`/tests/${encodeURIComponent(t.testName)}`}
                      style={{ color: '#3B82F6', textDecoration: 'none', fontSize: 12 }}>View →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
