import { useSlideNumber } from '@/hooks/useSlideNumber'

export function FeatureEngineeringSlide() {
  const slideNum = useSlideNumber('slide-features')
  return (
    <section
      id="slide-features"
      className="slide-section h-screen pl-40 pr-20 pt-20 pb-12 relative overflow-hidden flex flex-col"
    >
      {/* Background */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 blur-[160px] rounded-full -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-tertiary/5 blur-[140px] rounded-full translate-y-1/2 -translate-x-1/4" />

      <div className="w-full max-w-[1500px] mx-auto flex flex-col flex-1 justify-center min-h-0">
        {/* Header */}
        <header className="mb-4 relative">
          <div className="flex items-baseline gap-4 mb-1">
            <span className="font-[family-name:var(--font-family-label)] text-primary tracking-[0.3em] text-xs font-bold uppercase">
              Slide {slideNum}
            </span>
            <div className="h-px bg-outline-variant/30 flex-grow" />
          </div>
          <h1 className="font-[family-name:var(--font-family-headline)] text-3xl lg:text-4xl font-extrabold tracking-tighter mb-1">
            Feature Engineering.
          </h1>
          <p className="text-on-surface-variant max-w-2xl text-xs leading-relaxed">
            72 features across 4 modalities — all causal, with macro/sector signals lagged 1 day to eliminate lookahead.
          </p>
        </header>

        {/* 2x2 grid: Technical | Macro / Sentiment | Calendar */}
        <div className="grid grid-cols-2 gap-3">
          {/* Technical */}
          <div className="bg-surface-container-low rounded-lg p-4 relative border border-outline-variant/5 flex flex-col group overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
              <span className="material-symbols-outlined text-5xl" style={{ fontVariationSettings: '"FILL" 1' }}>insights</span>
            </div>
            <div className="relative z-10 flex-1">
              <div className="flex items-baseline gap-3 mb-2">
                <h2 className="font-[family-name:var(--font-family-headline)] text-4xl font-black">27</h2>
                <h3 className="font-[family-name:var(--font-family-label)] text-[11px] font-bold tracking-widest uppercase text-primary-dim">
                  Technical
                </h3>
              </div>
              <p className="text-on-surface-variant text-[11px] leading-snug mb-2.5">
                Momentum, volatility, trend, and volume metrics from raw OHLCV. All trailing-window only.
              </p>
              <div className="space-y-1">
                <div className="flex items-start gap-2">
                  <span className="font-[family-name:var(--font-family-label)] text-[9px] font-bold tracking-widest uppercase text-primary-dim w-16 shrink-0">Momentum</span>
                  <span className="text-on-surface-variant text-[10px]">RSI(14), MACD, Stoch K/D, ROC</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-[family-name:var(--font-family-label)] text-[9px] font-bold tracking-widest uppercase text-primary-dim w-16 shrink-0">Volatility</span>
                  <span className="text-on-surface-variant text-[10px]">Bollinger Bands, ATR, 20D realised vol</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-[family-name:var(--font-family-label)] text-[9px] font-bold tracking-widest uppercase text-primary-dim w-16 shrink-0">Trend</span>
                  <span className="text-on-surface-variant text-[10px]">SMA(20), EMA(50), ADX, +DI / −DI</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-[family-name:var(--font-family-label)] text-[9px] font-bold tracking-widest uppercase text-primary-dim w-16 shrink-0">Volume</span>
                  <span className="text-on-surface-variant text-[10px]">OBV, Volume / SMA(20) ratio</span>
                </div>
              </div>
            </div>
          </div>

          {/* Macro */}
          <div className="bg-surface-container-low rounded-lg p-4 relative border border-outline-variant/5 flex flex-col group overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
              <span className="material-symbols-outlined text-5xl" style={{ fontVariationSettings: '"FILL" 1' }}>public</span>
            </div>
            <div className="relative z-10 flex-1">
              <div className="flex items-baseline gap-3 mb-2">
                <h2 className="font-[family-name:var(--font-family-headline)] text-4xl font-black">32</h2>
                <h3 className="font-[family-name:var(--font-family-label)] text-[11px] font-bold tracking-widest uppercase text-tertiary-dim">
                  Macro
                </h3>
              </div>
              <p className="text-on-surface-variant text-[11px] leading-snug mb-2.5">
                Systemic risk, yield curve, and sector-rotation signals. Capture regime context single-stock data misses.
              </p>
              <div className="space-y-1">
                <div className="flex items-start gap-2">
                  <span className="font-[family-name:var(--font-family-label)] text-[9px] font-bold tracking-widest uppercase text-tertiary-dim w-20 shrink-0">VIX</span>
                  <span className="text-on-surface-variant text-[10px]">Level, change, 5D/20D MA, regime flag</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-[family-name:var(--font-family-label)] text-[9px] font-bold tracking-widest uppercase text-tertiary-dim w-20 shrink-0">Rates (TNX)</span>
                  <span className="text-on-surface-variant text-[10px]">10Y yield, Δ, 20D MA + deviation</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-[family-name:var(--font-family-label)] text-[9px] font-bold tracking-widest uppercase text-tertiary-dim w-20 shrink-0">Market (SPX)</span>
                  <span className="text-on-surface-variant text-[10px]">1D/5D/20D returns, 50D MA cross, z-score</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-[family-name:var(--font-family-label)] text-[9px] font-bold tracking-widest uppercase text-tertiary-dim w-20 shrink-0">Sectors</span>
                  <span className="text-on-surface-variant text-[10px]">XLK, XLF, XLE, XLV, XLI returns + RelRet</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-[family-name:var(--font-family-label)] text-[9px] font-bold tracking-widest uppercase text-tertiary-dim w-20 shrink-0">Regime</span>
                  <span className="text-on-surface-variant text-[10px]">4-class label (calm/volatile × bull/bear)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sentiment */}
          <div className="bg-surface-container-low rounded-lg p-4 relative border border-outline-variant/5 flex flex-col group overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
              <span className="material-symbols-outlined text-5xl" style={{ fontVariationSettings: '"FILL" 1' }}>psychology</span>
            </div>
            <div className="relative z-10 flex-1">
              <div className="flex items-baseline gap-3 mb-2">
                <h2 className="font-[family-name:var(--font-family-headline)] text-4xl font-black">9</h2>
                <h3 className="font-[family-name:var(--font-family-label)] text-[11px] font-bold tracking-widest uppercase text-secondary-dim">
                  Sentiment (FinBERT)
                </h3>
              </div>
              <p className="text-on-surface-variant text-[11px] leading-snug mb-2.5">
                Daily news headlines scored with finance-domain BERT (Araci 2019); aggregated and smoothed.
              </p>
              <div className="space-y-1">
                <div className="flex items-start gap-2">
                  <span className="font-[family-name:var(--font-family-label)] text-[9px] font-bold tracking-widest uppercase text-secondary-dim w-16 shrink-0">Per-Day</span>
                  <span className="text-on-surface-variant text-[10px]">p(pos), p(neu), p(neg), headline_count</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-[family-name:var(--font-family-label)] text-[9px] font-bold tracking-widest uppercase text-secondary-dim w-16 shrink-0">Aggregate</span>
                  <span className="text-on-surface-variant text-[10px]">sentiment_mean = label × confidence</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-[family-name:var(--font-family-label)] text-[9px] font-bold tracking-widest uppercase text-secondary-dim w-16 shrink-0">Rolling</span>
                  <span className="text-on-surface-variant text-[10px]">3D & 7D rolling mean + std</span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-outline-variant/10">
                <p className="font-[family-name:var(--font-family-label)] text-[10px] text-on-surface-variant italic leading-snug">
                  Spoiler: Daily sentiment added <span className="text-error-dim font-bold">zero lift</span> in our ablations.
                </p>
              </div>
            </div>
          </div>

          {/* Calendar */}
          <div className="bg-surface-container-low rounded-lg p-4 relative border border-outline-variant/5 flex flex-col">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-baseline gap-3 mb-2">
                  <h2 className="font-[family-name:var(--font-family-headline)] text-4xl font-black">4</h2>
                  <h3 className="font-[family-name:var(--font-family-label)] text-[11px] font-bold tracking-widest uppercase text-white/40">
                    Calendar
                  </h3>
                </div>
              </div>
              <div className="bg-black/20 p-2 rounded-md border border-white/5">
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {[true, false, false, true, false, false, false].map((active, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-1.5 rounded-sm ${active ? (i === 0 ? 'bg-primary/40' : 'bg-primary') : 'bg-white/10'}`}
                    />
                  ))}
                </div>
                <p className="font-[family-name:var(--font-family-label)] text-[7px] uppercase tracking-widest text-white/30 text-center">
                  M T W T F S S
                </p>
              </div>
            </div>
            <p className="text-on-surface-variant text-[11px] leading-snug mb-2">
              Captures weekly seasonality. Modest predictive lift on Fri / month-end.
            </p>
            <ul className="space-y-1.5 mt-1">
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-primary/70 text-xs mt-0.5">event</span>
                <div>
                  <span className="font-[family-name:var(--font-family-label)] text-[10px] font-bold tracking-widest uppercase text-white/80">
                    Day-of-Week
                  </span>
                  <p className="text-on-surface-variant text-[10px]">One-hot Mon–Fri encoding</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
