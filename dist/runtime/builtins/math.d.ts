import { NA } from '../types/na';
import { Series } from '../types/series';
export declare const math: {
    abs: (x: number) => number;
    ceil: (x: number) => number;
    floor: (x: number) => number;
    round: (x: number, precision?: number) => number;
    max: (...args: number[]) => number;
    min: (...args: number[]) => number;
    pow: (x: number, y: number) => number;
    sqrt: (x: number) => number;
    log: (x: number) => number;
    log10: (x: number) => number;
    exp: (x: number) => number;
    sign: (x: number) => number;
    /**
     * math.avg(...values) — variadic average; NA values are excluded from sum and count.
     */
    avg: (...args: (number | typeof NA)[]) => number;
    /**
     * math.sum(source, length) — rolling sum of last `length` bars.
     * Any NA in the window propagates NA.
     * Also supports variadic form math.sum(a, b, c) for backward compatibility.
     */
    sum: (sourceOrFirst: Series<number> | number, lengthOrRest?: number, ...rest: number[]) => number;
    sin: (x: number) => number;
    cos: (x: number) => number;
    tan: (x: number) => number;
    asin: (x: number) => number;
    acos: (x: number) => number;
    atan: (x: number) => number;
    todegrees: (rad: number) => number;
    toradians: (deg: number) => number;
    random: () => number;
    round_to_mintick: (x: number) => number;
    pi: number;
    e: number;
    phi: number;
    rphi: number;
};
