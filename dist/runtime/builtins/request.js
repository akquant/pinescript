"use strict";
// Pine Script v6 request.security() runtime module — multi-timeframe (MTF) analysis
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRequestModule = createRequestModule;
const series_1 = require("../types/series");
const na_1 = require("../types/na");
/** Group input bars into higher-TF periods and aggregate OHLCV. */
function getResampledBars(bars, tf) {
    if (bars.length === 0)
        return [];
    const keyFn = periodKeyFn(tf);
    const result = [];
    let group = [];
    let groupStartIdx = 0;
    let prevKey = null;
    for (let i = 0; i < bars.length; i++) {
        const key = keyFn(bars[i].time);
        if (prevKey !== null && key !== prevKey) {
            result.push(aggregateGroup(group, groupStartIdx, i - 1));
            group = [];
            groupStartIdx = i;
        }
        group.push(bars[i]);
        prevKey = key;
    }
    // flush last group
    if (group.length > 0) {
        result.push(aggregateGroup(group, groupStartIdx, bars.length - 1));
    }
    return result;
}
/** Return a function that maps a unix-seconds timestamp to a period key string. */
function periodKeyFn(tf) {
    if (tf === 'D') {
        return (ts) => {
            const d = new Date(ts * 1000);
            return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
        };
    }
    if (tf === 'W') {
        return (ts) => {
            const d = new Date(ts * 1000);
            // ISO week: floor to Monday
            const day = d.getUTCDay(); // 0=Sun
            const diff = (day + 6) % 7; // days since Monday
            const monday = new Date(d);
            monday.setUTCDate(d.getUTCDate() - diff);
            return `${monday.getUTCFullYear()}-W${monday.getUTCMonth()}-${monday.getUTCDate()}`;
        };
    }
    if (tf === 'M') {
        return (ts) => {
            const d = new Date(ts * 1000);
            return `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
        };
    }
    // Numeric = minutes.  Group bars into buckets of that many minutes.
    const minutes = parseInt(tf, 10);
    if (!isNaN(minutes) && minutes > 0) {
        const bucketSec = minutes * 60;
        return (ts) => String(Math.floor(ts / bucketSec));
    }
    // Fallback: treat as daily
    return (ts) => {
        const d = new Date(ts * 1000);
        return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
    };
}
/** Aggregate a group of bars into one higher-TF bar. */
function aggregateGroup(group, startIdx, endIdx) {
    const bar = {
        time: group[0].time,
        open: group[0].open,
        high: -Infinity,
        low: Infinity,
        close: group[group.length - 1].close,
        volume: 0,
    };
    for (const b of group) {
        if (b.high > bar.high)
            bar.high = b.high;
        if (b.low < bar.low)
            bar.low = b.low;
        bar.volume += b.volume;
    }
    return { bar, startIdx, endIdx };
}
/** Build O(1) lookup: input-bar index -> resampled-bar index. */
function buildBarToResampledIndex(barsLen, resampled) {
    const map = new Int32Array(barsLen).fill(-1);
    for (let ri = 0; ri < resampled.length; ri++) {
        for (let i = resampled[ri].startIdx; i <= resampled[ri].endIdx; i++) {
            map[i] = ri;
        }
    }
    return map;
}
function createRequestModule(bars, getCurrentBarIndex, getCurrentTimeframe) {
    // Cache: timeframe -> { resampled bars, bar-index lookup }
    const cache = new Map();
    function ensureCached(tf) {
        if (!cache.has(tf)) {
            const resampled = getResampledBars(bars, tf);
            const lookup = buildBarToResampledIndex(bars.length, resampled);
            cache.set(tf, { resampled, lookup });
        }
        return cache.get(tf);
    }
    function naValue(expression) {
        if (Array.isArray(expression)) {
            return expression.map(() => na_1.NA);
        }
        return na_1.NA;
    }
    function resolveValue(reBar, expression) {
        // Tuple / array → map each element to a resampled close
        if (Array.isArray(expression)) {
            return expression.map(() => reBar.close);
        }
        // Series or number → return resampled close
        return reBar.close;
    }
    function security(symbol, timeframe, expression, gaps = 'barmerge.gaps_off', lookahead = 'barmerge.lookahead_off') {
        // Same timeframe → return expression as-is
        const currentTf = getCurrentTimeframe();
        if (timeframe === currentTf || timeframe === '') {
            if (expression instanceof series_1.Series)
                return expression.get(0);
            return expression;
        }
        if (bars.length === 0)
            return naValue(expression);
        const { resampled, lookup } = ensureCached(timeframe);
        const barIdx = getCurrentBarIndex();
        if (barIdx < 0 || barIdx >= bars.length)
            return naValue(expression);
        const ri = lookup[barIdx];
        if (ri < 0)
            return naValue(expression);
        const gapsOn = (typeof gaps === 'string' && gaps === 'barmerge.gaps_on') ||
            (typeof gaps === 'object' && gaps !== null && gaps.gaps === 'barmerge.gaps_on');
        const lookaheadOn = (typeof gaps === 'object' && gaps !== null && 'lookahead' in gaps
            ? (gaps.lookahead === 'barmerge.lookahead_on' || gaps.lookahead === 'lookahead_on' || gaps.lookahead === true)
            : false) ||
            lookahead === 'barmerge.lookahead_on' ||
            lookahead === 'lookahead_on' ||
            lookahead === true;
        if (lookaheadOn) {
            // Return the current period's value (future peeking allowed)
            if (gapsOn) {
                // Only emit on the first bar of this period
                if (barIdx !== resampled[ri].startIdx)
                    return naValue(expression);
            }
            return resolveValue(resampled[ri].bar, expression);
        }
        // Default: no lookahead — return the *previous* completed period's value
        if (ri === 0) {
            // No completed period yet
            return naValue(expression);
        }
        // Previous completed period
        const prevRi = ri - 1;
        if (gapsOn) {
            // Only emit a value on the first bar of a new period
            if (barIdx !== resampled[ri].startIdx)
                return naValue(expression);
        }
        return resolveValue(resampled[prevRi].bar, expression);
    }
    return { security };
}
//# sourceMappingURL=request.js.map