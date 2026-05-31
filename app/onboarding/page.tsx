'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import {
  Check, Copy, ArrowRight, Loader2, KeyRound,
  CheckCircle2, Github, AlertCircle, GitBranch, Lock, Search,
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const YAML_SNIPPET = `- name: Report to Keel
  uses: trykeel/keel-action@v1
  with:
    api-key: \${{ secrets.KEEL_API_KEY }}
    test-results-path: ./test-results/**/*.xml`

type GithubRepo = {
  id: number
  name: string
  fullName: string
  defaultBranch: string
  private: boolean
  ownerId: number
  ownerLogin: string
}

type GithubBranch = {
  name: string
  isDefault: boolean
}

type OnboardResponse = {
  orgId: string
  repoId: string
  apiKey: string
  note: string
}


function OnboardingInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoaded } = useUser()

  const [checking, setChecking] = useState(true)
  const [step, setStep] = useState<'connect' | 'repo' | 'branches' | 'submitting' | 'success' | 'already'>('connect')
  const [repos, setRepos] = useState<GithubRepo[]>([])
  const [loadingRepos, setLoadingRepos] = useState(false)
  const [selectedRepo, setSelectedRepo] = useState<GithubRepo | null>(null)
  const [branches, setBranches] = useState<GithubBranch[]>([])
  const [selectedBranches, setSelectedBranches] = useState<string[]>([])
  const [ghToken, setGhToken] = useState('')
  const [loadingBranches, setLoadingBranches] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<OnboardResponse | null>(null)
  const [copied, setCopied] = useState<'key' | 'yaml' | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [repoSearch, setRepoSearch] = useState('')

  // Plan limit — starter = 1 branch, team = 3
  const branchLimit = 1

  useEffect(() => {
    if (localStorage.getItem('keelOrgId')) {
      setStep('already')
      setChecking(false)
      return
    }

    const errorParam = searchParams.get('error')
    if (errorParam) {
      const messages: Record<string, string> = {
        no_code: 'GitHub authorization was cancelled.',
        auth_failed: 'GitHub authentication failed. Please try again.',
        repos_failed: 'Could not fetch your repositories. Please try again.',
      }
      setError(messages[errorParam] || 'Something went wrong. Please try again.')
      setChecking(false)
      return
    }

    const token = searchParams.get('gh_token')

    if (token) {
      setGhToken(token)
      setStep('repo')
      setLoadingRepos(true)
      fetch(`${API_URL}/api/github/repos?gh_token=${encodeURIComponent(token)}`)
        .then(r => r.json())
        .then(data => {
          if (data.error) {
            setError('GitHub authorization failed — make sure you created a GitHub OAuth App (not a GitHub App) and the Client ID/Secret on Render are correct.')
            return
          }
          const list = Array.isArray(data.repos) ? data.repos : []
          setRepos(list)
          if (list.length === 0) {
            setError('No repositories found. Your GitHub account may not have any repos, or the OAuth App may not have access. Try reconnecting.')
          }
        })
        .catch(() => setError('Could not reach the Keel API. Check that the Render service is running.'))
        .finally(() => setLoadingRepos(false))
    }

    setChecking(false)
  }, [router, searchParams])

  const handleConnectGitHub = useCallback(async () => {
    setConnecting(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/api/github/authorize`)
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError('Could not get GitHub authorization URL. Please try again.')
        setConnecting(false)
      }
    } catch {
      setError('Could not reach Keel API. Please try again.')
      setConnecting(false)
    }
  }, [])

  const handleRepoSelect = useCallback(async (repo: GithubRepo) => {
    setSelectedRepo(repo)
    setSelectedBranches([repo.defaultBranch])
    setLoadingBranches(true)
    setStep('branches')
    setError('')

    try {
      const [owner, repoName] = repo.fullName.split('/')
      const res = await fetch(
        `${API_URL}/api/github/branches?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repoName)}&gh_token=${encodeURIComponent(ghToken)}`
      )
      const data = await res.json()
      setBranches(data.branches || [])
    } catch {
      setError('Could not fetch branches. Please try again.')
      setBranches([])
    } finally {
      setLoadingBranches(false)
    }
  }, [ghToken])

  function toggleBranch(name: string) {
    setSelectedBranches(prev => {
      if (prev.includes(name)) {
        if (prev.length === 1) return prev // always keep at least one
        return prev.filter(b => b !== name)
      }
      if (prev.length >= branchLimit) return prev // plan limit
      return [...prev, name]
    })
  }

  async function handleSubmit() {
    if (!selectedRepo || selectedBranches.length === 0 || !user) return
    setStep('submitting')
    setError('')

    try {
      const res = await fetch(`${API_URL}/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clerkUserId: user.id,
          githubOrgId: selectedRepo.ownerId,
          githubOrgName: selectedRepo.ownerLogin,
          githubRepoId: selectedRepo.id,
          repoName: selectedRepo.name,
          repoFullName: selectedRepo.fullName,
          defaultBranch: selectedRepo.defaultBranch,
          watchedBranches: selectedBranches,
          githubToken: ghToken,
        }),
      })

      if (!res.ok) throw new Error(`Onboarding failed (${res.status})`)
      const data: OnboardResponse = await res.json()

      localStorage.setItem('keelOrgId', data.orgId)
      localStorage.setItem('keelRepoId', data.repoId)
      localStorage.setItem('keelOrgName', selectedRepo.ownerLogin)
      localStorage.setItem('keelRepoName', selectedRepo.name)
      setResult(data)
      setStep('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setStep('branches')
    }
  }

  function copy(text: string, which: 'key' | 'yaml') {
    navigator.clipboard.writeText(text)
    setCopied(which)
    setTimeout(() => setCopied(null), 1800)
  }

  if (checking || !isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#07070a]">
        <Loader2 size={20} className="text-zinc-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-16 relative bg-[#07070a] text-white">
      <div className="absolute inset-0 grid-bg opacity-50"
        style={{
          maskImage: 'radial-gradient(ellipse at 50% 20%, #000 20%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 20%, #000 20%, transparent 70%)',
        }} />
      <div className="absolute inset-x-0 top-0 h-[400px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 50% 100% at 50% 0%, rgba(59,130,246,0.12), transparent 70%)' }} />

      <Link href="/" className="relative flex items-center gap-2 mb-12">
        <span className="font-black text-[28px] tracking-[-0.06em]">Keel</span>
        <span className="font-mono text-[9px] tracking-[0.18em] text-zinc-500 mt-1.5 uppercase">v.1</span>
      </Link>

      <div className="relative w-full max-w-[480px]">

        {/* ── STEP: ALREADY CONNECTED ── */}
        {step === 'already' && (
          <>
            <div className="text-center mb-9">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500/[0.12] border border-blue-500/25 mb-6">
                <CheckCircle2 size={26} className="text-blue-400" />
              </div>
              <h1 className="text-[36px] font-black tracking-[-0.04em] leading-[1] mb-3">
                Already <span className="serif-italic font-normal text-blue-400">connected.</span>
              </h1>
              <p className="text-[14px] text-zinc-500 leading-relaxed max-w-sm mx-auto">
                You have a workspace set up for{' '}
                <span className="font-mono text-zinc-300">
                  {localStorage.getItem('keelOrgName') || 'your org'}/{localStorage.getItem('keelRepoName') || 'your repo'}
                </span>.
              </p>
            </div>
            <div className="bg-[#0a0a0e] border border-white/[0.08] rounded-2xl p-7 flex flex-col gap-4 shadow-[0_30px_120px_-40px_rgba(59,130,246,0.4)]">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-black text-[14px] font-semibold hover:bg-zinc-100 transition-colors"
              >
                Go to dashboard <ArrowRight size={14} />
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('keelOrgId')
                  localStorage.removeItem('keelRepoId')
                  localStorage.removeItem('keelOrgName')
                  localStorage.removeItem('keelRepoName')
                  setStep('connect')
                }}
                className="flex items-center justify-center gap-2 py-3 rounded-xl border border-white/[0.08] text-[13px] text-zinc-400 hover:bg-white/[0.04] transition-colors"
              >
                Connect a different repo
              </button>
            </div>
          </>
        )}

        {/* ── STEP: CONNECT ── */}
        {(step === 'connect') && (
          <>
            <div className="text-center mb-9">
              <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-zinc-500 mb-4">Step 1 of 3 — Connect GitHub</p>
              <h1 className="text-[40px] font-black tracking-[-0.04em] leading-[0.98] mb-3">
                Point Keel at your<br />
                <span className="serif-italic font-normal text-zinc-400">first repository.</span>
              </h1>
              <p className="text-[14px] text-zinc-500 leading-relaxed max-w-sm mx-auto">
                Connect your GitHub account so Keel can see your repos and branches.
              </p>
            </div>

            <div className="bg-[#0a0a0e] border border-white/[0.08] rounded-2xl p-7 flex flex-col gap-5 shadow-[0_30px_120px_-40px_rgba(59,130,246,0.4)]">
              {error && (
                <div className="flex items-start gap-2 bg-red-500/[0.08] border border-red-500/20 rounded-xl px-4 py-3 text-[13px] text-red-300">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              <button
                onClick={handleConnectGitHub}
                disabled={connecting}
                className="flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-white text-black text-[14px] font-semibold hover:bg-zinc-100 transition-colors disabled:opacity-60"
              >
                {connecting
                  ? <><Loader2 size={15} className="animate-spin" />Connecting…</>
                  : <><Github size={16} />Connect GitHub</>}
              </button>
              <p className="text-center text-[12px] text-zinc-600 leading-relaxed">
                We request <span className="text-zinc-400">repo</span> and <span className="text-zinc-400">read:org</span> scopes only.<br />
                We never push code or delete anything.
              </p>
            </div>
          </>
        )}

        {/* ── STEP: REPO PICKER ── */}
        {step === 'repo' && (
          <>
            <div className="text-center mb-9">
              <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-zinc-500 mb-4">Step 2 of 3 — Pick a repository</p>
              <h1 className="text-[36px] font-black tracking-[-0.04em] leading-[0.98] mb-3">
                Which repo should<br />
                <span className="serif-italic font-normal text-zinc-400">Keel watch?</span>
              </h1>
              <p className="text-[14px] text-zinc-500">Select the repo where your CI runs tests.</p>
            </div>

            <div className="bg-[#0a0a0e] border border-white/[0.08] rounded-2xl p-7 shadow-[0_30px_120px_-40px_rgba(59,130,246,0.4)]">
              {loadingRepos ? (
                <div className="flex items-center justify-center gap-2 py-10 text-zinc-600">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-[13px]">Loading your repositories…</span>
                </div>
              ) : (<>
              {/* search */}
              <div className="relative mb-3">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search repos…"
                  value={repoSearch}
                  onChange={e => setRepoSearch(e.target.value)}
                  className="w-full bg-[#0c0c12] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-[13px] text-zinc-200 placeholder-zinc-600 outline-none focus:border-blue-500/40 transition-colors"
                />
              </div>
              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1 -mr-1">
                {repos.filter(r => r.fullName.toLowerCase().includes(repoSearch.toLowerCase())).length === 0 && (
                  <div className="text-center py-8 text-[13px] text-zinc-600">
                    No repos found for &ldquo;{repoSearch}&rdquo;
                  </div>
                )}
                {repos.filter(r => r.fullName.toLowerCase().includes(repoSearch.toLowerCase())).map(repo => (
                  <button
                    key={repo.id}
                    onClick={() => handleRepoSelect(repo)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] hover:border-blue-500/30 transition-all text-left group"
                  >
                    <Github size={14} className="text-zinc-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] text-zinc-200 font-medium truncate">{repo.fullName}</div>
                      <div className="text-[11px] text-zinc-600 font-mono mt-0.5">{repo.defaultBranch}</div>
                    </div>
                    {repo.private && <Lock size={11} className="text-zinc-600 shrink-0" />}
                    <ArrowRight size={13} className="text-zinc-700 group-hover:text-zinc-400 transition-colors shrink-0" />
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-zinc-700 mt-3 text-center">
                {repos.length} repos loaded · Don&apos;t see yours?{' '}
                <button
                  onClick={handleConnectGitHub}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors underline underline-offset-2"
                >
                  Reconnect GitHub
                </button>
              </p>
              </>)}
            </div>
          </>
        )}

        {/* ── STEP: BRANCH PICKER ── */}
        {step === 'branches' && selectedRepo && (
          <>
            <div className="text-center mb-9">
              <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-zinc-500 mb-4">Step 3 of 3 — Watched branches</p>
              <h1 className="text-[36px] font-black tracking-[-0.04em] leading-[0.98] mb-3">
                Which branches<br />
                <span className="serif-italic font-normal text-zinc-400">should we score?</span>
              </h1>
              <p className="text-[14px] text-zinc-500">
                Only selected branches affect flakiness scores.{' '}
                <span className="text-zinc-600 font-mono text-[12px]">{selectedRepo.fullName}</span>
              </p>
            </div>

            <div className="bg-[#0a0a0e] border border-white/[0.08] rounded-2xl p-7 flex flex-col gap-5 shadow-[0_30px_120px_-40px_rgba(59,130,246,0.4)]">

              {loadingBranches ? (
                <div className="flex items-center justify-center py-8 gap-2 text-zinc-600">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-[13px]">Fetching branches…</span>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto pr-1 -mr-1">
                    {branches.map(branch => {
                      const selected = selectedBranches.includes(branch.name)
                      const atLimit = selectedBranches.length >= branchLimit && !selected
                      return (
                        <button
                          key={branch.name}
                          onClick={() => toggleBranch(branch.name)}
                          disabled={atLimit}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                            selected
                              ? 'border-blue-500/40 bg-blue-500/[0.08]'
                              : atLimit
                              ? 'border-white/[0.04] bg-white/[0.01] opacity-40 cursor-not-allowed'
                              : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12]'
                          }`}
                        >
                          <GitBranch size={13} className={selected ? 'text-blue-400' : 'text-zinc-600'} />
                          <span className={`flex-1 text-[13px] font-mono ${selected ? 'text-zinc-200' : 'text-zinc-400'}`}>
                            {branch.name}
                          </span>
                          {branch.isDefault && (
                            <span className="text-[10px] font-mono text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">default</span>
                          )}
                          {selected && <Check size={13} className="text-blue-400 shrink-0" />}
                        </button>
                      )
                    })}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-600 font-mono -mt-1">
                    <span>{selectedBranches.length}/{branchLimit} branch selected</span>
                    <Link href="#pricing" className="text-blue-400 hover:text-blue-300 transition-colors">
                      Starter plan · upgrade for more →
                    </Link>
                  </div>
                  {selectedBranches.length >= branchLimit && (
                    <p className="text-[12px] text-zinc-600 bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-2.5">
                      Starter allows <span className="text-zinc-400">1 watched branch</span>. Upgrade to Team to score up to 3 branches.
                    </p>
                  )}

                  {error && (
                    <div className="flex items-start gap-2 bg-red-500/[0.08] border border-red-500/20 rounded-xl px-4 py-3 text-[13px] text-red-300">
                      <AlertCircle size={15} className="shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => { setStep('repo'); setSelectedRepo(null); setBranches([]) }}
                      className="px-4 py-3 rounded-xl border border-white/[0.08] text-[13px] text-zinc-400 hover:bg-white/[0.04] transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={selectedBranches.length === 0}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-black text-[14px] font-semibold hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Create workspace <ArrowRight size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* ── STEP: SUBMITTING ── */}
        {step === 'submitting' && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 size={28} className="text-blue-400 animate-spin" />
            <p className="text-[14px] text-zinc-500">Setting up your workspace…</p>
          </div>
        )}

        {/* ── STEP: SUCCESS ── */}
        {step === 'success' && result && (
          <>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-green-500/[0.12] border border-green-500/25 mb-6">
                <CheckCircle2 size={26} className="text-green-400" />
              </div>
              <h1 className="text-[36px] font-black tracking-[-0.04em] leading-[1] mb-3">
                You&apos;re <span className="serif-italic font-normal text-green-400">in.</span>
              </h1>
              <p className="text-[14px] text-zinc-500 leading-relaxed max-w-sm mx-auto">
                Workspace created for{' '}
                <span className="font-mono text-zinc-300">{selectedRepo?.fullName}</span>.
              </p>
            </div>

            <div className="bg-[#0a0a0e] border border-white/[0.08] rounded-2xl p-7 flex flex-col gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <KeyRound size={13} className="text-amber-300" />
                  <span className="text-[13px] text-zinc-300 font-medium">Your API key</span>
                  <span className="ml-auto font-mono text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full tracking-wide uppercase">Shown once</span>
                </div>
                <div className="flex items-stretch gap-2">
                  <div className="flex-1 bg-[#0c0c12] border border-white/[0.08] rounded-xl px-4 py-3 font-mono text-[12px] text-zinc-300 break-all leading-relaxed">
                    {result.apiKey}
                  </div>
                  <button
                    onClick={() => copy(result.apiKey, 'key')}
                    className="shrink-0 px-4 rounded-xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] transition-colors flex items-center gap-1.5 text-[12px] text-zinc-300 font-medium"
                  >
                    {copied === 'key' ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                    {copied === 'key' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="font-mono text-[10px] text-zinc-600 mt-2.5">{result.note}</p>
              </div>

              <div className="border-t border-white/[0.06] pt-6">
                <p className="text-[13px] text-zinc-400 leading-relaxed mb-3">
                  Add to your GitHub repo as a secret named{' '}
                  <span className="font-mono text-[12px] text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded">KEEL_API_KEY</span>
                  <span className="text-zinc-600"> (Settings → Secrets → Actions).</span>
                </p>
                <div className="rounded-xl bg-[#0c0c12] border border-white/[0.08] overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] bg-[#0e0e14]">
                    <span className="font-mono text-[10px] text-zinc-600 tracking-wider">.GITHUB/WORKFLOWS/CI.YML</span>
                    <button onClick={() => copy(YAML_SNIPPET, 'yaml')}
                      className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors">
                      {copied === 'yaml' ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
                      {copied === 'yaml' ? 'copied' : 'copy'}
                    </button>
                  </div>
                  <pre className="p-4 m-0 font-mono text-[11.5px] leading-[1.7] overflow-x-auto">
                    <span className="text-zinc-500">- name:</span><span className="text-zinc-300"> Report to Keel</span>{'\n'}
                    <span className="text-zinc-500">  uses:</span><span className="text-blue-300"> trykeel/keel-action@v1</span>{'\n'}
                    <span className="text-zinc-500">  with:</span>{'\n'}
                    <span className="text-green-300">    api-key:</span><span className="text-amber-300"> {'${{ secrets.KEEL_API_KEY }}'}</span>{'\n'}
                    <span className="text-green-300">    test-results-path:</span><span className="text-zinc-300"> ./test-results/**/*.xml</span>
                  </pre>
                </div>
              </div>

              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-black text-[14px] font-semibold hover:bg-zinc-100 transition-colors"
              >
                Go to dashboard <ArrowRight size={14} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#07070a]">
        <Loader2 size={20} className="text-zinc-600 animate-spin" />
      </div>
    }>
      <OnboardingInner />
    </Suspense>
  )
}
