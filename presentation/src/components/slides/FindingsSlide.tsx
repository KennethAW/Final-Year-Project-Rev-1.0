import { useSlideNumber } from '@/hooks/useSlideNumber'

// Per-model avg regression directional accuracy (from public/data/comparison/model_comparison.json)
const MODEL_ACCURACY = [
  { model: 'XGBoost', acc: 55.5, color: 'bg-primary', textColor: 'text-primary' },
  { model: 'TFT', acc: 50.8, color: 'bg-tertiary', textColor: 'text-tertiary' },
  { model: 'LSTM', acc: 49.4, color: 'bg-on-surface-variant', textColor: 'text-on-surface-variant' },
  { model: 'PatchTST', acc: 45.0, color: 'bg-secondary', textColor: 'text-secondary' },
]

// Per-ticker feature importance split: Tech vs Macro (Sentiment & Calendar were ~0% across all)
const TICKER_FEATURES = [
  { ticker: 'AAPL', tech: 44, macro: 56 },
  { ticker: 'MSFT', tech: 47, macro: 53 },
  { ticker: 'GOOGL', tech: 56, macro: 44, highlight: 'tech' },
  { ticker: 'JPM', tech: 44, macro: 56, highlight: 'macro' },
  { ticker: 'XOM', tech: 57, macro: 43 },
]

// Modalities that received zero importance from XGBoost across all 5 tickers
const ZERO_LIFT_MODALITIES = [
  { name: 'Sentiment', sub: '9 features (FinBERT scores)', icon: 'sentiment_neutral' },
  { name: 'Calendar', sub: '4 features (Day-of-Week)', icon: 'event_busy' },
]

const FINDINGS = [
  {
    icon: 'trophy',
    title: 'Simpler Models Win',
    chart: 'accuracy',
    tags: ['XGBoost > Transformers', 'Low Overfit'],
    tagColor: 'primary',
    iconBg: 'bg-gradient-to-br from-primary to-primary-container',
    iconText: 'text-on-primary-container',
  },
  {
    icon: 'token',
    title: 'Asset-Specific Patterns',
    chart: 'features',
    tags: ['Non-Universal', 'Per-Ticker Tuning'],
    tagColor: 'tertiary',
    iconBg: 'bg-tertiary',
    iconText: 'text-on-tertiary-container',
  },
  {
    icon: 'cancel',
    title: 'Sentiment = Zero Value',
    chart: 'categories',
    tags: ['Daily Inefficiency', 'Priced In'],
    tagColor: 'error',
    iconBg: 'bg-error/20 border border-error/30',
    iconText: 'text-error',
  },
  {
    icon: 'precision_manufacturing',
    title: 'Regression > Classification',
    chart: 'regvsclf',
    tags: ['Sharper Signal', 'Continuous Loss'],
    tagColor: 'secondary',
    iconBg: 'bg-secondary',
    iconText: 'text-on-secondary',
  },
] as const

// ─── Mini chart components ───────────────────────────────────────

function AccuracyChart() {
  // Domain: 40% to 60%; baseline (random = 50%) shown as vertical line in the bar area only
  const dMin = 40, dMax = 60
  const baseline = ((50 - dMin) / (dMax - dMin)) * 100
  return (
    <div className="flex flex-col gap-1 mt-2">
      {MODEL_ACCURACY.map((m) => {
        const pct = ((m.acc - dMin) / (dMax - dMin)) * 100
        return (
          <div key={m.model} className="flex items-center gap-2 h-[18px]">
            <span className="w-[60px] text-[10px] font-bold text-white font-[family-name:var(--font-family-headline)] shrink-0">{m.model}</span>
            <div className="flex-1 relative h-full">
              {/* 50% baseline reference line — relative to bar area, not whole row */}
              <div className="absolute top-0 bottom-0 w-px bg-on-surface-variant/50 z-10 pointer-events-none" style={{ left: `${baseline}%` }} />
              <div className={`absolute top-0 bottom-0 left-0 ${m.color} rounded-sm`} style={{ width: `${pct}%` }} />
            </div>
            <span className={`w-10 text-right text-[10px] font-bold tabular-nums ${m.textColor}`}>{m.acc}%</span>
          </div>
        )
      })}
      <p className="text-[9px] text-on-surface-variant/70 italic mt-1">Vertical line = 50% (random baseline) · domain 40-60%</p>
    </div>
  )
}

function FeaturesChart() {
  return (
    <div className="flex flex-col gap-1.5 mt-1">
      {TICKER_FEATURES.map((t) => (
        <div key={t.ticker} className="flex items-center gap-2 h-[16px]">
          <span className="w-[50px] text-[10px] font-bold text-white font-[family-name:var(--font-family-headline)] shrink-0">{t.ticker}</span>
          <div className="flex-1 relative h-full overflow-hidden rounded-sm">
            <div className={`absolute top-0 bottom-0 left-0 ${t.highlight === 'tech' ? 'bg-tertiary' : 'bg-tertiary/40'} flex items-center px-1.5`} style={{ width: `${t.tech}%` }}>
              <span className="text-[9px] font-bold text-white font-[family-name:var(--font-family-label)] tracking-tight">T {t.tech}</span>
            </div>
            <div className={`absolute top-0 bottom-0 right-0 ${t.highlight === 'macro' ? 'bg-secondary' : 'bg-secondary/40'} flex items-center justify-end px-1.5`} style={{ width: `${t.macro}%` }}>
              <span className="text-[9px] font-bold text-white font-[family-name:var(--font-family-label)] tracking-tight">M {t.macro}</span>
            </div>
          </div>
        </div>
      ))}
      <div className="flex gap-3 mt-1">
        <span className="text-[9px] font-[family-name:var(--font-family-label)] uppercase tracking-widest text-tertiary font-bold flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-tertiary" />Technical</span>
        <span className="text-[9px] font-[family-name:var(--font-family-label)] uppercase tracking-widest text-secondary font-bold flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-secondary" />Macro</span>
      </div>
    </div>
  )
}

