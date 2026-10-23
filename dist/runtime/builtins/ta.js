"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTaModule = createTaModule;
const series_1 = require("../types/series");
const na_1 = require("../types/na");
function calcEmaInternal(current, prev, length) {
    const k = 2 / (length + 1);
    if ((0, na_1.isNa)(prev))
        return current;
    return current * k + prev * (1 - k);
}
function createTaModule(getCurrentBarIndex, getHigh, getLow, getClose, getVolume) {
    // State cache keyed by call-site ID (isolated per TaModule instance)
    const emaState = new Map();
    const rsiState = new Map();
    const macdState = new Map();
    const bbState = new Map();
    const rmaState = new Map();
    const cumState = new Map();
    const valuewhenState = new Map();
    const barsSinceState = new Map();
    const dmiState = new Map();
    const obvState = new Map();
    const supertrendState = new Map();
    const crossoverState = new Map();
    const crossunderState = new Map();
    const hmaState = new Map();
    const vwapState = new Map();
    const autoBufferMap = new Map();
    const crossHistory = new Map();
    const crossunderHistory = new Map();
    let lastBarIndex = -1;
    const callCounters = new Map();
    function resolveId(fnName, id) {
        if (id !== undefined && !id.startsWith('default_')) {
            return id;
        }
        const barIndex = getCurrentBarIndex();
        if (barIndex !== lastBarIndex) {
            lastBarIndex = barIndex;
            callCounters.clear();
        }
        const count = callCounters.get(fnName) ?? 0;
        callCounters.set(fnName, count + 1);
        return `auto_${fnName}_${count}`;
    }
    function getOrPushBuffer(id, val, barIdx, capacity) {
        let entry = autoBufferMap.get(id);
        if (!entry || entry.prevBar > barIdx) {
            entry = { buf: [], prevBar: -1 };
            autoBufferMap.set(id, entry);
        }
        if (entry.prevBar !== barIdx) {
            entry.buf.unshift(val);
            if (entry.buf.length > capacity + 10)
                entry.buf.pop();
            entry.prevBar = barIdx;
        }
        return entry.buf;
    }
    function asSeries(source, length, fnName, id) {
        if (source && typeof source.get === 'function') {
            return source;
        }
        const callId = resolveId(fnName, id);
        const val = Number(source);
        const barIdx = getCurrentBarIndex();
        const buf = getOrPushBuffer(callId, isNaN(val) ? NaN : val, barIdx, Math.max(length * 3, 50));
        return {
            get: (i) => (i < buf.length ? buf[i] : na_1.NA),
            length: buf.length,
        };
    }
    function calcSma(source, length, barIdx, id = 'default_sma') {
        if (typeof source === 'number' || (source && typeof source.get !== 'function')) {
            const val = Number(source);
            if (isNaN(val))
                return na_1.NA;
            const buf = getOrPushBuffer(id, val, barIdx ?? 0, length);
            if (buf.length < length)
                return na_1.NA;
            let sum = 0;
            for (let i = 0; i < length; i++) {
                if (isNaN(buf[i]))
                    return na_1.NA;
                sum += buf[i];
            }
            return sum / length;
        }
        if (!source || source.length < length)
            return na_1.NA;
        let sum = 0;
        for (let i = 0; i < length; i++) {
            const v = source.get(i);
            if ((0, na_1.isNa)(v))
                return na_1.NA;
            sum += v;
        }
        return sum / length;
    }
    return {
        sma(source, length, id = 'default_sma') {
            const callId = resolveId('sma', id);
            return calcSma(source, length, getCurrentBarIndex(), callId);
        },
        ema(source, length, id = 'default_ema') {
            const current = (typeof source === 'number' || (source && typeof source.get !== 'function'))
                ? Number(source)
                : source.get(0);
            if ((0, na_1.isNa)(current) || isNaN(current))
                return na_1.NA;
            const callId = resolveId('ema', id);
            const state = emaState.get(callId);
            const barIndex = getCurrentBarIndex();
            if (!state || state.prevBarIndex !== barIndex - 1) {
                // First bar or discontinuity -- seed with current value
                const seedVal = current;
                emaState.set(callId, { prev: seedVal, prevBarIndex: barIndex });
                return seedVal;
            }
            const newVal = calcEmaInternal(current, state.prev, length);
            emaState.set(callId, { prev: newVal, prevBarIndex: barIndex });
            return newVal;
        },
        rsi(source, length, id = 'default_rsi') {
            const src = asSeries(source, length, 'rsi', id);
            const current = src.get(0);
            if ((0, na_1.isNa)(current))
                return na_1.NA;
            const callId = resolveId('rsi', id);
            let state = rsiState.get(callId);
            if (!state) {
                state = { avgGain: 0, avgLoss: 0, prevVal: na_1.NA, initialized: false, count: 0 };
                rsiState.set(callId, state);
            }
            if ((0, na_1.isNa)(state.prevVal)) {
                state.prevVal = current;
                return na_1.NA;
            }
            const diff = current - state.prevVal;
            const gain = diff > 0 ? diff : 0;
            const loss = diff < 0 ? -diff : 0;
            state.prevVal = current;
            state.count++;
            if (!state.initialized) {
                state.avgGain += gain;
                state.avgLoss += loss;
                if (state.count >= length) {
                    state.avgGain /= length;
                    state.avgLoss /= length;
                    state.initialized = true;
                }
                else {
                    return na_1.NA;
                }
            }
            else {
                // Wilder's smoothing
                state.avgGain = (state.avgGain * (length - 1) + gain) / length;
                state.avgLoss = (state.avgLoss * (length - 1) + loss) / length;
            }
            if (state.avgLoss === 0)
                return 100;
            const rs = state.avgGain / state.avgLoss;
            return 100 - 100 / (1 + rs);
        },
        macd(source, fast, slow, signal, id = 'default_macd') {
            const current = source.get(0);
            if ((0, na_1.isNa)(current))
                return [na_1.NA, na_1.NA, na_1.NA];
            const callId = resolveId('macd', id);
            const barIndex = getCurrentBarIndex();
            let state = macdState.get(callId);
            const k_fast = 2 / (fast + 1);
            const k_slow = 2 / (slow + 1);
            const k_sig = 2 / (signal + 1);
            if (!state || state.prevBarIndex !== barIndex - 1) {
                state = {
                    fastEma: current,
                    slowEma: current,
                    signalEma: na_1.NA,
                    prevBarIndex: barIndex,
                };
                macdState.set(callId, state);
                return [na_1.NA, na_1.NA, na_1.NA];
            }
            const fastEma = (0, na_1.isNa)(state.fastEma)
                ? current
                : current * k_fast + state.fastEma * (1 - k_fast);
            const slowEma = (0, na_1.isNa)(state.slowEma)
                ? current
                : current * k_slow + state.slowEma * (1 - k_slow);
            const macdLine = fastEma - slowEma;
            const signalEma = (0, na_1.isNa)(state.signalEma)
                ? macdLine
                : macdLine * k_sig + state.signalEma * (1 - k_sig);
            const histogram = macdLine - signalEma;
            state.fastEma = fastEma;
            state.slowEma = slowEma;
            state.signalEma = signalEma;
            state.prevBarIndex = barIndex;
            macdState.set(callId, state);
            return [macdLine, signalEma, histogram];
        },
        bb(source, length, mult, _id = 'default_bb') {
            const callId = resolveId('bb', _id);
            const src = asSeries(source, length, 'bb', _id);
            const middle = calcSma(src, length, getCurrentBarIndex(), callId);
            if ((0, na_1.isNa)(middle))
                return [na_1.NA, na_1.NA, na_1.NA];
            let variance = 0;
            for (let i = 0; i < length; i++) {
                const v = src.get(i);
                if ((0, na_1.isNa)(v))
                    return [na_1.NA, na_1.NA, na_1.NA];
                const diff = v - middle;
                variance += diff * diff;
            }
            const stddev = Math.sqrt(variance / length);
            const upper = middle + mult * stddev;
            const lower = middle - mult * stddev;
            return [middle, upper, lower];
        },
        atr(length, high, low, close, id = 'default_atr') {
            if (high.length < 2)
                return na_1.NA;
            // True range for current bar
            const h = high.get(0);
            const l = low.get(0);
            const pc = close.get(1);
            if ((0, na_1.isNa)(h) || (0, na_1.isNa)(l) || (0, na_1.isNa)(pc))
                return na_1.NA;
            // Use RMA (Wilder's MA) = EMA with length, seeded with first true range
            const callId = resolveId('atr', id);
            const trKey = callId + '_tr';
            let prevAtr = emaState.get(trKey);
            const barIndex = getCurrentBarIndex();
            const tr = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
            if (!prevAtr || prevAtr.prevBarIndex !== barIndex - 1) {
                emaState.set(trKey, { prev: tr, prevBarIndex: barIndex });
                return tr;
            }
            // Wilder's smoothing: rma = (prev*(length-1) + tr) / length
            const rmaVal = (prevAtr.prev * (length - 1) + tr) / length;
            emaState.set(trKey, { prev: rmaVal, prevBarIndex: barIndex });
            return rmaVal;
        },
        cross(a, b, id) {
            const isSeries = (v) => v !== null && typeof v === 'object' && typeof v.get === 'function';
            const callId = resolveId('cross', id);
            const prevRecord = crossHistory.get(callId);
            const a0 = isSeries(a) ? a.get(0) : (typeof a === 'number' ? a : na_1.NA);
            const a1 = isSeries(a) ? a.get(1) : (prevRecord !== undefined ? prevRecord.a : na_1.NA);
            const b0 = isSeries(b) ? b.get(0) : (typeof b === 'number' ? b : na_1.NA);
            const b1 = isSeries(b) ? b.get(1) : (prevRecord !== undefined ? prevRecord.b : na_1.NA);
            crossHistory.set(callId, { a: a0, b: b0 });
            if ((0, na_1.isNa)(a0) || (0, na_1.isNa)(a1) || (0, na_1.isNa)(b0) || (0, na_1.isNa)(b1))
                return false;
            const over = a0 > b0 && a1 <= b1;
            const under = a0 < b0 && a1 >= b1;
            return over || under;
        },
        crossover(a, b, id) {
            const isSeries = (v) => v !== null && typeof v === 'object' && typeof v.get === 'function';
            const callId = resolveId('crossover', id);
            const prevRecord = crossHistory.get(callId);
            const a0 = isSeries(a) ? a.get(0) : (typeof a === 'number' ? a : na_1.NA);
            const a1 = isSeries(a) ? a.get(1) : (prevRecord !== undefined ? prevRecord.a : na_1.NA);
            const b0 = isSeries(b) ? b.get(0) : (typeof b === 'number' ? b : na_1.NA);
            const b1 = isSeries(b) ? b.get(1) : (prevRecord !== undefined ? prevRecord.b : na_1.NA);
            crossHistory.set(callId, { a: a0, b: b0 });
            if ((0, na_1.isNa)(a0) || (0, na_1.isNa)(a1) || (0, na_1.isNa)(b0) || (0, na_1.isNa)(b1))
                return false;
            return a0 > b0 && a1 <= b1;
        },
        crossunder(a, b, id) {
            const isSeries = (v) => v !== null && typeof v === 'object' && typeof v.get === 'function';
            const callId = resolveId('crossunder', id);
            const prevRecord = crossunderHistory.get(callId);
            const a0 = isSeries(a) ? a.get(0) : (typeof a === 'number' ? a : na_1.NA);
            const a1 = isSeries(a) ? a.get(1) : (prevRecord !== undefined ? prevRecord.a : na_1.NA);
            const b0 = isSeries(b) ? b.get(0) : (typeof b === 'number' ? b : na_1.NA);
            const b1 = isSeries(b) ? b.get(1) : (prevRecord !== undefined ? prevRecord.b : na_1.NA);
            crossunderHistory.set(callId, { a: a0, b: b0 });
            if ((0, na_1.isNa)(a0) || (0, na_1.isNa)(a1) || (0, na_1.isNa)(b0) || (0, na_1.isNa)(b1))
                return false;
            return a0 < b0 && a1 >= b1;
        },
        change(source, length = 1, _id) {
            const src = asSeries(source, length + 1, 'change', _id);
            const current = src.get(0);
            const prev = src.get(length);
            if ((0, na_1.isNa)(current) || (0, na_1.isNa)(prev))
                return na_1.NA;
            return current - prev;
        },
        highest(sourceOrLength, lengthArg) {
            let source;
            let length;
            if (typeof sourceOrLength === 'number' && lengthArg === undefined) {
                source = getHigh ? getHigh() : sourceOrLength;
                length = sourceOrLength;
            }
            else {
                source = sourceOrLength;
                length = lengthArg ?? 1;
            }
            if (!source || typeof source.get !== 'function' || source.length < length)
                return na_1.NA;
            let max = -Infinity;
            for (let i = 0; i < length; i++) {
                const v = source.get(i);
                if ((0, na_1.isNa)(v))
                    return na_1.NA;
                if (v > max)
                    max = v;
            }
            return max;
        },
        lowest(sourceOrLength, lengthArg) {
            let source;
            let length;
            if (typeof sourceOrLength === 'number' && lengthArg === undefined) {
                source = getLow ? getLow() : sourceOrLength;
                length = sourceOrLength;
            }
            else {
                source = sourceOrLength;
                length = lengthArg ?? 1;
            }
            if (!source || typeof source.get !== 'function' || source.length < length)
                return na_1.NA;
            let min = Infinity;
            for (let i = 0; i < length; i++) {
                const v = source.get(i);
                if ((0, na_1.isNa)(v))
                    return na_1.NA;
                if (v < min)
                    min = v;
            }
            return min;
        },
        // ========================================================================
        // NEW TA FUNCTIONS
        // ========================================================================
        /**
         * ta.stoch(source, high, low, length)
         * Stochastic %K = 100 * (source - lowest(low, length)) / (highest(high, length) - lowest(low, length))
         */
        stoch(source, high, low, length) {
            const src = source.get(0);
            if ((0, na_1.isNa)(src))
                return na_1.NA;
            if (high.length < length || low.length < length)
                return na_1.NA;
            let hh = -Infinity;
            let ll = Infinity;
            for (let i = 0; i < length; i++) {
                const h = high.get(i);
                const l = low.get(i);
                if ((0, na_1.isNa)(h) || (0, na_1.isNa)(l))
                    return na_1.NA;
                if (h > hh)
                    hh = h;
                if (l < ll)
                    ll = l;
            }
            const range = hh - ll;
            if (range === 0)
                return 0;
            return 100 * (src - ll) / range;
        },
        /**
         * ta.wma(source, length)
         * Weighted Moving Average: sum(source[i] * (length - i)) / sum(weights)
         * Weight for bar i (0=current) = (length - i)
         */
        wma(source, length, id) {
            const src = asSeries(source, length, 'wma', id);
            if (src.length < length)
                return na_1.NA;
            let weightedSum = 0;
            let weightSum = 0;
            for (let i = 0; i < length; i++) {
                const v = src.get(i);
                if ((0, na_1.isNa)(v))
                    return na_1.NA;
                const weight = length - i;
                weightedSum += v * weight;
                weightSum += weight;
            }
            return weightedSum / weightSum;
        },
        /**
         * ta.vwma(source, volume, length)
         * Volume Weighted Moving Average: sma(source * volume, length) / sma(volume, length)
         */
        vwma(source, volume, length, _id) {
            if (source.length < length || volume.length < length)
                return na_1.NA;
            let svSum = 0;
            let vSum = 0;
            for (let i = 0; i < length; i++) {
                const s = source.get(i);
                const v = volume.get(i);
                if ((0, na_1.isNa)(s) || (0, na_1.isNa)(v))
                    return na_1.NA;
                svSum += s * v;
                vSum += v;
            }
            if (vSum === 0)
                return na_1.NA;
            return svSum / vSum;
        },
        /**
         * ta.rma(source, length)
         * Running Moving Average (Wilder's smoothing)
         * rma = (prev * (length - 1) + source) / length
         * First value is seeded with SMA of first `length` values.
         */
        rma(source, length, id = 'default_rma') {
            const src = asSeries(source, length, 'rma', id);
            const current = src.get(0);
            if ((0, na_1.isNa)(current))
                return na_1.NA;
            const callId = resolveId('rma', id);
            const barIndex = getCurrentBarIndex();
            let state = rmaState.get(callId);
            if (!state) {
                state = { prev: na_1.NA, prevBarIndex: -1, count: 0 };
                rmaState.set(callId, state);
            }
            if ((0, na_1.isNa)(state.prev) || state.prevBarIndex !== barIndex - 1) {
                // Seed: use current value as starting point
                state.prev = current;
                state.prevBarIndex = barIndex;
                state.count = 1;
                return current;
            }
            state.count++;
            const rmaVal = (state.prev * (length - 1) + current) / length;
            state.prev = rmaVal;
            state.prevBarIndex = barIndex;
            return rmaVal;
        },
        /**
         * ta.swma(source)
         * Symmetrically Weighted Moving Average (fixed 4-bar)
         * swma = source[3]*1/6 + source[2]*2/6 + source[1]*2/6 + source[0]*1/6
         */
        swma(source, _id) {
            if (source.length < 4)
                return na_1.NA;
            const v0 = source.get(0);
            const v1 = source.get(1);
            const v2 = source.get(2);
            const v3 = source.get(3);
            if ((0, na_1.isNa)(v0) || (0, na_1.isNa)(v1) || (0, na_1.isNa)(v2) || (0, na_1.isNa)(v3))
                return na_1.NA;
            return (v3 * 1 + v2 * 2 + v1 * 2 + v0 * 1) / 6;
        },
        /**
         * ta.alma(source, length, offset, sigma)
         * Arnaud Legoux Moving Average
         * Uses a Gaussian window centered at offset * (length - 1) from the beginning.
         * weight[i] = exp(-((i - m)^2) / (2 * s^2))
         * where m = offset * (length - 1), s = length / sigma
         */
        alma(source, length, offset, sigma, _id) {
            const src = asSeries(source, length, 'alma', _id);
            if (src.length < length)
                return na_1.NA;
            const m = offset * (length - 1);
            const s = length / sigma;
            let weightSum = 0;
            let normSum = 0;
            for (let i = 0; i < length; i++) {
                // In Pine Script, i=0 is the oldest bar in the window, so we map:
                // Pine's window index i -> our series lookback = (length - 1 - i)
                const lookback = length - 1 - i;
                const v = src.get(lookback);
                if ((0, na_1.isNa)(v))
                    return na_1.NA;
                const w = Math.exp(-((i - m) * (i - m)) / (2 * s * s));
                weightSum += w * v;
                normSum += w;
            }
            if (normSum === 0)
                return na_1.NA;
            return weightSum / normSum;
        },
        /**
         * ta.stdev(source, length)
         * Population standard deviation over `length` bars.
         * stdev = sqrt(variance) where variance uses population formula (divides by length, not length-1).
         * Pine Script v6: ta.stdev uses population stdev (biased).
         */
        stdev(source, length, _id) {
            const src = asSeries(source, length, 'stdev', _id);
            if (src.length < length)
                return na_1.NA;
            let sum = 0;
            for (let i = 0; i < length; i++) {
                const v = src.get(i);
                if ((0, na_1.isNa)(v))
                    return na_1.NA;
                sum += v;
            }
            const mean = sum / length;
            let sqDiffSum = 0;
            for (let i = 0; i < length; i++) {
                const diff = src.get(i) - mean;
                sqDiffSum += diff * diff;
            }
            return Math.sqrt(sqDiffSum / length);
        },
        /**
         * ta.variance(source, length)
         * Population variance over `length` bars.
         */
        variance(source, length, _id) {
            const src = asSeries(source, length, 'variance', _id);
            if (src.length < length)
                return na_1.NA;
            let sum = 0;
            for (let i = 0; i < length; i++) {
                const v = src.get(i);
                if ((0, na_1.isNa)(v))
                    return na_1.NA;
                sum += v;
            }
            const mean = sum / length;
            let sqDiffSum = 0;
            for (let i = 0; i < length; i++) {
                const diff = src.get(i) - mean;
                sqDiffSum += diff * diff;
            }
            return sqDiffSum / length;
        },
        /**
         * ta.cum(source)
         * Cumulative (running) sum of source values across all bars.
         */
        cum(source, id = 'default_cum') {
            const current = source.get(0);
            if ((0, na_1.isNa)(current))
                return na_1.NA;
            const callId = resolveId('cum', id);
            const barIndex = getCurrentBarIndex();
            let state = cumState.get(callId);
            if (!state || state.prevBarIndex !== barIndex - 1) {
                // First bar or discontinuity
                cumState.set(callId, { sum: current, prevBarIndex: barIndex });
                return current;
            }
            const newSum = state.sum + current;
            cumState.set(callId, { sum: newSum, prevBarIndex: barIndex });
            return newSum;
        },
        /**
         * ta.valuewhen(condition, source, occurrence)
         * Returns the value of `source` at the `occurrence`-th most recent bar where `condition` was true.
         * occurrence = 0 means the most recent true bar.
         */
        valuewhen(condition, source, occurrence, id = 'default_valuewhen') {
            const callId = resolveId('valuewhen', id);
            let state = valuewhenState.get(callId);
            if (!state) {
                state = { values: [] };
                valuewhenState.set(callId, state);
            }
            if (condition) {
                const v = source.get(0);
                if (!(0, na_1.isNa)(v)) {
                    state.values.unshift({ value: v });
                }
            }
            if (occurrence >= 0 && occurrence < state.values.length) {
                return state.values[occurrence].value;
            }
            return na_1.NA;
        },
        /**
         * ta.barssince(condition)
         * Returns the number of bars since `condition` was last true.
         * Returns NA if condition has never been true.
         */
        barssince(condition, id = 'default_barssince') {
            const callId = resolveId('barssince', id);
            const barIndex = getCurrentBarIndex();
            let state = barsSinceState.get(callId);
            if (!state) {
                state = { lastTrueBar: -1 };
                barsSinceState.set(callId, state);
            }
            if (condition) {
                state.lastTrueBar = barIndex;
            }
            if (state.lastTrueBar < 0)
                return na_1.NA;
            return barIndex - state.lastTrueBar;
        },
        /**
         * ta.highestbars(source, length)
         * Returns the offset (as a negative number or zero) to the bar with the highest value over the last `length` bars.
         * 0 means current bar, -1 means 1 bar ago, etc.
         */
        highestbars(source, length, _id) {
            const src = asSeries(source, length, 'highestbars', _id);
            if (src.length < length)
                return na_1.NA;
            let maxVal = -Infinity;
            let maxIdx = 0;
            for (let i = 0; i < length; i++) {
                const v = src.get(i);
                if ((0, na_1.isNa)(v))
                    return na_1.NA;
                if (v > maxVal) {
                    maxVal = v;
                    maxIdx = i;
                }
            }
            return -maxIdx;
        },
        /**
         * ta.lowestbars(source, length)
         * Returns the offset (as a negative number or zero) to the bar with the lowest value over the last `length` bars.
         */
        lowestbars(source, length, _id) {
            const src = asSeries(source, length, 'lowestbars', _id);
            if (src.length < length)
                return na_1.NA;
            let minVal = Infinity;
            let minIdx = 0;
            for (let i = 0; i < length; i++) {
                const v = src.get(i);
                if ((0, na_1.isNa)(v))
                    return na_1.NA;
                if (v < minVal) {
                    minVal = v;
                    minIdx = i;
                }
            }
            return -minIdx;
        },
        /**
         * ta.mom(source, length)
         * Momentum. Same as ta.change(source, length).
         * mom = source - source[length]
         */
        mom(source, length, _id) {
            const src = asSeries(source, length + 1, 'mom', _id);
            const current = src.get(0);
            const prev = src.get(length);
            if ((0, na_1.isNa)(current) || (0, na_1.isNa)(prev))
                return na_1.NA;
            return current - prev;
        },
        /**
         * ta.cci(source, length)
         * Commodity Channel Index
         * CCI = (source - sma(source, length)) / (0.015 * dev(source, length))
         * where dev is the mean absolute deviation.
         */
        cci(source, length, _id) {
            const src = asSeries(source, length, 'cci', _id);
            if (src.length < length)
                return na_1.NA;
            // Calculate SMA
            let sum = 0;
            for (let i = 0; i < length; i++) {
                const v = src.get(i);
                if ((0, na_1.isNa)(v))
                    return na_1.NA;
                sum += v;
            }
            const mean = sum / length;
            // Mean absolute deviation
            let madSum = 0;
            for (let i = 0; i < length; i++) {
                madSum += Math.abs(src.get(i) - mean);
            }
            const mad = madSum / length;
            const current = src.get(0);
            if ((0, na_1.isNa)(current))
                return na_1.NA;
            if (mad === 0)
                return 0;
            return (current - mean) / (0.015 * mad);
        },
        /**
         * ta.dmi(diLength, adxSmoothing, high, low, close)
         * Directional Movement Index
         * Returns [plusDI, minusDI, adx]
         *
         * Uses Wilder's smoothing (RMA) for the directional indicators and ADX.
         */
        dmi(diLength, adxSmoothing, high, low, close, id = 'default_dmi') {
            const naResult = [na_1.NA, na_1.NA, na_1.NA];
            const curHigh = high.get(0);
            const curLow = low.get(0);
            const curClose = close.get(0);
            if ((0, na_1.isNa)(curHigh) || (0, na_1.isNa)(curLow) || (0, na_1.isNa)(curClose))
                return naResult;
            const callId = resolveId('dmi', id);
            let state = dmiState.get(callId);
            const barIndex = getCurrentBarIndex();
            if (!state || state.prevBarIndex !== barIndex - 1) {
                state = {
                    prevHigh: curHigh,
                    prevLow: curLow,
                    prevClose: curClose,
                    smoothedPlusDM: na_1.NA,
                    smoothedMinusDM: na_1.NA,
                    smoothedTR: na_1.NA,
                    adx: na_1.NA,
                    prevBarIndex: barIndex,
                    count: 0,
                };
                dmiState.set(callId, state);
                return naResult;
            }
            const prevHigh = state.prevHigh;
            const prevLow = state.prevLow;
            // True Range
            const trueRange = Math.max(curHigh - curLow, Math.abs(curHigh - state.prevClose), Math.abs(curLow - state.prevClose));
            // Directional Movement
            const upMove = curHigh - prevHigh;
            const downMove = prevLow - curLow;
            const plusDM = (upMove > downMove && upMove > 0) ? upMove : 0;
            const minusDM = (downMove > upMove && downMove > 0) ? downMove : 0;
            state.count++;
            // Wilder's smoothing (RMA)
            if ((0, na_1.isNa)(state.smoothedTR)) {
                state.smoothedTR = trueRange;
                state.smoothedPlusDM = plusDM;
                state.smoothedMinusDM = minusDM;
            }
            else {
                state.smoothedTR = (state.smoothedTR * (diLength - 1) + trueRange) / diLength;
                state.smoothedPlusDM = (state.smoothedPlusDM * (diLength - 1) + plusDM) / diLength;
                state.smoothedMinusDM = (state.smoothedMinusDM * (diLength - 1) + minusDM) / diLength;
            }
            // DI+ and DI-
            const smoothedTR = state.smoothedTR;
            let plusDI = 0;
            let minusDI = 0;
            if (smoothedTR !== 0) {
                plusDI = 100 * state.smoothedPlusDM / smoothedTR;
                minusDI = 100 * state.smoothedMinusDM / smoothedTR;
            }
            // DX
            const diSum = plusDI + minusDI;
            const dx = diSum === 0 ? 0 : 100 * Math.abs(plusDI - minusDI) / diSum;
            // ADX (RMA of DX)
            if ((0, na_1.isNa)(state.adx)) {
                state.adx = dx;
            }
            else {
                state.adx = (state.adx * (adxSmoothing - 1) + dx) / adxSmoothing;
            }
            state.prevHigh = curHigh;
            state.prevLow = curLow;
            state.prevClose = curClose;
            state.prevBarIndex = barIndex;
            return [plusDI, minusDI, state.adx];
        },
        /**
         * ta.tr(handleNa)
         * True Range.
         * tr = max(high - low, abs(high - close[1]), abs(low - close[1]))
         * If handleNa is true, when close[1] is na, tr = high - low.
         */
        tr(handleNa = false, high, low, close) {
            const h = high ? high : getHigh ? getHigh() : undefined;
            const l = low ? low : getLow ? getLow() : undefined;
            const c = close ? close : getClose ? getClose() : undefined;
            if (!h || !l || !c)
                return na_1.NA;
            const curHigh = h.get(0);
            const curLow = l.get(0);
            const prevClose = c.get(1);
            if ((0, na_1.isNa)(curHigh) || (0, na_1.isNa)(curLow))
                return na_1.NA;
            if ((0, na_1.isNa)(prevClose)) {
                if (handleNa) {
                    return curHigh - curLow;
                }
                return na_1.NA;
            }
            return Math.max(curHigh - curLow, Math.abs(curHigh - prevClose), Math.abs(curLow - prevClose));
        },
        /**
         * ta.pivothigh(source, leftBars, rightBars)
         * Detects pivot highs. Returns the pivot value if source[rightBars] is higher than
         * all bars within leftBars before it and rightBars after it.
         * Returns NA if no pivot detected at the rightBars lookback point.
         */
        pivothigh(source, leftBars, rightBars) {
            const totalBars = leftBars + rightBars + 1;
            if (source.length < totalBars)
                return na_1.NA;
            // The pivot candidate is at source[rightBars] (rightBars bars ago)
            const pivotVal = source.get(rightBars);
            if ((0, na_1.isNa)(pivotVal))
                return na_1.NA;
            // Check right side: bars 0 to rightBars-1 must be <= pivotVal
            for (let i = 0; i < rightBars; i++) {
                const v = source.get(i);
                if ((0, na_1.isNa)(v))
                    return na_1.NA;
                if (v > pivotVal)
                    return na_1.NA;
            }
            // Check left side: bars rightBars+1 to rightBars+leftBars must be <= pivotVal
            for (let i = rightBars + 1; i <= rightBars + leftBars; i++) {
                const v = source.get(i);
                if ((0, na_1.isNa)(v))
                    return na_1.NA;
                if (v > pivotVal)
                    return na_1.NA;
            }
            return pivotVal;
        },
        /**
         * ta.pivotlow(source, leftBars, rightBars)
         * Detects pivot lows. Returns the pivot value if source[rightBars] is lower than
         * all bars within leftBars before it and rightBars after it.
         */
        pivotlow(source, leftBars, rightBars) {
            const totalBars = leftBars + rightBars + 1;
            if (source.length < totalBars)
                return na_1.NA;
            const pivotVal = source.get(rightBars);
            if ((0, na_1.isNa)(pivotVal))
                return na_1.NA;
            // Check right side: bars 0 to rightBars-1 must be >= pivotVal
            for (let i = 0; i < rightBars; i++) {
                const v = source.get(i);
                if ((0, na_1.isNa)(v))
                    return na_1.NA;
                if (v < pivotVal)
                    return na_1.NA;
            }
            // Check left side: bars rightBars+1 to rightBars+leftBars must be >= pivotVal
            for (let i = rightBars + 1; i <= rightBars + leftBars; i++) {
                const v = source.get(i);
                if ((0, na_1.isNa)(v))
                    return na_1.NA;
                if (v < pivotVal)
                    return na_1.NA;
            }
            return pivotVal;
        },
        /**
         * ta.falling(source, length)
         * Returns true if source has been falling (strictly decreasing) for `length` consecutive bars.
         */
        falling(source, length) {
            if (source.length < length + 1)
                return false;
            for (let i = 0; i < length; i++) {
                const current = source.get(i);
                const prev = source.get(i + 1);
                if ((0, na_1.isNa)(current) || (0, na_1.isNa)(prev))
                    return false;
                if (current >= prev)
                    return false;
            }
            return true;
        },
        /**
         * ta.rising(source, length)
         * Returns true if source has been rising (strictly increasing) for `length` consecutive bars.
         */
        rising(source, length) {
            if (source.length < length + 1)
                return false;
            for (let i = 0; i < length; i++) {
                const current = source.get(i);
                const prev = source.get(i + 1);
                if ((0, na_1.isNa)(current) || (0, na_1.isNa)(prev))
                    return false;
                if (current <= prev)
                    return false;
            }
            return true;
        },
        /**
         * ta.percentrank(source, length)
         * Percent rank: percentage of past `length` values that are less than or equal to the current value.
         */
        percentrank(source, length, _id) {
            const src = asSeries(source, length + 1, 'percentrank', _id);
            if (src.length < length + 1)
                return na_1.NA;
            const current = src.get(0);
            if ((0, na_1.isNa)(current))
                return na_1.NA;
            let count = 0;
            for (let i = 1; i <= length; i++) {
                const v = src.get(i);
                if ((0, na_1.isNa)(v))
                    return na_1.NA;
                if (v <= current)
                    count++;
            }
            return (count / length) * 100;
        },
        /**
         * ta.correlation(source1, source2, length)
         * Pearson correlation coefficient between source1 and source2 over `length` bars.
         */
        correlation(source1, source2, length) {
            if (source1.length < length || source2.length < length)
                return na_1.NA;
            let sum1 = 0, sum2 = 0;
            for (let i = 0; i < length; i++) {
                const v1 = source1.get(i);
                const v2 = source2.get(i);
                if ((0, na_1.isNa)(v1) || (0, na_1.isNa)(v2))
                    return na_1.NA;
                sum1 += v1;
                sum2 += v2;
            }
            const mean1 = sum1 / length;
            const mean2 = sum2 / length;
            let cov = 0, var1 = 0, var2 = 0;
            for (let i = 0; i < length; i++) {
                const d1 = source1.get(i) - mean1;
                const d2 = source2.get(i) - mean2;
                cov += d1 * d2;
                var1 += d1 * d1;
                var2 += d2 * d2;
            }
            const denom = Math.sqrt(var1 * var2);
            if (denom === 0)
                return 0;
            return cov / denom;
        },
        /**
         * ta.dev(source, length)
         * Mean absolute deviation of source over `length` bars.
         * dev = avg(abs(source[i] - sma(source, length))) for i in 0..length-1
         */
        dev(source, length, _id) {
            const src = asSeries(source, length, 'dev', _id);
            if (src.length < length)
                return na_1.NA;
            let sum = 0;
            for (let i = 0; i < length; i++) {
                const v = src.get(i);
                if ((0, na_1.isNa)(v))
                    return na_1.NA;
                sum += v;
            }
            const mean = sum / length;
            let madSum = 0;
            for (let i = 0; i < length; i++) {
                madSum += Math.abs(src.get(i) - mean);
            }
            return madSum / length;
        },
        /**
         * ta.mfi(series, length, high?, low?, close?, volume?)
         * Money Flow Index.
         * Typical price = (high + low + close) / 3
         * Raw money flow = typical price * volume
         * MFI uses Wilder-like summation over `length` bars.
         *
         * When called from Pine Script: ta.mfi(hlc3_series, length)
         * The `series` parameter is typically hlc3. We use it as the typical price directly.
         * We need volume to calculate raw money flow.
         */
        mfi(series, length, high, low, close, volume, _id) {
            // Get volume from parameter or closure
            const vol = volume ? volume : getVolume ? getVolume() : undefined;
            if (!vol)
                return na_1.NA;
            // We need length+1 bars to compare current typical price with previous
            if (series.length < length + 1 || vol.length < length)
                return na_1.NA;
            let posFlow = 0;
            let negFlow = 0;
            for (let i = 0; i < length; i++) {
                const tp = series.get(i);
                const prevTp = series.get(i + 1);
                const v = vol.get(i);
                if ((0, na_1.isNa)(tp) || (0, na_1.isNa)(prevTp) || (0, na_1.isNa)(v))
                    return na_1.NA;
                const rawMf = tp * v;
                if (tp > prevTp) {
                    posFlow += rawMf;
                }
                else if (tp < prevTp) {
                    negFlow += rawMf;
                }
                // If equal, money flow is not counted for either side
            }
            if (negFlow === 0)
                return 100;
            const mfr = posFlow / negFlow;
            return 100 - 100 / (1 + mfr);
        },
        /**
         * ta.obv()
         * On Balance Volume.
         * If close > close[1], OBV += volume
         * If close < close[1], OBV -= volume
         * If close == close[1], OBV unchanged
         */
        obv(close, volume, id = 'default_obv') {
            const c = close ? close : getClose ? getClose() : undefined;
            const v = volume ? volume : getVolume ? getVolume() : undefined;
            if (!c || !v)
                return na_1.NA;
            const curClose = c.get(0);
            const curVol = v.get(0);
            if ((0, na_1.isNa)(curClose) || (0, na_1.isNa)(curVol))
                return na_1.NA;
            const callId = resolveId('obv', id);
            const barIndex = getCurrentBarIndex();
            let state = obvState.get(callId);
            if (!state || state.prevBarIndex !== barIndex - 1) {
                state = { prevClose: curClose, obv: 0, prevBarIndex: barIndex };
                obvState.set(callId, state);
                return 0;
            }
            const prevClose = state.prevClose;
            let obvVal = state.obv;
            if (curClose > prevClose) {
                obvVal += curVol;
            }
            else if (curClose < prevClose) {
                obvVal -= curVol;
            }
            state.prevClose = curClose;
            state.obv = obvVal;
            state.prevBarIndex = barIndex;
            return obvVal;
        },
        /**
         * ta.supertrend(factor, atrPeriod, high?, low?, close?)
         * Supertrend indicator.
         * Returns [supertrend, direction]
         * direction: -1 = uptrend (bullish), 1 = downtrend (bearish)
         *
         * upperBand = hl2 + factor * atr
         * lowerBand = hl2 - factor * atr
         * Supertrend flips between upper and lower bands based on close price.
         */
        supertrend(factor, atrPeriod, high, low, close, id = 'default_supertrend') {
            const naResult = [na_1.NA, na_1.NA];
            const h = high ? high : getHigh ? getHigh() : undefined;
            const l = low ? low : getLow ? getLow() : undefined;
            const c = close ? close : getClose ? getClose() : undefined;
            if (!h || !l || !c)
                return naResult;
            if (h.length < 2)
                return naResult;
            const curHigh = h.get(0);
            const curLow = l.get(0);
            const curClose = c.get(0);
            const prevClose = c.get(1);
            if ((0, na_1.isNa)(curHigh) || (0, na_1.isNa)(curLow) || (0, na_1.isNa)(curClose) || (0, na_1.isNa)(prevClose))
                return naResult;
            // Calculate ATR using internal RMA-based ATR
            const callId = resolveId('supertrend', id);
            const atrId = callId + '_atr';
            const atrVal = this.atr(atrPeriod, h, l, c, atrId);
            if ((0, na_1.isNa)(atrVal))
                return naResult;
            const hl2 = (curHigh + curLow) / 2;
            let upperBand = hl2 + factor * atrVal;
            let lowerBand = hl2 - factor * atrVal;
            const barIndex = getCurrentBarIndex();
            let state = supertrendState.get(callId);
            if (!state || state.prevBarIndex !== barIndex - 1) {
                // First bar: default to downtrend (direction = 1)
                state = {
                    prevSupertrend: upperBand,
                    prevDirection: 1,
                    prevClose: curClose,
                    prevBarIndex: barIndex,
                };
                supertrendState.set(callId, state);
                return [upperBand, 1];
            }
            // Adjust bands based on previous values (band clamping)
            const prevST = state.prevSupertrend;
            const prevDir = state.prevDirection;
            // If previous supertrend was acting as lower band (uptrend), only allow it to go up
            if (prevDir === -1) {
                // Uptrend: supertrend = lowerBand
                if (lowerBand < prevST) {
                    lowerBand = prevST;
                }
            }
            else {
                // Downtrend: supertrend = upperBand
                if (upperBand > prevST) {
                    upperBand = prevST;
                }
            }
            let direction;
            let supertrend;
            if (prevDir === -1) {
                // Was uptrend
                if (curClose < lowerBand) {
                    // Flip to downtrend
                    direction = 1;
                    supertrend = upperBand;
                }
                else {
                    direction = -1;
                    supertrend = lowerBand;
                }
            }
            else {
                // Was downtrend
                if (curClose > upperBand) {
                    // Flip to uptrend
                    direction = -1;
                    supertrend = lowerBand;
                }
                else {
                    direction = 1;
                    supertrend = upperBand;
                }
            }
            state.prevSupertrend = supertrend;
            state.prevDirection = direction;
            state.prevClose = curClose;
            state.prevBarIndex = barIndex;
            return [supertrend, direction];
        },
        // ========================================================================
        // P1 TA FUNCTIONS
        // ========================================================================
        /**
         * ta.hma(source, length)
         * Hull Moving Average: WMA(2*WMA(src, length/2) - WMA(src, length), floor(sqrt(length)))
         */
        hma(source, length, id = 'default_hma') {
            const src = asSeries(source, length, 'hma', id);
            if (src.length < length)
                return na_1.NA;
            const halfLen = Math.floor(length / 2);
            const sqrtLen = Math.floor(Math.sqrt(length));
            // Compute wma1 (half-length) and wma2 (full-length) inline
            let ws1 = 0, wn1 = 0, ws2 = 0, wn2 = 0;
            for (let i = 0; i < length; i++) {
                const v = src.get(i);
                if ((0, na_1.isNa)(v))
                    return na_1.NA;
                const w2 = length - i;
                ws2 += v * w2;
                wn2 += w2;
                if (i < halfLen) {
                    const w1 = halfLen - i;
                    ws1 += v * w1;
                    wn1 += w1;
                }
            }
            if (wn1 === 0 || wn2 === 0)
                return na_1.NA;
            const delta = 2 * (ws1 / wn1) - (ws2 / wn2);
            // Accumulate delta in ring buffer
            const callId = resolveId('hma', id);
            const barIndex = getCurrentBarIndex();
            let state = hmaState.get(callId);
            if (!state || state.capacity !== sqrtLen) {
                state = { deltaBuf: [], capacity: sqrtLen, prevBarIndex: barIndex };
                hmaState.set(callId, state);
            }
            state.deltaBuf.unshift(delta);
            if (state.deltaBuf.length > sqrtLen)
                state.deltaBuf.length = sqrtLen;
            state.prevBarIndex = barIndex;
            if (state.deltaBuf.length < sqrtLen)
                return na_1.NA;
            // WMA over delta buffer
            let wSum = 0, wN = 0;
            for (let i = 0; i < sqrtLen; i++) {
                const w = sqrtLen - i;
                wSum += state.deltaBuf[i] * w;
                wN += w;
            }
            return wSum / wN;
        },
        /**
         * ta.kc(source, length, mult, useTrueRange?)
         * Keltner Channels. Returns [upper, basis, lower].
         * basis = EMA(source, length)
         * range = ATR(1) if useTrueRange, else EMA(high-low, length)
         */
        kc(source, length, mult, useTrueRange = true, id = 'default_kc') {
            const NA3 = [na_1.NA, na_1.NA, na_1.NA];
            const h = getHigh ? getHigh() : undefined;
            const l = getLow ? getLow() : undefined;
            const c = getClose ? getClose() : undefined;
            if (!h || !l || !c)
                return NA3;
            const callId = resolveId('kc', id);
            // basis EMA
            const basisId = callId + '_basis';
            const basis = this.ema(source, length, basisId);
            if ((0, na_1.isNa)(basis))
                return NA3;
            let rangeVal;
            if (useTrueRange) {
                rangeVal = this.atr(length, h, l, c, callId + '_atr');
            }
            else {
                // EMA of (high - low) using stateful EMA
                const curHigh = h.get(0);
                const curLow = l.get(0);
                if ((0, na_1.isNa)(curHigh) || (0, na_1.isNa)(curLow))
                    return NA3;
                const curr = curHigh - curLow;
                const rangeId = callId + '_range';
                const barIndex = getCurrentBarIndex();
                const rangeState = emaState.get(rangeId);
                if (!rangeState || rangeState.prevBarIndex !== barIndex - 1) {
                    emaState.set(rangeId, { prev: curr, prevBarIndex: barIndex });
                    rangeVal = curr;
                }
                else {
                    const k = 2 / (length + 1);
                    rangeVal = curr * k + rangeState.prev * (1 - k);
                    emaState.set(rangeId, { prev: rangeVal, prevBarIndex: barIndex });
                }
            }
            if ((0, na_1.isNa)(rangeVal))
                return NA3;
            const upper = basis + mult * rangeVal;
            const lower = basis - mult * rangeVal;
            return [upper, basis, lower];
        },
        /**
         * ta.donchian(length)
         * Donchian Channels. Returns [upper, basis, lower].
         * upper = highest(high, length), lower = lowest(low, length), basis = (upper+lower)/2
         */
        donchian(length, high, low) {
            const NA3 = [na_1.NA, na_1.NA, na_1.NA];
            const h = high ? high : (getHigh ? getHigh() : undefined);
            const l = low ? low : (getLow ? getLow() : undefined);
            if (!h || !l)
                return NA3;
            const upper = this.highest(h, length);
            const lower = this.lowest(l, length);
            if ((0, na_1.isNa)(upper) || (0, na_1.isNa)(lower))
                return NA3;
            const basis = (upper + lower) / 2;
            return [upper, basis, lower];
        },
        /**
         * ta.linreg(source, length, offset)
         * Least-squares linear regression value.
         * Returns the fitted value at `offset` bars back from most recent.
         */
        linreg(source, length, offset = 0, id) {
            const src = asSeries(source, length + Math.max(0, offset), 'linreg', id);
            if (src.length < length + offset)
                return na_1.NA;
            let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
            for (let i = 0; i < length; i++) {
                const x = i; // 0 = oldest in window
                const v = src.get(length - 1 - i + offset); // oldest first
                if ((0, na_1.isNa)(v))
                    return na_1.NA;
                sumX += x;
                sumY += v;
                sumXY += x * v;
                sumX2 += x * x;
            }
            const denom = length * sumX2 - sumX * sumX;
            if (denom === 0)
                return sumY / length;
            const slope = (length * sumXY - sumX * sumY) / denom;
            const intercept = (sumY - slope * sumX) / length;
            // Value at the most recent end of the regression line
            return intercept + slope * (length - 1);
        },
        /**
         * ta.median(source, length)
         * Median value over `length` bars.
         * For even-length: returns the lower of the two middle values.
         */
        median(source, length, _id) {
            const src = asSeries(source, length, 'median', _id);
            if (src.length < length)
                return na_1.NA;
            const vals = [];
            for (let i = 0; i < length; i++) {
                const v = src.get(i);
                if ((0, na_1.isNa)(v))
                    return na_1.NA;
                vals.push(v);
            }
            vals.sort((a, b) => a - b);
            const mid = Math.floor(length / 2);
            // Pine uses lower middle for even-length
            return length % 2 === 1 ? vals[mid] : vals[mid - 1];
        },
        vwap(source, _anchor) {
            const barIdx = getCurrentBarIndex();
            const volSeries = getVolume ? getVolume() : undefined;
            const volVal = volSeries ? volSeries.get(0) : 1;
            const srcVal = source instanceof series_1.Series ? source.get(0) : (source !== undefined ? Number(source) : (getClose ? getClose().get(0) : 0));
            const state = vwapState.get('global') ?? { cumPv: 0, cumVol: 0, prevBarIndex: -1 };
            if (barIdx === 0 || state.prevBarIndex > barIdx) {
                state.cumPv = 0;
                state.cumVol = 0;
            }
            if (state.prevBarIndex !== barIdx) {
                const v = (0, na_1.isNa)(volVal) || isNaN(volVal) || volVal <= 0 ? 1 : volVal;
                const p = (0, na_1.isNa)(srcVal) || isNaN(srcVal) ? 0 : srcVal;
                state.cumPv += p * v;
                state.cumVol += v;
                state.prevBarIndex = barIdx;
                vwapState.set('global', state);
            }
            return state.cumVol > 0 ? state.cumPv / state.cumVol : srcVal;
        },
    };
}
//# sourceMappingURL=ta.js.map