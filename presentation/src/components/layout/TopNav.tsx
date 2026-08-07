import { cn } from '@/lib/utils'
import { useTheme } from '@/hooks/useTheme'

const FULL_NAV_ITEMS = ['Intro', 'Methods', 'Data', 'Model', 'Results', 'Conclusion']
const DEMO_NAV_ITEMS = ['Intro', 'Methods', 'Data', 'Model', 'Results', 'Demo']

interface TopNavProps {
  activeIndex: number
  onNavigate: (index: number) => void
  isDemoMode?: boolean
}

// Full deck (18 slides):
//   Intro (0-3): Title, Literature, Research Question, Challenge
//   Methods (4): Architecture
//   Data (5-6): Data Sources, Feature Engineering
//   Model (7-9): Model Lineup, XGBoost, DL Models
//   Results (10-14): Prediction, Backtest Framework, Trading Headline, Trading Analysis, Findings
//   Conclusion (15-17): Limitations, Future Work, Thank You
const FULL_NAV_TO_SLIDE: Record<string, number> = {
  'Intro': 0,
  'Methods': 4,
  'Data': 5,
  'Model': 7,
  'Results': 10,
  'Conclusion': 15,
}

// Demo deck (6 slides): Title, Challenge, Architecture, Models, Results, Demo
// Last item reads "Demo" rather than "Conclusion" since the demo deck ends on the live-demo slide.
const DEMO_NAV_TO_SLIDE: Record<string, number> = {
  'Intro': 0,
  'Methods': 1,
  'Data': 2,
  'Model': 3,
  'Results': 4,
  'Demo': 5,
}

/**
 * Map a slide index between the two decks so the viewer stays on the
 * "same" slide when toggling Full Deck ↔ Demo Mode.
 *
 * Full deck (18 slides):
 *   0  Title
 *   1  Literature
 *   2  Research Question
 *   3  Challenge
 *   4  Architecture
 *   5  Data Sources
 *   6  Feature Engineering
 *   7  Model Lineup
 *   8  XGBoost
 *   9  DL Models
 *   10 Prediction
 *   11 Backtest Framework
 *   12 Trading Headline
 *   13 Trading Analysis
 *   14 Findings
 *   15 Limitations
 *   16 Future Work
 *   17 Thank You
 *
 * Demo deck (6):
 *   0 Title · 1 Challenge · 2 Architecture · 3 Models · 4 Results · 5 Demo
 */
const FULL_TO_DEMO = [
  0, // Title
  1, // Literature → Challenge
  1, // Research Question → Challenge
  1, // Challenge
  2, // Architecture
  2, // Data Sources → Architecture
  2, // Feature Engineering → Architecture
  3, // Model Lineup → Models
  3, // XGBoost → Models
  3, // DL Models → Models
  4, // Prediction → Results
  4, // Backtest Framework → Results
  4, // Trading Headline → Results
  4, // Trading Analysis → Results
  4, // Findings → Results
  5, // Limitations → Demo
  5, // Future Work → Demo
  5, // Thank You → Demo
] as const
const DEMO_TO_FULL = [
  0,  // Title
  3,  // Challenge → slide-challenge is index 3 in full deck
  4,  // Architecture → slide-architecture is index 4
  7,  // Models → Model Lineup is index 7
  10, // Results → Prediction is index 10
  17, // Demo → fall back to last slide (Thank You) since demo is removed from full deck
] as const

function equivalentSlide(currentIndex: number, currentIsDemo: boolean): number {
  if (currentIsDemo) {
    // Switching demo → full
    return DEMO_TO_FULL[Math.min(currentIndex, DEMO_TO_FULL.length - 1)]
  }
  // Switching full → demo
  return FULL_TO_DEMO[Math.min(currentIndex, FULL_TO_DEMO.length - 1)]
}

