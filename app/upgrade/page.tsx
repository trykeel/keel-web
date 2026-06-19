'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useUser, useAuth } from '@clerk/nextjs'
import { Zap, Check, Loader2, ArrowLeft } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const FEATURES = [
  'AI root cause analysis — Claude explains every flake',
  'Auto-quarantine PRs — fix opens automatically',
  'Cost estimator — dollar cost per test per year',
  'Up to 3 watched branches per repo',
  '20 repos · 90-day history',
  'Slack digest — daily flakiness summary',
]

export default function UpgradePage() {
  const { user } = useUser()
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [orgId, setOrgId] = useState('')

  useEffect(() => {
    async function fetchOrg() {
      try {
        const token = await getToken()
        const res = await fetch(`${API_URL}/billing/plan`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (data.orgId) setOrgId(data.orgId)
      } catch {}
    }
    fetchOrg()
  }, [getToken])

  async function handleUpgrade() {
    if (!orgId) {
      setError('No workspace found. Please complete onboarding first.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const token = await getToken()
      const res = await fetch(`${API_URL}/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orgId, email: user?.primaryEmailAddress?.emailAddress ?? '' }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError('Could not start checkout. Please try again.')
        setLoading(false)
      }
    } catch {
      setError('Could not reach the API. Please try again.')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-[#07070a] text-white relative">
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none"
        style={{
          maskImage: 'radial-gradient(ellipse at 50% 30%, #000 20%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 30%, #000 20%, transparent 70%)',
        }} />
      <div className="absolute inset-x-0 top-0 h-[500px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 80% at 50% 0%, rgba(59,130,246,0.12), transparent 70%)' }} />

      <div className="relative w-full max-w-[460px]">
        <Link href="/" className="flex items-center gap-2 mb-10 text-zinc-500 hover:text-zinc-300 transition-colors text-[13px]">
          <ArrowLeft size={13} /> Back to home
        </Link>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500/[0.12] border border-blue-500/25 mb-6">
            <Zap size={24} className="text-blue-400" />
          </div>
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-zinc-500 mb-3">Team plan</p>
          <h1 className="text-[42px] font-black tracking-[-0.04em] leading-[0.96] mb-3">
            Stop losing time to{' '}
            <span className="serif-italic font-normal text-blue-400">flaky tests.</span>
          </h1>
          <p className="text-[14px] text-zinc-400 leading-relaxed">
            The dashboard requires a Team subscription. Upgrade to unlock AI root cause analysis, auto-quarantine PRs, and full cost visibility.
          </p>
        </div>

        <div className="bg-[#0a0a0e] border border-white/[0.08] rounded-2xl p-7 shadow-[0_30px_120px_-40px_rgba(59,130,246,0.3)]">
          <div className="flex items-baseline gap-1.5 mb-6">
            <span className="text-[15px] text-zinc-500 self-start mt-2">$</span>
            <span className="text-[56px] font-black tracking-[-0.05em] leading-none">299</span>
            <span className="text-zinc-500 text-[13px] font-mono">/mo</span>
          </div>

          <ul className="space-y-3 mb-7">
            {FEATURES.map(f => (
              <li key={f} className="flex items-center gap-3 text-[13px] text-zinc-300">
                <div className="w-5 h-5 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0">
                  <Check size={10} className="text-blue-400" />
                </div>
                {f}
              </li>
            ))}
          </ul>

          {error && (
            <p className="text-[12px] text-red-400 bg-red-500/[0.08] border border-red-500/20 rounded-lg px-4 py-2.5 mb-4">
              {error}
            </p>
          )}

          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-[14px] font-semibold text-white disabled:opacity-60 transition-opacity"
            style={{ background: 'linear-gradient(120deg, rgba(59,130,246,0.9), rgba(139,92,246,0.9))' }}
          >
            {loading
              ? <><Loader2 size={15} className="animate-spin" />Redirecting to Stripe…</>
              : <><Zap size={15} />Start 14-day free trial</>
            }
          </button>

          <p className="text-center text-[11px] text-zinc-600 mt-4">
            Cancel anytime · No credit card required during trial
          </p>
        </div>
      </div>
    </main>
  )
}
