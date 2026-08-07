/**
 * Central slide-id registries. Both App.tsx (for routing / scroll observer)
 * and useSlideNumber (for dynamic header numbering) import from here so a slide
 * only needs to be declared in one place.
 */

export const FULL_SLIDE_IDS = [
  'slide-title',                   // 1
  'slide-literature',              // 2
  'slide-research-question',       // 3
  'slide-challenge',               // 4
  'slide-architecture',            // 5
  'slide-data-sources',            // 6
  'slide-features',                // 7 — merged Technical/Sentiment + Macro/Calendar
  'slide-models',                  // 8 — lineup
  'slide-xgboost',                 // 9
  'slide-deep-learning',           // 10
  'slide-prediction',              // 11
  'slide-backtest-framework',      // 12 — methodology bridge
  'slide-trading',                 // 13 — headline
  'slide-trading-analysis',        // 14
  'slide-findings',                // 15
  'slide-limitations',             // 16
  'slide-future-work',             // 17
  'slide-thank-you',               // 18
] as const

export const DEMO_SLIDE_IDS = [
  'slide-title',
  'slide-challenge',
  'slide-architecture',
  'slide-models',
  'slide-results',
  'slide-demo',
] as const

export type FullSlideId = typeof FULL_SLIDE_IDS[number]
export type DemoSlideId = typeof DEMO_SLIDE_IDS[number]
