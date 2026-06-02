import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isProtected = createRouteMatcher(['/dashboard(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) {
    const authObj = await auth()

    if (!authObj.userId) {
      return authObj.redirectToSignIn({ returnBackUrl: req.url })
    }

    const meta = authObj.sessionClaims?.publicMetadata as { plan?: string } | undefined
    if (meta?.plan !== 'team') {
      return NextResponse.redirect(new URL('/upgrade', req.url))
    }
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
