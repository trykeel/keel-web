'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function CalculatorPage() {
  const [engineers, setEngineers] = useState(40)
  const [flakyTests, setFlakyTests] = useState(30)
  const [salary, setSalary] = useState(120000)

  const hourlyRate = salary / 2000
  const minsPerInvestigation = 23
  const runsPerWeek = 7
  const flakyRunsPerWeek = flakyTests * runsPerWeek * 0.3
  const hoursPerWeek = (flakyRunsPerWeek * minsPerInvestigation) / 60
  const annualCost = Math.round(hoursPerWeek * hourlyRate * 52 * engineers / flakyTests * flakyTests)
  const keelCost = 2400
  const roi = Math.round(annualCost / keelCost)

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '60px 24px' }}>
      <Link href="/" style={{ color: '#3B82F6', textDecoration: 'none', fontSize: 14, display: 'block', marginBottom: 32 }}>← Back to Keel</Link>

      <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 8 }}>Flaky Test Cost Calculator</h1>
      <p style={{ color: '#6B7280', marginBottom: 48, fontSize: 15 }}>
        Find out how much flaky tests are costing your engineering team each year.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 32, marginBottom: 48 }}>
        {[
          { label: 'Number of engineers', value: engineers, min: 1, max: 500, set: setEngineers },
          { label: 'Flaky tests in your pipeline', value: flakyTests, min: 1, max: 200, set: setFlakyTests },
        ].map(slider => (
          <div key={slider.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <label style={{ fontSize: 15, fontWeight: 600 }}>{slider.label}</label>
              <span style={{ color: '#3B82F6', fontWeight: 700, fontSize: 18 }}>{slider.value}</span>
            </div>
            <input type="range" min={slider.min} max={slider.max} value={slider.value}
              onChange={e => slider.set(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#3B82F6' }} />
          </div>
        ))}

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <label style={{ fontSize: 15, fontWeight: 600 }}>Average engineer salary</label>
            <span style={{ color: '#3B82F6', fontWeight: 700, fontSize: 18 }}>${salary.toLocaleString()}/yr</span>
          </div>
          <input type="range" min={60000} max={300000} step={5000} value={salary}
            onChange={e => setSalary(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#3B82F6' }} />
        </div>
      </div>

      {/* Results */}
      <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 12, padding: 32 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>
          <div>
            <div style={{ color: '#6B7280', fontSize: 13, marginBottom: 6 }}>Your flaky tests cost</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#EF4444' }}>${annualCost.toLocaleString()}</div>
            <div style={{ color: '#6B7280', fontSize: 12 }}>per year</div>
          </div>
          <div>
            <div style={{ color: '#6B7280', fontSize: 13, marginBottom: 6 }}>Keel costs</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#22C55E' }}>${keelCost.toLocaleString()}</div>
            <div style={{ color: '#6B7280', fontSize: 12 }}>per year (Team plan)</div>
          </div>
        </div>
        <div style={{ background: '#1D3461', borderRadius: 8, padding: '16px 20px', textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: '#93C5FD', marginBottom: 4 }}>Return on investment</div>
          <div style={{ fontSize: 42, fontWeight: 800, color: '#3B82F6' }}>{roi}x ROI</div>
        </div>
        <Link href="/signup" style={{
          display: 'block', textAlign: 'center', background: '#3B82F6', color: '#fff',
          padding: '14px 0', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 16
        }}>
          Start fixing them free →
        </Link>
      </div>
    </div>
  )
}
