import { useSlideNumber } from '@/hooks/useSlideNumber'

const MODELS = [
  {
    category: 'Linear/Ensemble',
    name: 'XGBoost',
    type: 'Gradient Boosted Trees',
    params: 'N/A',
    paramsNote: 'Tree-based',
    keyFeature: 'Optuna HPO (100 trials)',
    keyNote: 'Bayesian hyperparameter search over 100 Optuna trials for optimal tree configuration.',
    handlesNaN: 'Natively',
    winner: true,
  },
  {
    category: 'Recurrent Neural',
    name: 'LSTM',
    type: 'Recurrent Neural Net',
    params: '~233K',
    keyFeature: 'Gated memory cells',
    handlesNaN: '3-layer defence',
    winner: false,
  },
  {
    category: 'Attention-Based',
    name: 'TFT',
    type: 'Attention-based',
    params: '~965K',
    keyFeature: 'Variable selection + temporal attention',
    handlesNaN: 'Via encoding',
    winner: false,
  },
  {
    category: 'Transformer Variant',
    name: 'PatchTST',
    type: 'Transformer',
    params: '~580K',
    keyFeature: 'Patch tokenisation',
    handlesNaN: 'Via masking',
    winner: false,
  },
]

export function ModelsSlide() {
  const slideNum = useSlideNumber('slide-models')
  return (
    <section id="slide-models" className="slide-section h-screen pl-40 pr-20 pt-20 pb-12 flex flex-col">
      <div className="w-full max-w-[1500px] mx-auto flex flex-col flex-1 justify-center">
        {/* Header */}
        <div className="mb-5 flex flex-col items-start relative">
          <span className="font-[family-name:var(--font-family-label)] text-primary text-xs tracking-[0.4em] uppercase mb-1.5">
            Slide {slideNum}: Model Lineup
          </span>
          <h1 className="font-[family-name:var(--font-family-headline)] font-extrabold text-4xl tracking-tighter leading-none mb-2">
            Four Architectures,<br /> One Benchmark.
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-primary to-transparent rounded-full" />
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        </div>

        {/* Comparison Table */}
        <div className="relative overflow-hidden rounded-lg bg-surface-container-low p-px">
          <div className="grid grid-cols-5 gap-px">
            {/* Header Row */}
            <div className="p-3 bg-surface-container-low flex items-end">
              <span className="font-[family-name:var(--font-family-label)] text-on-surface-variant text-[10px] uppercase tracking-widest">
                Feature Matrix
              </span>
            </div>
            {MODELS.map((m) => (
              <div
                key={m.name}
                className={`p-3 ${m.winner ? 'bg-surface-container-high relative overflow-hidden' : 'bg-surface-container-low/50'}`}
              >
                <span className="font-[family-name:var(--font-family-label)] text-white/40 text-[9px] uppercase tracking-widest block mb-1">
                  {m.category}
                </span>
                <h3 className={`font-[family-name:var(--font-family-headline)] font-bold text-xl ${m.winner ? 'text-primary' : 'text-white'}`}>
                  {m.name}
                </h3>
                {m.winner && (
                  <>
                    <div className="absolute top-0 right-0 p-2">
                      <span
                        className="material-symbols-outlined text-primary/40 text-lg"
                        style={{ fontVariationSettings: '"FILL" 1' }}
                      >
                        verified
                      </span>
                    </div>
                    <div className="absolute inset-0 border-2 border-primary/20 pointer-events-none shadow-[0_0_40px_-10px_rgba(105,246,184,0.15)]" />
                  </>
                )}
              </div>
            ))}

            {/* Type Row */}
            <div className="p-3 bg-surface-container-low/80 flex items-center">
              <span className="font-[family-name:var(--font-family-label)] text-on-surface-variant text-[10px] uppercase font-bold tracking-widest">
                Type
              </span>
            </div>
            {MODELS.map((m) => (
              <div
                key={`type-${m.name}`}
                className={`p-3 flex items-center relative ${m.winner ? 'bg-surface-container-high/80' : 'bg-surface-container-low/30'}`}
              >
                {m.winner && <div className="absolute inset-y-0 left-0 w-[2px] bg-primary/30" />}
                <p className={`text-sm ${m.winner ? 'text-on-surface' : 'text-on-surface/60'}`}>{m.type}</p>
              </div>
            ))}

            {/* Parameters Row */}
            <div className="p-3 bg-surface-container-low/80 flex items-center">
              <span className="font-[family-name:var(--font-family-label)] text-on-surface-variant text-[10px] uppercase font-bold tracking-widest">
                Parameters
              </span>
            </div>
            {MODELS.map((m) => (
              <div
                key={`params-${m.name}`}
                className={`p-3 flex items-center relative ${m.winner ? 'bg-surface-container-high/80' : 'bg-surface-container-low/30'}`}
              >
                {m.winner && <div className="absolute inset-y-0 left-0 w-[2px] bg-primary/30" />}
                {m.winner ? (
                  <div className="flex flex-col">
                    <p className="font-[family-name:var(--font-family-headline)] font-bold text-lg text-white">{m.params}</p>
                    <span className="font-[family-name:var(--font-family-label)] text-[9px] text-primary/60">{m.paramsNote}</span>
                  </div>
                ) : (
                  <p className="text-sm text-on-surface/60">{m.params}</p>
                )}
              </div>
            ))}

            {/* Key Feature Row */}
            <div className="p-3 bg-surface-container-low/80 flex items-center">
              <span className="font-[family-name:var(--font-family-label)] text-on-surface-variant text-[10px] uppercase font-bold tracking-widest">
                Key Feature
              </span>
            </div>
            {MODELS.map((m) => (
              <div
                key={`feat-${m.name}`}
                className={`p-3 flex items-center relative ${m.winner ? 'bg-surface-container-high/80' : 'bg-surface-container-low/30'}`}
              >
                {m.winner && <div className="absolute inset-y-0 left-0 w-[2px] bg-primary/30" />}
                {m.winner ? (
                  <div className="flex flex-col">
                    <p className="text-sm text-on-surface font-medium italic">{m.keyFeature}</p>
                    <span className="font-[family-name:var(--font-family-label)] text-[9px] text-white/40 mt-0.5 leading-snug">
                      {m.keyNote}
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-on-surface/60">{m.keyFeature}</p>
                )}
              </div>
            ))}

            {/* Handles NaN Row */}
            <div className="p-3 bg-surface-container-low/80 flex items-center">
              <span className="font-[family-name:var(--font-family-label)] text-on-surface-variant text-[10px] uppercase font-bold tracking-widest">
                Handles NaN
              </span>
            </div>
            {MODELS.map((m) => (
              <div
                key={`nan-${m.name}`}
                className={`p-3 flex items-center relative ${m.winner ? 'bg-surface-container-high/80' : 'bg-surface-container-low/30'}`}
              >
                {m.winner && <div className="absolute inset-y-0 left-0 w-[2px] bg-primary/30" />}
                <div className="flex items-center gap-2">
                  {m.winner && (
                    <span className="material-symbols-outlined text-primary text-base" style={{ fontVariationSettings: '"FILL" 1' }}>
                      check_circle
                    </span>
                  )}
                  <span className={`text-sm ${m.winner ? 'font-[family-name:var(--font-family-headline)] font-bold text-primary' : 'text-on-surface/60'}`}>
                    {m.handlesNaN}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Parameter count bars — horizontal bars showing relative model size on a 0-1M scale */}
        <div className="mt-3 bg-surface-container-low rounded-lg p-3 border border-outline-variant/10">
          <div className="flex items-baseline justify-between mb-2">
            <span className="font-[family-name:var(--font-family-label)] text-on-surface-variant text-[10px] uppercase font-bold tracking-widest">
              Parameter Count <span className="text-on-surface-variant/60 normal-case font-normal">· smaller = more parameter-efficient</span>
            </span>
            <span className="font-[family-name:var(--font-family-label)] text-on-surface-variant/60 text-[9px] uppercase tracking-widest">
              Linear scale, max = 1M
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            {[
              { name: 'XGBoost', count: '~thousand', countSub: 'tree splits', pct: 1, color: 'bg-primary', textColor: 'text-primary', winner: true },
              { name: 'LSTM', count: '~233K', countSub: 'params', pct: 23.3, color: 'bg-on-surface-variant', textColor: 'text-on-surface', winner: false },
              { name: 'TFT', count: '~965K', countSub: 'params', pct: 96.5, color: 'bg-on-surface-variant', textColor: 'text-on-surface', winner: false },
              { name: 'PatchTST', count: '~580K', countSub: 'params', pct: 58.0, color: 'bg-on-surface-variant', textColor: 'text-on-surface', winner: false },
            ].map((m) => (
              <div key={m.name} className="flex items-center gap-3 h-[18px]">
                {/* Label */}
                <div className="w-[110px] flex items-center gap-1.5 shrink-0">
                  {m.winner && (
                    <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: '"FILL" 1' }}>verified</span>
                  )}
                  <span className={`font-[family-name:var(--font-family-headline)] font-bold text-sm ${m.winner ? 'text-primary' : 'text-on-surface'}`}>
                    {m.name}
                  </span>
                </div>
                {/* Bar track + bar */}
                <div className="flex-1 relative h-full bg-surface-container-highest/30 rounded-sm overflow-hidden">
                  <div
                    className={`absolute top-0 bottom-0 left-0 ${m.color} ${m.winner ? '' : 'opacity-70'} rounded-sm`}
                    style={{ width: `${Math.max(m.pct, 0.5)}%` }}
                  />
                </div>
                {/* Value */}
                <div className="w-[180px] text-right shrink-0">
                  <span className={`font-[family-name:var(--font-family-headline)] font-bold text-sm ${m.textColor}`}>
                    {m.count}
                  </span>
                  <span className="font-[family-name:var(--font-family-label)] text-[9px] text-on-surface-variant uppercase tracking-widest ml-1.5">
                    {m.countSub}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-on-surface-variant mt-1.5 italic">
            XGBoost (winner on regression directional accuracy) uses a fraction of the capacity of the deep-learning models. Signal-to-noise in daily equity data is too low to benefit from extra parameters.
          </p>
        </div>

        {/* Protocol footer */}
        <div className="mt-3 grid grid-cols-3 gap-3">
          <div className="bg-surface-container-low rounded-lg p-3 flex flex-col gap-2">
            <span className="font-[family-name:var(--font-family-label)] text-on-surface-variant text-[10px] uppercase tracking-widest">
              Training Efficiency
            </span>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-md">
                <span className="material-symbols-outlined text-primary text-2xl">tune</span>
              </div>
              <div>
                <h4 className="font-[family-name:var(--font-family-headline)] font-bold text-lg text-white">100 Trials</h4>
                <p className="font-[family-name:var(--font-family-label)] text-[9px] text-on-surface-variant uppercase">
                  Optuna Bayesian HPO
                </p>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-low rounded-lg p-3 flex flex-col gap-2">
            <span className="font-[family-name:var(--font-family-label)] text-on-surface-variant text-[10px] uppercase tracking-widest">
              Data Split
            </span>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-md">
                <span className="material-symbols-outlined text-primary text-2xl">verified_user</span>
              </div>
              <div>
                <h4 className="font-[family-name:var(--font-family-headline)] font-bold text-lg text-white">70 / 15 / 15</h4>
                <p className="font-[family-name:var(--font-family-label)] text-[9px] text-on-surface-variant uppercase">
                  Chronological, per-ticker
                </p>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-low rounded-lg p-3 flex flex-col gap-2">
            <span className="font-[family-name:var(--font-family-label)] text-on-surface-variant text-[10px] uppercase tracking-widest">
              Reproducibility
            </span>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-md">
                <span className="material-symbols-outlined text-primary text-2xl">fingerprint</span>
              </div>
              <div>
                <h4 className="font-[family-name:var(--font-family-headline)] font-bold text-lg text-white">seed = 42</h4>
                <p className="font-[family-name:var(--font-family-label)] text-[9px] text-on-surface-variant uppercase">
                  numpy · torch · xgb · optuna
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
