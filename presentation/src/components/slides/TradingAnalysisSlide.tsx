import { useSlideNumber } from '@/hooks/useSlideNumber'

// Top-3 ranked from public/data/{model}/{ticker}_backtest_metrics.json
// equity = compound-return path computed from each strategy's trades.json (16 evenly-sampled points)
const TOP_RESULTS = [
  {
    rank: 1, model: 'TFT on GOOGL', totalReturn: 25.1, annReturn: 17.2, sharpe: 1.015, icon: 'analytics',
    equity: [1.0000, 1.0107, 1.0419, 1.0458, 1.0661, 1.2060, 1.1216, 1.1725, 1.2200, 1.1812, 1.1966, 1.1479, 1.1544, 1.1529, 1.2115, 1.3094],
  },
  {
    rank: 2, model: 'XGBoost on MSFT', totalReturn: 24.7, annReturn: 16.0, sharpe: 0.823, icon: 'memory',
    equity: [1.0000, 0.9677, 1.0076, 1.0802, 1.1405, 1.1765, 1.1968, 1.2699, 1.2354, 1.2484, 1.2977, 1.3123, 1.3267, 1.3382, 1.3529, 1.3927],
  },
  {
    rank: 3, model: 'XGBoost on GOOGL', totalReturn: 16.4, annReturn: 10.7, sharpe: 0.622, icon: 'query_stats',
    equity: [1.0000, 0.9820, 1.0396, 1.0349, 1.0710, 1.0916, 1.0345, 1.0329, 1.0077, 1.0449, 1.0467, 1.1008, 1.1086, 1.1471, 1.1392, 1.2113],
  },
]

