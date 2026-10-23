"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.math = void 0;
const na_1 = require("../types/na");
exports.math = {
    abs: Math.abs,
    ceil: Math.ceil,
    floor: Math.floor,
    round: (x, precision) => {
        if (precision === undefined || precision === 0)
            return Math.round(x);
        const factor = Math.pow(10, precision);
        return Math.round(x * factor) / factor;
    },
    max: (...args) => Math.max(...args),
    min: (...args) => Math.min(...args),
    pow: Math.pow,
    sqrt: Math.sqrt,
    log: Math.log,
    log10: Math.log10,
    exp: Math.exp,
    sign: Math.sign,
    /**
     * math.avg(...values) — variadic average; NA values are excluded from sum and count.
     */
    avg: (...args) => {
        let sum = 0;
        let count = 0;
        for (const v of args) {
            if (!(0, na_1.isNa)(v)) {
                sum += v;
                count++;
            }
        }
        if (count === 0)
            return na_1.NA;
        return sum / count;
    },
    /**
     * math.sum(source, length) — rolling sum of last `length` bars.
     * Any NA in the window propagates NA.
     * Also supports variadic form math.sum(a, b, c) for backward compatibility.
     */
    sum: (sourceOrFirst, lengthOrRest, ...rest) => {
        // If first arg is a Series, treat as rolling sum
        if (sourceOrFirst !== null && typeof sourceOrFirst === 'object' && typeof sourceOrFirst.get === 'function') {
            const source = sourceOrFirst;
            const length = lengthOrRest;
            if (source.length < length)
                return na_1.NA;
            let total = 0;
            for (let i = 0; i < length; i++) {
                const v = source.get(i);
                if ((0, na_1.isNa)(v))
                    return na_1.NA;
                total += v;
            }
            return total;
        }
        // Variadic numeric form: sum(a, b, c, ...)
        let total = sourceOrFirst;
        if (lengthOrRest !== undefined)
            total += lengthOrRest;
        for (const v of rest)
            total += v;
        return total;
    },
    // Trig functions
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    asin: Math.asin,
    acos: Math.acos,
    atan: Math.atan,
    // Degree / radian conversion
    todegrees: (rad) => rad * (180 / Math.PI),
    toradians: (deg) => deg * (Math.PI / 180),
    // Random
    random: () => Math.random(),
    // Round to minimum tick (default mintick = 0.01)
    round_to_mintick: (x) => Math.round(x * 100) / 100,
    // Constants
    pi: Math.PI,
    e: Math.E,
    phi: (1 + Math.sqrt(5)) / 2,
    rphi: 2 / (1 + Math.sqrt(5)), // 1/phi = 0.618...
};
//# sourceMappingURL=math.js.map