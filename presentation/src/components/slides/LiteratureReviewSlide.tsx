import { useSlideNumber } from '@/hooks/useSlideNumber'

const COLUMNS = [
  {
    icon: 'forest',
    color: 'primary',
    label: 'Classical ML in Finance',
    papers: [
      {
        cite: 'Gu, Kelly, Xiu (2020)',
        title: '"Empirical Asset Pricing via Machine Learning"',
        venue: 'Review of Financial Studies',
        takeaway: 'Tree-based models outperform linear baselines on US-equity cross-sections.',
      },
      {
        cite: 'López de Prado (2018)',
        title: 'Advances in Financial Machine Learning',
        venue: 'Wiley',
        takeaway: 'Canonical methodology pitfalls: lookahead, survivorship, p-hacking.',
      },
    ],
  },
  {
    icon: 'psychology',
    color: 'secondary',
    label: 'Deep Learning Forecasters',
    papers: [
      {
        cite: 'Lim, Arık, Loeff, Pfister (2020)',
        title: '"Temporal Fusion Transformers"',
        venue: 'Int. J. Forecasting',
        takeaway: 'Interpretable multi-horizon forecasting with static / observed / future input routing.',
      },
      {
        cite: 'Nie et al. (2023)',
        title: '"A Time Series is Worth 64 Words" (PatchTST)',
        venue: 'ICLR',
        takeaway: 'Patch-based Transformer; channel-independent; beats many DL baselines.',
      },
    ],
  },
  {
    icon: 'psychology_alt',
    color: 'tertiary',
    label: 'Sentiment & NLP for Finance',
    papers: [
      {
        cite: 'Araci (2019)',
        title: '"FinBERT: Financial Sentiment Analysis with Pre-trained LMs"',
        venue: 'arXiv:1908.10063',
        takeaway: 'Domain-adapted BERT producing positive / neutral / negative sentiment scores.',
      },
      {
        cite: 'Tetlock (2007)',
        title: '"Giving Content to Investor Sentiment"',
        venue: 'Journal of Finance',
        takeaway: 'Foundational work linking news pessimism to next-day returns.',
      },
    ],
  },
]

export function LiteratureReviewSlide() {
  const slideNum = useSlideNumber('slide-literature')
  return (
    <section id="slide-literature" className="slide-section h-screen pl-40 pr-20 pt-20 pb-12 bg-grid-pattern relative flex flex-col">
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-primary/5 blur-[120px] -z-10" />
      <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-secondary/5 blur-[100px] -z-10" />

      <div className="w-full max-w-[1500px] mx-auto flex flex-col flex-1 justify-center">
        {/* Header */}
        <header className="mb-6">
          <span className="font-[family-name:var(--font-family-label)] text-primary text-xs tracking-[0.3em] uppercase mb-2 block">
            Slide {slideNum}: Literature Review
          </span>
          <h1 className="text-5xl lg:text-6xl font-[family-name:var(--font-family-headline)] font-extrabold text-white tracking-tighter leading-none">
            Prior Work <br />
            <span className="text-outline-variant/40">& The Gap.</span>
          </h1>
        </header>

        {/* 3-column paper cards */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          {COLUMNS.map((col) => (
            <div
              key={col.label}
              className="bg-surface-container-low p-5 rounded-lg border border-outline-variant/10 hover:border-primary/30 transition-all group flex flex-col"
            >
              <div className={`w-10 h-10 bg-${col.color}/10 rounded-md flex items-center justify-center mb-3`}>
                <span className={`material-symbols-outlined text-${col.color}`}>{col.icon}</span>
              </div>
              <h3 className="font-[family-name:var(--font-family-label)] text-[10px] font-bold tracking-widest uppercase text-white/80 mb-3">
                {col.label}
              </h3>
              <div className="space-y-3 flex-1">
                {col.papers.map((p) => (
                  <div key={p.cite} className="border-l-2 border-outline-variant/20 pl-3">
                    <p className="font-[family-name:var(--font-family-headline)] font-bold text-white text-xs mb-0.5">
                      {p.cite}
                    </p>
                    <p className="text-on-surface-variant text-[11px] italic mb-0.5">{p.title}</p>
                    <p className="font-[family-name:var(--font-family-label)] text-[9px] uppercase tracking-widest text-white/30 mb-1">
                      {p.venue}
                    </p>
                    <p className="text-on-surface-variant text-[11px] leading-snug">{p.takeaway}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* The gap banner */}
        <div className="glass-card border border-primary/20 rounded-lg p-5 flex items-center gap-5 relative overflow-hidden">
          <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
          <div className="shrink-0">
            <div className="w-12 h-12 rounded-full border-2 border-primary/30 flex items-center justify-center">
              <span
                className="material-symbols-outlined text-primary text-2xl"
                style={{ fontVariationSettings: '"FILL" 1' }}
              >
                bookmark_add
              </span>
            </div>
          </div>
          <div className="flex-grow">
            <h4 className="font-[family-name:var(--font-family-headline)] text-base font-bold mb-1">
              The Gap This Project Fills
            </h4>
            <p className="text-on-surface-variant text-xs leading-relaxed">
              Most prior work benchmarks a single model family. This project tests{' '}
              <span className="text-primary font-semibold">multi-modal feature integration</span> across{' '}
              <span className="text-primary font-semibold">4 architecturally distinct models</span> on a
              shared test set, with rigorous bootstrap CIs and Diebold–Mariano significance tests.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
