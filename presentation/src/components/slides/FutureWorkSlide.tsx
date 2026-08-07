import { useSlideNumber } from '@/hooks/useSlideNumber'

const FUTURE_WORK = [
  {
    phase: 'Phase I &middot; Data Resolution',
    phaseColor: 'text-primary',
    icon: 'update',
    iconColor: 'text-primary',
    title: 'Intra-day data expansion',
    detail: '1-minute or tick-level bars. Daily noise drowns signals that 5-min aggregation would expose.',
  },
  {
    phase: 'Phase II &middot; NLP Enhancement',
    phaseColor: 'text-tertiary',
    icon: 'psychology',
    iconColor: 'text-tertiary',
    title: 'Event-driven NLP',
    detail: 'Per-event embeddings from earnings-call transcripts and 8-K filings, not just daily sentiment aggregates.',
  },
  {
    phase: 'Phase III &middot; Architecture',
    phaseColor: 'text-secondary',
    icon: 'layers',
    iconColor: 'text-secondary',
    title: 'Stacking / ensemble',
    detail: "Blend XGBoost's stability with TFT's attention. Meta-learner over raw model outputs.",
  },
]

const SMALL_ITEMS = [
  { title: 'Walk-forward CV', detail: 'Expanding-window validation for regime-robust variance.' },
  { title: 'Multi-asset universe', detail: 'Extend to crypto, forex, international ETFs.' },
  { title: 'Short-selling sim', detail: 'Relaxed long-only constraint; test against inverse regime alpha.' },
]

const CONTRIBUTIONS = [
  { icon: 'verified', text: 'Negative result with statistical backing (DM tests, bootstrap CIs)' },
  { icon: 'code', text: 'Reproducible pipeline template: chronological splits, causal features, seed=42' },
  { icon: 'compare_arrows', text: 'Cross-architecture comparative framework: 4 models tested against the same benchmark' },
  { icon: 'dashboard', text: 'Production-ready dashboard: live interactive demo of all 20 runs' },
]

export function FutureWorkSlide() {
  const slideNum = useSlideNumber('slide-future-work')
  return (
    <section
      id="slide-future-work"
      className="slide-section h-screen pl-40 pr-20 pt-20 pb-12 relative flex flex-col"
    >
      <div className="absolute top-1/4 -right-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -left-1/4 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-[1400px] mx-auto z-10 flex flex-col flex-1 justify-center">
        {/* Heading */}
        <div className="mb-6">
          <p className="font-[family-name:var(--font-family-label)] text-primary tracking-[0.4em] uppercase text-xs mb-2">
            Slide {slideNum}: Roadmap
          </p>
          <h1 className="font-[family-name:var(--font-family-headline)] text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-none">
            Future Work &amp; Contributions.
          </h1>
          <div className="h-1 w-24 bg-gradient-to-r from-primary to-transparent rounded-full mt-4" />
        </div>

        {/* 2-col: Future work | Contributions */}
        <div className="grid grid-cols-2 gap-6 items-start">
          {/* Future Work */}
          <div className="glass-card p-5 rounded-lg relative overflow-hidden border border-primary/20 shadow-[0_0_40px_-15px_rgba(105,246,184,0.15)]">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
            <h2 className="font-[family-name:var(--font-family-headline)] text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-primary">01.</span> Future Work
            </h2>

            <div className="space-y-2">
              {FUTURE_WORK.map((f) => (
                <div
                  key={f.title}
                  className="bg-surface-container-highest/40 p-3 rounded-md hover:bg-surface-container-highest/60 transition-colors"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span
                      className={`font-[family-name:var(--font-family-label)] text-[10px] ${f.phaseColor} tracking-widest uppercase`}
                      dangerouslySetInnerHTML={{ __html: f.phase }}
                    />
                    <span className={`material-symbols-outlined ${f.iconColor} text-sm`}>{f.icon}</span>
                  </div>
                  <h3 className="font-[family-name:var(--font-family-headline)] font-bold text-white text-sm">{f.title}</h3>
                  <p className="text-on-surface-variant text-xs mt-0.5">{f.detail}</p>
                </div>
              ))}

              <div className="grid grid-cols-3 gap-2 pt-1">
                {SMALL_ITEMS.map((s) => (
                  <div key={s.title} className="bg-surface-container-highest/40 p-2 rounded-md">
                    <h3 className="font-[family-name:var(--font-family-headline)] font-bold text-white text-[11px] mb-0.5">
                      {s.title}
                    </h3>
                    <p className="text-on-surface-variant text-[9px] leading-snug">{s.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Contributions */}
          <div className="bg-surface-container-low p-5 rounded-lg border border-outline-variant/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-20">
              <span className="material-symbols-outlined text-3xl text-primary">military_tech</span>
            </div>
            <h2 className="font-[family-name:var(--font-family-headline)] text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-primary">02.</span> Contributions
            </h2>

            <div className="space-y-3 mb-4">
              {CONTRIBUTIONS.map((c) => (
                <div key={c.text} className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-primary/10 rounded-md flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary text-base">{c.icon}</span>
                  </div>
                  <p className="text-white text-sm leading-snug flex-1">{c.text}</p>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-outline-variant/10">
              <p className="font-[family-name:var(--font-family-label)] text-[11px] text-on-surface-variant italic leading-relaxed">
                A rigorous negative finding is still a contribution, especially in a field with replication issues. This project leaves behind methodology and infrastructure future students can build on.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
