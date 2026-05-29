'use client'

import { useState, useEffect } from 'react'

/* ── Sparkline ── */
export function Sparkline({
  data, w = 150, h = 48, stroke = '#f59e0b', fill = 'rgba(245,158,11,0.18)',
}: { data: number[]; w?: number; h?: number; stroke?: string; fill?: string }) {
  const max = Math.max(...data), min = Math.min(...data)
  const span = max - min || 1
  const step = w / (data.length - 1)
  const pts = data.map((d, i) => [i * step, h - ((d - min) / span) * (h - 6) - 3] as const)
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L${w},${h} L0,${h} Z`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="overflow-visible">
      <path d={area} fill={fill} />
      <path d={line} fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.5" fill={stroke} />
    </svg>
  )
}

/* ── Donut gauge ── */
export function DonutGauge({
  value, size = 76, stroke = 9, color = '#f59e0b', track = 'rgba(255,255,255,0.08)',
}: { value: number; size?: number; stroke?: number; color?: string; track?: string }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const [shown, setShown] = useState(0)
  useEffect(() => {
    const start = performance.now(), dur = 1100
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur)
      setShown(value * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={c - (shown / 100) * c} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-black text-[15px]" style={{ color }}>{Math.round(shown)}%</span>
      </div>
    </div>
  )
}

/* ── Concentric health rings ── */
export function HealthRings({
  rings, size = 92,
}: { rings: { value: number; color: string }[]; size?: number }) {
  const [shown, setShown] = useState(0)
  useEffect(() => {
    const start = performance.now(), dur = 1200
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur)
      setShown(1 - Math.pow(1 - p, 3))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  const stroke = 7, gap = 4
  return (
    <svg width={size} height={size} className="-rotate-90 shrink-0">
      {rings.map((ring, i) => {
        const r = (size - stroke) / 2 - i * (stroke + gap)
        const c = 2 * Math.PI * r
        return (
          <g key={i}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={ring.color} strokeWidth={stroke}
              strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (ring.value / 100) * c * shown} />
          </g>
        )
      })}
    </svg>
  )
}

/* ── Heatmap strip ── */
export type HeatCell = 'high' | 'med' | 'low' | 'none'
export function Heatmap({ cells }: { cells: HeatCell[] }) {
  const tone: Record<HeatCell, string> = {
    high: 'bg-red-500', med: 'bg-amber-500', low: 'bg-emerald-500', none: 'bg-zinc-700/60',
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {cells.map((c, i) => (
        <div key={i}
          className={`w-[18px] h-[18px] rounded-[5px] ${tone[c]} transition-transform hover:scale-125 cursor-pointer`}
          style={{ animation: `hmpop .4s ease-out ${i * 12}ms both` }}
          title={c === 'none' ? 'no data' : `${c} flakiness`} />
      ))}
    </div>
  )
}

/* ── Stability trends ── */
export function TrendsChart({
  series, w = 560, h = 200,
}: { series: { data: number[]; color: string }[]; w?: number; h?: number }) {
  const pad = { l: 34, r: 12, t: 14, b: 24 }
  const innerW = w - pad.l - pad.r, innerH = h - pad.t - pad.b
  const n = series[0].data.length
  const xt = (i: number) => pad.l + (innerW * i) / (n - 1)
  const yt = (v: number) => pad.t + innerH * (1 - v / 100)
  const smooth = (data: number[]) => {
    const pts = data.map((v, i) => [xt(i), yt(v)] as const)
    let d = `M${pts[0][0]},${pts[0][1]}`
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1]
      const cx = (x0 + x1) / 2
      d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`
    }
    return d
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }}>
      {[0, 25, 50, 75, 100].map(g => (
        <g key={g}>
          <line x1={pad.l} x2={w - pad.r} y1={yt(g)} y2={yt(g)} stroke="rgba(255,255,255,0.05)" />
          <text x={pad.l - 8} y={yt(g) + 3} fontSize="9" fill="#52525b" textAnchor="end" fontFamily="ui-monospace">{g}%</text>
        </g>
      ))}
      {[0, 0.25, 0.5, 0.75, 1].map(f => (
        <text key={f} x={pad.l + innerW * f} y={h - 8} fontSize="9" fill="#52525b" textAnchor="middle" fontFamily="ui-monospace">
          {Math.round((n - 1) * f)}
        </text>
      ))}
      {series.map((s, si) => (
        <g key={si}>
          <path d={smooth(s.data)} fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${s.color}40)` }} />
          {s.data.map((v, i) => (i % Math.ceil(n / 8) === 0 || i === n - 1) && (
            <circle key={i} cx={xt(i)} cy={yt(v)} r="2.5" fill={s.color} />
          ))}
        </g>
      ))}
    </svg>
  )
}
