import { SignUp } from '@clerk/nextjs'
import Link from 'next/link'

const appearance = {
  variables: {
    colorBackground: '#0d0d12',
    colorText: '#fafafa',
    colorPrimary: '#3b82f6',
    colorInputBackground: '#0a0a0e',
    colorInputText: '#fafafa',
    colorNeutral: '#52525b',
    borderRadius: '0.75rem',
    colorDanger: '#ef4444',
    colorTextSecondary: '#a1a1aa',
    fontFamily: 'inherit',
    fontSize: '14px',
  },
  elements: {
    card: 'shadow-none bg-transparent p-0',
    cardBox: 'shadow-none rounded-2xl border border-white/[0.08] bg-[#0d0d12]',
    socialButtonsBlockButton: 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] text-white transition-colors',
    socialButtonsBlockButtonText: 'text-zinc-300 font-medium',
    dividerLine: 'bg-white/[0.06]',
    dividerText: 'text-zinc-600 text-xs',
    formFieldInput: 'bg-[#0a0a0e] border-white/[0.1] text-white rounded-lg focus:border-blue-500/50',
    formFieldLabel: 'text-zinc-400 text-xs font-medium',
    formButtonPrimary: 'bg-white text-black hover:bg-zinc-100 font-semibold transition-colors rounded-xl',
    footerActionLink: 'text-blue-400 hover:text-blue-300 transition-colors',
    footerActionText: 'text-zinc-600',
    headerTitle: 'text-white font-black tracking-tight text-xl',
    headerSubtitle: 'text-zinc-500 text-sm',
    identityPreviewText: 'text-zinc-300',
    identityPreviewEditButton: 'text-zinc-500',
    alertText: 'text-sm',
    formFieldSuccessText: 'text-green-400 text-xs',
    formFieldErrorText: 'text-red-400 text-xs',
    otpCodeFieldInput: 'bg-[#0a0a0e] border-white/[0.1] text-white',
  },
}

export default function SignUpPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16 bg-[#07070a] text-white relative">
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none"
        style={{
          maskImage: 'radial-gradient(ellipse at 50% 20%, #000 20%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 20%, #000 20%, transparent 70%)',
        }} />
      <div className="absolute inset-x-0 top-0 h-[360px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 50% 80% at 50% 0%, rgba(59,130,246,0.1), transparent 70%)' }} />

      <Link href="/" className="relative flex items-center gap-2 mb-10 group">
        <span className="font-black text-[28px] tracking-[-0.06em]">Keel</span>
        <span className="font-mono text-[9px] tracking-[0.18em] text-zinc-500 mt-1.5 uppercase">v.1</span>
      </Link>

      <div className="relative w-full max-w-[420px]">
        <div className="text-center mb-7">
          <h1 className="text-[32px] font-black tracking-[-0.04em] leading-[0.98] mb-2">
            Start for free
          </h1>
          <p className="text-[14px] text-zinc-500">
            Detect flaky tests across your CI in 2 minutes.
          </p>
        </div>

        <SignUp
          appearance={appearance}
          afterSignUpUrl="/onboarding"
          signInUrl="/sign-in"
        />

        <p className="text-center text-[13px] text-zinc-600 mt-6">
          Already have an account?{' '}
          <Link href="/sign-in" className="text-blue-400 hover:text-blue-300 transition-colors">
            Sign in
          </Link>
        </p>

        <p className="text-center text-[11px] text-zinc-700 mt-4 leading-relaxed">
          By signing up you agree to our{' '}
          <Link href="/privacy" className="text-zinc-500 hover:text-zinc-300 transition-colors">Privacy Policy</Link>
          {' '}and{' '}
          <Link href="/terms" className="text-zinc-500 hover:text-zinc-300 transition-colors">Terms of Service</Link>.
        </p>
      </div>
    </main>
  )
}
