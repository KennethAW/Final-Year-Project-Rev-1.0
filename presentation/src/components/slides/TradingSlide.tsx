import { useSlideNumber } from '@/hooks/useSlideNumber'

export function TradingSlide() {
  const slideNum = useSlideNumber('slide-trading')
  return (
    <section
      id="slide-trading"
      className="slide-section h-screen pl-40 pr-20 pt-20 pb-12 relative overflow-hidden flex flex-col"
      style={{
        background: 'linear-gradient(135deg, rgba(105,246,184,0.05) 0%, rgba(172,138,255,0.05) 100%)',
      }}
    >
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-secondary/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-[1500px] mx-auto flex flex-col flex-1 justify-center gap-6 relative z-10">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="font-[family-name:var(--font-family-label)] text-secondary tracking-[0.3em] text-xs uppercase font-bold">
              Slide {slideNum}: Headline Result
            </span>
            <div className="h-[1px] w-12 bg-outline-variant/30" />
          </div>
          <h1 className="font-[family-name:var(--font-family-headline)] text-5xl font-extrabold tracking-tight text-on-surface">
            An Exceptional Benchmark.
          </h1>
        </div>

        {/* Bento: SPY + 0/20 card */}
        <div className="grid grid-cols-12 gap-4">
          {/* Benchmark Card */}
          <div className="col-span-7 glass-card rounded-lg p-6 border-l-4 border-primary relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl" />
            <div className="flex justify-between items-start mb-5">
              <div className="space-y-1">
                <span className="font-[family-name:var(--font-family-label)] text-[10px] uppercase tracking-widest text-primary font-bold">
                  Primary Benchmark
                </span>
                <h2 className="font-[family-name:var(--font-family-headline)] text-3xl font-bold">SPY Buy &amp; Hold</h2>
              </div>
              <div className="px-3 py-1 rounded-lg bg-primary/10 border border-primary/20">
                <span className="font-[family-name:var(--font-family-label)] text-[9px] text-primary uppercase font-bold">
                  Exceptionally strong bull market
                </span>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-6">
              <div className="space-y-1">
                <span className="font-[family-name:var(--font-family-label)] text-[10px] text-on-surface-variant uppercase tracking-widest">
                  Total Return
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="font-[family-name:var(--font-family-headline)] text-4xl font-black text-primary">34.4%</span>
                </div>
              </div>
              <div className="space-y-1">
                <span className="font-[family-name:var(--font-family-label)] text-[10px] text-on-surface-variant uppercase tracking-widest">
                  Annualised
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="font-[family-name:var(--font-family-headline)] text-4xl font-black text-primary">23.4%</span>
                  <span className="material-symbols-outlined text-primary text-xl">trending_up</span>
                </div>
              </div>
              <div className="space-y-1">
                <span className="font-[family-name:var(--font-family-label)] text-[10px] text-on-surface-variant uppercase tracking-widest">
                  Sharpe Ratio
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="font-[family-name:var(--font-family-headline)] text-4xl font-black text-on-surface">1.44</span>
                </div>
              </div>
              <div className="space-y-1">
                <span className="font-[family-name:var(--font-family-label)] text-[10px] text-on-surface-variant uppercase tracking-widest">
                  Test Period
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="font-[family-name:var(--font-family-headline)] text-2xl font-black text-white">2023–24</span>
                </div>
              </div>
            </div>
          </div>

          {/* 0/20 Card */}
          <div className="col-span-5 bg-surface-container-highest rounded-lg p-6 flex flex-col justify-center items-center text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-error-container/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-error text-4xl">block</span>
            </div>
            <div className="space-y-1">
              <h3 className="font-[family-name:var(--font-family-headline)] text-5xl font-black leading-tight text-white">
                0 / 20
              </h3>
              <p className="font-[family-name:var(--font-family-label)] text-[10px] text-on-surface-variant uppercase tracking-widest">
                Model-ticker combos beat SPY (after 5bps costs)
              </p>
            </div>
          </div>
        </div>

        {/* Framing banner */}
        <div className="glass-card border border-secondary/20 rounded-lg p-5 relative overflow-hidden">
          <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-secondary/10 rounded-full blur-3xl" />
          <div className="flex items-start gap-4 relative z-10">
            <div className="shrink-0 w-10 h-10 rounded-full border-2 border-secondary/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary text-xl">gpp_maybe</span>
            </div>
            <div className="flex-grow">
              <h4 className="font-[family-name:var(--font-family-headline)] text-base font-bold mb-1">
                The Benchmark Was Extraordinary
              </h4>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                SPY returned <span className="text-primary font-semibold">34.4% cumulative (23.4% annualised)</span> during the ~17-month test window, well above its long-run ~10% annualised average. The 2024 rally made{' '}
                <span className="text-primary font-semibold">buy-and-hold an exceptionally high bar</span> for any active strategy to clear. A cost-sensitivity ablation confirms this result holds{' '}
                <span className="text-tertiary font-semibold">even at 0 bps transaction costs</span>, confirming the finding is structural, not a cost artefact.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
