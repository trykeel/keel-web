'use client'

import { useState, useEffect } from 'react'
import { useClerk, useUser, useAuth } from '@clerk/nextjs'
import {
  ChevronDown, LogOut, Key, Copy, Check, RefreshCw,
  Loader2, AlertCircle, GitBranch, Eye, EyeOff,
} from 'lucide-react'
import Sidebar from '../sidebar'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

type APIKey = {
  id: string
  repoId: string | null
  label: string
  lastUsedAt: string | null
  createdAt: string
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0c0c11] overflow-hidden">
      <div className="px-6 py-4 border-b border-white/[0.06]">
        <h2 className="text-[13px] font-semibold tracking-tight">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0">
      <span className="font-mono text-[11px] text-zinc-500 uppercase tracking-[0.12em]">{label}</span>
      <span className="font-mono text-[12px] text-zinc-300">{value}</span>
    </div>
  )
}

export default function SettingsPage() {
  const { user } = useUser()
  const { getToken } = useAuth()

  const [keys, setKeys] = useState<APIKey[]>([])
  const [keysLoading, setKeysLoading] = useState(true)
  const [keysError, setKeysError] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showKey, setShowKey] = useState(false)

  const orgId = typeof window !== 'undefined' ? localStorage.getItem('keelOrgId') || '' : ''
  const repoId = typeof window !== 'undefined' ? localStorage.getItem('keelRepoId') || '' : ''
  const orgName = typeof window !== 'undefined' ? localStorage.getItem('keelOrgName') || '—' : '—'
  const repoName = typeof window !== 'undefined' ? localStorage.getItem('keelRepoName') || '—' : '—'

  async function loadKeys() {
    if (!orgId) return
    setKeysLoading(true); setKeysError(false)
    try {
      const token = await getToken()
      const r = await fetch(`${API_URL}/api-keys?orgId=${orgId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!r.ok) throw new Error()
      const d = await r.json()
      setKeys(d.keys ?? [])
    } catch { setKeysError(true) }
    finally { setKeysLoading(false) }
  }

  useEffect(() => { loadKeys() }, [orgId])

  async function generateKey() {
    if (!orgId || !repoId) return
    setGenerating(true)
    try {
      const token = await getToken()
      const res = await fetch(`${API_URL}/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orgId, repoId, label: 'default' }),
      })
      const data = await res.json()
      if (data.key) { setNewKey(data.key); setShowKey(true); loadKeys() }
    } catch {}
    finally { setGenerating(false) }
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function fmtDate(iso: string | null) {
    if (!iso) return 'Never'
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#08080b] text-white">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <div className="flex-1 overflow-y-auto px-7 py-6">
          <div className="max-w-[720px] mx-auto flex flex-col gap-5">

            <div>
              <h1 className="text-[22px] font-black tracking-tight">Settings</h1>
              <p className="text-[13px] text-zinc-500 mt-0.5">Manage your workspace, repo, and API keys</p>
            </div>

            {/* Workspace */}
            <Section title="Workspace">
              <Row label="Organisation" value={orgName} />
              <Row label="Repository" value={repoName} />
              <Row label="Plan" value={
                (user?.publicMetadata as { plan?: string })?.plan === 'team' ? 'Team' : 'Starter (free trial)'
              } />
            </Section>

            {/* API Keys */}
            <Section title="API Keys">
              <div id="api-keys" className="flex flex-col gap-4">
                <p className="text-[12px] text-zinc-500 leading-relaxed">
                  API keys are used by <span className="text-zinc-300 font-mono">keel-action</span> in your CI workflow to report test results.
                  Generating a new key immediately invalidates the previous one.
                </p>

                {/* New key reveal */}
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

                {/* Keys list */}
                {keysLoading ? (
                  <div className="flex items-center gap-2 text-zinc-600 text-[12px]">
                    <Loader2 size={13} className="animate-spin" />Loading keys…
                  </div>
                ) : keysError ? (
                  <div className="flex items-center gap-2 text-red-400 text-[12px]">
                    <AlertCircle size={13} />Could not load keys.
                    <button onClick={loadKeys} className="underline hover:no-underline">Retry</button>
                  </div>
                ) : keys.length === 0 ? (
                  <div className="flex items-center gap-2 text-zinc-600 text-[12px]">
                    <GitBranch size={13} />No keys found for this org.
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/[0.07] overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          <th className="px-4 py-3 text-left font-mono text-[10px] tracking-[0.14em] uppercase text-zinc-600 font-normal">Label</th>
                          <th className="px-4 py-3 text-left font-mono text-[10px] tracking-[0.14em] uppercase text-zinc-600 font-normal">Created</th>
                          <th className="px-4 py-3 text-left font-mono text-[10px] tracking-[0.14em] uppercase text-zinc-600 font-normal">Last used</th>
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
                  <p className="text-[12px] text-zinc-600 mt-0.5">Re-run onboarding to connect a different repo.</p>
                </div>
                <button
                  onClick={() => {
                    localStorage.removeItem('keelOrgId')
                    localStorage.removeItem('keelRepoId')
                    localStorage.removeItem('keelOrgName')
                    localStorage.removeItem('keelRepoName')
                    window.location.href = '/onboarding'
                  }}
                  className="px-4 py-2 rounded-xl border border-red-500/30 text-[12px] text-red-400 hover:bg-red-500/10 transition-colors">
                  Disconnect
                </button>
              </div>
            </Section>

          </div>
        </div>
      </div>
    </div>
  )
}
