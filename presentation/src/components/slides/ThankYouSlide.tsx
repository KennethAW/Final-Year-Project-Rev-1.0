import { useSlideNumber } from '@/hooks/useSlideNumber'

export function ThankYouSlide() {
  const slideNum = useSlideNumber('slide-thank-you')
  return (
    <section
      id="slide-thank-you"
      className="slide-section h-screen pl-40 pr-20 pt-20 pb-12 relative overflow-hidden flex flex-col items-center justify-center"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(105,246,184,0.08) 0%, transparent 70%)',
      }}
    >
      {/* Decorative glows */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/10 blur-[160px] rounded-full" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-secondary/10 blur-[120px] rounded-full" />

      <div className="max-w-5xl mx-auto flex flex-col items-center text-center z-10 gap-8">
        {/* Label */}
        <span className="font-[family-name:var(--font-family-label)] text-primary text-xs tracking-[0.4em] uppercase">
          Slide {slideNum} &middot; Closing
        </span>

        {/* Huge Thank You */}
        <div>
          <h1 className="font-[family-name:var(--font-family-headline)] font-extrabold tracking-tighter text-white leading-none text-7xl lg:text-8xl">
            Thank You.
          </h1>
          <div className="h-1 w-32 bg-gradient-to-r from-primary via-secondary to-transparent rounded-full mt-5 mx-auto" />
          <p className="font-[family-name:var(--font-family-headline)] text-2xl lg:text-3xl font-bold text-primary mt-4">
            Questions?
          </p>
        </div>

        {/* Acknowledgements */}
        <div className="glass-card border border-primary/20 rounded-lg px-8 py-5 max-w-2xl">
          <span className="font-[family-name:var(--font-family-label)] text-[10px] font-bold tracking-widest uppercase text-primary-dim mb-3 block">
            Acknowledgements
          </span>
          <div className="grid grid-cols-2 gap-6 text-left">
            <div>
              <p className="font-[family-name:var(--font-family-label)] text-[9px] uppercase tracking-widest text-on-surface-variant mb-1">
                Supervisor
              </p>
              <p className="text-white font-[family-name:var(--font-family-headline)] font-bold text-sm">
                A/P Wong Jia Yiing Patricia
              </p>
            </div>
            <div>
              <p className="font-[family-name:var(--font-family-label)] text-[9px] uppercase tracking-widest text-on-surface-variant mb-1">
                Examiner
              </p>
              <p className="text-white font-[family-name:var(--font-family-headline)] font-bold text-sm">
                Prof Wen Changyun
              </p>
            </div>
          </div>
        </div>

        {/* FYP code + author chip */}
        <div className="flex items-center gap-4">
          <div className="bg-surface-container-highest/60 border border-outline-variant/20 rounded-full px-5 py-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-base">school</span>
            <span className="font-[family-name:var(--font-family-label)] text-[11px] tracking-widest uppercase text-white/80 font-bold">
              NTU EEE &middot; FYP A1088-251
            </span>
          </div>
          <div className="bg-surface-container-highest/60 border border-outline-variant/20 rounded-full px-5 py-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-base">person</span>
            <span className="font-[family-name:var(--font-family-label)] text-[11px] tracking-widest uppercase text-white/80 font-bold">
              Kenneth Anthony Wijaya
            </span>
          </div>
        </div>

        {/* Quick links */}
        <div className="flex items-center gap-3 pt-4">
          <a
            href="http://localhost:5174"
            target="_blank"
            rel="noopener noreferrer"
            className="font-[family-name:var(--font-family-headline)] font-bold px-5 py-2.5 rounded-xl text-xs tracking-tight transition-all duration-300 cursor-pointer flex items-center gap-2 bg-gradient-to-r from-primary to-primary-container text-on-primary-container hover:scale-95"
          >
            <span className="material-symbols-outlined text-base">dashboard</span>
            Open Live Dashboard
          </a>
          <a
            href="/EXECUTION_GUIDE.md"
            target="_blank"
            rel="noopener noreferrer"
            className="font-[family-name:var(--font-family-headline)] font-bold px-5 py-2.5 rounded-xl text-xs tracking-tight transition-all duration-300 cursor-pointer flex items-center gap-2 border border-white/20 bg-transparent text-white/80 hover:bg-white/10 hover:text-white"
          >
            <span className="material-symbols-outlined text-base">description</span>
            Technical Docs
          </a>
          <a
            href="vscode://file/C:/Users/kencl/Desktop/Final%20Year%20Project%20Rev%201.0"
            className="font-[family-name:var(--font-family-headline)] font-bold px-5 py-2.5 rounded-xl text-xs tracking-tight transition-all duration-300 cursor-pointer flex items-center gap-2 border border-white/20 bg-transparent text-white/80 hover:bg-white/10 hover:text-white"
          >
            <span className="material-symbols-outlined text-base">code</span>
            Source Code
          </a>
        </div>
      </div>
    </section>
  )
}
