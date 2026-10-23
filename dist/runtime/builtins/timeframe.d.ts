export interface TimeframeInfo {
    period: string;
    multiplier: number;
    isdwm: boolean;
    isintraday: boolean;
    isminutes: boolean;
    ishours: boolean;
    isdaily: boolean;
    isweekly: boolean;
    ismonthly: boolean;
    in_seconds: (tf?: string) => number;
    inSeconds: (tf?: string) => number;
    change: (tf?: string) => boolean;
}
/**
 * Convert a timeframe period string to its duration in seconds.
 *
 * - Numeric strings (e.g. "1", "5", "60") are treated as minutes.
 * - "D" → 86 400  (1 day)
 * - "W" → 604 800 (7 days)
 * - "M" → 2 592 000 (30 days, Pine convention)
 *
 * @param tf  Period string.  If omitted the caller should supply a default.
 */
export declare function inSeconds(tf: string): number;
/**
 * Create a timeframe info object from a period string.
 *
 * Period string conventions (Pine Script):
 *   - "1", "5", "15", "60", "240" — intraday minute-based
 *   - "D" — daily
 *   - "W" — weekly
 *   - "M" — monthly
 *
 * Minutes < 60 are classified as isminutes; >= 60 as ishours.
 */
export declare function createTimeframe(periodStr?: string, getTimeSeries?: () => {
    get: (offset: number) => number;
} | undefined, getBarIndex?: () => number): TimeframeInfo;
