'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useClerk, useUser, useAuth } from '@clerk/nextjs'
import {
  LogOut, Key, Copy, Check, RefreshCw, Loader2, AlertCircle,
  GitBranch, Eye, EyeOff, ChevronDown, Zap, ArrowUpRight,
} from 'lucide-react'
import Sidebar from '../sidebar'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

type APIKey = { id: string; repoId: string | null; label: string; lastUsedAt: string | null; createdAt: string }

function fmtDate(iso: string | null) {
  if (!iso) return 'Never'
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function branchLimitForPlan(plan: string) { return plan === 'team' ? 3 : 1 }
function repoLimitForPlan(plan: string)   { return plan === 'starter' ? 1 : 3 }

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0c0c11] overflow-hidden">
      <div className="px-6 py-4 border-b border-white/[0.06]">
        <h2 className="text-[13px] font-semibold tracking-tight">{title}</h2>
        {description && <p className="text-[12px] text-zinc-500 mt-0.5">{description}</p>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0">
      <span className="font-mono text-[11px] text-zinc-500 uppercase tracking-[0.12em]">{label}</span>
      <span className="font-mono text-[12px] text-zinc-300">{value}</span>
    </div>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const { user } = useUser()
  const { signOut } = useClerk()
  const { getToken } = useAuth()

  /* ── init state from /billing/plan ── */
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState('')
  const [orgName, setOrgName] = useState('')
  const [repoId, setRepoId] = useState('')
  const [repoName, setRepoName] = useState('')
  const [plan, setPlan] = useState('')
  const [repoCount, setRepoCount] = useState(0)
  const [token, setToken] = useState('')

  /* ── repo settings ── */
  const [defaultBranch, setDefaultBranch] = useState('')
  const [watchedBranches, setWatchedBranches] = useState<string[]>([])
  const [availableBranches, setAvailableBranches] = useState<string[]>([])
  const [branchesLoading, setBranchesLoading] = useState(false)
  const [savingBranches, setSavingBranches] = useState(false)
  const [branchSaved, setBranchSaved] = useState(false)
  const [branchError, setBranchError] = useState('')

  /* ── api keys ── */
  const [keys, setKeys] = useState<APIKey[]>([])
  const [keysLoading, setKeysLoading] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [copied, setCopied] = useState(false)
  const [generating, setGenerating] = useState(false)

  /* ── danger zone ── */
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)

  /* ── load plan + repo settings ── */
  useEffect(() => {
    async function init() {
      try {
        const t = await getToken()
        if (!t) { router.replace('/sign-in'); return }
        setToken(t)

        const planRes = await fetch(`${API_URL}/billing/plan`, { headers: { Authorization: `Bearer ${t}` } })
        if (!planRes.ok) throw new Error()
        const planData = await planRes.json()
        if (!planData.onboarded) { router.replace('/onboarding'); return }

        setOrgId(planData.orgId ?? '')
        setOrgName(planData.orgName ?? '')
        setRepoId(planData.repoId ?? '')
        setRepoName(planData.repoName ?? '')
        setPlan(planData.plan ?? '')
        setRepoCount((planData.repos ?? []).length)

        if (planData.repoId) {
          const settingsRes = await fetch(`${API_URL}/repos/${planData.repoId}/settings`, {
            headers: { Authorization: `Bearer ${t}` },
          })
          if (settingsRes.ok) {
            const s = await settingsRes.json()
            setDefaultBranch(s.defaultBranch ?? '')
            setWatchedBranches(s.watchedBranches ?? [])

            if (s.fullName) {
              const [owner, repo] = s.fullName.split('/')
              if (owner && repo) loadBranches(t, owner, repo)
            }
          }
        }
      } catch {
        // stay on page, show partial data
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [getToken, router])

  /* ── load api keys when orgId is set ── */
  useEffect(() => {
    if (!orgId || !token) return
    setKeysLoading(true)
    fetch(`${API_URL}/api-keys?orgId=${orgId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setKeys(d.keys ?? []))
      .catch(() => {})
      .finally(() => setKeysLoading(false))
  }, [orgId, token])

  function loadBranches(t: string, owner: string, repo: string) {
    setBranchesLoading(true)
    fetch(`${API_URL}/api/github/branches?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`, {
      headers: { Authorization: `Bearer ${t}` },
    })
      .then(r => r.json())
      .then(d => setAvailableBranches((d.branches ?? []).map((b: { name: string }) => b.name)))
      .catch(() => {})
      .finally(() => setBranchesLoading(false))
  }

  function toggleBranch(branch: string) {
    const limit = branchLimitForPlan(plan)
    setBranchError('')
    setWatchedBranches(prev => {
      if (prev.includes(branch)) {
        if (prev.length === 1) { setBranchError('At least one branch must be watched.'); return prev }
        return prev.filter(b => b !== branch)
      }
      if (prev.length >= limit) {
        setBranchError(`Your ${plan} plan allows up to ${limit} watched branch${limit === 1 ? '' : 'es'}.`)
        return prev
      }
      return [...prev, branch]
    })
  }

  async function saveBranches() {
    if (!repoId || !token) return
    setSavingBranches(true)
    setBranchError('')
    try {
      const res = await fetch(`${API_URL}/repos/${repoId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ watchedBranches }),
      })
      if (!res.ok) throw new Error()
      setBranchSaved(true)
      setTimeout(() => setBranchSaved(false), 2500)
    } catch {
      setBranchError('Failed to save. Try again.')
    } finally {
      setSavingBranches(false)
    }
  }

  async function generateKey() {
    if (!orgId || !repoId || !token) return
    setGenerating(true)
    try {
      const res = await fetch(`${API_URL}/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orgId, repoId, label: 'default' }),
      })
      const data = await res.json()
      if (data.key) {
        setNewKey(data.key)
        setShowKey(true)
        const r = await fetch(`${API_URL}/api-keys?orgId=${orgId}`, { headers: { Authorization: `Bearer ${token}` } })
        const d = await r.json()
        setKeys(d.keys ?? [])
      }
    } catch {}
    finally { setGenerating(false) }
  }

  function copyKey(k: string) {
    navigator.clipboard.writeText(k)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#08080b]">
        <Loader2 size={20} className="text-zinc-600 animate-spin" />
      </div>
    )
  }

  const branchLimit = branchLimitForPlan(plan)
  const repoLimit = repoLimitForPlan(plan)
  const planLabel = plan === 'team' ? 'Team' : plan === 'trialing' ? 'Free trial' : 'Starter'

  return (
    <div className="flex h-screen overflow-hidden bg-[#08080b] text-white">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TopBar */}
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

        <div className="flex-1 overflow-y-auto px-7 py-6">
          <div className="max-w-[720px] mx-auto flex flex-col gap-5">

            <div>
              <h1 className="text-[22px] font-black tracking-tight">Settings</h1>
              <p className="text-[13px] text-zinc-500 mt-0.5">Manage your workspace, repo, and billing</p>
            </div>

            {/* Repo settings */}
            <Section title="Repository" description="Configure which branches Keel watches for flaky tests.">
              <Row label="Repository" value={repoName} />
              <Row label="Default branch" value={defaultBranch || '—'} />

              <div className="mt-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-zinc-500 uppercase tracking-[0.12em]">Watched branches</span>
                  <span className="font-mono text-[10px] text-zinc-600">{watchedBranches.length}/{branchLimit} used</span>
                </div>

                {branchesLoading ? (
                  <div className="flex items-center gap-2 text-zinc-600 text-[12px]">
                    <Loader2 size={13} className="animate-spin" />Loading branches…
                  </div>
                ) : availableBranches.length === 0 ? (
                  <p className="text-[12px] text-zinc-600">No branches found.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availableBranches.map(b => {
                      const active = watchedBranches.includes(b)
                      return (
                        <button key={b} onClick={() => toggleBranch(b)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[11px] border transition-colors ${
                            active
                              ? 'bg-blue-500/15 border-blue-500/30 text-blue-300'
                              : 'bg-white/[0.03] border-white/[0.08] text-zinc-400 hover:border-white/[0.16] hover:text-zinc-300'
                          }`}>
                          {active && <Check size={10} />}
                          <GitBranch size={10} />
                          {b}
                        </button>
                      )
                    })}
                  </div>
                )}

                {branchError && (
                  <p className="flex items-center gap-1.5 text-[12px] text-amber-400">
                    <AlertCircle size={12} />{branchError}
                  </p>
                )}

                <div className="flex items-center gap-3 mt-1">
                  <button onClick={saveBranches} disabled={savingBranches || availableBranches.length === 0}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.1] text-[12px] font-medium text-zinc-300 hover:bg-white/[0.05] disabled:opacity-40 transition-colors">
                    {savingBranches
                      ? <><Loader2 size={12} className="animate-spin" />Saving…</>
                      : branchSaved
                      ? <><Check size={12} className="text-emerald-400" />Saved</>
                      : 'Save branches'}
                  </button>
                  {plan !== 'team' && (
                    <a href="/upgrade" className="flex items-center gap-1 font-mono text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors">
                      <ArrowUpRight size={11} />Upgrade for more branches
                    </a>
                  )}
                </div>
              </div>
            </Section>

            {/* Plan & billing */}
            <Section title="Plan & billing">
              <Row label="Plan" value={
                <span className={plan === 'team' ? 'text-blue-300' : 'text-zinc-300'}>{planLabel}</span>
              } />
              <Row label="Repositories" value={`${repoCount} / ${repoLimit}`} />
              <Row label="Branches per repo" value={`${watchedBranches.length} / ${branchLimit}`} />

              {plan !== 'team' && (
                <div className="mt-4">
                  <a href="/upgrade"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
                    style={{ background: 'linear-gradient(120deg, rgba(59,130,246,0.9), rgba(139,92,246,0.9))' }}>
                    <Zap size={12} />Upgrade to Team
                  </a>
                </div>
              )}
            </Section>

            {/* API Keys */}
            <Section title="API Keys" description="Used by keel-action in your CI workflow to report test results.">
              <div id="api-keys" className="flex flex-col gap-4">
                {newKey && (
                  <div className="rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-[12px] text-emerald-400 font-medium">
                      <Check size={13} />New key generated — save it now, it won&apos;t be shown again
                    </div>
                    <div className="flex items-stretch gap-2">
                      <div className="flex-1 bg-[#0c0c12] border border-white/[0.08] rounded-lg px-4 py-2.5 font-mono text-[12px] text-zinc-300 break-all">
                        {showKey ? newKey : '•'.repeat(32)}
                      </div>
                      <button onClick={() => setShowKey(v => !v)}
                        className="px-3 rounded-lg border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] transition-colors text-zinc-400">
                        {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                      <button onClick={() => copyKey(newKey)}
                        className="px-4 rounded-lg border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] transition-colors flex items-center gap-1.5 text-[12px] text-zinc-300 font-medium">
                        {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                )}

                {keysLoading ? (
                  <div className="flex items-center gap-2 text-zinc-600 text-[12px]">
                    <Loader2 size={13} className="animate-spin" />Loading keys…
                  </div>
                ) : keys.length === 0 ? (
                  <p className="text-[12px] text-zinc-600">No keys yet.</p>
                ) : (
                  <div className="rounded-xl border border-white/[0.07] overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          {['Label', 'Created', 'Last used'].map(h => (
                            <th key={h} className="px-4 py-3 text-left font-mono text-[10px] tracking-[0.14em] uppercase text-zinc-600 font-normal">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {keys.map(k => (
                          <tr key={k.id} className="border-t border-white/[0.04]">
                            <td className="px-4 py-3 font-mono text-[12px] text-zinc-300">{k.label || 'default'}</td>
                            <td className="px-4 py-3 font-mono text-[11px] text-zinc-500">{fmtDate(k.createdAt)}</td>
                            <td className="px-4 py-3 font-mono text-[11px] text-zinc-500">{fmtDate(k.lastUsedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <button onClick={generateKey} disabled={generating}
                  className="flex items-center gap-2 self-start px-4 py-2.5 rounded-xl border border-white/[0.1] text-[12px] font-medium text-zinc-300 hover:bg-white/[0.05] disabled:opacity-50 transition-colors">
                  {generating
                    ? <><Loader2 size={13} className="animate-spin" />Generating…</>
                    : <><RefreshCw size={13} /><Key size={13} />Generate new key</>}
                </button>
              </div>
            </Section>

            {/* Danger zone */}
            <Section title="Danger zone">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] text-zinc-300 font-medium">Disconnect repository</p>
                  <p className="text-[12px] text-zinc-600 mt-0.5">Removes this repo from Keel. You can re-onboard at any time.</p>
                </div>
                {confirmDisconnect ? (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-zinc-500">Are you sure?</span>
                    <button onClick={() => router.push('/onboarding')}
                      className="px-3 py-1.5 rounded-lg border border-red-500/40 text-[12px] text-red-400 hover:bg-red-500/10 transition-colors">
                      Yes, disconnect
                    </button>
                    <button onClick={() => setConfirmDisconnect(false)}
                      className="px-3 py-1.5 rounded-lg border border-white/[0.08] text-[12px] text-zinc-400 hover:bg-white/[0.05] transition-colors">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDisconnect(true)}
                    className="px-4 py-2 rounded-xl border border-red-500/30 text-[12px] text-red-400 hover:bg-red-500/10 transition-colors">
                    Disconnect
                  </button>
                )}
              </div>
            </Section>

          </div>
        </div>
      </div>
    </div>
  )
}
