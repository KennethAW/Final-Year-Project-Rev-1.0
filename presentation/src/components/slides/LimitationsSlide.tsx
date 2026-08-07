import { useSlideNumber } from '@/hooks/useSlideNumber'

const LIMITATIONS = [
  { title: 'Small 5-stock universe', detail: 'Limited generalisability; a single sector shock could distort aggregate findings. Large-cap US bias.' },
  { title: 'Daily horizon only', detail: 'EOD bars miss intraday microstructure, where ML-signal research often finds more exploitable edge.' },
  { title: 'Vectorised backtesting', detail: 'No order-book simulation, slippage, or latency modelling. Execution assumes clean fill at close price.' },
  { title: 'No short-selling / leverage', detail: 'Long-only constraint; strategies can only go to cash during drawdowns, foregoing inverse trades.' },
  { title: 'Sentiment pipeline limits', detail: "FinBERT struggles with sarcasm and nuanced irony; news coverage uneven across 5 tickers (GOOGL > XOM)." },
  { title: 'Single chronological split', detail: 'Walk-forward CV would give a variance estimate across regimes. Compute-prohibitive at 4 models × 5 tickers × N folds.' },
]

export function LimitationsSlide() {
  const slideNum = useSlideNumber('slide-limitations')
  return (
    <section
      id="slide-limitations"
      className="slide-section h-screen pl-40 pr-20 pt-20 pb-12 relative flex flex-col"
    >
      <div className="absolute top-1/4 -right-1/4 w-[600px] h-[600px] bg-error/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -left-1/4 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-[1400px] mx-auto z-10 flex flex-col flex-1 justify-center">
        {/* Heading */}
        <div className="mb-6">
          <p className="font-[family-name:var(--font-family-label)] text-error-dim tracking-[0.4em] uppercase text-xs mb-2">
            Slide {slideNum}: Conclusion
          </p>
          <h1 className="font-[family-name:var(--font-family-headline)] text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-none">
            Limitations &amp; Honest Caveats.
          </h1>
          <div className="h-1 w-24 bg-gradient-to-r from-error to-transparent rounded-full mt-4" />
        </div>

        {/* 2-col layout: bullets + summary tiles */}
        <div className="grid grid-cols-2 gap-6 items-start">
          {/* Left: bullet list */}
          <div className="bg-surface-container-low p-6 rounded-lg relative overflow-hidden border border-outline-variant/10">
            <div className="absolute top-0 right-0 p-3 opacity-20">
              <span className="material-symbols-outlined text-3xl text-error">warning</span>
            </div>
            <h2 className="font-[family-name:var(--font-family-headline)] text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-error-dim">01.</span> Known Constraints
            </h2>
            <ul className="space-y-3">
              {LIMITATIONS.map((l) => (
                <li key={l.title} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-error-dim mt-2 shrink-0" />
                  <div>
                    <h3 className="font-[family-name:var(--font-family-headline)] font-bold text-on-surface text-sm">
                      {l.title}
                    </h3>
                    <p className="text-on-surface-variant text-xs mt-0.5">{l.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Right: summary tile grid */}
          <div className="glass-card p-6 rounded-lg relative overflow-hidden border border-outline-variant/10">
            <h2 className="font-[family-name:var(--font-family-headline)] text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-error-dim">02.</span> Scope Summary
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-container-highest/40 rounded-md p-3 flex items-center gap-3">
                <div className="bg-error/10 p-2 rounded-md shrink-0">
                  <span className="material-symbols-outlined text-error text-lg">monitoring</span>
                </div>
                <div>
                  <span className="font-[family-name:var(--font-family-headline)] font-bold text-white text-sm">5 Tickers</span>
                  <p className="font-[family-name:var(--font-family-label)] text-on-surface-variant text-[9px] uppercase">
                    AAPL MSFT GOOGL JPM XOM
                  </p>
                </div>
              </div>
              <div className="bg-surface-container-highest/40 rounded-md p-3 flex items-center gap-3">
                <div className="bg-error/10 p-2 rounded-md shrink-0">
                  <span className="material-symbols-outlined text-error text-lg">schedule</span>
                </div>
                <div>
                  <span className="font-[family-name:var(--font-family-headline)] font-bold text-white text-sm">Daily Only</span>
                  <p className="font-[family-name:var(--font-family-label)] text-on-surface-variant text-[9px] uppercase">
                    EOD close prices
                  </p>
                </div>
              </div>
              <div className="bg-surface-container-highest/40 rounded-md p-3 flex items-center gap-3">
                <div className="bg-error/10 p-2 rounded-md shrink-0">
                  <span className="material-symbols-outlined text-error text-lg">trending_up</span>
                </div>
                <div>
                  <span className="font-[family-name:var(--font-family-headline)] font-bold text-white text-sm">Long Only</span>
                  <p className="font-[family-name:var(--font-family-label)] text-on-surface-variant text-[9px] uppercase">
                    No short positions
                  </p>
                </div>
              </div>
              <div className="bg-surface-container-highest/40 rounded-md p-3 flex items-center gap-3">
                <div className="bg-error/10 p-2 rounded-md shrink-0">
                  <span className="material-symbols-outlined text-error text-lg">speed</span>
                </div>
                <div>
                  <span className="font-[family-name:var(--font-family-headline)] font-bold text-white text-sm">No Slippage</span>
                  <p className="font-[family-name:var(--font-family-label)] text-on-surface-variant text-[9px] uppercase">
                    Vectorised sim only
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-outline-variant/10">
              <p className="font-[family-name:var(--font-family-label)] text-[11px] text-on-surface-variant italic leading-relaxed">
                These constraints make the <span className="text-primary font-semibold">negative result conservative</span>. Even more relaxed setups (shorts, intra-day, zero costs) were also tested in ablation and did not reverse the headline finding.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
