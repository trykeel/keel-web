'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser, useAuth } from '@clerk/nextjs'
import {
  LayoutDashboard, TrendingUp, DollarSign, Settings, Key,
  ChevronsLeft, Zap, Loader2,
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: TrendingUp,      label: 'Tests',     href: '/dashboard/tests' },
  { icon: DollarSign,      label: 'Costs',     href: '/dashboard/costs' },
  { icon: Settings,        label: 'Settings',  href: '/dashboard/settings' },
]

export default function Sidebar() {
  const { user } = useUser()
  const { getToken } = useAuth()
  const pathname = usePathname()
  const [upgrading, setUpgrading] = useState(false)
  const [plan, setPlan] = useState<'starter' | 'team' | 'trialing'>('trialing')
  const [daysLeft, setDaysLeft] = useState<number | null>(null)

  useEffect(() => {
    async function fetchPlan() {
      try {
        const token = await getToken()
        const res = await fetch(`${API_URL}/billing/plan`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (data.plan) setPlan(data.plan)
        if (data.plan === 'trialing') setDaysLeft(data.trialDaysLeft ?? null)
      } catch {}
    }
    fetchPlan()
  }, [getToken])

  function isActive(href: string) {
    return href === '/dashboard' ? pathname === href : pathname.startsWith(href)
  }

  async function handleUpgrade() {
    const orgId = localStorage.getItem('keelOrgId')
    if (!orgId) return
    setUpgrading(true)
    try {
      const token = await getToken()
      const res = await fetch(`${API_URL}/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orgId, email: user?.primaryEmailAddress?.emailAddress ?? '' }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      setUpgrading(false)
    }
  }

  return (
    <aside className="w-[212px] shrink-0 bg-[#0a0a0e] border-r border-white/[0.06] flex flex-col">
      <div className="flex items-center justify-between px-5 h-16 border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center font-black text-blue-300 text-[15px]">K</span>
          <span className="font-black text-[19px] tracking-[-0.05em]">Keel</span>
        </Link>
        <ChevronsLeft size={15} className="text-zinc-600 hover:text-zinc-300 cursor-pointer transition-colors" />
      </div>
      <nav className="flex-1 p-3 flex flex-col gap-1">
        {NAV_ITEMS.map(it => (
          <Link key={it.label} href={it.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-mono text-[11px] tracking-[0.12em] uppercase transition-colors ${
              isActive(it.href)
                ? 'bg-blue-500/10 text-blue-300'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
            }`}>
            <it.icon size={15} />{it.label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-white/[0.05] flex flex-col gap-3">
        <Link href="/dashboard/settings#api-keys"
          className="flex items-center gap-2 font-mono text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors">
          <Key size={13} />Manage API keys
        </Link>
        {plan === 'team' ? (
          <span className="font-mono text-[9px] tracking-[0.18em] uppercase text-blue-300 border border-blue-500/30 bg-blue-500/10 rounded-full px-2.5 py-1 w-fit">★ Team</span>
        ) : (
          <>
            {daysLeft !== null && (
              <div className={`rounded-lg px-3 py-2 text-[11px] font-mono border ${
                daysLeft <= 3
                  ? 'bg-amber-500/10 border-amber-500/25 text-amber-400'
                  : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
              }`}>
                {daysLeft === 0 ? 'Trial expired' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left in trial`}
              </div>
            )}
            <button onClick={handleUpgrade} disabled={upgrading}
              className="flex items-center justify-center gap-1.5 w-full rounded-lg py-2 text-[11px] font-semibold text-white disabled:opacity-60 transition-opacity"
              style={{ background: 'linear-gradient(120deg, rgba(59,130,246,0.85), rgba(139,92,246,0.85))' }}>
              {upgrading
                ? <><Loader2 size={11} className="animate-spin" />Redirecting…</>
                : <><Zap size={11} />Upgrade to Team</>}
            </button>
          </>
        )}
      </div>
    </aside>
  )
}
