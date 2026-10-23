"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Series = void 0;
const na_1 = require("./na");
class Series {
    buffer;
    head = 0;
    _length = 0;
    maxLookback;
    constructor(maxLookback = 500) {
        this.maxLookback = maxLookback;
        this.buffer = new Array(maxLookback).fill(na_1.NA);
    }
    push(value) {
        let next = this.head + 1;
        if (next >= this.maxLookback) {
            next = 0;
        }
        this.head = next;
        this.buffer[next] = value;
        if (this._length < this.maxLookback) {
            this._length++;
        }
    }
    get(barsBack = 0) {
        if (barsBack < 0 || barsBack >= this._length) {
            return na_1.NA;
        }
        if (barsBack === 0) {
            return this.buffer[this.head];
        }
        let idx = this.head - barsBack;
        if (idx < 0) {
            idx += this.maxLookback;
            if (idx < 0) {
                idx = ((idx % this.maxLookback) + this.maxLookback) % this.maxLookback;
            }
        }
        return this.buffer[idx];
    }
    set(value) {
        this.buffer[this.head] = value;
    }
    get length() {
        return this._length;
    }
    toArray() {
        const result = [];
        for (let i = this._length - 1; i >= 0; i--) {
            result.push(this.get(i));
        }
        return result;
    }
    // Allow Series<number> to be used in arithmetic contexts
    // JavaScript calls valueOf() for +, -, *, /, comparisons, etc.
    valueOf() {
        return this.get(0);
    }
    // String coercion
    toString() {
        return String(this.get(0));
    }
}
exports.Series = Series;
//# sourceMappingURL=series.js.map