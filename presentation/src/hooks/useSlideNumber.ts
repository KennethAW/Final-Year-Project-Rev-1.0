import { FULL_SLIDE_IDS, DEMO_SLIDE_IDS } from '@/lib/slideRegistry'

/**
 * Returns the 1-indexed position of a given slide id in whichever deck
 * (full vs demo) is currently active. Zero if not present in the active deck.
 *
 * Use in each slide's header to avoid hardcoded "Slide 4:" strings:
 *
 *   const slideNum = useSlideNumber('slide-features-tech')
 *   ...
 *   <span>Slide {slideNum}</span>
 */
export function useSlideNumber(slideId: string): number {
  const isDemoMode =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('demo') === 'true'

  const ids: readonly string[] = isDemoMode ? DEMO_SLIDE_IDS : FULL_SLIDE_IDS
  const idx = ids.indexOf(slideId)
  return idx === -1 ? 0 : idx + 1
}
