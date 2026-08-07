import { useSlideNumber } from '@/hooks/useSlideNumber'

const SOURCES = [
  {
    icon: 'trending_up',
    color: 'primary',
    provider: 'yfinance',
    label: 'Price Data',
    detail: 'OHLCV daily bars for 5 tickers',
    tags: ['AAPL', 'MSFT', 'GOOGL', 'JPM', 'XOM'],
  },
  {
    icon: 'public',
    color: 'tertiary',
    provider: 'yfinance',
    label: 'Macro Features',
    detail: 'VIX (^VIX), 10Y Treasury (^TNX), S&P 500 (^GSPC), 5 sector ETFs',
    tags: ['^VIX', '^TNX', '^GSPC', 'XLK', 'XLF', 'XLE', 'XLV', 'XLI'],
  },
  {
    icon: 'psychology_alt',
    color: 'secondary',
    provider: 'FinBERT (ProsusAI)',
    label: 'News Sentiment',
    detail: 'Domain-tuned BERT on daily headlines (with placeholder fallback)',
    tags: ['POS', 'NEU', 'NEG', 'ROLL_3D', 'ROLL_7D'],
  },
  {
    icon: 'calendar_month',
    color: 'on-surface',
    provider: 'Derived',
    label: 'Calendar Features',
    detail: 'Day-of-week seasonality',
    tags: ['DOW'],
  },
]

export function DataSourcesSlide() {
  const slideNum = useSlideNumber('slide-data-sources')
  return (
    <section id="slide-data-sources" className="slide-section h-screen pl-40 pr-20 pt-20 pb-12 relative flex flex-col">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 blur-[140px] rounded-full -translate-y-1/3 translate-x-1/4" />

      <div className="w-full max-w-[1500px] mx-auto flex flex-col flex-1 justify-center">
        {/* Header */}
        <header className="mb-5">
          <div className="flex items-center gap-4 mb-2">
            <span className="font-[family-name:var(--font-family-label)] text-primary tracking-[0.3em] uppercase text-xs">
              Slide {slideNum}
            </span>
            <div className="h-px w-12 bg-primary/30" />
            <span className="font-[family-name:var(--font-family-label)] text-on-surface-variant tracking-[0.1em] uppercase text-xs">
              Data Sources
            </span>
          </div>
          <h1 className="font-[family-name:var(--font-family-headline)] text-5xl lg:text-6xl font-extrabold tracking-tighter text-white">
            Data Coverage & <br />
            <span className="text-primary-container">Provenance.</span>
          </h1>
        </header>

        {/* 4 source cards */}
        <div className="grid grid-cols-4 gap-4 mb-5">
          {SOURCES.map((s) => (
            <div
              key={s.label}
              className="bg-surface-container-low rounded-lg p-4 border border-outline-variant/10 relative overflow-hidden group"
            >
              <div className={`absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-15 transition-opacity pointer-events-none`}>
                <span className="material-symbols-outlined text-6xl" style={{ fontVariationSettings: '"FILL" 1' }}>
                  {s.icon}
                </span>
              </div>
              <div className="relative z-10">
                <div className={`w-9 h-9 bg-${s.color}/10 rounded-md flex items-center justify-center mb-2`}>
                  <span className={`material-symbols-outlined text-${s.color} text-lg`}>{s.icon}</span>
                </div>
                <span className={`font-[family-name:var(--font-family-label)] text-[9px] font-bold tracking-widest uppercase text-${s.color}-dim`}>
                  {s.provider}
                </span>
                <h3 className="font-[family-name:var(--font-family-headline)] font-bold text-base text-white mt-0.5 mb-1">
                  {s.label}
                </h3>
                <p className="text-on-surface-variant text-xs leading-snug mb-2">{s.detail}</p>
                <div className="flex flex-wrap gap-1">
                  {s.tags.map((t) => (
                    <span
                      key={t}
                      className="px-1.5 py-0.5 bg-surface-container-highest rounded text-[9px] font-[family-name:var(--font-family-label)] font-bold text-on-surface-variant"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Timeline: Train / Val / Test */}
        <div className="bg-surface-container-low rounded-lg p-5 border border-outline-variant/10 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-[family-name:var(--font-family-label)] text-[10px] font-bold tracking-widest uppercase text-white/60">
              Chronological Split &middot; 70 / 15 / 15
            </span>
            <span className="font-[family-name:var(--font-family-label)] text-[10px] text-on-surface-variant uppercase">
              2015 — 2024
            </span>
          </div>
          <div className="flex rounded-md overflow-hidden h-10 border border-outline-variant/20">
            <div
              className="bg-primary/80 flex items-center justify-center"
              style={{ width: '70%' }}
            >
              <span className="font-[family-name:var(--font-family-label)] text-[11px] font-bold tracking-widest uppercase text-on-primary-container">
                TRAIN · 2015 — 2021
              </span>
            </div>
            <div
              className="bg-secondary/60 flex items-center justify-center"
              style={{ width: '15%' }}
            >
              <span className="font-[family-name:var(--font-family-label)] text-[11px] font-bold tracking-widest uppercase text-white">
                VAL · 2022
              </span>
            </div>
            <div
              className="bg-tertiary/70 flex items-center justify-center"
              style={{ width: '15%' }}
            >
              <span className="font-[family-name:var(--font-family-label)] text-[11px] font-bold tracking-widest uppercase text-white">
                TEST · 2023 — 2024
              </span>
            </div>
          </div>
        </div>

        {/* Coverage metric row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-surface-container-highest/40 rounded-lg p-4 flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-md">
              <span className="material-symbols-outlined text-primary">trending_up</span>
            </div>
            <div>
              <p className="font-[family-name:var(--font-family-headline)] font-black text-2xl text-white">5</p>
              <p className="font-[family-name:var(--font-family-label)] text-[9px] uppercase tracking-widest text-on-surface-variant">
                Tickers
              </p>
            </div>
          </div>
          <div className="bg-surface-container-highest/40 rounded-lg p-4 flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-md">
              <span className="material-symbols-outlined text-primary">calendar_month</span>
            </div>
            <div>
              <p className="font-[family-name:var(--font-family-headline)] font-black text-2xl text-white">~2,500</p>
              <p className="font-[family-name:var(--font-family-label)] text-[9px] uppercase tracking-widest text-on-surface-variant">
                Trading days per ticker
              </p>
            </div>
          </div>
          <div className="bg-surface-container-highest/40 rounded-lg p-4 flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-md">
              <span className="material-symbols-outlined text-primary">hub</span>
            </div>
            <div>
              <p className="font-[family-name:var(--font-family-headline)] font-black text-2xl text-white">~12,500</p>
              <p className="font-[family-name:var(--font-family-label)] text-[9px] uppercase tracking-widest text-on-surface-variant">
                Ticker-day observations
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