function CategoriesChart() {
  return (
    <div className="flex flex-col gap-2 mt-1">
      {ZERO_LIFT_MODALITIES.map((c) => (
        <div key={c.name} className="flex items-center gap-3 bg-error/5 border border-error/20 rounded-md px-3 py-2.5">
          <div className="w-9 h-9 bg-error/15 rounded-full flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-error text-base">{c.icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-[family-name:var(--font-family-headline)] font-bold text-white text-sm leading-tight">{c.name}</h4>
            <p className="font-[family-name:var(--font-family-label)] text-[9px] text-on-surface-variant uppercase tracking-widest mt-0.5">{c.sub}</p>
          </div>
          <div className="flex items-baseline gap-1.5 shrink-0">
            <span className="font-[family-name:var(--font-family-headline)] font-black text-2xl text-error tracking-tight leading-none">0%</span>
            <span className="font-[family-name:var(--font-family-label)] text-[9px] uppercase tracking-widest text-error/70">importance</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function RegVsClfChart() {
  // Same 40-60 domain
  const dMin = 40, dMax = 60
  const baseline = ((50 - dMin) / (dMax - dMin)) * 100
  const data = [
    { label: 'Classification', best: 52.5, color: 'bg-on-surface-variant', tColor: 'text-on-surface-variant' },
    { label: 'Regression', best: 55.5, color: 'bg-secondary', tColor: 'text-secondary' },
  ]
  return (
    <div className="flex flex-col gap-2 mt-2">
      {data.map((d) => {
        const pct = ((d.best - dMin) / (dMax - dMin)) * 100
        return (
          <div key={d.label} className="flex items-center gap-2 h-[20px]">
            <span className="w-[100px] text-[10px] font-bold text-white font-[family-name:var(--font-family-headline)] shrink-0">{d.label}</span>
            <div className="flex-1 relative h-full">
              {/* 50% baseline reference line — inside bar area only */}
              <div className="absolute top-0 bottom-0 w-px bg-on-surface-variant/50 z-10 pointer-events-none" style={{ left: `${baseline}%` }} />
              <div className={`absolute top-0 bottom-0 left-0 ${d.color} rounded-sm`} style={{ width: `${pct}%` }} />
            </div>
            <span className={`w-10 text-right text-[11px] font-bold tabular-nums ${d.tColor}`}>{d.best}%</span>
          </div>
        )
      })}
      <p className="text-[9px] text-on-surface-variant italic mt-0.5">Best peak per task type · 50% line = random baseline</p>
    </div>
  )
}

function ChartFor({ kind }: { kind: string }) {
  if (kind === 'accuracy') return <AccuracyChart />
  if (kind === 'features') return <FeaturesChart />
  if (kind === 'categories') return <CategoriesChart />
  if (kind === 'regvsclf') return <RegVsClfChart />
  return null
}

export function FindingsSlide() {
  const slideNum = useSlideNumber('slide-findings')
  return (
    <section id="slide-findings" className="slide-section h-screen pl-40 pr-20 pt-16 pb-10 relative overflow-hidden flex flex-col">
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] -z-10 pointer-events-none translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-secondary/5 rounded-full blur-[100px] -z-10 pointer-events-none -translate-x-1/2 translate-y-1/2" />

      <div className="max-w-[1600px] mx-auto flex flex-col flex-1 justify-center w-full">
        {/* Header */}
        <div className="mb-5">
          <div className="flex items-center gap-4 mb-2">
            <span className="font-[family-name:var(--font-family-label)] text-primary font-bold text-xs tracking-[0.2em] uppercase">Slide {slideNum} // Results</span>
            <div className="h-px w-24 bg-outline-variant/30" />
          </div>
          <h1 className="font-[family-name:var(--font-family-headline)] font-black text-4xl tracking-tighter text-on-surface">
            Four Key Findings.
          </h1>
        </div>

        {/* 2x2 Grid — wider cards (1600px container), natural card heights */}
        <div className="grid grid-cols-2 gap-5">
          {FINDINGS.map((f) => (
            <div key={f.title} className="group relative bg-surface-container-low rounded-lg p-6 transition-all duration-500 hover:bg-surface-container-high overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-md ${f.iconBg} flex items-center justify-center shrink-0`}>
                    <span className={`material-symbols-outlined ${f.iconText} text-lg`}>{f.icon}</span>
                  </div>
                  <h3 className="font-[family-name:var(--font-family-headline)] font-bold text-lg text-white tracking-tight">{f.title}</h3>
                </div>
                <ChartFor kind={f.chart} />
                <div className="flex items-center gap-2 mt-4">
                  {f.tags.map((tag) => (
                    <span key={tag} className={`font-[family-name:var(--font-family-label)] text-[9px] uppercase tracking-widest text-${f.tagColor}/60 px-2 py-0.5 bg-${f.tagColor}/10 rounded-md`}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
