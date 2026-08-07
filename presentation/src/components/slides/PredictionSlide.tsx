import { useSlideNumber } from '@/hooks/useSlideNumber'

const CLASSIFICATION = [
  { name: 'PatchTST', value: 52.5, best: true },
  { name: 'TFT (Temporal Fusion)', value: 51.0, best: false },
  { name: 'LSTM', value: 50.6, best: false },
  { name: 'XGBoost', value: 49.6, best: false },
]

const REGRESSION = [
  { name: 'XGBoost', value: 55.5, best: true },
  { name: 'TFT', value: 50.8, best: false },
  { name: 'LSTM', value: 49.4, best: false },
  { name: 'PatchTST', value: 45.0, best: false },
]

export function PredictionSlide() {
  const slideNum = useSlideNumber('slide-prediction')
  return (
    <section id="slide-prediction" className="slide-section h-screen pl-40 pr-20 pt-20 pb-10 relative flex flex-col"
      style={{ background: 'radial-gradient(circle at top right, rgba(105,246,184,0.05), transparent 40%), radial-gradient(circle at bottom left, rgba(172,138,255,0.05), transparent 40%)' }}>
      <div className="w-full max-w-[1500px] mx-auto flex flex-col flex-1 justify-center">
        {/* Header */}
        <header className="mb-5">
          <span className="font-[family-name:var(--font-family-label)] text-primary text-xs font-bold tracking-[0.3em] uppercase mb-2 block">
            Slide {slideNum} // Experimental Results
          </span>
          <h1 className="font-[family-name:var(--font-family-headline)] font-extrabold text-5xl text-white tracking-tighter leading-[0.9]">
            Prediction <span className="gradient-text">Performance.</span>
          </h1>
        </header>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-6 items-start">
          {/* Classification */}
          <div className="bg-surface-container-low rounded-lg p-7 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-700" />
            <div className="flex justify-between items-end gap-6 mb-8">
              <div>
                <h3 className="font-[family-name:var(--font-family-headline)] font-bold text-2xl text-white mb-1">Directional Classification</h3>
                <p className="font-[family-name:var(--font-family-label)] text-on-surface-variant text-[10px] uppercase tracking-widest">Target: Binary Movement (Up/Down)</p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-[family-name:var(--font-family-headline)] font-extrabold text-white">52.5%</span>
                <p className="font-[family-name:var(--font-family-label)] text-on-surface-variant text-[10px] uppercase">Peak Accuracy</p>
              </div>
            </div>

            <div className="space-y-5 relative">
              {/* Vertical 50% baseline — at 50% of the normalized 45-55 range */}
              <div className="absolute top-0 -bottom-1 left-[50%] z-10 pointer-events-none">
                <div className="w-px h-full border-l border-dashed border-error/50" />
              </div>
              {CLASSIFICATION.map((item) => (
                <div key={item.name} className={`relative space-y-2 ${!item.best ? 'opacity-60' : ''}`}>
                  <div className="flex justify-between items-center">
                    <span className={`font-[family-name:var(--font-family-label)] text-sm uppercase tracking-wider ${item.best ? 'text-white' : 'text-white/60'}`}>{item.name}</span>
                    <span className={`font-[family-name:var(--font-family-headline)] font-bold ${item.best ? 'text-primary' : 'text-white/80'}`}>{item.value}%</span>
                  </div>
                  <div className="h-3 w-full bg-surface-container-highest rounded-full relative">
                    <div className={`h-full rounded-full ${item.best ? 'bg-gradient-to-r from-primary to-primary-container' : 'bg-on-surface-variant/50'}`} style={{ width: `${((item.value - 45) / 10) * 100}%` }} />
                  </div>
                </div>
              ))}
              {/* Axis labels */}
              <div className="flex justify-between items-center pt-1">
                <span className="font-[family-name:var(--font-family-label)] text-[8px] text-white/30 uppercase">45%</span>
                <span className="font-[family-name:var(--font-family-label)] text-[8px] text-error uppercase">50% Baseline</span>
                <span className="font-[family-name:var(--font-family-label)] text-[8px] text-white/30 uppercase">55%</span>
              </div>
            </div>
          </div>

          {/* Regression */}
          <div className="bg-surface-container-low rounded-lg p-7 relative overflow-hidden group border-l-4 border-primary/20">
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-primary/10 rotate-45 pointer-events-none">
            </div>
            <div className="absolute top-3 right-3">
              <span className="material-symbols-outlined text-primary/40 text-lg">star</span>
            </div>
            <div className="flex justify-between items-end gap-6 mb-8">
              <div>
                <h3 className="font-[family-name:var(--font-family-headline)] font-bold text-2xl text-white mb-1">Return Regression</h3>
                <p className="font-[family-name:var(--font-family-label)] text-on-surface-variant text-[10px] uppercase tracking-widest">Target: Next-Day Log Returns</p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-[family-name:var(--font-family-headline)] font-extrabold text-primary">55.5%</span>
                <p className="font-[family-name:var(--font-family-label)] text-on-surface-variant text-[10px] uppercase">Hit Ratio</p>
              </div>
            </div>

            <div className="space-y-5">
              {REGRESSION.map((item) => (
                <div key={item.name} className="relative space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className={`font-[family-name:var(--font-family-label)] text-sm uppercase tracking-wider ${item.best ? 'text-primary font-bold' : 'text-white/80'}`}>{item.name}</span>
                      {item.best && (
                        <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-sm font-[family-name:var(--font-family-label)] font-bold uppercase">Best Performer</span>
                      )}
                    </div>
                    <span className={`font-[family-name:var(--font-family-headline)] font-bold ${item.best ? 'text-primary text-lg' : 'text-white'}`}>{item.value}%</span>
                  </div>
                  <div className={`${item.best ? 'h-4 p-0.5' : 'h-3'} w-full bg-surface-container-highest rounded-full overflow-hidden`}>
                    <div className={`h-full rounded-full ${item.best ? 'bg-gradient-to-r from-primary to-tertiary shadow-[0_0_15px_rgba(105,246,184,0.3)]' : 'bg-on-surface-variant/50'}`} style={{ width: `${((item.value - 40) / 20) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Callout */}
        <div className="mt-4 bg-surface-container-highest/60 backdrop-blur-xl rounded-lg p-4 flex items-center gap-4 border border-outline-variant/10">
          <div className="bg-secondary/20 p-2.5 rounded-lg shrink-0">
            <span className="material-symbols-outlined text-secondary text-xl" style={{ fontVariationSettings: '"FILL" 1' }}>lightbulb</span>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-[family-name:var(--font-family-headline)] font-bold text-white text-sm mb-0.5">Key takeaway: Structural Insight</h4>
            <p className="text-on-surface-variant leading-snug text-xs">
              Regression loss captures directional information better than binary classification. Simpler models win when signal-to-noise is low. The decision boundaries in binary tasks are often too rigid for the stochastic nature of stock markets.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
