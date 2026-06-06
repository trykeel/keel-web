'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'
import {
  ArrowLeft, FileText, Clock, GitCommit, GitBranch,
  Sparkles, Loader2, Ban, CheckCircle2, ExternalLink, AlertCircle, TrendingUp,
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

/* ── types ── */
type RunStatus = 'passed' | 'failed'
type HistoryItem = {
  status: RunStatus
  failureMessage: string
  commitSha: string
  branch: string
  createdAt: string
}
type Analysis = {
  rootCauseType: string
  confidence: 'high' | 'medium' | 'low'
  explanation: string
  suggestedFix: string
  codeEvidence: string
  createdAt: string
  updatedAt: string
  // optional enrichments — rendered when the API provides them
  model?: string
  durationMs?: number
  summary?: string
  fixFilePath?: string
  evidenceHighlight?: string
  signals?: { icon: string; text: string }[]
}
type TestDetail = {
  score: {
    testName: string
    filePath: string
    flakinessRate: number
    totalRuns: number
    failedRuns: number
    estimatedCostUsd: number
    lastFailedAt: string | null
  }
  history: HistoryItem[]
  analysis: Analysis | null
}

/* ── helpers ── */
function timeAgo(iso: string | null) {
  if (!iso) return '—'
  const diff = Math.max(0, Date.now() - new Date(iso).getTime())
  const m = Math.floor(diff / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24)
  if (d > 0) return `${d} day${d > 1 ? 's' : ''} ago`
  if (h > 0) return `${h} hour${h > 1 ? 's' : ''} ago`
  if (m > 0) return `${m} min${m > 1 ? 's' : ''} ago`
  return 'just now'
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function rateColor(rate: number) {
  if (rate > 0.2) return 'text-red-400'
  if (rate >= 0.1) return 'text-amber-400'
  return 'text-emerald-400'
}

const ROOT_CAUSE_STYLES: Record<string, { label: string; cls: string }> = {
  timing:         { label: 'Timing',         cls: 'bg-amber-500/10 text-amber-300 border-amber-500/20' },
  race_condition: { label: 'Race condition', cls: 'bg-red-500/10 text-red-300 border-red-500/20' },
  network:        { label: 'Network',        cls: 'bg-blue-500/10 text-blue-300 border-blue-500/20' },
  environment:    { label: 'Environment',    cls: 'bg-purple-500/10 text-purple-300 border-purple-500/20' },
  unknown:        { label: 'Unknown',        cls: 'bg-zinc-500/10 text-zinc-300 border-zinc-500/20' },
}

/* ── sub-components ── */
const SIGNAL_ICONS: Record<string, typeof TrendingUp> = { TrendingUp, GitCommit, Clock }

function ConfidenceMeter({ level }: { level: Analysis['confidence'] }) {
  const n = level === 'high' ? 3 : level === 'medium' ? 2 : 1
  const color = level === 'high' ? 'bg-emerald-400' : level === 'medium' ? 'bg-amber-400' : 'bg-zinc-500'
  return (
    <div className="flex items-end gap-[3px] h-3.5">
      {[0, 1, 2].map(i => (
        <span key={i} className={`w-1.5 rounded-sm ${i < n ? color : 'bg-white/10'}`} style={{ height: `${((i + 1) / 3) * 100}%` }} />
      ))}
    </div>
  )
}

function CodeBlock({ text, highlight, diff }: { text: string; highlight?: string; diff?: boolean }) {
  const lines = text.split('\n')
  return (
    <div className="rounded-xl bg-[#08080c] border border-white/[0.07] overflow-hidden">
      <pre className="m-0 py-2 font-mono text-[11.5px] leading-[1.65] overflow-x-auto">
        {lines.map((line, i) => {
          const t = line.trimStart()
          let cls = 'text-zinc-400', bg = '', gutter = diff ? ' ' : ''
          if (diff && t.startsWith('+')) { cls = 'text-emerald-300'; bg = 'bg-emerald-500/[0.07]'; gutter = '+' }
          else if (diff && t.startsWith('-')) { cls = 'text-red-300'; bg = 'bg-red-500/[0.07]'; gutter = '-' }
          else if (highlight && line.toLowerCase().includes(highlight.toLowerCase())) { cls = 'text-red-300'; bg = 'bg-red-500/[0.08]' }
          const body = diff && /^[+-]/.test(t) ? line.replace(/^(\s*)[+-]\s?/, '$1') : line
          return (
            <div key={i} className={`flex px-3 ${bg}`}>
              {diff && <span className={`select-none w-3 shrink-0 ${gutter === '+' ? 'text-emerald-500' : gutter === '-' ? 'text-red-500' : 'text-zinc-700'}`}>{gutter}</span>}
              <span className={`${cls} whitespace-pre`}>{body || ' '}</span>
            </div>
          )
        })}
      </pre>
    </div>
  )
}

function SuggestedFix({ text, filePath }: { text: string; filePath: string }) {
  const isDiff = text.split('\n').some(l => /^\s*[+-]/.test(l))
  if (!isDiff) {
    return (
      <div className="rounded-xl bg-blue-500/[0.06] border-l-2 border-blue-500/50 px-4 py-3.5 text-[13px] text-zinc-300 leading-relaxed">{text}</div>
    )
  }
  return (
    <div className="rounded-xl bg-[#08080c] border border-white/[0.07] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06] bg-white/[0.02]">
        <span className="font-mono text-[10px] text-zinc-500">{filePath}</span>
        <span className="font-mono text-[10px] text-zinc-600">unified diff</span>
      </div>
      <CodeBlock text={text} diff />
    </div>
  )
}

function StatCard({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0d0d12] p-5">
      <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-zinc-500 mb-3">{label}</div>
      {children}
      {sub && <div className="font-mono text-[11px] text-zinc-600 mt-1.5">{sub}</div>}
    </div>
  )
}

function HistoryDots({ history }: { history: HistoryItem[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {history.map((run, i) => (
        <div key={i} className="group relative">
          <div className={`w-3 h-3 rounded-full ring-1 ${
            run.status === 'passed' ? 'bg-emerald-500 ring-emerald-500/30' : 'bg-red-500 ring-red-500/30'
          }`} />
          <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 whitespace-nowrap">
            <div className="bg-[#16161c] border border-white/10 rounded-lg px-2.5 py-1.5 shadow-xl">
              <div className="font-mono text-[10px] text-zinc-300">
                {run.status === 'passed' ? '✓ passed' : '✗ failed'} · {run.commitSha.slice(0, 7)}
              </div>
              <div className="font-mono text-[10px] text-zinc-600">{fmtDate(run.createdAt)}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function FailureRow({ run }: { run: HistoryItem }) {
  const [open, setOpen] = useState(false)
  const long = run.failureMessage.length > 80
  return (
    <div className="border border-white/[0.06] rounded-xl overflow-hidden bg-[#0d0d12]">
      <div className="flex items-center gap-4 px-4 py-3 text-[12px]">
        <span className="flex items-center gap-1.5 font-mono text-zinc-400"><GitCommit size={12} className="text-zinc-600" />{run.commitSha.slice(0, 7)}</span>
        <span className="flex items-center gap-1.5 font-mono text-zinc-500"><GitBranch size={12} className="text-zinc-600" />{run.branch}</span>
        <span className="font-mono text-zinc-600 ml-auto">{fmtDate(run.createdAt)}</span>
      </div>
      <div className="px-4 pb-3">
        <pre className={`m-0 font-mono text-[11px] leading-relaxed text-red-300/90 bg-black/40 border border-red-500/15 rounded-lg px-3 py-2 ${long && !open ? 'truncate' : 'whitespace-pre-wrap'}`}>
          {run.failureMessage}
        </pre>
        {long && (
          <button onClick={() => setOpen(o => !o)} className="mt-1.5 font-mono text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors">
            {open ? '▲ collapse' : '▼ expand'}
          </button>
        )}
      </div>
    </div>
  )
}

function ConfirmModal({ onConfirm, onCancel, busy }: { onConfirm: () => void; onCancel: () => void; busy: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-[400px] bg-[#0c0c12] border border-white/[0.1] rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center"><Ban size={16} className="text-red-400" /></div>
          <h3 className="text-[16px] font-bold tracking-tight">Quarantine this test?</h3>
        </div>
        <p className="text-[13px] text-zinc-400 leading-relaxed mb-6">
          This will open a PR on GitHub that skips this test in CI. Deploys keep moving while your team fixes the root cause. Continue?
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={busy} className="flex-1 py-2.5 rounded-xl border border-white/[0.1] text-[13px] text-zinc-300 hover:bg-white/[0.05] transition-colors">Cancel</button>
          <button onClick={onConfirm} disabled={busy} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white text-[13px] font-semibold transition-colors flex items-center justify-center gap-2">
            {busy ? <><Loader2 size={14} className="animate-spin" />Opening PR…</> : 'Open quarantine PR'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="max-w-[920px] mx-auto px-6 py-10 animate-pulse">
      <div className="h-3 w-20 bg-white/5 rounded mb-8" />
      <div className="h-9 w-80 bg-white/5 rounded mb-3" />
      <div className="h-3 w-48 bg-white/5 rounded mb-10" />
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[0, 1, 2].map(i => <div key={i} className="h-28 bg-white/5 rounded-xl" />)}
      </div>
      <div className="h-32 bg-white/5 rounded-xl mb-8" />
      <div className="h-48 bg-white/5 rounded-xl" />
    </div>
  )
}

/* ── page ── */
export default function TestDetailPage() {
  const params = useParams<{ testName: string }>()
  const searchParams = useSearchParams()
  const testName = decodeURIComponent(params.testName)
  const filePath = searchParams.get('filePath') ?? ''

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [data, setData] = useState<TestDetail | null>(null)

  const [analysing, setAnalysing] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [quarantining, setQuarantining] = useState(false)
  const [prUrl, setPrUrl] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { getToken } = useAuth()
  const router = useRouter()
  const repoId = typeof window !== 'undefined' ? localStorage.getItem('keelRepoId') : null
  const encoded = encodeURIComponent(testName)

  // initial load
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const token = await getToken()
        const res = await fetch(`${API_URL}/repos/${repoId}/tests/${encoded}?filePath=${encodeURIComponent(filePath)}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.status === 404) { if (!cancelled) { setNotFound(true); setLoading(false) } return }
        if (!res.ok) throw new Error(`${res.status}`)
        const json: TestDetail = await res.json()
        if (!cancelled) { setData(json); setLoading(false) }
      } catch {
        if (!cancelled) { setNotFound(true); setLoading(false) }
      }
    }
    load()
    return () => { cancelled = true; if (pollRef.current) clearInterval(pollRef.current) }
  }, [repoId, encoded, filePath])

  // trigger analysis, then poll every 3s until it appears
  const runAnalysis = useCallback(async () => {
    setAnalysing(true)
    try {
      const token = await getToken()
      const res = await fetch(`${API_URL}/repos/${repoId}/tests/${encoded}/analyse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ filePath }),
      })
      if (res.status === 403) { setAnalysing(false); router.push('/upgrade'); return }
      pollRef.current = setInterval(async () => {
        const t = await getToken()
        const res = await fetch(
          `${API_URL}/repos/${repoId}/tests/${encoded}/analysis?filePath=${encodeURIComponent(filePath)}`,
          { headers: { Authorization: `Bearer ${t}` } },
        )
        if (res.ok) {
          const analysis: Analysis = await res.json()
          if (analysis && analysis.rootCauseType) {
            setData(d => (d ? { ...d, analysis } : d))
            setAnalysing(false)
            if (pollRef.current) clearInterval(pollRef.current)
          }
        }
      }, 3000)
    } catch {
      setAnalysing(false)
    }
  }, [repoId, encoded, filePath, getToken])

  async function confirmQuarantine() {
    setQuarantining(true)
    try {
      const token = await getToken()
      const res = await fetch(`${API_URL}/repos/${repoId}/tests/${encoded}/quarantine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ filePath }),
      })
      if (res.status === 403) { router.push('/upgrade'); return }
      const json = await res.json()
      setPrUrl(json.prUrl || json.url || null)
      setShowModal(false)
    } finally {
      setQuarantining(false)
    }
  }

  if (loading) return <div className="min-h-screen bg-[#07070a] text-white"><Skeleton /></div>

  if (notFound || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-6 bg-[#07070a] text-white">
        <AlertCircle size={32} className="text-zinc-600" />
        <div className="text-[18px] font-semibold">Test not found</div>
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-[13px] text-blue-400 hover:text-blue-300">
          <ArrowLeft size={14} />Back to dashboard
        </Link>
      </div>
    )
  }

  const { score, history, analysis } = data
  const failures = history.filter(h => h.status === 'failed').slice(0, 5)
  const rc = ROOT_CAUSE_STYLES[analysis?.rootCauseType ?? 'unknown'] ?? ROOT_CAUSE_STYLES.unknown

  // Fallbacks so the rich layout works even if the API only sends the base fields.
  const aiModel = analysis?.model ?? 'claude-sonnet-4'
  const aiSummary = analysis?.summary ?? analysis?.explanation.split(/(?<=\.)\s/)[0]
  const failedInLast20 = history.filter(h => h.status === 'failed').length
  const aiSignals = analysis?.signals ?? (analysis ? [
    { icon: 'TrendingUp', text: `${score.failedRuns} of ${score.totalRuns} runs failed — ${(score.flakinessRate * 100).toFixed(0)}% flaky` },
    { icon: 'Clock', text: `${failedInLast20} of the last ${history.length} runs failed` },
  ] : [])

  return (
    <div className="min-h-screen bg-[#07070a] text-white">
      <div className="max-w-[920px] mx-auto px-6 py-10">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 font-mono text-[12px] text-zinc-500 hover:text-zinc-300 transition-colors mb-8">
          <ArrowLeft size={14} />All tests
        </Link>

        {/* header */}
        <div className="mb-9">
          <h1 className="text-[40px] font-black tracking-[-0.04em] leading-[1.02] mb-3 break-words">{score.testName}</h1>
          <div className="flex items-center gap-4 flex-wrap font-mono text-[12px] text-zinc-500">
            <span className="flex items-center gap-1.5"><FileText size={12} className="text-zinc-600" />{score.filePath}</span>
            <span className="flex items-center gap-1.5 text-zinc-600"><Clock size={12} />Last failed {timeAgo(score.lastFailedAt)}</span>
          </div>
        </div>

        {/* stats */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <StatCard label="Flakiness rate">
            <div className={`text-[40px] font-black tracking-[-0.04em] leading-none ${rateColor(score.flakinessRate)}`}>
              {(score.flakinessRate * 100).toFixed(0)}%
            </div>
          </StatCard>
          <StatCard label="Annual cost">
            <div className="text-[40px] font-black tracking-[-0.04em] leading-none text-red-400 tabular-nums">
              ${Math.round(score.estimatedCostUsd).toLocaleString()}
            </div>
          </StatCard>
          <StatCard label="Total runs" sub={`${score.failedRuns} failed`}>
            <div className="text-[40px] font-black tracking-[-0.04em] leading-none tabular-nums">{score.totalRuns}</div>
          </StatCard>
        </div>

        {/* history */}
        <div className="rounded-xl border border-white/[0.06] bg-[#0d0d12] p-5 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-zinc-500">Last 20 runs</div>
            <div className="flex items-center gap-3 font-mono text-[10px] text-zinc-600">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />pass</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" />fail</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[9px] text-zinc-700 uppercase tracking-wider shrink-0">old</span>
            <HistoryDots history={history} />
            <span className="font-mono text-[9px] text-zinc-700 uppercase tracking-wider shrink-0">new</span>
          </div>
        </div>

        {/* AI analysis */}
        {analysis ? (
          <div className="rounded-2xl border border-blue-500/15 bg-gradient-to-b from-blue-500/[0.05] to-transparent overflow-hidden mb-8">
            {/* model attribution bar */}
            <div className="flex items-center gap-3 px-6 py-3.5 border-b border-white/[0.06] bg-white/[0.015]">
              <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/25 flex items-center justify-center shrink-0">
                <Sparkles size={14} className="text-blue-300" />
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] font-semibold leading-none">AI Root Cause Analysis</span>
                <span className="font-mono text-[10px] text-zinc-500 mt-1.5">by claude · {aiModel}</span>
              </div>
              <div className="ml-auto flex items-center gap-2.5 font-mono text-[10px] text-zinc-600">
                {analysis.durationMs && <><span>{(analysis.durationMs / 1000).toFixed(1)}s</span><span className="text-zinc-700">·</span></>}
                <span>{timeAgo(analysis.updatedAt)}</span>
              </div>
            </div>

            <div className="p-6 flex flex-col gap-5">
              {/* verdict row */}
              <div className="flex items-center gap-4 flex-wrap">
                <span className={`font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md border ${rc.cls}`}>{rc.label}</span>
                <div className="flex items-center gap-2">
                  <ConfidenceMeter level={analysis.confidence} />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">{analysis.confidence} confidence</span>
                </div>
              </div>

              {/* one-line verdict */}
              {aiSummary && <p className="text-[16px] text-zinc-100 leading-snug font-medium tracking-[-0.01em]">{aiSummary}</p>}

              {/* reasoning */}
              <p className="text-[13.5px] text-zinc-400 leading-relaxed">{analysis.explanation}</p>

              {/* correlated signals */}
              {aiSignals.length > 0 && (
                <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                  <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-zinc-500 mb-3">What Keel correlated</div>
                  <div className="flex flex-col gap-2.5">
                    {aiSignals.map((s, i) => {
                      const Ic = SIGNAL_ICONS[s.icon] ?? TrendingUp
                      return (
                        <div key={i} className="flex items-start gap-2.5 text-[12.5px] text-zinc-300 leading-relaxed">
                          <Ic size={13} className="text-zinc-500 mt-0.5 shrink-0" />
                          <span>{s.text}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* suggested fix */}
              <div>
                <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-blue-300 mb-2">Suggested fix</div>
                <SuggestedFix text={analysis.suggestedFix} filePath={analysis.fixFilePath || score.filePath} />
              </div>

              {/* evidence */}
              <div>
                <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-zinc-500 mb-2">Failure evidence</div>
                <CodeBlock text={analysis.codeEvidence} highlight={analysis.evidenceHighlight} />
              </div>

              {/* feedback */}
              <div className="flex items-center gap-4 pt-1">
                <span className="font-mono text-[10px] text-zinc-600">Was this helpful?</span>
                <button className="font-mono text-[10px] text-zinc-500 hover:text-emerald-400 transition-colors">↑ yes</button>
                <button className="font-mono text-[10px] text-zinc-500 hover:text-red-400 transition-colors">↓ no</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12] p-6 mb-8">
            <div className="flex items-center gap-2 mb-5">
              <Sparkles size={15} className="text-blue-300" />
              <h2 className="text-[15px] font-bold tracking-tight">AI Root Cause Analysis</h2>
            </div>
            <div className="flex flex-col items-start gap-4 py-2">
              <p className="text-[13px] text-zinc-500">No AI analysis yet for this test.</p>
              <button onClick={runAnalysis} disabled={analysing}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-70 text-white text-[13px] font-semibold transition-colors">
                {analysing
                  ? <><Loader2 size={14} className="animate-spin" />Analysing…</>
                  : <><Sparkles size={14} />Run AI Analysis</>}
              </button>
              {analysing && <p className="font-mono text-[10px] text-zinc-600">Polling for results every 3s — Claude is reading the failure logs…</p>}
            </div>
          </div>
        )}

        {/* quarantine */}
        <div className="rounded-xl border border-white/[0.06] bg-[#0d0d12] p-6 mb-8">
          {prUrl ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0"><CheckCircle2 size={16} className="text-emerald-400" /></div>
              <div className="flex-1">
                <div className="text-[14px] text-zinc-200 font-medium">Quarantine PR opened</div>
                <a href={prUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-mono text-[12px] text-blue-400 hover:text-blue-300 transition-colors">
                  {prUrl.replace('https://', '')} <ExternalLink size={11} />
                </a>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="text-[14px] font-medium text-zinc-200 mb-0.5">Unblock your pipeline</div>
                <div className="text-[12px] text-zinc-500">Open a PR that skips this test until it&apos;s fixed.</div>
              </div>
              <button onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/40 text-red-400 hover:bg-red-500/10 text-[13px] font-semibold transition-colors">
                <Ban size={14} />Quarantine this test
              </button>
            </div>
          )}
        </div>

        {/* recent failures */}
        <div>
          <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-zinc-500 mb-4">Recent failures</div>
          <div className="flex flex-col gap-3">
            {failures.length
              ? failures.map((run, i) => <FailureRow key={i} run={run} />)
              : <div className="text-[13px] text-zinc-600 font-mono">No recorded failures in the last 20 runs.</div>}
          </div>
        </div>
      </div>

      {showModal && <ConfirmModal onConfirm={confirmQuarantine} onCancel={() => setShowModal(false)} busy={quarantining} />}
    </div>
  )
}
