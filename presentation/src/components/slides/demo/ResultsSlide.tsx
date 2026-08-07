const TOP_RESULTS = [
  { rank: 1, model: 'TFT on GOOGL', return: '25.1%', icon: 'analytics' },
  { rank: 2, model: 'XGBoost on MSFT', return: '24.7%', icon: 'memory' },
  { rank: 3, model: 'XGBoost on GOOGL', return: '22.3%', icon: 'query_stats' },
]

const CLASSIFICATION = [
  { name: 'PatchTST', value: 52.5, best: true },
  { name: 'TFT', value: 51.0, best: false },
  { name: 'LSTM', value: 50.6, best: false },
  { name: 'XGBoost', value: 49.6, best: false },
]

const REGRESSION = [
  { name: 'XGBoost', value: 55.5, best: true },
  { name: 'TFT', value: 50.8, best: false },
  { name: 'LSTM', value: 49.4, best: false },
  { name: 'PatchTST', value: 45.0, best: false },
]

const FINDINGS = [
  {
    icon: 'sentiment_neutral',
    title: 'FinBERT = Zero Lift',
    text: 'Daily sentiment added no edge — info priced in too fast or drowned by noise.',
    color: 'error',
  },
  {
    icon: 'precision_manufacturing',
    title: 'Regression > Classification',
    text: 'Continuous log-returns beat binary labels; softer boundaries work better.',
    color: 'secondary',
  },
  {
    icon: 'token',
    title: 'Asset-Specific Patterns',
    text: 'Importance varies by ticker: GOOGL on technicals, energy/finance on macro.',
    color: 'tertiary',
  },
]

