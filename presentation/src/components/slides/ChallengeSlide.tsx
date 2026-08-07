import { useSlideNumber } from '@/hooks/useSlideNumber'

const CHALLENGES = [
  {
    icon: 'waves',
    title: 'Low Signal-to-Noise',
    description:
      'Stock returns are predominantly stochastic. Extracting meaningful patterns requires high-fidelity multi-modal integration against overwhelming market entropy.',
    color: 'primary',
  },
  {
    icon: 'insights',
    title: 'Market Efficiency (EMH)',
    description:
      'Efficient markets rapidly price in public data. The research must identify "edge" signals that are not yet arbitraged away by institutional HFT clusters.',
    color: 'secondary',
  },
  {
    icon: 'payments',
    title: 'Cost Erosion',
    description:
      'A 55% prediction accuracy can still result in net losses once slippage, commissions, and bid-ask spreads are factored into the backtesting engine.',
    color: 'tertiary',
  },
]

export function ChallengeSlide() {
  const slideNum = useSlideNumber('slide-challenge')
  return (
    <section
      id="slide-challenge"
      className="slide-section h-screen pl-40 pr-20 pt-20 pb-12 bg-grid-pattern relative flex flex-col"
    >
      {/* Background */}
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-primary/5 blur-[120px] -z-10" />
      <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-secondary/5 blur-[100px] -z-10" />

      <div className="w-full max-w-[1500px] mx-auto flex flex-col flex-1 justify-center">
        {/* Header */}
        <header className="mb-8">
          <span className="font-[family-name:var(--font-family-label)] text-primary text-xs tracking-[0.3em] uppercase mb-2 block">
            Slide {slideNum}: Core Challenges
          </span>
          <h1 className="text-5xl lg:text-6xl font-[family-name:var(--font-family-headline)] font-extrabold text-white tracking-tighter leading-none mb-4">
            Why This is <br />
            <span className="text-outline-variant/40">A Hard Problem.</span>
          </h1>
          <p className="text-on-surface-variant max-w-3xl text-sm leading-relaxed mt-4">
            Three forces fight every ML-in-finance attempt. A project that ignores any one of them produces misleading results.
          </p>
        </header>

        {/* Challenge Cards */}
        <div className="grid grid-cols-3 gap-5">
          {CHALLENGES.map((c) => (
            <div
              key={c.title}
              className="bg-surface-container-low p-6 rounded-lg border border-outline-variant/10 hover:border-primary/30 transition-all group relative overflow-hidden"
            >
              <div className={`absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-15 transition-opacity pointer-events-none`}>
                <span className="material-symbols-outlined text-7xl" style={{ fontVariationSettings: '"FILL" 1' }}>
                  {c.icon}
                </span>
              </div>
              <div className="relative z-10">
                <div className={`w-12 h-12 bg-${c.color}/10 rounded-md flex items-center justify-center mb-4`}>
                  <span className={`material-symbols-outlined text-${c.color} text-2xl`}>{c.icon}</span>
                </div>
                <h3 className="font-[family-name:var(--font-family-headline)] font-extrabold text-xl mb-2 text-white">
                  {c.title}
                </h3>
                <p className="text-on-surface-variant leading-relaxed text-xs">{c.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
