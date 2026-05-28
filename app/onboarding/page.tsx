'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import {
  Check, Copy, ArrowRight, Loader2, KeyRound,
  CheckCircle2, Github, AlertCircle,
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const YAML_SNIPPET = `- name: Report to Keel
  uses: trykeel/keel-action@v1
  with:
    api-key: \${{ secrets.KEEL_API_KEY }}
    test-results-path: ./test-results/**/*.xml`

type OnboardResponse = {
  orgId: string
  repoId: string
  apiKey: string
  note: string
}

function Field({
  label, hint, value, onChange, placeholder,
}: {
  label: string; hint?: string; value: string
  onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[13px] text-zinc-400 font-medium">{label}</span>
        {hint && <span className="font-mono text-[10px] text-zinc-600 tracking-wide">{hint}</span>}
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#0c0c12] border border-white/[0.08] rounded-xl px-4 py-3 text-[14px] text-white placeholder:text-zinc-700 outline-none transition-colors focus:border-blue-500/50 focus:bg-[#0e0e16] font-mono"
      />
    </label>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const { user, isLoaded } = useUser()

  const [checking, setChecking] = useState(true)
  const [orgName, setOrgName] = useState('')
  const [repoName, setRepoName] = useState('')
  const [branch, setBranch] = useState('main')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<OnboardResponse | null>(null)
  const [copied, setCopied] = useState<'key' | 'yaml' | null>(null)

  // Already onboarded → straight to dashboard.
  useEffect(() => {
    if (localStorage.getItem('keelOrgId')) {
      router.replace('/dashboard')
      return
    }
    setChecking(false)
  }, [router])

  const repoFullName = orgName && repoName ? `${orgName}/${repoName}` : ''
  const valid = orgName.trim() && repoName.trim() && branch.trim()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid || loading) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${API_URL}/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clerkUserId: user?.id,
          githubOrgId: 1, // placeholder until GitHub App install wired up
          githubOrgName: orgName.trim(),
          githubRepoId: 1, // placeholder
          repoName: repoName.trim(),
          repoFullName: `${orgName.trim()}/${repoName.trim()}`,
          defaultBranch: branch.trim(),
        }),
      })

      if (!res.ok) throw new Error(`Onboarding failed (${res.status})`)
      const data: OnboardResponse = await res.json()

      localStorage.setItem('keelOrgId', data.orgId)
      localStorage.setItem('keelRepoId', data.repoId)
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
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
      {/* ambient grid + glow */}
      <div className="absolute inset-0 grid-bg opacity-50"
        style={{
          maskImage: 'radial-gradient(ellipse at 50% 20%, #000 20%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 20%, #000 20%, transparent 70%)',
        }} />
      <div className="absolute inset-x-0 top-0 h-[400px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 50% 100% at 50% 0%, rgba(59,130,246,0.12), transparent 70%)' }} />

      {/* logo */}
      <Link href="/" className="relative flex items-center gap-2 mb-12">
        <span className="font-black text-[28px] tracking-[-0.06em]">Keel</span>
        <span className="font-mono text-[9px] tracking-[0.18em] text-zinc-500 mt-1.5 uppercase">v.1</span>
      </Link>

      {!result ? (
        /* ─────────── FORM ─────────── */
        <div className="relative w-full max-w-[480px]">
          <div className="text-center mb-9">
            <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-zinc-500 mb-4">Step 1 of 1 — Connect a repo</p>
            <h1 className="text-[40px] font-black tracking-[-0.04em] leading-[0.98] mb-3">
              Point Keel at your<br />
              <span className="serif-italic font-normal text-zinc-400">first repository.</span>
            </h1>
            <p className="text-[14px] text-zinc-500 leading-relaxed max-w-sm mx-auto">
              We&apos;ll create your org, connect the repo, and mint an API key — in one step.
            </p>
          </div>

          <form onSubmit={handleSubmit}
            className="bg-[#0a0a0e] border border-white/[0.08] rounded-2xl p-7 flex flex-col gap-5 shadow-[0_30px_120px_-40px_rgba(59,130,246,0.4)]">
            <Field label="GitHub organisation" hint="e.g. acme-corp" value={orgName} onChange={setOrgName} placeholder="acme-corp" />
            <Field label="Repository name" hint="e.g. backend" value={repoName} onChange={setRepoName} placeholder="backend" />
            <Field label="Default branch" value={branch} onChange={setBranch} placeholder="main" />

            {repoFullName && (
              <div className="flex items-center gap-2 -mt-1 font-mono text-[11px] text-zinc-600">
                <Github size={12} className="text-zinc-500" />
                <span>github.com/<span className="text-zinc-400">{repoFullName}</span></span>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 bg-red-500/[0.08] border border-red-500/20 rounded-xl px-4 py-3 text-[13px] text-red-300">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!valid || loading}
              className={`mt-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-semibold transition-all ${
                valid && !loading ? 'bg-white text-black hover:bg-zinc-100' : 'bg-white/[0.08] text-zinc-500 cursor-not-allowed'
              }`}
            >
              {loading
                ? (<><Loader2 size={15} className="animate-spin" />Creating your workspace…</>)
                : (<>Create workspace <ArrowRight size={14} /></>)}
            </button>
          </form>
        </div>
      ) : (
        /* ─────────── SUCCESS ─────────── */
        <div className="relative w-full max-w-[480px]">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-green-500/[0.12] border border-green-500/25 mb-6">
              <CheckCircle2 size={26} className="text-green-400" />
            </div>
            <h1 className="text-[36px] font-black tracking-[-0.04em] leading-[1] mb-3">
              You&apos;re <span className="serif-italic font-normal text-green-400">in.</span>
            </h1>
            <p className="text-[14px] text-zinc-500 leading-relaxed max-w-sm mx-auto">
              Workspace created for <span className="font-mono text-zinc-300">{repoFullName}</span>. Here&apos;s your API key.
            </p>
          </div>

          <div className="bg-[#0a0a0e] border border-white/[0.08] rounded-2xl p-7 flex flex-col gap-6">
            {/* api key */}
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
              <p className="font-mono text-[10px] text-zinc-600 mt-2.5 leading-relaxed">{result.note}</p>
            </div>

            {/* secret + yaml */}
            <div className="border-t border-white/[0.06] pt-6">
              <p className="text-[13px] text-zinc-400 leading-relaxed mb-3">
                Add this to your GitHub repo as a secret named{' '}
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
        </div>
      )}
    </div>
  )
}