export function ResultsSlide() {
  return (
    <section
      id="slide-results"
      className="slide-section h-screen pl-40 pr-20 pt-20 pb-10 relative flex flex-col"
      style={{ background: 'radial-gradient(circle at top right, rgba(105,246,184,0.05), transparent 40%), radial-gradient(circle at bottom left, rgba(172,138,255,0.05), transparent 40%)' }}
    >
      <div className="max-w-[1500px] mx-auto flex flex-col flex-1 justify-center w-full gap-5">
        {/* Header */}
        <header>
          <span className="font-[family-name:var(--font-family-label)] text-primary text-sm font-bold tracking-[0.3em] uppercase mb-2 block">
            Slide 5 // Results &amp; Findings
          </span>
          <h1 className="font-[family-name:var(--font-family-headline)] font-extrabold text-5xl text-white tracking-tighter leading-[0.9]">
            Results &amp; <span className="gradient-text">Key Findings.</span>
          </h1>
        </header>

        {/* Top zone: Top 3 performing model-ticker combos */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="font-[family-name:var(--font-family-label)] text-secondary-fixed-dim text-xs uppercase tracking-widest font-bold">Top Backtest Performers</span>
            <div className="flex-1 h-px bg-outline-variant/20" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            {TOP_RESULTS.map((r) => (
              <div key={r.rank} className="bg-surface-container-low rounded-lg p-5 border border-outline-variant/10 flex items-center gap-4 relative overflow-hidden">
                <div className="w-14 h-14 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-secondary-fixed-dim text-2xl">{r.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-[family-name:var(--font-family-headline)] text-base font-bold text-white truncate">{r.model}</h4>
                    <span className="font-[family-name:var(--font-family-label)] text-[10px] text-white/30 uppercase ml-2 font-bold">#{r.rank}</span>
                  </div>
                  <span className="font-[family-name:var(--font-family-headline)] font-black text-3xl text-secondary-fixed-dim">{r.return}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Middle zone: dual bar chart */}
        <div className="grid grid-cols-2 gap-5 items-start">
          {/* Classification */}
          <div className="bg-surface-container-low rounded-lg p-5 relative overflow-hidden">
            <div className="flex justify-between items-end gap-4 mb-4">
              <div>
                <h3 className="font-[family-name:var(--font-family-headline)] font-bold text-xl text-white mb-1">Directional Classification</h3>
                <p className="font-[family-name:var(--font-family-label)] text-on-surface-variant text-[10px] uppercase tracking-widest">Target: Binary Movement</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-[family-name:var(--font-family-headline)] font-extrabold text-white">52.5%</span>
                <p className="font-[family-name:var(--font-family-label)] text-on-surface-variant text-[10px] uppercase">Peak</p>
              </div>
            </div>
            <div className="space-y-3 relative">
              <div className="absolute top-0 -bottom-1 left-[50%] z-10 pointer-events-none">
                <div className="w-px h-full border-l border-dashed border-error/50" />
              </div>
              {CLASSIFICATION.map((item) => (
                <div key={item.name} className={`relative space-y-1 ${!item.best ? 'opacity-60' : ''}`}>
                  <div className="flex justify-between items-center">
                    <span className={`font-[family-name:var(--font-family-label)] text-xs uppercase tracking-wider ${item.best ? 'text-white' : 'text-white/60'}`}>{item.name}</span>
                    <span className={`font-[family-name:var(--font-family-headline)] font-bold text-sm ${item.best ? 'text-primary' : 'text-white/80'}`}>{item.value}%</span>
                  </div>
                  <div className="h-2 w-full bg-surface-container-highest rounded-full relative">
                    <div className={`h-full rounded-full ${item.best ? 'bg-gradient-to-r from-primary to-primary-container' : 'bg-white/20'}`} style={{ width: `${((item.value - 45) / 10) * 100}%` }} />
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center pt-1">
                <span className="font-[family-name:var(--font-family-label)] text-[9px] text-white/30 uppercase">45%</span>
                <span className="font-[family-name:var(--font-family-label)] text-[9px] text-error uppercase">50% Baseline</span>
                <span className="font-[family-name:var(--font-family-label)] text-[9px] text-white/30 uppercase">55%</span>
              </div>
            </div>
          </div>

          {/* Regression */}
          <div className="bg-surface-container-low rounded-lg p-5 relative overflow-hidden border-l-4 border-primary/20">
            <div className="absolute top-3 right-3">
              <span className="material-symbols-outlined text-primary/40 text-lg">star</span>
            </div>
            <div className="flex justify-between items-end gap-4 mb-4">
              <div>
                <h3 className="font-[family-name:var(--font-family-headline)] font-bold text-xl text-white mb-1">Return Regression</h3>
                <p className="font-[family-name:var(--font-family-label)] text-on-surface-variant text-[10px] uppercase tracking-widest">Target: Log Returns</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-[family-name:var(--font-family-headline)] font-extrabold text-primary">55.5%</span>
                <p className="font-[family-name:var(--font-family-label)] text-on-surface-variant text-[10px] uppercase">Hit Ratio</p>
              </div>
            </div>
            <div className="space-y-3">
              {REGRESSION.map((item) => (
                <div key={item.name} className="relative space-y-1">
                  <div className="flex justify-between items-center">
                    <span className={`font-[family-name:var(--font-family-label)] text-xs uppercase tracking-wider ${item.best ? 'text-primary font-bold' : 'text-white/80'}`}>{item.name}</span>
                    <span className={`font-[family-name:var(--font-family-headline)] font-bold text-sm ${item.best ? 'text-primary' : 'text-white'}`}>{item.value}%</span>
                  </div>
                  <div className={`${item.best ? 'h-3 p-0.5' : 'h-2'} w-full bg-surface-container-highest rounded-full overflow-hidden`}>
                    <div className={`h-full rounded-full ${item.best ? 'bg-gradient-to-r from-primary to-tertiary shadow-[0_0_15px_rgba(105,246,184,0.3)]' : 'bg-white/20'}`} style={{ width: `${((item.value - 40) / 20) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom zone: 4 Key Findings */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="font-[family-name:var(--font-family-label)] text-primary text-xs uppercase tracking-widest font-bold">Key Findings</span>
            <div className="flex-1 h-px bg-outline-variant/20" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            {FINDINGS.map((f) => {
              const colorMap: Record<string, { bg: string; text: string; border: string }> = {
                error: { bg: 'bg-error/10', text: 'text-error', border: 'border-error/20' },
                secondary: { bg: 'bg-secondary/10', text: 'text-secondary', border: 'border-secondary/20' },
                tertiary: { bg: 'bg-tertiary/10', text: 'text-tertiary', border: 'border-tertiary/20' },
              }
              const c = colorMap[f.color] ?? colorMap.error
              return (
                <div key={f.title} className={`glass-card rounded-lg p-4 border ${c.border} flex flex-col gap-2`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`${c.bg} p-2 rounded-md`}>
                      <span className={`material-symbols-outlined ${c.text} text-lg`}>{f.icon}</span>
                    </div>
                    <h4 className="font-[family-name:var(--font-family-headline)] font-bold text-white text-sm leading-tight">{f.title}</h4>
                  </div>
                  <p className="text-on-surface-variant leading-snug text-[11px]">
                    {f.text}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
