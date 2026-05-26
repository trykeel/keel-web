import Link from 'next/link'

const features = [
  { keel: 'Yes', bp: 'Yes', label: 'Detects flaky tests' },
  { keel: 'Advanced + cost estimate', bp: 'Basic', label: 'Flakiness rate score' },
  { keel: 'Yes — 5 root cause types', bp: 'No', label: 'AI root cause analysis' },
  { keel: 'Yes — annual cost per test', bp: 'No', label: 'Dollar cost estimator' },
  { keel: 'Yes — opens GitHub PR', bp: 'No', label: 'Auto-quarantine PR' },
  { keel: 'Digest + alerts + queries', bp: 'Basic', label: 'Slack integration' },
  { keel: 'Yes — auto-creates', bp: 'No', label: 'Linear / Jira tickets' },
  { keel: 'Yes', bp: 'No', label: 'Free tier' },
  { keel: '$0 / $199 / $1,200', bp: '$160–400', label: 'Price' },
]

const steps = [
  { n: '1', title: 'Install', desc: 'Add one step to your GitHub Actions workflow. Takes 2 minutes.' },
  { n: '2', title: 'Detect', desc: 'Keel tracks every test run and scores flakiness across commits.' },
  { n: '3', title: 'Fix', desc: 'AI explains the root cause. Keel opens the quarantine PR for you.' },
]

export default function LandingPage() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px' }}>

      {/* Nav */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 0', borderBottom: '1px solid #1F2937' }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: '#3B82F6' }}>Keel</span>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <Link href="/calculator" style={{ color: '#6B7280', textDecoration: 'none', fontSize: 14 }}>ROI Calculator</Link>
          <Link href="/login" style={{ color: '#6B7280', textDecoration: 'none', fontSize: 14 }}>Sign in</Link>
          <Link href="/signup" style={{ background: '#3B82F6', color: '#fff', padding: '8px 16px', borderRadius: 6, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>Start free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: '80px 0 64px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: '#111827', border: '1px solid #1F2937', borderRadius: 20, padding: '4px 14px', fontSize: 12, color: '#6B7280', marginBottom: 24 }}>
          AI-powered flaky test detection
        </div>
        <h1 style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.1, margin: '0 0 20px' }}>
          Stop losing{' '}
          <span style={{ color: '#3B82F6' }}>$200k/year</span>
          <br />to flaky tests
        </h1>
        <p style={{ fontSize: 18, color: '#6B7280', maxWidth: 520, margin: '0 auto 36px', lineHeight: 1.6 }}>
          Keel finds flaky tests, explains why they fail, and opens the fix PR — automatically.
          Install in 5 minutes.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link href="/signup" style={{ background: '#3B82F6', color: '#fff', padding: '12px 28px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 16 }}>
            Start free — no credit card
          </Link>
          <Link href="/calculator" style={{ background: '#111827', color: '#F9FAFB', padding: '12px 28px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 16, border: '1px solid #1F2937' }}>
            Calculate your cost →
          </Link>
        </div>
      </section>

      {/* Install snippet */}
      <section style={{ marginBottom: 80 }}>
        <pre style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 10, padding: 24, fontSize: 13, lineHeight: 1.8, overflow: 'auto', color: '#F9FAFB' }}>
{`- name: Report to Keel
  uses: trykeel/keel-action@v1
  if: always()
  with:
    api-key: \${{ secrets.KEEL_API_KEY }}`}
        </pre>
      </section>

      {/* How it works */}
      <section style={{ marginBottom: 80 }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 40, textAlign: 'center' }}>How it works</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {steps.map(s => (
            <div key={s.n} style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 10, padding: 28 }}>
              <div style={{ width: 36, height: 36, background: '#3B82F6', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, marginBottom: 16 }}>{s.n}</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{s.title}</h3>
              <p style={{ color: '#6B7280', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Competitor table */}
      <section style={{ marginBottom: 80 }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>Keel vs BuildPulse</h2>
        <p style={{ color: '#6B7280', textAlign: 'center', marginBottom: 32, fontSize: 14 }}>BuildPulse tells you which tests are flaky. Keel tells you why.</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1F2937' }}>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: '#6B7280', fontWeight: 500 }}>Feature</th>
              <th style={{ textAlign: 'center', padding: '12px 16px', color: '#6B7280', fontWeight: 500 }}>BuildPulse</th>
              <th style={{ textAlign: 'center', padding: '12px 16px', color: '#3B82F6', fontWeight: 700 }}>Keel</th>
            </tr>
          </thead>
          <tbody>
            {features.map((f, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #1F2937', background: i % 2 === 0 ? 'transparent' : '#111827' }}>
                <td style={{ padding: '12px 16px', color: '#F9FAFB' }}>{f.label}</td>
                <td style={{ padding: '12px 16px', textAlign: 'center', color: f.bp === 'No' ? '#EF4444' : '#6B7280' }}>{f.bp}</td>
                <td style={{ padding: '12px 16px', textAlign: 'center', color: '#22C55E', fontWeight: 500 }}>{f.keel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Pricing */}
      <section style={{ marginBottom: 80 }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 40, textAlign: 'center' }}>Pricing</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {[
            { name: 'Starter', price: '$0', period: 'forever', features: ['1 repo', '500 tests', '14-day history', 'Flakiness dashboard', '1 Slack alert'], cta: 'Start free', highlight: false },
            { name: 'Team', price: '$199', period: '/month', features: ['20 repos', 'Unlimited tests', '90-day history', 'AI root cause', 'Auto-quarantine PR', 'Cost estimator', 'Weekly digest'], cta: 'Start trial', highlight: true },
            { name: 'Enterprise', price: '$1,200+', period: '/month', features: ['Unlimited repos', 'Dedicated AI agent', 'SSO + audit logs', 'SOC2 Type II', 'SLA 99.9%', 'Dedicated support'], cta: 'Contact us', highlight: false },
          ].map(plan => (
            <div key={plan.name} style={{ background: plan.highlight ? '#1D3461' : '#111827', border: `1px solid ${plan.highlight ? '#3B82F6' : '#1F2937'}`, borderRadius: 10, padding: 28 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{plan.name}</h3>
              <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 4 }}>{plan.price}</div>
              <div style={{ color: '#6B7280', fontSize: 13, marginBottom: 24 }}>{plan.period}</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ fontSize: 13, color: '#D1D5DB', display: 'flex', gap: 8 }}>
                    <span style={{ color: '#22C55E' }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" style={{ display: 'block', textAlign: 'center', background: plan.highlight ? '#3B82F6' : '#1F2937', color: '#fff', padding: '10px 0', borderRadius: 6, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #1F2937', padding: '32px 0', textAlign: 'center', color: '#6B7280', fontSize: 13 }}>
        <span style={{ color: '#3B82F6', fontWeight: 700, marginRight: 16 }}>Keel</span>
        <Link href="/calculator" style={{ color: '#6B7280', textDecoration: 'none', marginRight: 16 }}>Calculator</Link>
        <Link href="https://github.com/trykeel" style={{ color: '#6B7280', textDecoration: 'none' }}>GitHub</Link>
        <div style={{ marginTop: 12 }}>© 2026 Keel. Built to eliminate flaky tests.</div>
      </footer>
    </div>
  )
}
