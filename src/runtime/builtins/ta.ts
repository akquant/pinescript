import { Series } from '../types/series';
import { NA, isNa, NaType } from '../types/na';

function calcEmaInternal(
  current: number,
  prev: number | typeof NA,
  length: number
): number {
  const k = 2 / (length + 1);
  if (isNa(prev)) return current;
  return current * k + (prev as number) * (1 - k);
}

export interface TaModule {
  sma(source: Series<number> | number, length: number, id?: string): number;
  ema(source: Series<number> | number, length: number, id?: string): number;
  rsi(source: Series<number> | number, length: number, id?: string): number;
  macd(
    source: Series<number> | number,
    fast: number,
    slow: number,
    signal: number,
    id?: string
  ): [number, number, number];
  bb(
    source: Series<number> | number,
    length: number,
    mult: number,
    id?: string
  ): [number, number, number];
  atr(
    length: number,
    high: Series<number>,
    low: Series<number>,
    close: Series<number>,
    id?: string
  ): number;
  cross(a: Series<number> | number, b: Series<number> | number, id?: string): boolean;
  crossover(a: Series<number> | number, b: Series<number> | number, id?: string): boolean;
  crossunder(a: Series<number> | number, b: Series<number> | number, id?: string): boolean;
  change(source: Series<number> | number, length?: number, id?: string): number;
  highest(sourceOrLength: Series<number> | number, length?: number): number;
  lowest(sourceOrLength: Series<number> | number, length?: number): number;

  // New TA functions
  stoch(source: Series<number>, high: Series<number>, low: Series<number>, length: number): number;
  wma(source: Series<number> | number, length: number, id?: string): number;
  vwma(source: Series<number>, volume: Series<number>, length: number, id?: string): number;
  rma(source: Series<number> | number, length: number, id?: string): number;
  swma(source: Series<number>, id?: string): number;
  alma(source: Series<number> | number, length: number, offset: number, sigma: number, id?: string): number;
  stdev(source: Series<number> | number, length: number, id?: string): number;
  variance(source: Series<number> | number, length: number, id?: string): number;
  cum(source: Series<number>, id?: string): number;
  valuewhen(condition: boolean, source: Series<number>, occurrence: number, id?: string): number;
  barssince(condition: boolean, id?: string): number;
  highestbars(source: Series<number> | number, length: number, id?: string): number;
  lowestbars(source: Series<number> | number, length: number, id?: string): number;
  mom(source: Series<number> | number, length: number, id?: string): number;
  cci(source: Series<number> | number, length: number, id?: string): number;
  dmi(diLength: number, adxSmoothing: number, high: Series<number>, low: Series<number>, close: Series<number>, id?: string): [number, number, number];
  tr(handleNa?: boolean, high?: Series<number>, low?: Series<number>, close?: Series<number>): number;
  pivothigh(source: Series<number>, leftBars: number, rightBars: number): number;
  pivotlow(source: Series<number>, leftBars: number, rightBars: number): number;
  falling(source: Series<number>, length: number): boolean;
  rising(source: Series<number>, length: number): boolean;
  percentrank(source: Series<number> | number, length: number, id?: string): number;
  correlation(source1: Series<number>, source2: Series<number>, length: number): number;
  dev(source: Series<number> | number, length: number, id?: string): number;
  mfi(series: Series<number>, length: number, high?: Series<number>, low?: Series<number>, close?: Series<number>, volume?: Series<number>, id?: string): number;
  obv(close?: Series<number>, volume?: Series<number>, id?: string): number;
  supertrend(factor: number, atrPeriod: number, high?: Series<number>, low?: Series<number>, close?: Series<number>, id?: string): [number, number];

  // P1 additions
  hma(source: Series<number> | number, length: number, id?: string): number;
  kc(source: Series<number> | number, length: number, mult: number, useTrueRange?: boolean, id?: string): [number, number, number];
  donchian(length: number, high?: Series<number>, low?: Series<number>): [number, number, number];
  linreg(source: Series<number> | number, length: number, offset?: number, id?: string): number;
  median(source: Series<number> | number, length: number, id?: string): number;
  vwap(source?: Series<number> | number, anchor?: any): number;
}

