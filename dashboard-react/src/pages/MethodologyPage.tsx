import { Card } from "@/components/ui/Card";

interface Section {
  icon: string;
  title: string;
  tag: string;
  body: React.ReactNode;
}

const SECTIONS: Section[] = [
  {
    icon: "schedule",
    tag: "Splits",
    title: "Chronological 70 / 15 / 15 Split",
    body: (
      <>
        <p>
          Data is split strictly chronologically per ticker, with no shuffling
          or random sampling. The first 70% of each ticker's history is used for
          training, the next 15% for validation, and the final 15% for held-out
          testing.
        </p>
        <p className="mt-2">
          This eliminates any possibility of lookahead bias: the model never
          sees any data point whose date is later than the dates in its
          training set.
        </p>
      </>
    ),
  },
  {
    icon: "tune",
    tag: "Scaling",
    title: "Per-Ticker Scaling Fit on Train Only",
    body: (
      <>
        <p>
          <code className="text-[11px] bg-surface-container px-1 py-0.5 rounded">
            RobustScaler
          </code>{" "}
          is fit on each ticker's training split alone, then applied to that
          ticker's validation and test splits. There are no pooled statistics
          across tickers and no statistics computed on the test set.
        </p>
        <p className="mt-2">
          Each ticker thus has its own independent scaler, which prevents
          cross-ticker leakage during feature normalisation.
        </p>
      </>
    ),
  },
  {
    icon: "payments",
    tag: "Costs",
    title: "Cost-Aware Backtesting (5 bps)",
    body: (
      <>
        <p>
          Every backtest applies a 5-basis-point transaction cost on each position
          change, covering both entry and exit. This matches typical retail commission +
          spread for large-cap US equities.
        </p>
        <p className="mt-2">
          A cost-sensitivity ablation (see{" "}
          <strong>Backtest Results</strong> page in Advanced mode) verifies the
          result is robust: <strong>0 / 20 strategies beat SPY even at 0 bps</strong>.
          The finding is structural, not cost-driven.
        </p>
      </>
    ),
  },
  {
    icon: "verified_user",
    tag: "Universe",
    title: "No Survivorship Bias",
    body: (
      <>
        <p>
          The 5-ticker universe (AAPL, MSFT, GOOGL, JPM, XOM) is fixed from
          2015. All tickers were in the S&amp;P 500 at the start of the period
          and remained continuously listed through the entire 10-year window.
          No ticker was added or dropped based on performance.
        </p>
        <p className="mt-2">
          Delisted or renamed tickers would require a survivorship-bias
          correction; this study avoids the issue entirely by restricting to
          tickers with stable listings.
        </p>
      </>
    ),
  },
  {
    icon: "block",
    tag: "Lookahead",
    title: "Causal Feature Engineering",
    body: (
      <>
        <p>
          Every feature at time <em>t</em> uses only information available at
          the close of day <em>t</em>. Rolling statistics (e.g., 20-day SMA,
          Bollinger Bands) use a trailing window, not centred. Macro/sector
          features are aligned so they lag at least one trading day.
        </p>
        <p className="mt-2">
          Targets are <em>next-day</em> (<em>t+1</em>) log returns or direction,
          so the model predicts tomorrow given today.
        </p>
      </>
    ),
  },
  {
    icon: "fact_check",
    tag: "Reproducibility",
    title: "Fixed Seeds &amp; Deterministic Runs",
    body: (
      <>
        <p>
          All training runs use a fixed random seed (<code className="text-[11px] bg-surface-container px-1 py-0.5 rounded">SEED=42</code>) across numpy,
          torch, and XGBoost. Optuna trials are seeded. The same command
          produces identical metrics on re-run, within floating-point
          non-determinism from CUDA kernels.
        </p>
      </>
    ),
  },
];

export function MethodologyPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Methodology</h1>
        <p className="text-sm text-text-secondary mt-1">
          How leakage, survivorship bias, and reproducibility are handled
          throughout the pipeline, defensive against the standard critique vectors for ML-on-markets research.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {SECTIONS.map((s) => (
          <Card key={s.title}>
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-xl">
                  {s.icon}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-primary">
                    {s.tag}
                  </span>
                  <div className="flex-1 h-px bg-outline" />
                </div>
                <h2 className="text-sm font-bold text-text-primary mb-2">
                  {s.title}
                </h2>
                <div className="text-xs text-text-secondary leading-relaxed">
                  {s.body}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex items-start gap-4">
          <div className="shrink-0 w-10 h-10 rounded-lg bg-tertiary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-tertiary text-xl">
              science
            </span>
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-bold text-text-primary mb-2">
              Why these choices defuse the common critiques
            </h2>
            <ul className="text-xs text-text-secondary leading-relaxed space-y-1.5 list-disc pl-4">
              <li>
                <strong>Lookahead bias</strong> is eliminated by chronological splits and causal feature
                engineering.
              </li>
              <li>
                <strong>Data snooping / p-hacking</strong> is reduced by reporting bootstrap CIs and DM tests in Advanced mode.
              </li>
              <li>
                <strong>Survivorship bias</strong> is avoided by fixing the universe ex-ante.
              </li>
              <li>
                <strong>Over-optimistic costs</strong> are avoided by the 5 bps default and the 0&ndash;20 bps ablation.
              </li>
              <li>
                <strong>Overfitting</strong> is visible in <em>Training Convergence</em> panel
                (Advanced mode on Feature Analysis).
              </li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
