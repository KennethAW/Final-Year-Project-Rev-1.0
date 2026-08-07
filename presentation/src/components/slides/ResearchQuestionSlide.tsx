import { useSlideNumber } from '@/hooks/useSlideNumber'

const SUB_QUESTIONS = [
  { num: 'Q1', label: 'Feature Integration' },
  { num: 'Q2', label: 'Architecture Comparison' },
  { num: 'Q3', label: 'Economic Viability' },
]

export function ResearchQuestionSlide() {
  const slideNum = useSlideNumber('slide-research-question')
  return (
    <section
      id="slide-research-question"
      className="slide-section h-screen pl-40 pr-20 pt-20 pb-12 bg-grid-pattern relative flex flex-col"
    >
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-primary/5 blur-[120px] -z-10" />
      <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-tertiary/5 blur-[100px] -z-10" />

      <div className="w-full max-w-[1500px] mx-auto flex flex-col flex-1 justify-center">
        {/* Header */}
        <header className="mb-6">
          <span className="font-[family-name:var(--font-family-label)] text-primary text-xs tracking-[0.3em] uppercase mb-2 block">
            Slide {slideNum}: Research Question
          </span>
          <h1 className="text-5xl lg:text-6xl font-[family-name:var(--font-family-headline)] font-extrabold text-white tracking-tighter leading-none">
            Hypothesis &<br />
            <span className="text-outline-variant/40">Sub-Questions.</span>
          </h1>
        </header>

        {/* Primary Question blockquote */}
        <div className="mb-6 relative">
          <div className="absolute -left-6 -top-4 text-7xl text-primary/10 font-[family-name:var(--font-family-headline)] opacity-50">
            &ldquo;
          </div>
          <div className="glass-card p-6 rounded-lg border border-white/5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 glow-accent" />
            <blockquote className="text-lg lg:text-xl font-[family-name:var(--font-family-headline)] font-bold leading-snug text-white/90">
              Can ML models predict next-day stock price movements with enough accuracy to generate{' '}
              <span className="text-primary">risk-adjusted profits</span> that outperform a passive buy-and-hold benchmark, after{' '}
              <span className="text-tertiary">realistic transaction costs?</span>
            </blockquote>
            <div className="mt-3 flex items-center gap-4">
              <div className="h-px w-12 bg-primary" />
              <span className="font-[family-name:var(--font-family-label)] text-[10px] uppercase tracking-widest text-on-surface-variant">
                Primary Research Question
              </span>
            </div>
          </div>
        </div>

        {/* Sub-questions 3-col — headlines only */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          {SUB_QUESTIONS.map((q) => (
            <div
              key={q.num}
              className="bg-surface-container-low p-5 rounded-lg border border-outline-variant/10 hover:border-primary/30 transition-all group flex items-center gap-4"
            >
              <span className="font-[family-name:var(--font-family-headline)] font-black text-4xl text-primary leading-none">
                {q.num}
              </span>
              <span className="font-[family-name:var(--font-family-headline)] font-bold text-base text-white tracking-tight">
                {q.label}
              </span>
            </div>
          ))}
        </div>

        {/* Hypothesis card */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface-container-low p-4 rounded-lg border-l-4 border-error/40">
            <span className="font-[family-name:var(--font-family-label)] text-[10px] font-bold tracking-widest uppercase text-error-dim mb-1 block">
              Null Hypothesis (H₀)
            </span>
            <p className="text-white text-sm">
              ML strategies <span className="font-bold text-error-dim">≤</span> buy-and-hold SPY after realistic costs.
            </p>
          </div>
          <div className="bg-surface-container-low p-4 rounded-lg border-l-4 border-primary/40">
            <span className="font-[family-name:var(--font-family-label)] text-[10px] font-bold tracking-widest uppercase text-primary mb-1 block">
              Alternative Hypothesis (H₁)
            </span>
            <p className="text-white text-sm">
              ML strategies <span className="font-bold text-primary">&gt;</span> buy-and-hold SPY after realistic costs.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
