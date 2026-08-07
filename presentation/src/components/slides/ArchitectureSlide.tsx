import { useSlideNumber } from '@/hooks/useSlideNumber'

const PIPELINE_STEPS = [
  { icon: 'input', label: 'Data Ingestion', highlight: false, detail: 'yfinance · FRED · FinBERT' },
  { icon: 'engineering', label: 'Feature Engineering', highlight: false, detail: '68 features · causal only' },
  { icon: 'psychology', label: 'Model Training', highlight: true, detail: '4 architectures · 100 trials each' },
  { icon: 'history', label: 'Backtesting', highlight: false, detail: '5 bps · long-only · vectorised' },
  { icon: 'dashboard', label: 'Dashboard', highlight: false, detail: 'Live · interactive · reproducible' },
]

export function ArchitectureSlide() {
  const slideNum = useSlideNumber('slide-architecture')
  return (
    <section id="slide-architecture" className="slide-section h-screen pl-40 pr-20 pt-20 pb-14 flex flex-col">
      <div className="w-full max-w-[1500px] mx-auto flex flex-col flex-1 justify-center gap-10">
        {/* Header */}
        <header>
          <div className="flex items-center gap-4 mb-2">
            <span className="font-[family-name:var(--font-family-label)] text-primary tracking-[0.3em] uppercase text-xs">
              Slide {slideNum}
            </span>
            <div className="h-px w-12 bg-primary/30" />
            <span className="font-[family-name:var(--font-family-label)] text-on-surface-variant tracking-[0.1em] uppercase text-xs">
              System Architecture
            </span>
          </div>
          <h1 className="font-[family-name:var(--font-family-headline)] text-6xl lg:text-7xl font-extrabold tracking-tighter text-white">
            End-to-End <br />
            <span className="text-primary-container">Pipeline.</span>
          </h1>
          <p className="text-on-surface-variant max-w-2xl text-sm leading-relaxed mt-4">
            Five stages from raw data to interactive dashboard &mdash; every stage reproducible from seed and configuration.
          </p>
        </header>

        {/* Pipeline Diagram */}
        <div className="relative py-12 px-8 bg-surface-container-low rounded-lg">
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />
          <div className="relative flex flex-row justify-between items-stretch gap-4">
            {PIPELINE_STEPS.map((step, i) => (
              <div key={step.label} className="contents">
                <div className="flex flex-col items-center gap-3 group relative">
                  {step.highlight && <div className="absolute -inset-4 bg-primary/5 blur-2xl rounded-full" />}
                  <div
                    className={`${
                      step.highlight
                        ? 'relative bg-gradient-to-br from-surface-variant to-surface-container-highest w-44 h-44 border-primary/20 shadow-[0_0_40px_-10px_rgba(105,246,184,0.2)]'
                        : 'glass-card w-40 h-40 border-outline-variant/15 group-hover:border-primary/40'
                    } rounded-lg border flex flex-col items-center justify-center gap-3 transition-all duration-500`}
                  >
                    <span
                      className={`material-symbols-outlined text-primary ${step.highlight ? 'text-5xl' : 'text-4xl'}`}
                    >
                      {step.icon}
                    </span>
                    <span
                      className={`font-[family-name:var(--font-family-label)] text-[10px] tracking-widest uppercase text-center px-2 ${
                        step.highlight ? 'text-primary font-bold' : 'text-on-surface-variant'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  <span className="font-[family-name:var(--font-family-label)] text-[9px] text-white/40 uppercase tracking-wider text-center max-w-[10rem]">
                    {step.detail}
                  </span>
                </div>
                {i < PIPELINE_STEPS.length - 1 && <div className="flow-line opacity-30 flex-grow max-w-[50px] self-center" />}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom caption row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-4 bg-surface-container-low rounded-lg border border-outline-variant/10">
            <div className="w-10 h-10 bg-primary/10 rounded-md flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-primary">layers</span>
            </div>
            <div>
              <p className="font-[family-name:var(--font-family-headline)] font-bold text-white text-sm">4 Models</p>
              <p className="font-[family-name:var(--font-family-label)] text-[9px] text-on-surface-variant uppercase tracking-widest">
                XGBoost · LSTM · TFT · PatchTST
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-surface-container-low rounded-lg border border-outline-variant/10">
            <div className="w-10 h-10 bg-secondary/10 rounded-md flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-secondary">code</span>
            </div>
            <div>
              <p className="font-[family-name:var(--font-family-headline)] font-bold text-white text-sm">Python + PyTorch</p>
              <p className="font-[family-name:var(--font-family-label)] text-[9px] text-on-surface-variant uppercase tracking-widest">
                xgboost · pytorch-forecasting · optuna
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-surface-container-low rounded-lg border border-outline-variant/10">
            <div className="w-10 h-10 bg-tertiary/10 rounded-md flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-tertiary">web</span>
            </div>
            <div>
              <p className="font-[family-name:var(--font-family-headline)] font-bold text-white text-sm">React + Vite</p>
              <p className="font-[family-name:var(--font-family-label)] text-[9px] text-on-surface-variant uppercase tracking-widest">
                Dashboard · Recharts · Tailwind
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
