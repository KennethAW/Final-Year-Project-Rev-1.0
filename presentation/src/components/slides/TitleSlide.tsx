interface TitleSlideProps {
  onBegin: () => void
  /** Optional — when omitted (e.g. in the full deck where the demo slide has been removed)
   *  the VIEW DEMO button is hidden. */
  onViewAbstract?: () => void
}

export function TitleSlide({ onBegin, onViewAbstract }: TitleSlideProps) {
  return (
    <section id="slide-title" className="slide-section relative h-screen w-full flex items-center justify-center overflow-hidden bg-background pl-20">
      {/* Background */}
      <div className="absolute inset-0 hero-glow z-0" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/5 blur-[120px] rounded-full" />

      {/* Decorative stock market background texture */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none z-[1]"
        style={{
          backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuA-txT7hQOrxOWoFbgNiFpt_2vVAJIHSkxi7zgOCELwdIfyZXW_r1XJEU-NPnv_rKqkvU6yATXOGSyiQMeDo9Zep7Qs7AZ5WkErW5kg1QWM5uRRm0_2i2--TN7LgfGUQXOM2DrY8SdDsB8RRt79VHymXupH6bCIpj2KWCNPNBMq3OLGFgPj-H9Wp2Kzz-vO2m3zpxW_u3GTgKrS97Pzwhb0h-scBUF28Ien7iehYTFSYNpcFHcakuBWG-zvczY8IatYe0rMRO69ZXU")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Content — pt-16 shifts content down to visually center between the TopNav and Footer overlays */}
      <div className="relative z-10 max-w-5xl px-12 pt-16 flex flex-col items-center text-center">
        {/* Badge */}
        <div className="inline-block mb-6 px-4 py-1.5 rounded-xl bg-surface-container-highest border border-outline-variant/15">
          <span className="font-[family-name:var(--font-family-label)] text-[10px] uppercase tracking-[0.3em] text-primary font-bold">
            Final Year Project &middot; 2026
          </span>
        </div>

        {/* Title */}
        <h1 className="font-[family-name:var(--font-family-headline)] font-extrabold text-4xl lg:text-6xl xl:text-[4.5rem] leading-[1.05] tracking-tight text-white mb-8 text-glow">
          Multi-Modal Feature Integration for{' '}
          <span className="text-primary">ML-Based</span> Stock Prediction
        </h1>

        <div className="w-24 h-1 bg-gradient-to-r from-transparent via-primary to-transparent mb-8" />

        {/* Subtitle */}
        <div className="flex flex-col items-center gap-4">
          <p className="font-[family-name:var(--font-family-label)] text-sm tracking-[0.2em] text-white/80 uppercase">
            An Empirical Evaluation with Cost-Aware Backtesting
          </p>

          {/* Author Grid — always 3 columns */}
          <div className="grid grid-cols-3 gap-8 mt-6">
            {[
              { role: 'Student Researcher', name: 'Kenneth Anthony Wijaya' },
              { role: 'Lead Supervisor', name: 'A/P Wong Jia Yiing, Patricia' },
              { role: 'Examiner', name: 'Prof Wen Changyun' },
            ].map((person) => (
              <div key={person.role} className="flex flex-col items-center">
                <span className="font-[family-name:var(--font-family-label)] text-[10px] uppercase tracking-widest text-on-surface-variant mb-2">
                  {person.role}
                </span>
                <p className="font-[family-name:var(--font-family-headline)] font-bold text-base text-white">
                  {person.name}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <div className="mt-10 flex flex-col items-center gap-8">
          <div className="flex gap-6 items-center">
            <button
              onClick={onBegin}
              className="animate-levitate relative bg-gradient-to-r from-primary to-primary-container text-on-primary-container px-10 py-4 rounded-xl font-[family-name:var(--font-family-headline)] font-bold text-sm tracking-wide shadow-[0_10px_40px_-10px_rgba(105,246,184,0.4)] hover:scale-105 transition-all border-none cursor-pointer btn-glow"
            >
              BEGIN PRESENTATION
            </button>
            {onViewAbstract && (
              <button
                onClick={onViewAbstract}
                className="px-10 py-4 rounded-xl border border-outline-variant/30 text-white font-[family-name:var(--font-family-headline)] font-bold text-sm tracking-wide hover:bg-white/5 transition-all bg-transparent cursor-pointer"
              >
                VIEW DEMO
              </button>
            )}
          </div>

          {/* Animated scroll-down chevrons */}
          <button onClick={onBegin} className="flex flex-col items-center gap-0 bg-transparent border-none cursor-pointer animate-bounce-slow">
            <svg width="24" height="14" viewBox="0 0 24 14" fill="none" className="opacity-60">
              <path d="M2 2L12 12L22 2" stroke="rgba(105,246,184,0.8)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <svg width="24" height="14" viewBox="0 0 24 14" fill="none" className="opacity-40 -mt-1">
              <path d="M2 2L12 12L22 2" stroke="rgba(105,246,184,0.6)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <svg width="24" height="14" viewBox="0 0 24 14" fill="none" className="opacity-20 -mt-1">
              <path d="M2 2L12 12L22 2" stroke="rgba(105,246,184,0.4)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  )
}
