"use strict";
/**
 * Technical Indicator Functions for PineScript
 * Adapted for QuantTrade Web & Bot Engine
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MathFunctions = exports.TechnicalIndicators = void 0;
class TechnicalIndicators {
    // Simple Moving Average
    static sma(data, period) {
        const result = [];
        for (let i = 0; i < data.length; i++) {
            if (i < period - 1) {
                result.push(NaN);
                continue;
            }
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += data[i - j];
            }
            result.push(sum / period);
        }
        return result;
    }
    // Exponential Moving Average
    static ema(data, period) {
        const result = [];
        const multiplier = 2 / (period + 1);
        let ema = 0;
        const startIdx = Math.min(period, data.length);
        for (let i = 0; i < startIdx; i++) {
            ema += data[i];
        }
        ema /= startIdx || 1;
        for (let i = 0; i < data.length; i++) {
            if (i < period - 1) {
                result.push(NaN);
            }
            else if (i === period - 1) {
                result.push(ema);
            }
            else {
                ema = (data[i] - ema) * multiplier + ema;
                result.push(ema);
            }
        }
        return result;
    }
    // Relative Strength Index
    static rsi(data, period = 14) {
        const result = [];
        const gains = [];
        const losses = [];
        for (let i = 1; i < data.length; i++) {
            const change = data[i] - data[i - 1];
            gains.push(change > 0 ? change : 0);
            losses.push(change < 0 ? -change : 0);
        }
        const avgGains = this.sma(gains, period);
        const avgLosses = this.sma(losses, period);
        result.push(NaN); // First bar
        for (let i = 0; i < avgGains.length; i++) {
            if (isNaN(avgGains[i]) || avgLosses[i] === 0) {
                result.push(NaN);
            }
            else {
                const rs = avgGains[i] / avgLosses[i];
                const rsiVal = 100 - (100 / (1 + rs));
                result.push(rsiVal);
            }
        }
        return result;
    }
    // Average True Range (ATR)
    static atr(high, low, close, period = 14) {
        const tr = [];
        for (let i = 0; i < close.length; i++) {
            if (i === 0) {
                tr.push(high[i] - low[i]);
            }
            else {
                const hL = high[i] - low[i];
                const hCp = Math.abs(high[i] - close[i - 1]);
                const lCp = Math.abs(low[i] - close[i - 1]);
                tr.push(Math.max(hL, hCp, lCp));
            }
        }
        return this.ema(tr, period);
    }
    // Moving Average Convergence Divergence
    static macd(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        const fastEMA = this.ema(data, fastPeriod);
        const slowEMA = this.ema(data, slowPeriod);
        const macdLine = [];
        for (let i = 0; i < data.length; i++) {
            if (isNaN(fastEMA[i]) || isNaN(slowEMA[i])) {
                macdLine.push(NaN);
            }
            else {
                macdLine.push(fastEMA[i] - slowEMA[i]);
            }
        }
        const validMacd = macdLine.map(v => isNaN(v) ? 0 : v);
        const signalLine = this.ema(validMacd, signalPeriod);
        const histogram = [];
        for (let i = 0; i < data.length; i++) {
            if (isNaN(macdLine[i]) || isNaN(signalLine[i])) {
                histogram.push(NaN);
            }
            else {
                histogram.push(macdLine[i] - signalLine[i]);
            }
        }
        return {
            macd: macdLine,
            signal: signalLine,
            histogram,
        };
    }
    // Bollinger Bands
    static bollingerBands(data, period = 20, mult = 2) {
        const middle = this.sma(data, period);
        const upper = [];
        const lower = [];
        for (let i = 0; i < data.length; i++) {
            if (isNaN(middle[i])) {
                upper.push(NaN);
                lower.push(NaN);
                continue;
            }
            let sumSq = 0;
            for (let j = 0; j < period; j++) {
                sumSq += Math.pow(data[i - j] - middle[i], 2);
            }
            const stdDev = Math.sqrt(sumSq / period);
            upper.push(middle[i] + mult * stdDev);
            lower.push(middle[i] - mult * stdDev);
        }
        return { middle, upper, lower };
    }
    // Crossover detection (series1 crosses above series2)
    static crossover(series1, series2) {
        const result = [];
        const isArray2 = Array.isArray(series2);
        for (let i = 0; i < series1.length; i++) {
            const s2_cur = isArray2 ? series2[i] : series2;
            const s2_prev = isArray2 ? series2[i - 1] : series2;
            if (i === 0 || isNaN(series1[i]) || isNaN(series1[i - 1]) || isNaN(s2_cur) || isNaN(s2_prev)) {
                result.push(false);
            }
            else {
                const crossed = series1[i] > s2_cur && series1[i - 1] <= s2_prev;
                result.push(crossed);
            }
        }
        return result;
    }
    // Crossunder detection (series1 crosses below series2)
    static crossunder(series1, series2) {
        const result = [];
        const isArray2 = Array.isArray(series2);
        for (let i = 0; i < series1.length; i++) {
            const s2_cur = isArray2 ? series2[i] : series2;
            const s2_prev = isArray2 ? series2[i - 1] : series2;
            if (i === 0 || isNaN(series1[i]) || isNaN(series1[i - 1]) || isNaN(s2_cur) || isNaN(s2_prev)) {
                result.push(false);
            }
            else {
                const crossed = series1[i] < s2_cur && series1[i - 1] >= s2_prev;
                result.push(crossed);
            }
        }
        return result;
    }
    // Highest value over period
    static highest(data, period) {
        const result = [];
        for (let i = 0; i < data.length; i++) {
            if (i < period - 1) {
                result.push(NaN);
                continue;
            }
            let maxVal = -Infinity;
            for (let j = 0; j < period; j++) {
                if (data[i - j] > maxVal)
                    maxVal = data[i - j];
            }
            result.push(maxVal);
        }
        return result;
    }
    // Lowest value over period
    static lowest(data, period) {
        const result = [];
        for (let i = 0; i < data.length; i++) {
            if (i < period - 1) {
                result.push(NaN);
                continue;
            }
            let minVal = Infinity;
            for (let j = 0; j < period; j++) {
                if (data[i - j] < minVal)
                    minVal = data[i - j];
            }
            result.push(minVal);
        }
        return result;
    }
    // Pivot High detection
    static pivothigh(source, leftBars, rightBars) {
        const result = [];
        const left = Math.max(1, Math.floor(leftBars));
        const right = Math.max(1, Math.floor(rightBars));
        for (let i = 0; i < source.length; i++) {
            const candidateIdx = i - right;
            if (candidateIdx < left || candidateIdx >= source.length) {
                result.push(NaN);
                continue;
            }
            const candidateVal = source[candidateIdx];
            if (isNaN(candidateVal) || candidateVal === null || candidateVal === undefined) {
                result.push(NaN);
                continue;
            }
            let isPivot = true;
            for (let j = 1; j <= left; j++) {
                if (source[candidateIdx - j] >= candidateVal) {
                    isPivot = false;
                    break;
                }
            }
            if (isPivot) {
                for (let j = 1; j <= right; j++) {
                    if (source[candidateIdx + j] > candidateVal) {
                        isPivot = false;
                        break;
                    }
                }
            }
            result.push(isPivot ? candidateVal : NaN);
        }
        return result;
    }
    // Pivot Low detection
    static pivotlow(source, leftBars, rightBars) {
        const result = [];
        const left = Math.max(1, Math.floor(leftBars));
        const right = Math.max(1, Math.floor(rightBars));
        for (let i = 0; i < source.length; i++) {
            const candidateIdx = i - right;
            if (candidateIdx < left || candidateIdx >= source.length) {
                result.push(NaN);
                continue;
            }
            const candidateVal = source[candidateIdx];
            if (isNaN(candidateVal) || candidateVal === null || candidateVal === undefined) {
                result.push(NaN);
                continue;
            }
            let isPivot = true;
            for (let j = 1; j <= left; j++) {
                if (source[candidateIdx - j] <= candidateVal) {
                    isPivot = false;
                    break;
                }
            }
            if (isPivot) {
                for (let j = 1; j <= right; j++) {
                    if (source[candidateIdx + j] < candidateVal) {
                        isPivot = false;
                        break;
                    }
                }
            }
            result.push(isPivot ? candidateVal : NaN);
        }
        return result;
    }
    // Fix NaN: replace NaN with previous valid value
    static fixnan(data) {
        const result = [];
        let lastValid = NaN;
        for (let i = 0; i < data.length; i++) {
            const val = data[i];
            if (!isNaN(val) && val !== null && val !== undefined) {
                lastValid = val;
            }
            result.push(lastValid);
        }
        return result;
    }
    // Change: data[i] - data[i - 1]
    static change(data) {
        const result = [];
        for (let i = 0; i < data.length; i++) {
            if (i === 0 || isNaN(data[i]) || isNaN(data[i - 1])) {
                result.push(NaN);
            }
            else {
                result.push(data[i] - data[i - 1]);
            }
        }
        return result;
    }
    // Weighted Moving Average
    static wma(data, period) {
        const result = [];
        const p = Math.max(1, Math.floor(period));
        const denom = (p * (p + 1)) / 2;
        for (let i = 0; i < data.length; i++) {
            if (i < p - 1) {
                result.push(NaN);
                continue;
            }
            let sum = 0;
            for (let j = 0; j < p; j++) {
                sum += data[i - j] * (p - j);
            }
            result.push(sum / denom);
        }
        return result;
    }
    // True Range
    static tr(high, low, close) {
        const result = [];
        for (let i = 0; i < close.length; i++) {
            if (i === 0) {
                result.push(high[i] - low[i]);
            }
            else {
                const hL = high[i] - low[i];
                const hCp = Math.abs(high[i] - close[i - 1]);
                const lCp = Math.abs(low[i] - close[i - 1]);
                result.push(Math.max(hL, hCp, lCp));
            }
        }
        return result;
    }
    // Supertrend indicator
    static supertrend(high, low, close, factor = 3, atrPeriod = 10) {
        const len = close.length;
        const atrValues = this.atr(high, low, close, atrPeriod);
        const supertrend = [];
        const direction = []; // 1 for downtrend (bearish), -1 for uptrend (bullish)
        let prevUpper = 0;
        let prevLower = 0;
        let prevDir = 1;
        for (let i = 0; i < len; i++) {
            const hl2 = (high[i] + low[i]) / 2;
            const currentAtr = isNaN(atrValues[i]) ? 0 : atrValues[i];
            let basicUpper = hl2 + factor * currentAtr;
            let basicLower = hl2 - factor * currentAtr;
            let upper = basicUpper;
            let lower = basicLower;
            if (i > 0) {
                if (basicUpper < prevUpper || close[i - 1] > prevUpper) {
                    upper = basicUpper;
                }
                else {
                    upper = prevUpper;
                }
                if (basicLower > prevLower || close[i - 1] < prevLower) {
                    lower = basicLower;
                }
                else {
                    lower = prevLower;
                }
            }
            let dir = prevDir;
            if (i === 0) {
                dir = close[i] > upper ? -1 : 1;
            }
            else {
                if (prevDir === 1 && close[i] > prevUpper) {
                    dir = -1;
                }
                else if (prevDir === -1 && close[i] < prevLower) {
                    dir = 1;
                }
                else {
                    dir = prevDir;
                }
            }
            supertrend.push(dir === -1 ? lower : upper);
            direction.push(dir);
            prevUpper = upper;
            prevLower = lower;
            prevDir = dir;
        }
        return { supertrend, direction };
    }
    // Stochastic %K
    static stoch(close, high, low, period = 14, smoothK = 3) {
        const rawK = [];
        for (let i = 0; i < close.length; i++) {
            if (i < period - 1) {
                rawK.push(NaN);
                continue;
            }
            let highestHigh = -Infinity;
            let lowestLow = Infinity;
            for (let j = 0; j < period; j++) {
                if (high[i - j] > highestHigh)
                    highestHigh = high[i - j];
                if (low[i - j] < lowestLow)
                    lowestLow = low[i - j];
            }
            const range = highestHigh - lowestLow;
            if (range === 0) {
                rawK.push(50);
            }
            else {
                rawK.push(((close[i] - lowestLow) / range) * 100);
            }
        }
        return smoothK > 1 ? this.sma(rawK, smoothK) : rawK;
    }
    // Volume Weighted Average Price (VWAP)
    static vwap(high, low, close, volume) {
        const result = [];
        let cumPv = 0;
        let cumVol = 0;
        for (let i = 0; i < close.length; i++) {
            const typicalPrice = (high[i] + low[i] + close[i]) / 3;
            const vol = isNaN(volume[i]) ? 1 : volume[i];
            cumPv += typicalPrice * vol;
            cumVol += vol;
            result.push(cumVol > 0 ? cumPv / cumVol : typicalPrice);
        }
        return result;
    }
    // Cumulative Sum
    static cum(data) {
        const result = [];
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
            const val = isNaN(data[i]) ? 0 : data[i];
            sum += val;
            result.push(sum);
        }
        return result;
    }
    // Rate of Change
    static roc(data, length = 9) {
        const result = [];
        for (let i = 0; i < data.length; i++) {
            if (i < length || isNaN(data[i]) || isNaN(data[i - length]) || data[i - length] === 0) {
                result.push(NaN);
            }
            else {
                result.push(((data[i] - data[i - length]) / data[i - length]) * 100);
            }
        }
        return result;
    }
    // Commodity Channel Index (CCI)
    static cci(high, low, close, period = 20) {
        const tp = [];
        for (let i = 0; i < close.length; i++) {
            tp.push((high[i] + low[i] + close[i]) / 3);
        }
        const smaTp = this.sma(tp, period);
        const result = [];
        for (let i = 0; i < close.length; i++) {
            if (i < period - 1 || isNaN(smaTp[i])) {
                result.push(NaN);
                continue;
            }
            let meanDev = 0;
            for (let j = 0; j < period; j++) {
                meanDev += Math.abs(tp[i - j] - smaTp[i]);
            }
            meanDev /= period;
            if (meanDev === 0) {
                result.push(0);
            }
            else {
                result.push((tp[i] - smaTp[i]) / (0.015 * meanDev));
            }
        }
        return result;
    }
}
exports.TechnicalIndicators = TechnicalIndicators;
// Math utility functions
class MathFunctions {
    static max(...values) {
        const hasArray = values.some(v => Array.isArray(v));
        if (hasArray) {
            const len = Math.max(...values.map(v => (Array.isArray(v) ? v.length : 0)));
            const result = [];
            for (let i = 0; i < len; i++) {
                const barVals = values.map(v => (Array.isArray(v) ? v[i] : v)).filter(v => typeof v === 'number' && !isNaN(v));
                result.push(barVals.length > 0 ? Math.max(...barVals) : NaN);
            }
            return result;
        }
        return Math.max(...values.filter(v => typeof v === 'number' && !isNaN(v)));
    }
    static min(...values) {
        const hasArray = values.some(v => Array.isArray(v));
        if (hasArray) {
            const len = Math.max(...values.map(v => (Array.isArray(v) ? v.length : 0)));
            const result = [];
            for (let i = 0; i < len; i++) {
                const barVals = values.map(v => (Array.isArray(v) ? v[i] : v)).filter(v => typeof v === 'number' && !isNaN(v));
                result.push(barVals.length > 0 ? Math.min(...barVals) : NaN);
            }
            return result;
        }
        return Math.min(...values.filter(v => typeof v === 'number' && !isNaN(v)));
    }
    static abs(value) {
        if (Array.isArray(value)) {
            return value.map(v => (typeof v === 'number' && !isNaN(v) ? Math.abs(v) : NaN));
        }
        return Math.abs(value);
    }
    static sqrt(value) {
        if (Array.isArray(value)) {
            return value.map(v => (typeof v === 'number' && v >= 0 ? Math.sqrt(v) : NaN));
        }
        return typeof value === 'number' && value >= 0 ? Math.sqrt(value) : NaN;
    }
    static log(value) {
        if (Array.isArray(value)) {
            return value.map(v => (typeof v === 'number' && v > 0 ? Math.log(v) : NaN));
        }
        return typeof value === 'number' && value > 0 ? Math.log(value) : NaN;
    }
    static exp(value) {
        if (Array.isArray(value)) {
            return value.map(v => (typeof v === 'number' ? Math.exp(v) : NaN));
        }
        return typeof value === 'number' ? Math.exp(value) : NaN;
    }
    static sign(value) {
        if (Array.isArray(value)) {
            return value.map(v => (typeof v === 'number' ? Math.sign(v) : NaN));
        }
        return typeof value === 'number' ? Math.sign(value) : NaN;
    }
    static avg(...values) {
        return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    }
    static sum(...values) {
        return values.reduce((a, b) => a + b, 0);
    }
    static round(value, decimals = 0) {
        const multiplier = Math.pow(10, decimals);
        return Math.round(value * multiplier) / multiplier;
    }
    static floor(value) {
        return Math.floor(value);
    }
    static ceil(value) {
        return Math.ceil(value);
    }
    static pow(base, exponent) {
        return Math.pow(base, exponent);
    }
}
exports.MathFunctions = MathFunctions;
//# sourceMappingURL=indicators.js.map