"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBuiltinVariables = createBuiltinVariables;
const series_1 = require("../types/series");
function createBuiltinVariables(bars) {
    const open = new series_1.Series(bars.length + 10);
    const high = new series_1.Series(bars.length + 10);
    const low = new series_1.Series(bars.length + 10);
    const close = new series_1.Series(bars.length + 10);
    const volume = new series_1.Series(bars.length + 10);
    const time = new series_1.Series(bars.length + 10);
    const bar_index = new series_1.Series(bars.length + 10);
    const hl2 = new series_1.Series(bars.length + 10);
    const hlc3 = new series_1.Series(bars.length + 10);
    const ohlc4 = new series_1.Series(bars.length + 10);
    for (let i = 0; i < bars.length; i++) {
        const bar = bars[i];
        open.push(bar.open);
        high.push(bar.high);
        low.push(bar.low);
        close.push(bar.close);
        volume.push(bar.volume);
        time.push(bar.time);
        bar_index.push(i);
        hl2.push((bar.high + bar.low) / 2);
        hlc3.push((bar.high + bar.low + bar.close) / 3);
        ohlc4.push((bar.open + bar.high + bar.low + bar.close) / 4);
    }
    return { open, high, low, close, volume, time, bar_index, hl2, hlc3, ohlc4 };
}
//# sourceMappingURL=variables.js.map