export function TopNav({ activeIndex, onNavigate, isDemoMode = false }: TopNavProps) {
  const navToSlide = isDemoMode ? DEMO_NAV_TO_SLIDE : FULL_NAV_TO_SLIDE
  const navItems = isDemoMode ? DEMO_NAV_ITEMS : FULL_NAV_ITEMS
  const { theme, toggleTheme } = useTheme()

  const getActiveNav = () => {
    if (isDemoMode) {
      // demo deck mapping
      if (activeIndex <= 0) return 'Intro'
      if (activeIndex <= 1) return 'Methods'
      if (activeIndex <= 2) return 'Data'
      if (activeIndex <= 3) return 'Model'
      if (activeIndex <= 4) return 'Results'
      return 'Demo'
    }
    // full deck mapping (18 slides)
    //   0-3   Intro       (Title, Literature, Research Question, Challenge)
    //   4     Methods     (Architecture pipeline)
    //   5-6   Data        (Data Sources + Feature Engineering)
    //   7-9   Model       (Lineup, XGBoost, DL Models)
    //   10-14 Results     (Prediction, Backtest Framework, Trading Headline, Trading Analysis, Findings)
    //   15-17 Conclusion  (Limitations, Future Work, Thank You)
    if (activeIndex <= 3) return 'Intro'
    if (activeIndex <= 4) return 'Methods'
    if (activeIndex <= 6) return 'Data'
    if (activeIndex <= 9) return 'Model'
    if (activeIndex <= 14) return 'Results'
    return 'Conclusion'
  }

  const activeNav = getActiveNav()

  return (
    <nav className="fixed top-0 w-full z-40 flex justify-between items-center pl-24 pr-12 py-6 bg-transparent backdrop-blur-xl bg-gradient-to-b from-black/40 to-transparent">
      <div className="text-lg font-black text-white tracking-widest uppercase font-[family-name:var(--font-family-headline)]" style={{ letterSpacing: '1.8px' }}>
        Final year project
      </div>

      <div className="hidden md:flex gap-8 items-center">
        {navItems.map((item) => (
          <button
            key={item}
            onClick={() => onNavigate(navToSlide[item])}
            className={cn(
              'font-[family-name:var(--font-family-headline)] font-bold tracking-tight transition-colors text-sm bg-transparent border-none cursor-pointer',
              activeNav === item
                ? 'text-emerald-400 border-b-2 border-emerald-400 pb-1'
                : 'text-white/60 hover:text-white'
            )}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="font-[family-name:var(--font-family-headline)] font-bold w-9 h-9 rounded-xl text-xs transition-all duration-300 border border-white/20 bg-transparent text-white/70 hover:bg-white/10 hover:text-white cursor-pointer flex items-center justify-center"
        >
          <span className="material-symbols-outlined text-base">
            {theme === 'dark' ? 'light_mode' : 'dark_mode'}
          </span>
        </button>

        <button
          onClick={() => {
            // Preserve the viewer's current position by computing the
            // equivalent slide in the other deck and passing it via `start=`.
            // App.tsx reads this on mount and scrolls to that slide.
            const target = equivalentSlide(activeIndex, isDemoMode)
            const params = new URLSearchParams()
            if (!isDemoMode) params.set('demo', 'true')
            if (target > 0) params.set('start', String(target))
            window.location.search = params.toString() ? `?${params.toString()}` : ''
          }}
          title={isDemoMode ? 'Switch to full 21-slide deck' : 'Switch to condensed 6-slide demo deck'}
          className={cn(
            'font-[family-name:var(--font-family-headline)] font-bold px-4 py-2 rounded-xl text-xs tracking-tight transition-all duration-300 border cursor-pointer flex items-center gap-1.5',
            isDemoMode
              ? 'bg-secondary/10 text-secondary border-secondary/30 hover:bg-secondary/20'
              : 'bg-transparent text-white/70 border-white/20 hover:bg-white/10 hover:text-white'
          )}
        >
          <span className="material-symbols-outlined text-sm">
            {isDemoMode ? 'view_list' : 'slideshow'}
          </span>
          {isDemoMode ? 'Full Deck' : 'Demo Mode'}
        </button>

        <a
          href="/FYP-Report.docx"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-gradient-to-r from-primary to-primary-container text-on-primary-container font-[family-name:var(--font-family-headline)] font-bold px-6 py-2 rounded-xl text-sm hover:scale-95 active:scale-90 transition-all duration-300 no-underline inline-block"
        >
          Open Report
        </a>
      </div>
    </nav>
  )
}
