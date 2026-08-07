import { cn } from '@/lib/utils'

// Full deck (18 slides, 0-indexed):
//   0 Title, 1 Literature, 2 Research Question, 3 Challenge,
//   4 Architecture, 5 Data Sources, 6 Feature Engineering,
//   7 Model Lineup, 8 XGBoost, 9 DL Models,
//   10 Prediction, 11 Backtest Framework, 12 Trading Headline, 13 Trading Analysis, 14 Findings,
//   15 Limitations, 16 Future Work, 17 Thank You
const FULL_NAV_ITEMS = [
  { icon: 'info', label: 'Abstract', slideIndex: 0 },                    // Title
  { icon: 'book', label: 'Literature', slideIndex: 1 },                  // Literature (covers 1-3 intro block)
  { icon: 'account_tree', label: 'Methodology', slideIndex: 4 },         // Architecture (covers 4-5 methods block)
  { icon: 'construction', label: 'Feature Engineering', slideIndex: 6 }, // Feature Engineering
  { icon: 'memory', label: 'Model Architecture', slideIndex: 7 },        // Model Lineup (covers 7-9)
  { icon: 'analytics', label: 'Evaluation', slideIndex: 10 },            // Prediction (covers 10-14)
  { icon: 'fast_forward', label: 'Future Work', slideIndex: 15 },        // Limitations (covers 15-17 conclusion block)
]

// Demo deck: 6 slides → 6 nav items
//   [0] Title → Abstract
//   [1] Challenge → Literature
//   [2] Architecture → Methodology
//   [3] Models → Model Architecture
//   [4] Results → Evaluation
//   [5] Demo → Deployment
const DEMO_NAV_ITEMS = [
  { icon: 'info', label: 'Abstract', slideIndex: 0 },
  { icon: 'book', label: 'Literature', slideIndex: 1 },
  { icon: 'account_tree', label: 'Methodology', slideIndex: 2 },
  { icon: 'memory', label: 'Model Architecture', slideIndex: 3 },
  { icon: 'analytics', label: 'Evaluation', slideIndex: 4 },
  { icon: 'rocket_launch', label: 'Deployment', slideIndex: 5 },
]

interface SideNavProps {
  activeIndex: number
  onNavigate: (index: number) => void
  isDemoMode?: boolean
}

export function SideNav({ activeIndex, onNavigate, isDemoMode = false }: SideNavProps) {
  const items = isDemoMode ? DEMO_NAV_ITEMS : FULL_NAV_ITEMS

  // In demo mode, active item maps 1:1 to activeIndex.
  // In full mode, blocks of slides share a single nav slot.
  const activeItem = isDemoMode
    ? Math.min(activeIndex, items.length - 1)
    : (() => {
        if (activeIndex <= 0) return 0   // Title                                    → Abstract
        if (activeIndex <= 3) return 1   // Literature / Research / Challenge        → Literature
        if (activeIndex <= 5) return 2   // Architecture / Data Sources              → Methodology
        if (activeIndex <= 6) return 3   // Feature Engineering                      → Feature Engineering
        if (activeIndex <= 9) return 4   // Model Lineup / XGBoost / DL              → Model Architecture
        if (activeIndex <= 14) return 5  // Prediction / Backtest / Trading*2 / Find → Evaluation
        return 6                         // Limitations / Future Work / Thank You    → Future Work
      })()

  return (
    <aside className="fixed left-0 top-0 h-screen w-20 hover:w-64 transition-all duration-500 z-50 bg-surface-container-lowest/80 backdrop-blur-2xl shadow-[20px_0px_60px_-15px_rgba(105,246,184,0.05)] flex flex-col items-center py-12 gap-6 group">
      {/* Header */}
      <div className="mb-8 opacity-0 group-hover:opacity-100 transition-opacity duration-300 px-6 w-full">
        <p className="font-[family-name:var(--font-family-label)] text-[10px] uppercase tracking-[0.2em] text-primary">
          {isDemoMode ? 'FYP Demo' : 'FYP Presentation'}
        </p>
        <h3 className="font-[family-name:var(--font-family-headline)] font-extrabold text-white text-sm truncate">
          Alpha Architect
        </h3>
      </div>

      {/* Nav Items */}
      <div className="flex flex-col w-full">
        {items.map((item, i) => {
          const isActive = activeItem === i
          return (
            <button
              key={item.label}
              onClick={() => onNavigate(item.slideIndex)}
              className={cn(
                'flex items-center w-full py-4 px-6 cursor-pointer transition-all duration-300 border-none bg-transparent text-left',
                isActive
                  ? 'text-emerald-400 bg-emerald-400/10 border-r-2 border-r-emerald-400'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              )}
            >
              <span
                className={cn(
                  'material-symbols-outlined transition-transform',
                  !isActive && 'group-hover:[&]:translate-x-0'
                )}
              >
                {item.icon}
              </span>
              <span className="ml-4 font-[family-name:var(--font-family-label)] text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {item.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Profile avatar + FYP code at bottom */}
      <div className="mt-auto mb-6 group-hover:px-6 w-full flex items-center justify-center group-hover:justify-start gap-3">
        <div className="w-10 h-10 rounded-full bg-surface-container-highest border border-primary/20 flex items-center justify-center text-primary text-sm font-bold font-[family-name:var(--font-family-headline)] shrink-0">
          KW
        </div>
        <div className="hidden group-hover:block whitespace-nowrap">
          <p className="font-[family-name:var(--font-family-label)] text-[9px] uppercase tracking-[0.2em] text-primary leading-tight">
            NTU EEE FYP
          </p>
          <p className="font-[family-name:var(--font-family-headline)] font-bold text-xs text-white/70 leading-tight">
            A1088-251
          </p>
        </div>
      </div>
    </aside>
  )
}
