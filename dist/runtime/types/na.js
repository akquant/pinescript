"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NA = void 0;
exports.isNa = isNa;
exports.nz = nz;
exports.fixnan = fixnan;
exports.naAdd = naAdd;
exports.naSub = naSub;
exports.naMul = naMul;
exports.naDiv = naDiv;
exports.NA = NaN;
function isNa(val) {
    return (val === null ||
        val === undefined ||
        (typeof val === 'number' && isNaN(val)) ||
        (typeof val === 'symbol'));
}
function nz(val, replacement = 0) {
    if (isNa(val))
        return replacement;
    return val;
}
let _lastNonNa = NaN;
function fixnan(val) {
    if (!isNa(val)) {
        _lastNonNa = val;
        return val;
    }
    return _lastNonNa;
}
function naAdd(a, b) {
    if (isNa(a) || isNa(b))
        return exports.NA;
    return a + b;
}
function naSub(a, b) {
    if (isNa(a) || isNa(b))
        return exports.NA;
    return a - b;
}
function naMul(a, b) {
    if (isNa(a) || isNa(b))
        return exports.NA;
    return a * b;
}
function naDiv(a, b) {
    if (isNa(a) || isNa(b))
        return exports.NA;
    const divisor = b;
    if (divisor === 0)
        return exports.NA;
    return a / divisor;
}
//# sourceMappingURL=na.js.map