import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isProtected = createRouteMatcher(['/dashboard(.*)'])

const TRIAL_MS = 14 * 24 * 60 * 60 * 1000

type ClerkMeta = {
  plan?: string
  onboarded?: boolean
  trialStartedAt?: string
}

export default clerkMiddleware(async (auth, req) => {
  if (!isProtected(req)) return

  const authObj = await auth()

  if (!authObj.userId) {
    return authObj.redirectToSignIn({ returnBackUrl: req.url })
  }

  const meta = authObj.sessionClaims?.publicMetadata as ClerkMeta | undefined

  // Not onboarded yet → send to onboarding
  if (!meta?.onboarded) {
    return NextResponse.redirect(new URL('/onboarding', req.url))
  }

  // Paid team plan → always allow
  if (meta.plan === 'team') return

  // Free trial: check if still within 14 days
  if (meta.trialStartedAt) {
    const trialEnd = new Date(new Date(meta.trialStartedAt).getTime() + TRIAL_MS)
    if (new Date() < trialEnd) return
  } else {
    // onboarded but trialStartedAt missing (Clerk patch failed at onboard time) → allow through
    return
  }

  // Trial expired, not on team plan → upgrade wall
  return NextResponse.redirect(new URL('/upgrade', req.url))
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