export function createTaModule(
  getCurrentBarIndex: () => number,
  getHigh?: () => Series<number>,
  getLow?: () => Series<number>,
  getClose?: () => Series<number>,
  getVolume?: () => Series<number>
): TaModule {
  // State cache keyed by call-site ID (isolated per TaModule instance)
  const emaState = new Map<string, { prev: number | typeof NA; prevBarIndex: number }>();
  const rsiState = new Map<string, { avgGain: number; avgLoss: number; prevVal: number | typeof NA; initialized: boolean; count: number }>();
  const macdState = new Map<string, {
    fastEma: number | typeof NA;
    slowEma: number | typeof NA;
    signalEma: number | typeof NA;
    prevBarIndex: number;
  }>();
  const bbState = new Map<string, { prevBarIndex: number }>();
  const rmaState = new Map<string, { prev: number | typeof NA; prevBarIndex: number; count: number }>();
  const cumState = new Map<string, { sum: number; prevBarIndex: number }>();
  const valuewhenState = new Map<string, { values: { value: number }[] }>();
  const barsSinceState = new Map<string, { lastTrueBar: number }>();
  const dmiState = new Map<string, {
    prevHigh: number | typeof NA;
    prevLow: number | typeof NA;
    prevClose: number | typeof NA;
    smoothedPlusDM: number | typeof NA;
    smoothedMinusDM: number | typeof NA;
    smoothedTR: number | typeof NA;
    adx: number | typeof NA;
    prevBarIndex: number;
    count: number;
  }>();
  const obvState = new Map<string, { prevClose: number | typeof NA; obv: number; prevBarIndex: number }>();
  const supertrendState = new Map<string, {
    prevSupertrend: number;
    prevDirection: number;
    prevClose: number;
    prevBarIndex: number;
  }>();
  const crossoverState = new Map<string, number>();
  const crossunderState = new Map<string, number>();
  const hmaState = new Map<string, {
    deltaBuf: number[];
    capacity: number;
    prevBarIndex: number;
  }>();
  const vwapState = new Map<string, { cumPv: number; cumVol: number; prevBarIndex: number }>();

  const autoBufferMap = new Map<string, { buf: number[]; prevBar: number }>();

  const crossHistory = new Map<string, { a: number; b: number }>();
  const crossunderHistory = new Map<string, { a: number; b: number }>();

  let lastBarIndex = -1;
  const callCounters = new Map<string, number>();

  function resolveId(fnName: string, id?: string): string {
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

  function getOrPushBuffer(id: string, val: number, barIdx: number, capacity: number): number[] {
    let entry = autoBufferMap.get(id);
    if (!entry || entry.prevBar > barIdx) {
      entry = { buf: [], prevBar: -1 };
      autoBufferMap.set(id, entry);
    }
    if (entry.prevBar !== barIdx) {
      entry.buf.unshift(val);
      if (entry.buf.length > capacity + 10) entry.buf.pop();
      entry.prevBar = barIdx;
    }
    return entry.buf;
  }

  function asSeries(source: Series<number> | number, length: number, fnName: string, id?: string): { get: (i: number) => number; length: number } {
    if (source && typeof (source as any).get === 'function') {
      return source as Series<number>;
    }
    const callId = resolveId(fnName, id);
    const val = Number(source);
    const barIdx = getCurrentBarIndex();
    const buf = getOrPushBuffer(callId, isNaN(val) ? NaN : val, barIdx, Math.max(length * 3, 50));
    return {
      get: (i: number) => (i < buf.length ? buf[i] : (NA as unknown as number)),
      length: buf.length,
    };
  }

  function calcSma(source: Series<number> | number, length: number, barIdx?: number, id: string = 'default_sma'): number {
    if (typeof source === 'number' || (source && typeof (source as any).get !== 'function')) {
      const val = Number(source);
      if (isNaN(val)) return NA as unknown as number;
      const buf = getOrPushBuffer(id, val, barIdx ?? 0, length);
      if (buf.length < length) return NA as unknown as number;
      let sum = 0;
      for (let i = 0; i < length; i++) {
        if (isNaN(buf[i])) return NA as unknown as number;
        sum += buf[i];
      }
      return sum / length;
    }
    if (!source || source.length < length) return NA as unknown as number;
    let sum = 0;
    for (let i = 0; i < length; i++) {
      const v = source.get(i);
      if (isNa(v)) return NA as unknown as number;
      sum += v as number;
    }
    return sum / length;
  }

  return {
    sma(source: Series<number> | number, length: number, id: string = 'default_sma'): number {
      const callId = resolveId('sma', id);
      return calcSma(source, length, getCurrentBarIndex(), callId);
    },

    ema(source: Series<number> | number, length: number, id: string = 'default_ema'): number {
      const current = (typeof source === 'number' || (source && typeof (source as any).get !== 'function'))
        ? Number(source)
        : source.get(0);
      if (isNa(current) || isNaN(current)) return NA as unknown as number;

      const callId = resolveId('ema', id);
      const state = emaState.get(callId);
      const barIndex = getCurrentBarIndex();

      if (!state || state.prevBarIndex !== barIndex - 1) {
        // First bar or discontinuity -- seed with current value
        const seedVal = current as number;
        emaState.set(callId, { prev: seedVal, prevBarIndex: barIndex });
        return seedVal;
      }

      const newVal = calcEmaInternal(current as number, state.prev, length);
      emaState.set(callId, { prev: newVal, prevBarIndex: barIndex });
      return newVal;
    },

    rsi(source: Series<number> | number, length: number, id: string = 'default_rsi'): number {
      const src = asSeries(source, length, 'rsi', id);
      const current = src.get(0);
      if (isNa(current)) return NA as unknown as number;

      const callId = resolveId('rsi', id);
      let state = rsiState.get(callId);
      if (!state) {
        state = { avgGain: 0, avgLoss: 0, prevVal: NA, initialized: false, count: 0 };
        rsiState.set(callId, state);
      }

      if (isNa(state.prevVal)) {
        state.prevVal = current;
        return NA as unknown as number;
      }

      const diff = (current as number) - (state.prevVal as number);
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
        } else {
          return NA as unknown as number;
        }
      } else {
        // Wilder's smoothing
        state.avgGain = (state.avgGain * (length - 1) + gain) / length;
        state.avgLoss = (state.avgLoss * (length - 1) + loss) / length;
      }

      if (state.avgLoss === 0) return 100;
      const rs = state.avgGain / state.avgLoss;
      return 100 - 100 / (1 + rs);
    },

    macd(
      source: Series<number>,
      fast: number,
      slow: number,
      signal: number,
      id: string = 'default_macd'
    ): [number, number, number] {
      const current = source.get(0);
      if (isNa(current)) return [NA as unknown as number, NA as unknown as number, NA as unknown as number];

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
          signalEma: NA,
          prevBarIndex: barIndex,
        };
        macdState.set(callId, state);
        return [NA as unknown as number, NA as unknown as number, NA as unknown as number];
      }

      const fastEma = isNa(state.fastEma)
        ? (current as number)
        : (current as number) * k_fast + (state.fastEma as number) * (1 - k_fast);
      const slowEma = isNa(state.slowEma)
        ? (current as number)
        : (current as number) * k_slow + (state.slowEma as number) * (1 - k_slow);
      const macdLine = fastEma - slowEma;
      const signalEma = isNa(state.signalEma)
        ? macdLine
        : macdLine * k_sig + (state.signalEma as number) * (1 - k_sig);
      const histogram = macdLine - signalEma;

      state.fastEma = fastEma;
      state.slowEma = slowEma;
      state.signalEma = signalEma;
      state.prevBarIndex = barIndex;
      macdState.set(callId, state);

      return [macdLine, signalEma, histogram];
    },

    bb(
      source: Series<number> | number,
      length: number,
      mult: number,
      _id: string = 'default_bb'
    ): [number, number, number] {
      const callId = resolveId('bb', _id);
      const src = asSeries(source, length, 'bb', _id);
      const middle = calcSma(src as any, length, getCurrentBarIndex(), callId);
      if (isNa(middle)) return [NA as unknown as number, NA as unknown as number, NA as unknown as number];

      let variance = 0;
      for (let i = 0; i < length; i++) {
        const v = src.get(i);
        if (isNa(v)) return [NA as unknown as number, NA as unknown as number, NA as unknown as number];
        const diff = (v as number) - (middle as number);
        variance += diff * diff;
      }
      const stddev = Math.sqrt(variance / length);
      const upper = (middle as number) + mult * stddev;
      const lower = (middle as number) - mult * stddev;
      return [middle as number, upper, lower];
    },

    atr(
      length: number,
      high: Series<number>,
      low: Series<number>,
      close: Series<number>,
      id: string = 'default_atr'
    ): number {
      if (high.length < 2) return NA as unknown as number;

      // True range for current bar
      const h = high.get(0);
      const l = low.get(0);
      const pc = close.get(1);
      if (isNa(h) || isNa(l) || isNa(pc)) return NA as unknown as number;

      // Use RMA (Wilder's MA) = EMA with length, seeded with first true range
      const callId = resolveId('atr', id);
      const trKey = callId + '_tr';
      let prevAtr = emaState.get(trKey);
      const barIndex = getCurrentBarIndex();

      const tr = Math.max(
        (h as number) - (l as number),
        Math.abs((h as number) - (pc as number)),
        Math.abs((l as number) - (pc as number))
      );

      if (!prevAtr || prevAtr.prevBarIndex !== barIndex - 1) {
        emaState.set(trKey, { prev: tr, prevBarIndex: barIndex });
        return tr;
      }

      // Wilder's smoothing: rma = (prev*(length-1) + tr) / length
      const rmaVal = ((prevAtr.prev as number) * (length - 1) + tr) / length;
      emaState.set(trKey, { prev: rmaVal, prevBarIndex: barIndex });
      return rmaVal;
    },

    cross(a: Series<number> | number, b: Series<number> | number, id?: string): boolean {
      const isSeries = (v: any): v is Series<number> =>
        v !== null && typeof v === 'object' && typeof v.get === 'function';

      const callId = resolveId('cross', id);
      const prevRecord = crossHistory.get(callId);

      const a0: number | typeof NA = isSeries(a) ? a.get(0) : (typeof a === 'number' ? a : NA);
      const a1: number | typeof NA = isSeries(a) ? a.get(1) : (prevRecord !== undefined ? prevRecord.a : NA);

      const b0: number | typeof NA = isSeries(b) ? b.get(0) : (typeof b === 'number' ? b : NA);
      const b1: number | typeof NA = isSeries(b) ? b.get(1) : (prevRecord !== undefined ? prevRecord.b : NA);

      crossHistory.set(callId, { a: a0 as number, b: b0 as number });

      if (isNa(a0) || isNa(a1) || isNa(b0) || isNa(b1)) return false;
      const over = (a0 as number) > (b0 as number) && (a1 as number) <= (b1 as number);
      const under = (a0 as number) < (b0 as number) && (a1 as number) >= (b1 as number);
      return over || under;
    },

    crossover(a: Series<number> | number, b: Series<number> | number, id?: string): boolean {
      const isSeries = (v: any): v is Series<number> =>
        v !== null && typeof v === 'object' && typeof v.get === 'function';

      const callId = resolveId('crossover', id);
      const prevRecord = crossHistory.get(callId);

      const a0: number | typeof NA = isSeries(a) ? a.get(0) : (typeof a === 'number' ? a : NA);
      const a1: number | typeof NA = isSeries(a) ? a.get(1) : (prevRecord !== undefined ? prevRecord.a : NA);

      const b0: number | typeof NA = isSeries(b) ? b.get(0) : (typeof b === 'number' ? b : NA);
      const b1: number | typeof NA = isSeries(b) ? b.get(1) : (prevRecord !== undefined ? prevRecord.b : NA);

      crossHistory.set(callId, { a: a0 as number, b: b0 as number });

      if (isNa(a0) || isNa(a1) || isNa(b0) || isNa(b1)) return false;
      return (a0 as number) > (b0 as number) && (a1 as number) <= (b1 as number);
    },

    crossunder(a: Series<number> | number, b: Series<number> | number, id?: string): boolean {
      const isSeries = (v: any): v is Series<number> =>
        v !== null && typeof v === 'object' && typeof v.get === 'function';

      const callId = resolveId('crossunder', id);
      const prevRecord = crossunderHistory.get(callId);

      const a0: number | typeof NA = isSeries(a) ? a.get(0) : (typeof a === 'number' ? a : NA);
      const a1: number | typeof NA = isSeries(a) ? a.get(1) : (prevRecord !== undefined ? prevRecord.a : NA);

      const b0: number | typeof NA = isSeries(b) ? b.get(0) : (typeof b === 'number' ? b : NA);
      const b1: number | typeof NA = isSeries(b) ? b.get(1) : (prevRecord !== undefined ? prevRecord.b : NA);

      crossunderHistory.set(callId, { a: a0 as number, b: b0 as number });

      if (isNa(a0) || isNa(a1) || isNa(b0) || isNa(b1)) return false;
      return (a0 as number) < (b0 as number) && (a1 as number) >= (b1 as number);
    },

    change(source: Series<number> | number, length: number = 1, _id?: string): number {
      const src = asSeries(source, length + 1, 'change', _id);
      const current = src.get(0);
      const prev = src.get(length);
      if (isNa(current) || isNa(prev)) return NA as unknown as number;
      return (current as number) - (prev as number);
    },

    highest(sourceOrLength: Series<number> | number, lengthArg?: number): number {
      let source: Series<number>;
      let length: number;
      if (typeof sourceOrLength === 'number' && lengthArg === undefined) {
        source = getHigh ? getHigh() : (sourceOrLength as any);
        length = sourceOrLength;
      } else {
        source = sourceOrLength as Series<number>;
        length = lengthArg ?? 1;
      }
      if (!source || typeof source.get !== 'function' || source.length < length) return NA as unknown as number;
      let max = -Infinity;
      for (let i = 0; i < length; i++) {
        const v = source.get(i);
        if (isNa(v)) return NA as unknown as number;
        if ((v as number) > max) max = v as number;
      }
      return max;
    },

    lowest(sourceOrLength: Series<number> | number, lengthArg?: number): number {
      let source: Series<number>;
      let length: number;
      if (typeof sourceOrLength === 'number' && lengthArg === undefined) {
        source = getLow ? getLow() : (sourceOrLength as any);
        length = sourceOrLength;
      } else {
        source = sourceOrLength as Series<number>;
        length = lengthArg ?? 1;
      }
      if (!source || typeof source.get !== 'function' || source.length < length) return NA as unknown as number;
      let min = Infinity;
      for (let i = 0; i < length; i++) {
        const v = source.get(i);
        if (isNa(v)) return NA as unknown as number;
        if ((v as number) < min) min = v as number;
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
    stoch(source: Series<number>, high: Series<number>, low: Series<number>, length: number): number {
      const src = source.get(0);
      if (isNa(src)) return NA as unknown as number;
      if (high.length < length || low.length < length) return NA as unknown as number;

      let hh = -Infinity;
      let ll = Infinity;
      for (let i = 0; i < length; i++) {
        const h = high.get(i);
        const l = low.get(i);
        if (isNa(h) || isNa(l)) return NA as unknown as number;
        if ((h as number) > hh) hh = h as number;
        if ((l as number) < ll) ll = l as number;
      }

      const range = hh - ll;
      if (range === 0) return 0;
      return 100 * ((src as number) - ll) / range;
    },

    /**
     * ta.wma(source, length)
     * Weighted Moving Average: sum(source[i] * (length - i)) / sum(weights)
     * Weight for bar i (0=current) = (length - i)
     */
    wma(source: Series<number> | number, length: number, id?: string): number {
      const src = asSeries(source, length, 'wma', id);
      if (src.length < length) return NA as unknown as number;
      let weightedSum = 0;
      let weightSum = 0;
      for (let i = 0; i < length; i++) {
        const v = src.get(i);
        if (isNa(v)) return NA as unknown as number;
        const weight = length - i;
        weightedSum += (v as number) * weight;
        weightSum += weight;
      }
      return weightedSum / weightSum;
    },

    /**
     * ta.vwma(source, volume, length)
     * Volume Weighted Moving Average: sma(source * volume, length) / sma(volume, length)
     */
    vwma(source: Series<number>, volume: Series<number>, length: number, _id?: string): number {
      if (source.length < length || volume.length < length) return NA as unknown as number;
      let svSum = 0;
      let vSum = 0;
      for (let i = 0; i < length; i++) {
        const s = source.get(i);
        const v = volume.get(i);
        if (isNa(s) || isNa(v)) return NA as unknown as number;
        svSum += (s as number) * (v as number);
        vSum += v as number;
      }
      if (vSum === 0) return NA as unknown as number;
      return svSum / vSum;
    },

    /**
     * ta.rma(source, length)
     * Running Moving Average (Wilder's smoothing)
     * rma = (prev * (length - 1) + source) / length
     * First value is seeded with SMA of first `length` values.
     */
    rma(source: Series<number> | number, length: number, id: string = 'default_rma'): number {
      const src = asSeries(source, length, 'rma', id);
      const current = src.get(0);
      if (isNa(current)) return NA as unknown as number;

      const callId = resolveId('rma', id);
      const barIndex = getCurrentBarIndex();
      let state = rmaState.get(callId);

      if (!state) {
        state = { prev: NA, prevBarIndex: -1, count: 0 };
        rmaState.set(callId, state);
      }

      if (isNa(state.prev) || state.prevBarIndex !== barIndex - 1) {
        // Seed: use current value as starting point
        state.prev = current as number;
        state.prevBarIndex = barIndex;
        state.count = 1;
        return current as number;
      }

      state.count++;
      const rmaVal = ((state.prev as number) * (length - 1) + (current as number)) / length;
      state.prev = rmaVal;
      state.prevBarIndex = barIndex;
      return rmaVal;
    },

    /**
     * ta.swma(source)
     * Symmetrically Weighted Moving Average (fixed 4-bar)
     * swma = source[3]*1/6 + source[2]*2/6 + source[1]*2/6 + source[0]*1/6
     */
    swma(source: Series<number>, _id?: string): number {
      if (source.length < 4) return NA as unknown as number;
      const v0 = source.get(0);
      const v1 = source.get(1);
      const v2 = source.get(2);
      const v3 = source.get(3);
      if (isNa(v0) || isNa(v1) || isNa(v2) || isNa(v3)) return NA as unknown as number;
      return ((v3 as number) * 1 + (v2 as number) * 2 + (v1 as number) * 2 + (v0 as number) * 1) / 6;
    },

    /**
     * ta.alma(source, length, offset, sigma)
     * Arnaud Legoux Moving Average
     * Uses a Gaussian window centered at offset * (length - 1) from the beginning.
     * weight[i] = exp(-((i - m)^2) / (2 * s^2))
     * where m = offset * (length - 1), s = length / sigma
     */
    alma(source: Series<number> | number, length: number, offset: number, sigma: number, _id?: string): number {
      const src = asSeries(source, length, 'alma', _id);
      if (src.length < length) return NA as unknown as number;

      const m = offset * (length - 1);
      const s = length / sigma;

      let weightSum = 0;
      let normSum = 0;

      for (let i = 0; i < length; i++) {
        // In Pine Script, i=0 is the oldest bar in the window, so we map:
        // Pine's window index i -> our series lookback = (length - 1 - i)
        const lookback = length - 1 - i;
        const v = src.get(lookback);
        if (isNa(v)) return NA as unknown as number;

        const w = Math.exp(-((i - m) * (i - m)) / (2 * s * s));
        weightSum += w * (v as number);
        normSum += w;
      }

      if (normSum === 0) return NA as unknown as number;
      return weightSum / normSum;
    },

    /**
     * ta.stdev(source, length)
     * Population standard deviation over `length` bars.
     * stdev = sqrt(variance) where variance uses population formula (divides by length, not length-1).
     * Pine Script v6: ta.stdev uses population stdev (biased).
     */
    stdev(source: Series<number> | number, length: number, _id?: string): number {
      const src = asSeries(source, length, 'stdev', _id);
      if (src.length < length) return NA as unknown as number;

      let sum = 0;
      for (let i = 0; i < length; i++) {
        const v = src.get(i);
        if (isNa(v)) return NA as unknown as number;
        sum += v as number;
      }
      const mean = sum / length;

      let sqDiffSum = 0;
      for (let i = 0; i < length; i++) {
        const diff = (src.get(i) as number) - mean;
        sqDiffSum += diff * diff;
      }
      return Math.sqrt(sqDiffSum / length);
    },

    /**
     * ta.variance(source, length)
     * Population variance over `length` bars.
     */
    variance(source: Series<number> | number, length: number, _id?: string): number {
      const src = asSeries(source, length, 'variance', _id);
      if (src.length < length) return NA as unknown as number;

      let sum = 0;
      for (let i = 0; i < length; i++) {
        const v = src.get(i);
        if (isNa(v)) return NA as unknown as number;
        sum += v as number;
      }
      const mean = sum / length;

      let sqDiffSum = 0;
      for (let i = 0; i < length; i++) {
        const diff = (src.get(i) as number) - mean;
        sqDiffSum += diff * diff;
      }
      return sqDiffSum / length;
    },

    /**
     * ta.cum(source)
     * Cumulative (running) sum of source values across all bars.
     */
    cum(source: Series<number>, id: string = 'default_cum'): number {
      const current = source.get(0);
      if (isNa(current)) return NA as unknown as number;

      const callId = resolveId('cum', id);
      const barIndex = getCurrentBarIndex();
      let state = cumState.get(callId);

      if (!state || state.prevBarIndex !== barIndex - 1) {
        // First bar or discontinuity
        cumState.set(callId, { sum: current as number, prevBarIndex: barIndex });
        return current as number;
      }

      const newSum = state.sum + (current as number);
      cumState.set(callId, { sum: newSum, prevBarIndex: barIndex });
      return newSum;
    },

    /**
     * ta.valuewhen(condition, source, occurrence)
     * Returns the value of `source` at the `occurrence`-th most recent bar where `condition` was true.
     * occurrence = 0 means the most recent true bar.
     */
    valuewhen(condition: boolean, source: Series<number>, occurrence: number, id: string = 'default_valuewhen'): number {
      const callId = resolveId('valuewhen', id);
      let state = valuewhenState.get(callId);
      if (!state) {
        state = { values: [] };
        valuewhenState.set(callId, state);
      }

      if (condition) {
        const v = source.get(0);
        if (!isNa(v)) {
          state.values.unshift({ value: v as number });
        }
      }

      if (occurrence >= 0 && occurrence < state.values.length) {
        return state.values[occurrence].value;
      }
      return NA as unknown as number;
    },

    /**
     * ta.barssince(condition)
     * Returns the number of bars since `condition` was last true.
     * Returns NA if condition has never been true.
     */
    barssince(condition: boolean, id: string = 'default_barssince'): number {
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

      if (state.lastTrueBar < 0) return NA as unknown as number;
      return barIndex - state.lastTrueBar;
    },

    /**
     * ta.highestbars(source, length)
     * Returns the offset (as a negative number or zero) to the bar with the highest value over the last `length` bars.
     * 0 means current bar, -1 means 1 bar ago, etc.
     */
    highestbars(source: Series<number> | number, length: number, _id?: string): number {
      const src = asSeries(source, length, 'highestbars', _id);
      if (src.length < length) return NA as unknown as number;
      let maxVal = -Infinity;
      let maxIdx = 0;
      for (let i = 0; i < length; i++) {
        const v = src.get(i);
        if (isNa(v)) return NA as unknown as number;
        if ((v as number) > maxVal) {
          maxVal = v as number;
          maxIdx = i;
        }
      }
      return -maxIdx;
    },

    /**
     * ta.lowestbars(source, length)
     * Returns the offset (as a negative number or zero) to the bar with the lowest value over the last `length` bars.
     */
    lowestbars(source: Series<number> | number, length: number, _id?: string): number {
      const src = asSeries(source, length, 'lowestbars', _id);
      if (src.length < length) return NA as unknown as number;
      let minVal = Infinity;
      let minIdx = 0;
      for (let i = 0; i < length; i++) {
        const v = src.get(i);
        if (isNa(v)) return NA as unknown as number;
        if ((v as number) < minVal) {
          minVal = v as number;
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
    mom(source: Series<number> | number, length: number, _id?: string): number {
      const src = asSeries(source, length + 1, 'mom', _id);
      const current = src.get(0);
      const prev = src.get(length);
      if (isNa(current) || isNa(prev)) return NA as unknown as number;
      return (current as number) - (prev as number);
    },

    /**
     * ta.cci(source, length)
     * Commodity Channel Index
     * CCI = (source - sma(source, length)) / (0.015 * dev(source, length))
     * where dev is the mean absolute deviation.
     */
    cci(source: Series<number> | number, length: number, _id?: string): number {
      const src = asSeries(source, length, 'cci', _id);
      if (src.length < length) return NA as unknown as number;

      // Calculate SMA
      let sum = 0;
      for (let i = 0; i < length; i++) {
        const v = src.get(i);
        if (isNa(v)) return NA as unknown as number;
        sum += v as number;
      }
      const mean = sum / length;

      // Mean absolute deviation
      let madSum = 0;
      for (let i = 0; i < length; i++) {
        madSum += Math.abs((src.get(i) as number) - mean);
      }
      const mad = madSum / length;

      const current = src.get(0);
      if (isNa(current)) return NA as unknown as number;
      if (mad === 0) return 0;

      return ((current as number) - mean) / (0.015 * mad);
    },

    /**
     * ta.dmi(diLength, adxSmoothing, high, low, close)
     * Directional Movement Index
     * Returns [plusDI, minusDI, adx]
     *
     * Uses Wilder's smoothing (RMA) for the directional indicators and ADX.
     */
    dmi(
      diLength: number,
      adxSmoothing: number,
      high: Series<number>,
      low: Series<number>,
      close: Series<number>,
      id: string = 'default_dmi'
    ): [number, number, number] {
      const naResult: [number, number, number] = [NA as unknown as number, NA as unknown as number, NA as unknown as number];

      const curHigh = high.get(0);
      const curLow = low.get(0);
      const curClose = close.get(0);
      if (isNa(curHigh) || isNa(curLow) || isNa(curClose)) return naResult;

      const callId = resolveId('dmi', id);
      let state = dmiState.get(callId);
      const barIndex = getCurrentBarIndex();

      if (!state || state.prevBarIndex !== barIndex - 1) {
        state = {
          prevHigh: curHigh,
          prevLow: curLow,
          prevClose: curClose,
          smoothedPlusDM: NA,
          smoothedMinusDM: NA,
          smoothedTR: NA,
          adx: NA,
          prevBarIndex: barIndex,
          count: 0,
        };
        dmiState.set(callId, state);
        return naResult;
      }

      const prevHigh = state.prevHigh as number;
      const prevLow = state.prevLow as number;

      // True Range
      const trueRange = Math.max(
        (curHigh as number) - (curLow as number),
        Math.abs((curHigh as number) - (state.prevClose as number)),
        Math.abs((curLow as number) - (state.prevClose as number))
      );

      // Directional Movement
      const upMove = (curHigh as number) - prevHigh;
      const downMove = prevLow - (curLow as number);
      const plusDM = (upMove > downMove && upMove > 0) ? upMove : 0;
      const minusDM = (downMove > upMove && downMove > 0) ? downMove : 0;

      state.count++;

      // Wilder's smoothing (RMA)
      if (isNa(state.smoothedTR)) {
        state.smoothedTR = trueRange;
        state.smoothedPlusDM = plusDM;
        state.smoothedMinusDM = minusDM;
      } else {
        state.smoothedTR = ((state.smoothedTR as number) * (diLength - 1) + trueRange) / diLength;
        state.smoothedPlusDM = ((state.smoothedPlusDM as number) * (diLength - 1) + plusDM) / diLength;
        state.smoothedMinusDM = ((state.smoothedMinusDM as number) * (diLength - 1) + minusDM) / diLength;
      }

      // DI+ and DI-
      const smoothedTR = state.smoothedTR as number;
      let plusDI = 0;
      let minusDI = 0;
      if (smoothedTR !== 0) {
        plusDI = 100 * (state.smoothedPlusDM as number) / smoothedTR;
        minusDI = 100 * (state.smoothedMinusDM as number) / smoothedTR;
      }

      // DX
      const diSum = plusDI + minusDI;
      const dx = diSum === 0 ? 0 : 100 * Math.abs(plusDI - minusDI) / diSum;

      // ADX (RMA of DX)
      if (isNa(state.adx)) {
        state.adx = dx;
      } else {
        state.adx = ((state.adx as number) * (adxSmoothing - 1) + dx) / adxSmoothing;
      }

      state.prevHigh = curHigh;
      state.prevLow = curLow;
      state.prevClose = curClose;
      state.prevBarIndex = barIndex;

      return [plusDI, minusDI, state.adx as number];
    },

    /**
     * ta.tr(handleNa)
     * True Range.
     * tr = max(high - low, abs(high - close[1]), abs(low - close[1]))
     * If handleNa is true, when close[1] is na, tr = high - low.
     */
    tr(handleNa: boolean = false, high?: Series<number>, low?: Series<number>, close?: Series<number>): number {
      const h = high ? high : getHigh ? getHigh() : undefined;
      const l = low ? low : getLow ? getLow() : undefined;
      const c = close ? close : getClose ? getClose() : undefined;

      if (!h || !l || !c) return NA as unknown as number;

      const curHigh = h.get(0);
      const curLow = l.get(0);
      const prevClose = c.get(1);

      if (isNa(curHigh) || isNa(curLow)) return NA as unknown as number;

      if (isNa(prevClose)) {
        if (handleNa) {
          return (curHigh as number) - (curLow as number);
        }
        return NA as unknown as number;
      }

      return Math.max(
        (curHigh as number) - (curLow as number),
        Math.abs((curHigh as number) - (prevClose as number)),
        Math.abs((curLow as number) - (prevClose as number))
      );
    },

    /**
     * ta.pivothigh(source, leftBars, rightBars)
     * Detects pivot highs. Returns the pivot value if source[rightBars] is higher than
     * all bars within leftBars before it and rightBars after it.
     * Returns NA if no pivot detected at the rightBars lookback point.
     */
    pivothigh(source: Series<number>, leftBars: number, rightBars: number): number {
      const totalBars = leftBars + rightBars + 1;
      if (source.length < totalBars) return NA as unknown as number;

      // The pivot candidate is at source[rightBars] (rightBars bars ago)
      const pivotVal = source.get(rightBars);
      if (isNa(pivotVal)) return NA as unknown as number;

      // Check right side: bars 0 to rightBars-1 must be <= pivotVal
      for (let i = 0; i < rightBars; i++) {
        const v = source.get(i);
        if (isNa(v)) return NA as unknown as number;
        if ((v as number) > (pivotVal as number)) return NA as unknown as number;
      }

      // Check left side: bars rightBars+1 to rightBars+leftBars must be <= pivotVal
      for (let i = rightBars + 1; i <= rightBars + leftBars; i++) {
        const v = source.get(i);
        if (isNa(v)) return NA as unknown as number;
        if ((v as number) > (pivotVal as number)) return NA as unknown as number;
      }

      return pivotVal as number;
    },

    /**
     * ta.pivotlow(source, leftBars, rightBars)
     * Detects pivot lows. Returns the pivot value if source[rightBars] is lower than
     * all bars within leftBars before it and rightBars after it.
     */
    pivotlow(source: Series<number>, leftBars: number, rightBars: number): number {
      const totalBars = leftBars + rightBars + 1;
      if (source.length < totalBars) return NA as unknown as number;

      const pivotVal = source.get(rightBars);
      if (isNa(pivotVal)) return NA as unknown as number;

      // Check right side: bars 0 to rightBars-1 must be >= pivotVal
      for (let i = 0; i < rightBars; i++) {
        const v = source.get(i);
        if (isNa(v)) return NA as unknown as number;
        if ((v as number) < (pivotVal as number)) return NA as unknown as number;
      }

      // Check left side: bars rightBars+1 to rightBars+leftBars must be >= pivotVal
      for (let i = rightBars + 1; i <= rightBars + leftBars; i++) {
        const v = source.get(i);
        if (isNa(v)) return NA as unknown as number;
        if ((v as number) < (pivotVal as number)) return NA as unknown as number;
      }

      return pivotVal as number;
    },

    /**
     * ta.falling(source, length)
     * Returns true if source has been falling (strictly decreasing) for `length` consecutive bars.
     */
    falling(source: Series<number>, length: number): boolean {
      if (source.length < length + 1) return false;
      for (let i = 0; i < length; i++) {
        const current = source.get(i);
        const prev = source.get(i + 1);
        if (isNa(current) || isNa(prev)) return false;
        if ((current as number) >= (prev as number)) return false;
      }
      return true;
    },

    /**
     * ta.rising(source, length)
     * Returns true if source has been rising (strictly increasing) for `length` consecutive bars.
     */
    rising(source: Series<number>, length: number): boolean {
      if (source.length < length + 1) return false;
      for (let i = 0; i < length; i++) {
        const current = source.get(i);
        const prev = source.get(i + 1);
        if (isNa(current) || isNa(prev)) return false;
        if ((current as number) <= (prev as number)) return false;
      }
      return true;
    },

    /**
     * ta.percentrank(source, length)
     * Percent rank: percentage of past `length` values that are less than or equal to the current value.
     */
    percentrank(source: Series<number> | number, length: number, _id?: string): number {
      const src = asSeries(source, length + 1, 'percentrank', _id);
      if (src.length < length + 1) return NA as unknown as number;
      const current = src.get(0);
      if (isNa(current)) return NA as unknown as number;

      let count = 0;
      for (let i = 1; i <= length; i++) {
        const v = src.get(i);
        if (isNa(v)) return NA as unknown as number;
        if ((v as number) <= (current as number)) count++;
      }
      return (count / length) * 100;
    },

    /**
     * ta.correlation(source1, source2, length)
     * Pearson correlation coefficient between source1 and source2 over `length` bars.
     */
    correlation(source1: Series<number>, source2: Series<number>, length: number): number {
      if (source1.length < length || source2.length < length) return NA as unknown as number;

      let sum1 = 0, sum2 = 0;
      for (let i = 0; i < length; i++) {
        const v1 = source1.get(i);
        const v2 = source2.get(i);
        if (isNa(v1) || isNa(v2)) return NA as unknown as number;
        sum1 += v1 as number;
        sum2 += v2 as number;
      }
      const mean1 = sum1 / length;
      const mean2 = sum2 / length;

      let cov = 0, var1 = 0, var2 = 0;
      for (let i = 0; i < length; i++) {
        const d1 = (source1.get(i) as number) - mean1;
        const d2 = (source2.get(i) as number) - mean2;
        cov += d1 * d2;
        var1 += d1 * d1;
        var2 += d2 * d2;
      }

      const denom = Math.sqrt(var1 * var2);
      if (denom === 0) return 0;
      return cov / denom;
    },

    /**
     * ta.dev(source, length)
     * Mean absolute deviation of source over `length` bars.
     * dev = avg(abs(source[i] - sma(source, length))) for i in 0..length-1
     */
    dev(source: Series<number> | number, length: number, _id?: string): number {
      const src = asSeries(source, length, 'dev', _id);
      if (src.length < length) return NA as unknown as number;

      let sum = 0;
      for (let i = 0; i < length; i++) {
        const v = src.get(i);
        if (isNa(v)) return NA as unknown as number;
        sum += v as number;
      }
      const mean = sum / length;

      let madSum = 0;
      for (let i = 0; i < length; i++) {
        madSum += Math.abs((src.get(i) as number) - mean);
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
    mfi(
      series: Series<number>,
      length: number,
      high?: Series<number>,
      low?: Series<number>,
      close?: Series<number>,
      volume?: Series<number>,
      _id?: string
    ): number {
      // Get volume from parameter or closure
      const vol = volume ? volume : getVolume ? getVolume() : undefined;
      if (!vol) return NA as unknown as number;

      // We need length+1 bars to compare current typical price with previous
      if (series.length < length + 1 || vol.length < length) return NA as unknown as number;

      let posFlow = 0;
      let negFlow = 0;

      for (let i = 0; i < length; i++) {
        const tp = series.get(i);
        const prevTp = series.get(i + 1);
        const v = vol.get(i);
        if (isNa(tp) || isNa(prevTp) || isNa(v)) return NA as unknown as number;

        const rawMf = (tp as number) * (v as number);
        if ((tp as number) > (prevTp as number)) {
          posFlow += rawMf;
        } else if ((tp as number) < (prevTp as number)) {
          negFlow += rawMf;
        }
        // If equal, money flow is not counted for either side
      }

      if (negFlow === 0) return 100;
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
    obv(close?: Series<number>, volume?: Series<number>, id: string = 'default_obv'): number {
      const c = close ? close : getClose ? getClose() : undefined;
      const v = volume ? volume : getVolume ? getVolume() : undefined;

      if (!c || !v) return NA as unknown as number;

      const curClose = c.get(0);
      const curVol = v.get(0);
      if (isNa(curClose) || isNa(curVol)) return NA as unknown as number;

      const callId = resolveId('obv', id);
      const barIndex = getCurrentBarIndex();
      let state = obvState.get(callId);

      if (!state || state.prevBarIndex !== barIndex - 1) {
        state = { prevClose: curClose, obv: 0, prevBarIndex: barIndex };
        obvState.set(callId, state);
        return 0;
      }

      const prevClose = state.prevClose as number;
      let obvVal = state.obv;

      if ((curClose as number) > prevClose) {
        obvVal += curVol as number;
      } else if ((curClose as number) < prevClose) {
        obvVal -= curVol as number;
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
    supertrend(
      factor: number,
      atrPeriod: number,
      high?: Series<number>,
      low?: Series<number>,
      close?: Series<number>,
      id: string = 'default_supertrend'
    ): [number, number] {
      const naResult: [number, number] = [NA as unknown as number, NA as unknown as number];

      const h = high ? high : getHigh ? getHigh() : undefined;
      const l = low ? low : getLow ? getLow() : undefined;
      const c = close ? close : getClose ? getClose() : undefined;

      if (!h || !l || !c) return naResult;
      if (h.length < 2) return naResult;

      const curHigh = h.get(0);
      const curLow = l.get(0);
      const curClose = c.get(0);
      const prevClose = c.get(1);

      if (isNa(curHigh) || isNa(curLow) || isNa(curClose) || isNa(prevClose)) return naResult;

      // Calculate ATR using internal RMA-based ATR
      const callId = resolveId('supertrend', id);
      const atrId = callId + '_atr';
      const atrVal = this.atr(atrPeriod, h, l, c, atrId);
      if (isNa(atrVal)) return naResult;

      const hl2 = ((curHigh as number) + (curLow as number)) / 2;
      let upperBand = hl2 + factor * (atrVal as number);
      let lowerBand = hl2 - factor * (atrVal as number);

      const barIndex = getCurrentBarIndex();
      let state = supertrendState.get(callId);

      if (!state || state.prevBarIndex !== barIndex - 1) {
        // First bar: default to downtrend (direction = 1)
        state = {
          prevSupertrend: upperBand,
          prevDirection: 1,
          prevClose: curClose as number,
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
      } else {
        // Downtrend: supertrend = upperBand
        if (upperBand > prevST) {
          upperBand = prevST;
        }
      }

      let direction: number;
      let supertrend: number;

      if (prevDir === -1) {
        // Was uptrend
        if ((curClose as number) < lowerBand) {
          // Flip to downtrend
          direction = 1;
          supertrend = upperBand;
        } else {
          direction = -1;
          supertrend = lowerBand;
        }
      } else {
        // Was downtrend
        if ((curClose as number) > upperBand) {
          // Flip to uptrend
          direction = -1;
          supertrend = lowerBand;
        } else {
          direction = 1;
          supertrend = upperBand;
        }
      }

      state.prevSupertrend = supertrend;
      state.prevDirection = direction;
      state.prevClose = curClose as number;
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
    hma(source: Series<number> | number, length: number, id: string = 'default_hma'): number {
      const src = asSeries(source, length, 'hma', id);
      if (src.length < length) return NA as unknown as number;

      const halfLen = Math.floor(length / 2);
      const sqrtLen = Math.floor(Math.sqrt(length));

      // Compute wma1 (half-length) and wma2 (full-length) inline
      let ws1 = 0, wn1 = 0, ws2 = 0, wn2 = 0;
      for (let i = 0; i < length; i++) {
        const v = src.get(i);
        if (isNa(v)) return NA as unknown as number;
        const w2 = length - i;
        ws2 += (v as number) * w2;
        wn2 += w2;
        if (i < halfLen) {
          const w1 = halfLen - i;
          ws1 += (v as number) * w1;
          wn1 += w1;
        }
      }
      if (wn1 === 0 || wn2 === 0) return NA as unknown as number;
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
      if (state.deltaBuf.length > sqrtLen) state.deltaBuf.length = sqrtLen;
      state.prevBarIndex = barIndex;

      if (state.deltaBuf.length < sqrtLen) return NA as unknown as number;

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
    kc(
      source: Series<number> | number,
      length: number,
      mult: number,
      useTrueRange: boolean = true,
      id: string = 'default_kc'
    ): [number, number, number] {
      const NA3: [number, number, number] = [NA as unknown as number, NA as unknown as number, NA as unknown as number];

      const h = getHigh ? getHigh() : undefined;
      const l = getLow ? getLow() : undefined;
      const c = getClose ? getClose() : undefined;
      if (!h || !l || !c) return NA3;

      const callId = resolveId('kc', id);

      // basis EMA
      const basisId = callId + '_basis';
      const basis = this.ema(source, length, basisId);
      if (isNa(basis)) return NA3;

      let rangeVal: number;
      if (useTrueRange) {
        rangeVal = this.atr(length, h, l, c, callId + '_atr');
      } else {
        // EMA of (high - low) using stateful EMA
        const curHigh = h.get(0);
        const curLow = l.get(0);
        if (isNa(curHigh) || isNa(curLow)) return NA3;
        const curr = (curHigh as number) - (curLow as number);
        const rangeId = callId + '_range';
        const barIndex = getCurrentBarIndex();
        const rangeState = emaState.get(rangeId);
        if (!rangeState || rangeState.prevBarIndex !== barIndex - 1) {
          emaState.set(rangeId, { prev: curr, prevBarIndex: barIndex });
          rangeVal = curr;
        } else {
          const k = 2 / (length + 1);
          rangeVal = curr * k + (rangeState.prev as number) * (1 - k);
          emaState.set(rangeId, { prev: rangeVal, prevBarIndex: barIndex });
        }
      }
      if (isNa(rangeVal)) return NA3;

      const upper = (basis as number) + mult * rangeVal;
      const lower = (basis as number) - mult * rangeVal;
      return [upper, basis as number, lower];
    },

    /**
     * ta.donchian(length)
     * Donchian Channels. Returns [upper, basis, lower].
     * upper = highest(high, length), lower = lowest(low, length), basis = (upper+lower)/2
     */
    donchian(
      length: number,
      high?: Series<number>,
      low?: Series<number>
    ): [number, number, number] {
      const NA3: [number, number, number] = [NA as unknown as number, NA as unknown as number, NA as unknown as number];
      const h = high ? high : (getHigh ? getHigh() : undefined);
      const l = low ? low : (getLow ? getLow() : undefined);
      if (!h || !l) return NA3;

      const upper = this.highest(h, length);
      const lower = this.lowest(l, length);
      if (isNa(upper) || isNa(lower)) return NA3;

      const basis = ((upper as number) + (lower as number)) / 2;
      return [upper as number, basis, lower as number];
    },

    /**
     * ta.linreg(source, length, offset)
     * Least-squares linear regression value.
     * Returns the fitted value at `offset` bars back from most recent.
     */
    linreg(source: Series<number> | number, length: number, offset: number = 0, id?: string): number {
      const src = asSeries(source, length + Math.max(0, offset), 'linreg', id);
      if (src.length < length + offset) return NA as unknown as number;

      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
      for (let i = 0; i < length; i++) {
        const x = i; // 0 = oldest in window
        const v = src.get(length - 1 - i + offset); // oldest first
        if (isNa(v)) return NA as unknown as number;
        sumX += x;
        sumY += v as number;
        sumXY += x * (v as number);
        sumX2 += x * x;
      }

      const denom = length * sumX2 - sumX * sumX;
      if (denom === 0) return sumY / length;

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
    median(source: Series<number> | number, length: number, _id?: string): number {
      const src = asSeries(source, length, 'median', _id);
      if (src.length < length) return NA as unknown as number;

      const vals: number[] = [];
      for (let i = 0; i < length; i++) {
        const v = src.get(i);
        if (isNa(v)) return NA as unknown as number;
        vals.push(v as number);
      }

      vals.sort((a, b) => a - b);
      const mid = Math.floor(length / 2);
      // Pine uses lower middle for even-length
      return length % 2 === 1 ? vals[mid] : vals[mid - 1];
    },

    vwap(source?: Series<number> | number, _anchor?: any): number {
      const barIdx = getCurrentBarIndex();
      const volSeries = getVolume ? getVolume() : undefined;
      const volVal = volSeries ? (volSeries.get(0) as number) : 1;
      const srcVal = source instanceof Series ? (source.get(0) as number) : (source !== undefined ? Number(source) : (getClose ? (getClose().get(0) as number) : 0));

      const state = vwapState.get('global') ?? { cumPv: 0, cumVol: 0, prevBarIndex: -1 };
      if (barIdx === 0 || state.prevBarIndex > barIdx) {
        state.cumPv = 0;
        state.cumVol = 0;
      }
      if (state.prevBarIndex !== barIdx) {
        const v = isNa(volVal) || isNaN(volVal) || volVal <= 0 ? 1 : volVal;
        const p = isNa(srcVal) || isNaN(srcVal) ? 0 : srcVal;
        state.cumPv += p * v;
        state.cumVol += v;
        state.prevBarIndex = barIdx;
        vwapState.set('global', state);
      }
      return state.cumVol > 0 ? state.cumPv / state.cumVol : srcVal;
    },
  };
}