function Sparkline({ data, colorClass }: { data: number[]; colorClass: string }) {
  const W = 280, H = 50
  const pad = { top: 4, right: 4, bottom: 8, left: 4 }
  const dataMin = Math.min(...data)
  const dataMax = Math.max(...data)
  const range = dataMax - dataMin
  // Larger buffer below the min so the curve sits visually higher in the SVG and
  // doesn't graze the bottom edge of the card
  const yMin = dataMin - range * 0.30
  const yMax = dataMax + range * 0.05
  const innerW = W - pad.left - pad.right
  const innerH = H - pad.top - pad.bottom
  const xFor = (i: number) => pad.left + (i / (data.length - 1)) * innerW
  const yFor = (v: number) => pad.top + ((yMax - v) / (yMax - yMin)) * innerH
  const path = data.map((v, i) => `${i === 0 ? 'M' : 'L'}${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`).join(' ')
  const areaPath = `${path} L${xFor(data.length - 1).toFixed(1)},${H - pad.bottom} L${xFor(0).toFixed(1)},${H - pad.bottom} Z`
  // Color picked up via currentColor so it adapts to light/dark theme
  return (
    <div className={`w-full h-full ${colorClass}`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="none">
        <path d={areaPath} fill="currentColor" fillOpacity="0.12" />
        <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={xFor(data.length - 1)} cy={yFor(data[data.length - 1])} r="2" fill="currentColor" />
      </svg>
    </div>
  )
}

const SPY_TOTAL_RETURN = 34.4
const SPY_ANN_RETURN = 23.4

// All 20 model-ticker combos sorted by annualised return (desc).
// Source: public/data/{model}/{ticker}_backtest_metrics.json
const ALL_RESULTS = [
  { model: 'TFT', ticker: 'GOOGL', annReturn: 17.2 },
  { model: 'XGBoost', ticker: 'MSFT', annReturn: 16.0 },
  { model: 'XGBoost', ticker: 'GOOGL', annReturn: 10.7 },
  { model: 'PatchTST', ticker: 'MSFT', annReturn: 7.0 },
  { model: 'PatchTST', ticker: 'JPM', annReturn: 6.3 },
  { model: 'PatchTST', ticker: 'AAPL', annReturn: 5.4 },
  { model: 'LSTM', ticker: 'AAPL', annReturn: 4.6 },
  { model: 'LSTM', ticker: 'XOM', annReturn: 1.8 },
  { model: 'TFT', ticker: 'AAPL', annReturn: 1.6 },
  { model: 'TFT', ticker: 'JPM', annReturn: 0.5 },
  { model: 'XGBoost', ticker: 'XOM', annReturn: 0.0 },
  { model: 'LSTM', ticker: 'JPM', annReturn: 0.0 },
  { model: 'TFT', ticker: 'XOM', annReturn: 0.0 },
  { model: 'LSTM', ticker: 'GOOGL', annReturn: -0.5 },
  { model: 'PatchTST', ticker: 'XOM', annReturn: -0.6 },
  { model: 'XGBoost', ticker: 'JPM', annReturn: -0.6 },
  { model: 'PatchTST', ticker: 'GOOGL', annReturn: -0.8 },
  { model: 'LSTM', ticker: 'MSFT', annReturn: -1.9 },
  { model: 'XGBoost', ticker: 'AAPL', annReturn: -2.5 },
  { model: 'TFT', ticker: 'MSFT', annReturn: -4.0 },
]

// Bar chart domain: -5% to +25% (covers all data + SPY at 23.4%)
const DOMAIN_MIN = -5
const DOMAIN_MAX = 25
const DOMAIN_RANGE = DOMAIN_MAX - DOMAIN_MIN
const ZERO_PCT = ((0 - DOMAIN_MIN) / DOMAIN_RANGE) * 100  // 16.67%
const SPY_PCT = ((SPY_ANN_RETURN - DOMAIN_MIN) / DOMAIN_RANGE) * 100  // 94.67%

const MODEL_COLORS: Record<string, string> = {
  XGBoost: 'bg-primary',
  LSTM: 'bg-on-surface-variant',
  TFT: 'bg-tertiary',
  PatchTST: 'bg-secondary',
}

function valuePct(v: number): number {
  return ((v - DOMAIN_MIN) / DOMAIN_RANGE) * 100
}

export function TradingAnalysisSlide() {
  const slideNum = useSlideNumber('slide-trading-analysis')
  return (
    <section
      id="slide-trading-analysis"
      className="slide-section h-screen pl-40 pr-20 pt-28 pb-12 relative overflow-hidden flex flex-col"
      style={{
        background: 'linear-gradient(135deg, rgba(105,246,184,0.05) 0%, rgba(172,138,255,0.05) 100%)',
      }}
    >
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-secondary/10 rounded-full blur-[120px]" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-[1500px] mx-auto flex flex-col flex-1 justify-center gap-3 relative z-10">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="font-[family-name:var(--font-family-label)] text-secondary tracking-[0.3em] text-xs uppercase font-bold">
              Slide {slideNum}: Top Strategies & Post-Mortem
            </span>
            <div className="h-[1px] w-12 bg-outline-variant/30" />
          </div>
          <h1 className="font-[family-name:var(--font-family-headline)] text-4xl font-extrabold tracking-tight text-on-surface">
            Profit Across the Board.
          </h1>
        </div>

        {/* Top 3 ranked cards */}
        <div className="grid grid-cols-3 gap-3">
          {TOP_RESULTS.map((r) => {
            // Use theme-aware color classes so sparkline is visible in both light + dark mode
            const sparkColorClass = r.rank === 1 ? 'text-primary' : 'text-secondary-dim'
            return (
              <div
                key={r.rank}
                className={`rounded-lg p-3 group transition-all duration-300 relative overflow-hidden ${
                  r.rank === 1
                    ? 'bg-surface-container-high border border-primary/30'
                    : 'bg-surface-container-low'
                }`}
              >
                {r.rank === 1 && (
                  <div className="absolute top-0 right-0 p-2">
                    <span className="material-symbols-outlined text-primary/40 text-base" style={{ fontVariationSettings: '"FILL" 1' }}>
                      star
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between mb-1">
                  <span className="font-[family-name:var(--font-family-label)] text-[9px] text-white/40 uppercase tracking-widest">
                    Rank #{r.rank}
                  </span>
                </div>
                <h4 className="font-[family-name:var(--font-family-headline)] text-base font-bold text-white mb-1">{r.model}</h4>
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <p className={`text-2xl font-[family-name:var(--font-family-headline)] font-black ${r.rank === 1 ? 'text-primary' : 'text-secondary-dim'}`}>
                        {r.totalReturn.toFixed(1)}%
                      </p>
                      <span className="font-[family-name:var(--font-family-label)] text-[10px] text-on-surface-variant tabular-nums">
                        ({r.annReturn.toFixed(1)}% ann.)
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="font-[family-name:var(--font-family-label)] text-[8px] uppercase tracking-widest text-on-surface-variant">Sharpe</span>
                    <p className="text-base font-[family-name:var(--font-family-headline)] font-bold text-white leading-tight">{r.sharpe.toFixed(2)}</p>
                  </div>
                </div>
                {/* Equity curve sparkline */}
                <div className="mt-2 h-[40px]">
                  <Sparkline data={r.equity} colorClass={sparkColorClass} />
                </div>
                <p className="mt-1 font-[family-name:var(--font-family-label)] text-[9px] uppercase tracking-widest text-error-dim text-right">
                  Lagged SPY by &minus;{(SPY_TOTAL_RETURN - r.totalReturn).toFixed(1)} pp
                </p>
              </div>
            )
          })}
        </div>

        {/* All-20 strategies bar chart */}
        <div className="bg-surface-container-low/50 rounded-lg p-3 border border-outline-variant/10">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="font-[family-name:var(--font-family-headline)] text-xs font-bold text-white tracking-wide uppercase">
              All 20 Strategies <span className="text-on-surface-variant font-normal normal-case"> · annualised return</span>
            </h3>
            <div className="flex items-center gap-3 text-[9px] uppercase tracking-widest font-[family-name:var(--font-family-label)] font-bold">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-primary" />XGBoost</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-tertiary" />TFT</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-secondary" />PatchTST</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-on-surface-variant" />LSTM</span>
            </div>
          </div>

          {/* Bar grid */}
          <div className="relative">
            {/* Zero reference line */}
            <div
              className="absolute top-0 bottom-0 w-px bg-outline-variant/30 z-0 pointer-events-none"
              style={{ left: `calc(120px + (100% - 130px) * ${ZERO_PCT / 100})` }}
            />

            <div className="flex flex-col gap-[2px]">
              {ALL_RESULTS.map((r, i) => {
                const isPositive = r.annReturn >= 0
                const pct = valuePct(r.annReturn)
                const left = isPositive ? ZERO_PCT : pct
                const width = isPositive ? pct - ZERO_PCT : ZERO_PCT - pct
                const colorClass = MODEL_COLORS[r.model]
                return (
                  <div key={i} className="flex items-center gap-2 h-[12px]">
                    {/* Label */}
                    <div className="w-[120px] flex items-center gap-1.5 shrink-0">
                      <span className="font-[family-name:var(--font-family-label)] text-[8px] font-bold tracking-widest uppercase text-on-surface-variant w-3 tabular-nums">{i + 1}</span>
                      <span className="font-[family-name:var(--font-family-headline)] text-[10px] font-bold text-white">
                        {r.model}
                        <span className="text-on-surface-variant font-normal"> · {r.ticker}</span>
                      </span>
                    </div>
                    {/* Bar area */}
                    <div className="relative flex-1 h-full">
                      <div
                        className={`absolute top-0 bottom-0 ${colorClass} ${isPositive ? '' : 'opacity-50'} rounded-sm`}
                        style={{ left: `${left}%`, width: `${width}%` }}
                      />
                    </div>
                    {/* Value */}
                    <span className={`w-12 text-right font-[family-name:var(--font-family-label)] text-[10px] font-bold tabular-nums ${isPositive ? 'text-white' : 'text-error-dim'}`}>
                      {r.annReturn > 0 ? '+' : ''}{r.annReturn.toFixed(1)}%
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Compact post-mortem keywords + statistical significance callout */}
        <div className="grid grid-cols-[1fr_auto] gap-3 items-stretch">
          <div className="bg-surface-container-low/50 rounded-lg p-2.5 flex items-center gap-4 border border-outline-variant/10">
            <span className="font-[family-name:var(--font-family-label)] text-[9px] text-secondary tracking-widest uppercase font-bold whitespace-nowrap">Why?</span>
            <div className="flex gap-3 text-[10px]">
              <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-secondary text-sm">trending_up</span><span className="text-on-surface">Bull-market benchmark</span></span>
              <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-secondary text-sm">payments</span><span className="text-on-surface">5 bps cost drag</span></span>
              <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-secondary text-sm">block</span><span className="text-on-surface">Long-only constraint</span></span>
            </div>
          </div>
          <div className="glass-card border border-tertiary/20 rounded-lg p-2.5 flex items-center gap-3">
            <span className="material-symbols-outlined text-tertiary text-base">science</span>
            <p className="text-[10px] text-on-surface-variant leading-snug">
              <span className="text-tertiary font-semibold">6 of 20</span> statistically significant at α=0.05
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
