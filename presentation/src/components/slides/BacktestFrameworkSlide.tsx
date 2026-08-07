import { useSlideNumber } from '@/hooks/useSlideNumber'

const PIPELINE = [
  { icon: 'tune', label: 'Signal', detail: 'Model output: predProbUp + predLogReturn', color: 'primary' },
  { icon: 'filter_alt', label: 'Threshold', detail: 'Enter long when predProbUp ≥ 0.55', color: 'primary' },
  { icon: 'straighten', label: 'Size', detail: 'Scaled by |predLogReturn| (capped 0–100%)', color: 'primary', highlight: true },
  { icon: 'payments', label: 'Costs', detail: '5 bps per side (entry + exit)', color: 'tertiary' },
  { icon: 'show_chart', label: 'P&L', detail: 'Compounded daily returns net of costs', color: 'primary' },
]

// Trimmed: just icon + value + label (no full-sentence detail)
const ASSUMPTIONS = [
  { icon: 'attach_money', label: 'Cost', value: '5 bps', color: 'tertiary' },
  { icon: 'straighten', label: 'Sizing', value: 'Regression-Driven', color: 'primary' },
  { icon: 'block', label: 'Constraints', value: 'Long-Only', color: 'secondary' },
  { icon: 'speed', label: 'Execution', value: 'Vectorised', color: 'on-surface' },
  { icon: 'shield', label: 'Stops', value: '−3% / +5%', color: 'tertiary' },
]

const METRICS = [
  { label: 'Total Return', icon: 'percent' },
  { label: 'Annualised Return', icon: 'timeline' },
  { label: 'Sharpe Ratio', icon: 'analytics' },
  { label: 'Max Drawdown', icon: 'trending_down' },
  { label: 'Win Rate', icon: 'emoji_events' },
  { label: 'Profit Factor', icon: 'paid' },
]

export function BacktestFrameworkSlide() {
  const slideNum = useSlideNumber('slide-backtest-framework')
  return (
    <section
      id="slide-backtest-framework"
      className="slide-section h-screen pl-40 pr-20 pt-20 pb-12 relative flex flex-col"
    >
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 blur-[140px] rounded-full -translate-y-1/3 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-tertiary/5 blur-[120px] rounded-full translate-y-1/3 -translate-x-1/4" />

      <div className="w-full max-w-[1500px] mx-auto flex flex-col flex-1 justify-center">
        {/* Header */}
        <header className="mb-5">
          <div className="flex items-center gap-4 mb-2">
            <span className="font-[family-name:var(--font-family-label)] text-primary tracking-[0.3em] uppercase text-xs">
              Slide {slideNum}
            </span>
            <div className="h-px w-12 bg-primary/30" />
            <span className="font-[family-name:var(--font-family-label)] text-on-surface-variant tracking-[0.1em] uppercase text-xs">
              Backtest Methodology
            </span>
          </div>
          <h1 className="font-[family-name:var(--font-family-headline)] text-4xl lg:text-5xl font-extrabold tracking-tighter text-white">
            From Signal to <span className="text-primary-container">Strategy P&amp;L.</span>
          </h1>
          <p className="text-on-surface-variant max-w-2xl text-sm leading-relaxed mt-2">
            How model predictions become measurable trading performance with realistic friction.
            <span className="text-primary"> Classification</span> decides <em>when</em> to enter;
            <span className="text-primary"> regression</span> decides <em>how much</em>.
          </p>
        </header>

        {/* Pipeline diagram */}
        <div className="bg-surface-container-low rounded-lg p-4 mb-4 border border-outline-variant/10">
          <div className="flex items-center justify-between gap-2">
            {PIPELINE.map((step, i) => (
              <div key={step.label} className="contents">
                <div className="flex flex-col items-center gap-1.5 flex-1 group relative">
                  {step.highlight && <div className="absolute -inset-3 bg-primary/5 blur-2xl rounded-full" />}
                  <div className={`relative w-16 h-16 rounded-lg flex items-center justify-center border ${step.highlight ? 'bg-gradient-to-br from-surface-variant to-surface-container-highest border-primary/30 shadow-[0_0_30px_-8px_rgba(105,246,184,0.25)]' : 'bg-surface-container border-outline-variant/15'}`}>
                    <span className={`material-symbols-outlined text-2xl ${step.color === 'tertiary' ? 'text-tertiary' : 'text-primary'}`}>{step.icon}</span>
                  </div>
                  <span className={`font-[family-name:var(--font-family-label)] text-[10px] font-bold tracking-widest uppercase ${step.highlight ? 'text-primary' : 'text-on-surface'}`}>{step.label}</span>
                  <span className="font-[family-name:var(--font-family-label)] text-[8px] text-on-surface-variant text-center max-w-[10rem] leading-tight">{step.detail}</span>
                </div>
                {i < PIPELINE.length - 1 && (
                  <span className="material-symbols-outlined text-outline-variant/40 text-2xl shrink-0">chevron_right</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Trimmed assumption tiles — full width, just icon + value + label */}
        <div className="grid grid-cols-5 gap-3 mb-4">
          {ASSUMPTIONS.map((a) => (
            <div key={a.label} className="bg-surface-container-low rounded-lg p-4 border border-outline-variant/10 flex flex-col items-center text-center">
              <div className={`w-10 h-10 bg-${a.color}/10 rounded-md flex items-center justify-center mb-2`}>
                <span className={`material-symbols-outlined text-${a.color} text-lg`}>{a.icon}</span>
              </div>
              <span className={`font-[family-name:var(--font-family-label)] text-[9px] font-bold tracking-widest uppercase text-${a.color}-dim`}>
                {a.label}
              </span>
              <h3 className="font-[family-name:var(--font-family-headline)] font-bold text-base text-white leading-tight mt-1">
                {a.value}
              </h3>
            </div>
          ))}
        </div>

        {/* Reported metrics — restored to full-width 6-col layout */}
        <div className="glass-card border border-primary/20 rounded-lg p-4 relative overflow-hidden">
          <div className="flex items-center gap-3 mb-3 relative z-10">
            <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: '"FILL" 1' }}>fact_check</span>
            <h4 className="font-[family-name:var(--font-family-headline)] text-base font-bold text-white">Reported Metrics</h4>
            <span className="font-[family-name:var(--font-family-label)] text-[10px] text-on-surface-variant uppercase tracking-widest ml-auto">All against SPY benchmark</span>
          </div>
          <div className="grid grid-cols-6 gap-2 relative z-10">
            {METRICS.map((m) => (
              <div key={m.label} className="bg-surface-container-highest/40 rounded-md px-3 py-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-sm">{m.icon}</span>
                <span className="font-[family-name:var(--font-family-label)] text-[10px] uppercase tracking-widest text-white/80 font-bold">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
