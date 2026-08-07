import { useSlideNumber } from '@/hooks/useSlideNumber'

const DL_MODELS = [
  {
    name: 'LSTM',
    tag: 'Recurrent',
    color: 'secondary',
    params: '~233K',
    icon: 'memory',
    paper: 'Hochreiter & Schmidhuber (1997)',
    features: [
      'Sequence-to-one: lookback → next-day target',
      'Gated memory cells (input / forget / output)',
      'Multi-layer stack with dropout',
      'Handles variable-length history via padding',
    ],
    strengths: 'Captures short-range temporal dependencies efficiently.',
    weakness: 'Limited long-range context; vanishing gradients on very long sequences.',
  },
  {
    name: 'TFT',
    tag: 'Attention',
    color: 'primary',
    params: '~965K',
    icon: 'hub',
    paper: 'Lim et al. (2020)',
    features: [
      'Input routing: static / known-future / observed-past',
      'Variable selection networks (soft feature selection)',
      'Interpretable multi-head attention over history',
      'Quantile loss for built-in uncertainty bounds',
    ],
    strengths: 'Most interpretable; can explain per-feature & per-time importance.',
    weakness: 'Heaviest at ~965K params — hard to generalise on 2,500 daily bars.',
  },
  {
    name: 'PatchTST',
    tag: 'Transformer',
    color: 'tertiary',
    params: '~580K',
    icon: 'grid_view',
    paper: 'Nie et al. (2023)',
    features: [
      'Time series → patches (ViT-style)',
      'Channel-independent encoding per feature',
      'Reduced sequence length → faster attention',
      'Supervised & self-supervised variants',
    ],
    strengths: 'Fast; strong on datasets with clear multi-scale patterns.',
    weakness: 'Patch boundary artefacts on noisy equity returns.',
  },
]

export function DeepLearningModelsSlide() {
  const slideNum = useSlideNumber('slide-deep-learning')
  return (
    <section
      id="slide-deep-learning"
      className="slide-section h-screen pl-40 pr-20 pt-20 pb-12 flex flex-col relative"
    >
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-secondary/10 blur-[140px] rounded-full -translate-y-1/3 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-tertiary/10 blur-[120px] rounded-full translate-y-1/3 -translate-x-1/4" />

      <div className="w-full max-w-[1500px] mx-auto flex flex-col flex-1 justify-center">
        {/* Header */}
        <div className="mb-6">
          <span className="font-[family-name:var(--font-family-label)] text-secondary text-xs tracking-[0.4em] uppercase mb-2 block">
            Slide {slideNum}: Deep-Learning Models
          </span>
          <h1 className="font-[family-name:var(--font-family-headline)] font-extrabold text-5xl tracking-tighter leading-none">
            LSTM &middot; TFT &middot; PatchTST.
          </h1>
        </div>

        {/* 3-column card set */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          {DL_MODELS.map((m) => (
            <div
              key={m.name}
              className="bg-surface-container-low rounded-lg p-5 border border-outline-variant/10 relative overflow-hidden flex flex-col"
            >
              <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none">
                <span className="material-symbols-outlined text-6xl" style={{ fontVariationSettings: '"FILL" 1' }}>
                  {m.icon}
                </span>
              </div>
              <div className="relative z-10 flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-10 h-10 bg-${m.color}/10 rounded-md flex items-center justify-center`}>
                    <span className={`material-symbols-outlined text-${m.color}`}>{m.icon}</span>
                  </div>
                  <span className={`font-[family-name:var(--font-family-label)] text-[9px] font-bold tracking-widest uppercase text-${m.color}-dim`}>
                    {m.tag}
                  </span>
                </div>
                <h3 className="font-[family-name:var(--font-family-headline)] font-black text-2xl text-white mb-0.5">
                  {m.name}
                </h3>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-[family-name:var(--font-family-headline)] font-bold text-base text-white/70">
                    {m.params}
                  </span>
                  <span className="font-[family-name:var(--font-family-label)] text-[9px] uppercase tracking-widest text-on-surface-variant">
                    params
                  </span>
                </div>
                <p className="font-[family-name:var(--font-family-label)] text-[10px] text-on-surface-variant italic mb-3">
                  {m.paper}
                </p>
                <ul className="space-y-1.5 mb-3">
                  {m.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full bg-${m.color} mt-1.5 shrink-0`} />
                      <span className="text-on-surface-variant text-[11px] leading-snug">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative z-10 pt-3 mt-auto border-t border-outline-variant/10 space-y-1.5">
                <div>
                  <span className="font-[family-name:var(--font-family-label)] text-[9px] font-bold tracking-widest uppercase text-primary-dim">
                    Strength
                  </span>
                  <p className="text-on-surface-variant text-[11px] leading-snug">{m.strengths}</p>
                </div>
                <div>
                  <span className="font-[family-name:var(--font-family-label)] text-[9px] font-bold tracking-widest uppercase text-error-dim">
                    Limitation
                  </span>
                  <p className="text-on-surface-variant text-[11px] leading-snug">{m.weakness}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Shared training protocol */}
        <div className="glass-card border border-secondary/20 rounded-lg p-4 relative overflow-hidden flex items-center gap-5">
          <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-secondary/10 rounded-full blur-3xl" />
          <div className="shrink-0">
            <div className="w-10 h-10 rounded-full border-2 border-secondary/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary text-xl">settings</span>
            </div>
          </div>
          <div className="flex-grow">
            <h4 className="font-[family-name:var(--font-family-headline)] text-sm font-bold mb-0.5">Shared Training Protocol</h4>
            <p className="text-on-surface-variant text-xs">
              Fixed-config training (no Optuna search) &middot; <span className="text-white font-semibold">LSTM/PatchTST: max 100 epochs</span>, <span className="text-white font-semibold">TFT: max 50 epochs</span> &middot; early-stop on validation loss &middot;{' '}
              <span className="text-white font-semibold">seed = 42</span> (numpy + torch)
            </p>
          </div>
          <div className="shrink-0 hidden lg:block">
            <div className="font-[family-name:var(--font-family-label)] text-[9px] tracking-widest uppercase text-white/30 border-l border-white/10 pl-5 italic">
              Failure mode: all 3 DL models hit diminishing returns at ~2,500 daily bars — classical literature expectation <span className="text-primary">confirmed</span>.
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
