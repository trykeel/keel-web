'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, ArrowRight, Zap } from 'lucide-react'

export default function BillingSuccessPage() {
  const router = useRouter()

  useEffect(() => {
    const t = setTimeout(() => router.push('/dashboard'), 3000)
    return () => clearTimeout(t)
  }, [router])

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-[#07070a] text-white relative">
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none"
        style={{
          maskImage: 'radial-gradient(ellipse at 50% 30%, #000 20%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 30%, #000 20%, transparent 70%)',
        }} />
      <div className="absolute inset-x-0 top-0 h-[400px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 80% at 50% 0%, rgba(59,130,246,0.15), transparent 70%)' }} />

      <div className="relative w-full max-w-[440px] text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/[0.12] border border-blue-500/25 mb-8">
          <CheckCircle2 size={30} className="text-blue-400" />
        </div>

        <h1 className="text-[40px] font-black tracking-[-0.04em] leading-[0.96] mb-4">
          You&apos;re on{' '}
          <span className="serif-italic font-normal text-blue-400">Team.</span>
        </h1>

        <p className="text-[15px] text-zinc-400 leading-relaxed mb-8">
          Your workspace is now upgraded. You have access to AI root cause analysis,
          auto-quarantine PRs, cost estimator, and up to 3 watched branches.
        </p>

        <div className="bg-[#0a0a0e] border border-white/[0.08] rounded-2xl p-6 mb-8 text-left space-y-3">
          {[
            'AI root cause analysis — Claude explains every flake',
            'Auto-quarantine PRs — fixes open automatically',
            'Cost estimator — dollar cost per test per year',
            'Up to 3 watched branches per repo',
            '20 repos · 90-day history',
          ].map(f => (
            <div key={f} className="flex items-center gap-3 text-[13px] text-zinc-300">
              <div className="w-5 h-5 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0">
                <Zap size={10} className="text-blue-400" />
              </div>
              {f}
            </div>
          ))}
        </div>

        <Link
          href="/dashboard"
          className="flex items-center justify-center gap-2 py-3.5 rounded-full bg-white text-black text-[14px] font-semibold hover:bg-zinc-100 transition-colors"
        >
          Go to dashboard <ArrowRight size={14} />
        </Link>

        <p className="text-[12px] text-zinc-600 mt-4">
          Redirecting to dashboard in a moment…
        </p>
      </div>
    </main>
  )
}
