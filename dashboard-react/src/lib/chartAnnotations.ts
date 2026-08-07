/**
 * Vertical annotations overlaid on the PredictiveChart when Advanced mode is on.
 * Each annotation turns the price line into a story the examiner can read directly:
 * "model missed here → oh, that's Q3 earnings miss → fine, that makes sense."
 *
 * Covers the Aug 2023 → Dec 2024 test window for the 5 project tickers.
 */

export type AnnotationType = "earnings" | "macro" | "news";

export interface ChartAnnotation {
  date: string; // ISO YYYY-MM-DD (must match a trading day in the test set)
  label: string; // 2-4 words, shown as the on-chart label
  type: AnnotationType;
}

/** Ticker-specific events (mostly earnings). */
export const TICKER_EVENTS: Record<string, ChartAnnotation[]> = {
  AAPL: [
    { date: "2023-09-12", label: "iPhone 15 launch",  type: "news" },
    { date: "2023-11-02", label: "Q4 FY23",           type: "earnings" },
    { date: "2024-02-01", label: "Q1 FY24",           type: "earnings" },
    { date: "2024-02-02", label: "Vision Pro launch", type: "news" },
    { date: "2024-03-21", label: "DOJ antitrust suit", type: "news" },
    { date: "2024-05-02", label: "Q2 FY24",           type: "earnings" },
    { date: "2024-06-10", label: "Apple Intelligence", type: "news" },
    { date: "2024-08-01", label: "Q3 FY24",           type: "earnings" },
    { date: "2024-10-31", label: "Q4 FY24",           type: "earnings" },
  ],
  MSFT: [
    { date: "2023-10-13", label: "Activision closes",  type: "news" },
    { date: "2023-10-24", label: "Q1 FY24",            type: "earnings" },
    { date: "2023-11-15", label: "M365 Copilot GA",    type: "news" },
    { date: "2024-01-24", label: "Hits $3T mkt cap",   type: "news" },
    { date: "2024-01-30", label: "Q2 FY24",            type: "earnings" },
    { date: "2024-04-25", label: "Q3 FY24",            type: "earnings" },
    { date: "2024-07-30", label: "Q4 FY24",            type: "earnings" },
    { date: "2024-10-30", label: "Q1 FY25",            type: "earnings" },
  ],
  GOOGL: [
    { date: "2023-10-24", label: "Q3 23 miss",         type: "earnings" },
    { date: "2023-12-06", label: "Gemini launch",      type: "news" },
    { date: "2024-01-30", label: "Q4 23",              type: "earnings" },
    { date: "2024-04-25", label: "Q1 24 beat",         type: "earnings" },
    { date: "2024-07-23", label: "Q2 24",              type: "earnings" },
    { date: "2024-08-05", label: "DOJ antitrust ruling", type: "news" },
    { date: "2024-10-29", label: "Q3 24",              type: "earnings" },
  ],
  JPM: [
    { date: "2023-10-13", label: "Q3 23",              type: "earnings" },
    { date: "2024-01-12", label: "Q4 23",              type: "earnings" },
    { date: "2024-04-12", label: "Q1 24",              type: "earnings" },
    { date: "2024-06-28", label: "Stress test pass",   type: "news" },
    { date: "2024-07-12", label: "Q2 24",              type: "earnings" },
    { date: "2024-10-11", label: "Q3 24",              type: "earnings" },
    { date: "2024-12-11", label: "$50B buyback plan",  type: "news" },
  ],
  XOM: [
    { date: "2023-10-11", label: "Pioneer deal ($60B)", type: "news" },
    { date: "2023-10-27", label: "Q3 23",               type: "earnings" },
    { date: "2024-02-02", label: "Q4 23",               type: "earnings" },
    { date: "2024-04-26", label: "Q1 24",               type: "earnings" },
    { date: "2024-05-03", label: "Pioneer FTC approved", type: "news" },
    { date: "2024-08-02", label: "Q2 24",               type: "earnings" },
    { date: "2024-11-01", label: "Q3 24",               type: "earnings" },
  ],
};

/** Market-wide events shown regardless of ticker. Kept short to avoid clutter. */
export const MACRO_EVENTS: ChartAnnotation[] = [
  { date: "2023-12-13", label: "Fed dovish pivot", type: "macro" },
  { date: "2024-08-05", label: "Yen carry unwind", type: "macro" },
  { date: "2024-09-18", label: "Fed -50bps",       type: "macro" },
  { date: "2024-11-05", label: "US election",      type: "macro" },
];
