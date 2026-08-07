import { useSlideNumber } from '@/hooks/useSlideNumber'

const WHY_WINS = [
  {
    icon: 'account_tree',
    title: 'Tree splits handle non-stationarity',
    text: 'Partition-based learners are robust to shifting feature distributions that hurt gradient-based optimisers.',
  },
  {
    icon: 'compress',
    title: 'Low parameter count',
    text: 'No 1M-param model on 2,500 training samples. XGBoost avoids the overfitting that plagues LSTM / TFT / PatchTST at this sample size.',
  },
  {
    icon: 'bolt',
    title: 'No gradient-flow issues',
    text: "Boosted trees don't suffer vanishing / exploding gradients or attention-saturation that limits DL convergence on noisy daily returns.",
  },
]

const HPO = [
  { param: 'max_depth', range: '3 — 10' },
  { param: 'learning_rate', range: '0.01 — 0.3' },
  { param: 'num_boost_round', range: '100 — 2,000' },
  { param: 'min_child_weight', range: '1 — 10' },
  { param: 'subsample', range: '0.5 — 1.0' },
  { param: 'colsample_bytree', range: '0.5 — 1.0' },
  { param: 'reg_alpha (L1)', range: '1e-8 — 1.0' },
  { param: 'reg_lambda (L2)', range: '1e-8 — 1.0' },
]

export function XGBoostSlide() {
  const slideNum = useSlideNumber('slide-xgboost')
  return (
    <section id="slide-xgboost" className="slide-section h-screen pl-40 pr-20 pt-20 pb-12 flex flex-col relative">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 blur-[140px] rounded-full -translate-y-1/3 translate-x-1/4" />

      <div className="w-full max-w-[1500px] mx-auto flex flex-col flex-1 justify-center">
        {/* Header */}
        <div className="mb-6 flex items-end justify-between">
          <div>
            <span className="font-[family-name:var(--font-family-label)] text-primary text-xs tracking-[0.4em] uppercase mb-2 block">
              Slide {slideNum}: Classical Baseline
            </span>
            <h1 className="font-[family-name:var(--font-family-headline)] font-extrabold text-5xl tracking-tighter leading-none">
              XGBoost.
            </h1>
          </div>
          <div className="bg-primary/10 border border-primary/30 rounded-full px-4 py-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-base" style={{ fontVariationSettings: '"FILL" 1' }}>
              trophy
            </span>
            <span className="font-[family-name:var(--font-family-label)] text-primary text-[10px] tracking-widest uppercase font-bold">
              Overall Winner
            </span>
          </div>
        </div>

        {/* 2-col: architecture + HPO */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Architecture */}
          <div className="bg-surface-container-low rounded-lg p-5 border border-outline-variant/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-primary/10 rounded-md flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">account_tree</span>
              </div>
              <div>
                <span className="font-[family-name:var(--font-family-label)] text-[9px] tracking-widest uppercase text-primary-dim font-bold">
                  Algorithm
                </span>
                <h3 className="font-[family-name:var(--font-family-headline)] font-bold text-white text-base">
                  Gradient Boosted Trees
                </h3>
              </div>
            </div>
            <p className="text-on-surface-variant text-xs leading-relaxed mb-3">
              Ensemble of sequential decision trees; each tree corrects the residual error of the ensemble so far. Regularised via L1 / L2 penalties plus early stopping on validation loss.
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-primary/70 text-sm mt-0.5">check</span>
                <span className="text-on-surface-variant text-xs">
                  Native NaN handling, so no imputation pipeline is needed
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-primary/70 text-sm mt-0.5">check</span>
                <span className="text-on-surface-variant text-xs">
                  Feature importance out-of-the-box (gain, cover, freq)
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-primary/70 text-sm mt-0.5">check</span>
                <span className="text-on-surface-variant text-xs">
                  GPU-accelerated training (tree_method=&apos;hist&apos;, device=&apos;cuda&apos;)
                </span>
              </div>
            </div>
          </div>

          {/* HPO */}
          <div className="bg-surface-container-low rounded-lg p-5 border border-outline-variant/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-secondary/10 rounded-md flex items-center justify-center">
                <span className="material-symbols-outlined text-secondary">tune</span>
              </div>
              <div>
                <span className="font-[family-name:var(--font-family-label)] text-[9px] tracking-widest uppercase text-secondary-dim font-bold">
                  Hyperparameter Search
                </span>
                <h3 className="font-[family-name:var(--font-family-headline)] font-bold text-white text-base">
                  Optuna TPE &middot; 100 Trials
                </h3>
              </div>
            </div>
            <p className="text-on-surface-variant text-xs leading-relaxed mb-3">
              Bayesian TPE sampler prioritises promising regions; pruned by validation-loss median stopping. Per-ticker search so each stock gets its own tuned model.
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {HPO.map((h) => (
                <div key={h.param} className="flex justify-between items-baseline border-b border-outline-variant/10 py-1">
                  <span className="font-[family-name:var(--font-family-label)] text-[10px] text-on-surface-variant font-mono">
                    {h.param}
                  </span>
                  <span className="font-[family-name:var(--font-family-label)] text-[10px] text-white/70 font-mono">
                    {h.range}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Why it wins */}
        <div className="glass-card border border-primary/20 rounded-lg p-5 relative overflow-hidden">
          <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
          <div className="flex items-center gap-3 mb-3 relative z-10">
            <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: '"FILL" 1' }}>
              auto_awesome
            </span>
            <h4 className="font-[family-name:var(--font-family-headline)] text-base font-bold text-white">
              Why Simpler Won
            </h4>
          </div>
          <div className="grid grid-cols-3 gap-4 relative z-10">
            {WHY_WINS.map((w) => (
              <div key={w.title} className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-md flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-base">{w.icon}</span>
                </div>
                <div>
                  <h5 className="font-[family-name:var(--font-family-headline)] font-bold text-white text-xs mb-1">
                    {w.title}
                  </h5>
                  <p className="text-on-surface-variant text-[11px] leading-snug">{w.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
