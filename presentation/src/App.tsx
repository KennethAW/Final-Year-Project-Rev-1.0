import { useCallback, useEffect, useMemo } from 'react'
import { useActiveSlide } from '@/hooks/useActiveSlide'
import { TopNav } from '@/components/layout/TopNav'
import { SideNav } from '@/components/layout/SideNav'
import { Footer } from '@/components/layout/Footer'
import { TickerBar } from '@/components/layout/TickerBar'
import { FULL_SLIDE_IDS, DEMO_SLIDE_IDS } from '@/lib/slideRegistry'

import { TitleSlide } from '@/components/slides/TitleSlide'
import { LiteratureReviewSlide } from '@/components/slides/LiteratureReviewSlide'
import { ResearchQuestionSlide } from '@/components/slides/ResearchQuestionSlide'
import { ChallengeSlide } from '@/components/slides/ChallengeSlide'
import { ArchitectureSlide } from '@/components/slides/ArchitectureSlide'
import { DataSourcesSlide } from '@/components/slides/DataSourcesSlide'
import { FeatureEngineeringSlide } from '@/components/slides/FeatureEngineeringSlide'
import { ModelsSlide } from '@/components/slides/ModelsSlide'
import { XGBoostSlide } from '@/components/slides/XGBoostSlide'
import { DeepLearningModelsSlide } from '@/components/slides/DeepLearningModelsSlide'
import { PredictionSlide } from '@/components/slides/PredictionSlide'
import { BacktestFrameworkSlide } from '@/components/slides/BacktestFrameworkSlide'
import { TradingSlide } from '@/components/slides/TradingSlide'
import { TradingAnalysisSlide } from '@/components/slides/TradingAnalysisSlide'
import { FindingsSlide } from '@/components/slides/FindingsSlide'
import { LimitationsSlide } from '@/components/slides/LimitationsSlide'
import { FutureWorkSlide } from '@/components/slides/FutureWorkSlide'
import { DemoSlide } from '@/components/slides/DemoSlide'
import { ThankYouSlide } from '@/components/slides/ThankYouSlide'
import { ResultsSlide } from '@/components/slides/demo/ResultsSlide'

function useIsDemoMode(): boolean {
  return useMemo(() => {
    if (typeof window === 'undefined') return false
    const params = new URLSearchParams(window.location.search)
    return params.get('demo') === 'true'
  }, [])
}

/** Reads `?start=N` so a fresh load lands on slide N instead of slide 0.
 * Used when the Full Deck ↔ Demo Mode toggle preserves the viewer's position. */
function useStartIndex(): number {
  return useMemo(() => {
    if (typeof window === 'undefined') return 0
    const params = new URLSearchParams(window.location.search)
    const raw = params.get('start')
    if (!raw) return 0
    const n = parseInt(raw, 10)
    return Number.isFinite(n) && n > 0 ? n : 0
  }, [])
}

export default function App() {
  const isDemoMode = useIsDemoMode()
  const startIndex = useStartIndex()
  // Memoize so the array reference is stable across renders — otherwise the
  // IntersectionObserver inside useActiveSlide tears down and never re-attaches
  // in time, and the active-nav highlight gets stuck on slide 0.
  const slideIds = useMemo(
    () => (isDemoMode ? [...DEMO_SLIDE_IDS] : [...FULL_SLIDE_IDS]),
    [isDemoMode]
  )
  const { activeIndex, scrollTo, containerRef } = useActiveSlide(slideIds)

  // On first mount, if ?start=N was in the URL (from the deck-mode toggle),
  // jump to that slide so the viewer keeps their position across the reload.
  useEffect(() => {
    if (startIndex <= 0) return
    // Wait a tick for the slide DOM elements to mount before scrollIntoView.
    const id = requestAnimationFrame(() => {
      const el = document.getElementById(slideIds[Math.min(startIndex, slideIds.length - 1)])
      if (el) el.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'start' })
      // Remove ?start from the URL so refresh-in-place doesn't re-trigger.
      const url = new URL(window.location.href)
      url.searchParams.delete('start')
      window.history.replaceState({}, '', url.toString())
    })
    return () => cancelAnimationFrame(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'PageDown') {
      e.preventDefault()
      scrollTo(Math.min(activeIndex + 1, slideIds.length - 1))
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault()
      scrollTo(Math.max(activeIndex - 1, 0))
    }
  }, [activeIndex, scrollTo, slideIds.length])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Title slide "View Abstract" jumps to demo. In full deck mode the demo slide
  // has been removed, so we omit the callback and the button is hidden.
  const demoIdx = isDemoMode ? slideIds.length - 1 : slideIds.indexOf('slide-demo')
  const demoSlideIndex = demoIdx >= 0 ? demoIdx : null

  return (
    <div ref={containerRef} className="slide-container">
      <TopNav activeIndex={activeIndex} onNavigate={scrollTo} isDemoMode={isDemoMode} />
      <SideNav activeIndex={activeIndex} onNavigate={scrollTo} isDemoMode={isDemoMode} />

      {isDemoMode ? (
        <>
          <TitleSlide
            onBegin={() => scrollTo(1)}
            onViewAbstract={demoSlideIndex !== null ? () => scrollTo(demoSlideIndex) : undefined}
          />
          <ChallengeSlide />
          <ArchitectureSlide />
          <ModelsSlide />
          <ResultsSlide />
          <DemoSlide />
        </>
      ) : (
        <>
          <TitleSlide
            onBegin={() => scrollTo(1)}
            onViewAbstract={demoSlideIndex !== null ? () => scrollTo(demoSlideIndex) : undefined}
          />
          <LiteratureReviewSlide />
          <ResearchQuestionSlide />
          <ChallengeSlide />
          <ArchitectureSlide />
          <DataSourcesSlide />
          <FeatureEngineeringSlide />
          <ModelsSlide />
          <XGBoostSlide />
          <DeepLearningModelsSlide />
          <PredictionSlide />
          <BacktestFrameworkSlide />
          <TradingSlide />
          <TradingAnalysisSlide />
          <FindingsSlide />
          <LimitationsSlide />
          <FutureWorkSlide />
          <ThankYouSlide />
        </>
      )}

      <Footer />
      <TickerBar />
    </div>
  )
}
