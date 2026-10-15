// Pine Script v6 timeframe built-in module

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
export function inSeconds(tf: string): number {
  if (tf === 'D' || tf === '1D') return 86400;
  if (tf === 'W' || tf === '1W') return 604800;
  if (tf === 'M' || tf === '1M') return 2592000;
  if (tf === '12M' || tf === 'Y' || tf === '1Y') return 31536000;

  const num = parseInt(tf, 10);
  if (!isNaN(num)) {
    return num * 60; // numeric periods are minutes
  }

  // Unknown format — fall back to daily
  return 86400;
}

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
export function createTimeframe(
  periodStr?: string,
  getTimeSeries?: () => { get: (offset: number) => number } | undefined,
  getBarIndex?: () => number,
): TimeframeInfo {
  const period = periodStr ?? 'D';

  const isDWM = period === 'D' || period === 'W' || period === 'M';
  const isNumeric = /^\d+$/.test(period);
  const numericValue = isNumeric ? parseInt(period, 10) : 0;

  let multiplier = 1;
  if (isNumeric) {
    multiplier = numericValue;
  }

  return {
    period,
    multiplier,
    isdwm: isDWM,
    isintraday: !isDWM,
    isminutes: isNumeric && numericValue < 60,
    ishours: isNumeric && numericValue >= 60,
    isdaily: period === 'D',
    isweekly: period === 'W',
    ismonthly: period === 'M',
    in_seconds(tf?: string): number {
      return inSeconds(tf ?? period);
    },
    inSeconds(tf?: string): number {
      return inSeconds(tf ?? period);
    },
    change(tf?: string): boolean {
      const idx = getBarIndex ? getBarIndex() : 0;
      if (idx === 0) return true;

      const timeSeries = getTimeSeries ? getTimeSeries() : undefined;
      if (!timeSeries) return true;

      const tCurr = timeSeries.get(0);
      const tPrev = timeSeries.get(1);
      if (tCurr === undefined || tPrev === undefined || isNaN(tCurr) || isNaN(tPrev)) {
        return true;
      }

      const targetTf = tf ?? period;
      if (!targetTf || targetTf === period) {
        return true;
      }

      const dCurr = new Date(tCurr);
      const dPrev = new Date(tPrev);

      if (targetTf === 'D' || targetTf === '1D') {
        return (
          dCurr.getUTCDate() !== dPrev.getUTCDate() ||
          dCurr.getUTCMonth() !== dPrev.getUTCMonth() ||
          dCurr.getUTCFullYear() !== dPrev.getUTCFullYear()
        );
      }

      if (targetTf === 'W' || targetTf === '1W') {
        const wCurr = Math.floor((tCurr + 4 * 86400000) / (7 * 86400000));
        const wPrev = Math.floor((tPrev + 4 * 86400000) / (7 * 86400000));
        return wCurr !== wPrev;
      }

      if (targetTf === 'M' || targetTf === '1M') {
        return (
          dCurr.getUTCMonth() !== dPrev.getUTCMonth() ||
          dCurr.getUTCFullYear() !== dPrev.getUTCFullYear()
        );
      }

      if (targetTf === '12M' || targetTf === 'Y' || targetTf === '1Y') {
        return dCurr.getUTCFullYear() !== dPrev.getUTCFullYear();
      }

      let mins = 0;
      if (/^\d+$/.test(targetTf)) {
        mins = parseInt(targetTf, 10);
      } else if (/^(\d+)m$/i.test(targetTf)) {
        mins = parseInt(targetTf, 10);
      } else if (/^(\d+)h$/i.test(targetTf)) {
        mins = parseInt(targetTf, 10) * 60;
      } else if (/^(\d+)s$/i.test(targetTf)) {
        const secs = parseInt(targetTf, 10);
        return Math.floor(tCurr / (secs * 1000)) !== Math.floor(tPrev / (secs * 1000));
      }

      if (mins > 0) {
        const periodMs = mins * 60 * 1000;
        return Math.floor(tCurr / periodMs) !== Math.floor(tPrev / periodMs);
      }

      return Math.floor(tCurr / 86400000) !== Math.floor(tPrev / 86400000);
    },
  };
}
