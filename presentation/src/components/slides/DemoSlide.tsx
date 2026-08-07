const DASHBOARD_URL = 'http://localhost:5174'

export function DemoSlide() {
  const openDashboard = () => window.open(DASHBOARD_URL, '_blank')

  return (
    <section id="slide-demo" className="slide-section h-screen pl-40 pr-20 pt-20 pb-12 flex flex-col items-center justify-center relative">
      {/* Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Hero Content */}
      <div className="max-w-[1400px] w-full text-center mb-6 relative z-10">
        <span className="font-[family-name:var(--font-family-label)] text-xs tracking-[0.3em] uppercase text-primary mb-2 block">Final Stage</span>
        <h1 className="font-[family-name:var(--font-family-headline)] text-5xl lg:text-6xl font-extrabold tracking-tighter mb-4">
          Live Demo<span className="text-primary">.</span>
        </h1>
        <p className="text-on-surface-variant text-sm max-w-2xl mx-auto leading-relaxed">
          Interactive dashboard for exploring model results, trading performance, and cross-model comparisons across all 5 tickers.
        </p>
      </div>

      {/* Dashboard Preview Bento */}
      <div className="w-full max-w-[1400px] grid grid-cols-12 gap-4 relative z-10 mb-6">
        {/* Large Hero — Live iframe preview */}
        <button
          onClick={openDashboard}
          className="col-span-8 rounded-lg overflow-hidden bg-surface-container-high relative group border border-outline-variant/10 min-h-[280px] cursor-pointer p-0 text-left block"
        >
          <iframe
            src={DASHBOARD_URL}
            title="Dashboard Preview"
            className="w-full h-full absolute inset-0 pointer-events-none"
            style={{ transform: 'scale(0.38)', transformOrigin: 'top left', width: '263%', height: '263%' }}
            loading="lazy"
          />
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-background/0 group-hover:bg-background/40 transition-all duration-300 flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-lg">open_in_new</span>
          </div>
          {/* Label overlay at bottom */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background/80 to-transparent p-4 z-10">
            <h3 className="font-[family-name:var(--font-family-headline)] text-lg font-bold mb-0.5">Overview Dashboard</h3>
            <p className="font-[family-name:var(--font-family-label)] text-[9px] uppercase tracking-widest text-primary">Click to open &middot; Model performance summary across all tickers</p>
          </div>
        </button>

        {/* Side Cards */}
        <div className="col-span-4 flex flex-col gap-3">
          <button
            onClick={() => window.open(DASHBOARD_URL + '/analytics', '_blank')}
            className="flex-1 rounded-lg bg-surface-container-highest p-4 flex flex-col justify-between border border-outline-variant/10 group hover:border-primary/20 transition-all cursor-pointer text-left"
          >
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-xl">compare_arrows</span>
              </div>
              <span className="material-symbols-outlined text-white/20 group-hover:text-primary transition-colors text-lg">open_in_new</span>
            </div>
            <div>
              <h4 className="font-[family-name:var(--font-family-headline)] text-base font-bold mb-0.5">Model Comparison</h4>
              <p className="text-xs text-on-surface-variant">Cross-model metric comparison with interactive filters.</p>
            </div>
          </button>

          <button
            onClick={() => window.open(DASHBOARD_URL + '/signals', '_blank')}
            className="flex-1 rounded-lg glass-card p-4 flex flex-col justify-between border border-outline-variant/10 group hover:border-secondary/20 transition-all cursor-pointer text-left"
          >
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-md bg-secondary/10 flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-xl">query_stats</span>
              </div>
              <span className="material-symbols-outlined text-white/20 group-hover:text-secondary transition-colors text-lg">open_in_new</span>
            </div>
            <div>
              <h4 className="font-[family-name:var(--font-family-headline)] text-base font-bold mb-0.5">Signal Explorer</h4>
              <p className="text-xs text-on-surface-variant">Feature importance and attention weight visualisations.</p>
            </div>
          </button>
        </div>

        {/* Bottom backtesting */}
        <div className="col-span-12 rounded-lg bg-surface-container-low p-5 flex flex-row items-center justify-between gap-6 border border-outline-variant/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl text-primary">history_toggle_off</span>
            </div>
            <div className="text-left">
              <h4 className="font-[family-name:var(--font-family-headline)] text-base font-bold">Backtesting Tearsheets</h4>
              <p className="text-xs text-on-surface-variant">Equity curves, drawdown analysis, and trade distributions.</p>
            </div>
          </div>
          <div className="flex gap-4 shrink-0">
            <div className="flex flex-col items-center px-4 border-r border-white/5">
              <span className="font-[family-name:var(--font-family-label)] text-[9px] text-white/40 uppercase mb-0.5 whitespace-nowrap">Models</span>
              <span className="font-[family-name:var(--font-family-headline)] text-xl font-bold text-primary whitespace-nowrap">4</span>
            </div>
            <div className="flex flex-col items-center px-4">
              <span className="font-[family-name:var(--font-family-label)] text-[9px] text-white/40 uppercase mb-0.5 whitespace-nowrap">Tickers</span>
              <span className="font-[family-name:var(--font-family-headline)] text-xl font-bold text-white whitespace-nowrap">5</span>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="relative z-10 flex flex-col items-center">
        <button
          onClick={openDashboard}
          className="group relative px-10 py-4 rounded-xl bg-gradient-to-r from-primary to-primary-container text-on-primary-container font-[family-name:var(--font-family-headline)] font-extrabold text-base tracking-tight hover:shadow-[0_0_30px_rgba(105,246,184,0.2)] transition-all active:scale-95 border-none cursor-pointer"
        >
          <span className="flex items-center gap-3">
            Launch Live Dashboard
            <span className="material-symbols-outlined group-hover:translate-x-2 transition-transform">rocket_launch</span>
          </span>
        </button>
        <p className="mt-3 font-[family-name:var(--font-family-label)] text-[9px] uppercase tracking-[0.4em] text-white/30">
          localhost:5174
        </p>
      </div>
    </section>
  )
}
