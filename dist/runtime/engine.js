"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEngine = createEngine;
const ta_1 = require("./builtins/ta");
const context_1 = require("./context");
const request_1 = require("./builtins/request");
const fnCache = new Map();
const FN_CACHE_LIMIT = 50;
function getCompiledFunction(compiledCode) {
    let fn = fnCache.get(compiledCode);
    if (!fn) {
        if (fnCache.size >= FN_CACHE_LIMIT) {
            const firstKey = fnCache.keys().next().value;
            if (firstKey !== undefined)
                fnCache.delete(firstKey);
        }
        const trimmed = compiledCode.trim();
        if (trimmed.startsWith('(function')) {
            const wrappedCode = `return (${compiledCode})(__rt);`;
            fn = new Function('__rt', wrappedCode);
        }
        else {
            fn = new Function('__rt', compiledCode);
        }
        fnCache.set(compiledCode, fn);
    }
    return fn;
}
function createEngine(bars, initialInputs) {
    return {
        execute(compiledCode) {
            // Create builtins for bar-by-bar execution using ring buffer slicing
            const windowedBuiltins = createWindowedBuiltins(bars);
            let currentBarIdx = 0;
            const ta = (0, ta_1.createTaModule)(() => currentBarIdx, () => windowedBuiltins.high, () => windowedBuiltins.low, () => windowedBuiltins.close, () => windowedBuiltins.volume);
            const lastBarTime = bars.length > 0 ? bars[bars.length - 1].time : 0;
            const executionTimenow = Date.now();
            // Create context using windowed builtins for bar-by-bar execution
            const windowedContext = (0, context_1.createContext)(windowedBuiltins, ta, bars.length, lastBarTime, executionTimenow, initialInputs);
            const winCtx = windowedContext.ctx;
            // Wire request.security with full bars data
            const requestModule = (0, request_1.createRequestModule)(bars, () => currentBarIdx, () => 'D' // default timeframe
            );
            winCtx.request = requestModule;
            // Evaluate compiled code on windowed context using cached executable function
            try {
                const fn = getCompiledFunction(compiledCode);
                fn(winCtx);
            }
            catch (e) {
                throw new Error(`Failed to evaluate compiled code: ${e instanceof Error ? e.message : String(e)}`);
            }
            // Call init on windowed context (initializes var/varip state)
            if (windowedContext.initFn) {
                try {
                    windowedContext.initFn();
                }
                catch (e) {
                    throw new Error(`Windowed init function error: ${e instanceof Error ? e.message : String(e)}`);
                }
            }
            // Run bar-by-bar
            const lastIndex = bars.length - 1;
            for (let i = 0; i < bars.length; i++) {
                currentBarIdx = i;
                windowedContext.updateBar(i, windowedBuiltins, lastIndex);
                // Update windowed series to point at bar i
                updateWindowedBuiltins(windowedBuiltins, bars, i);
                // Process strategy orders at the start of each bar
                const bar = bars[i];
                windowedContext.strategyEngine.processBar(i, bar.open, bar.high, bar.low, bar.close, bar.time);
                if (windowedContext.executeFn) {
                    try {
                        windowedContext.executeFn();
                    }
                    catch (e) {
                        // Re-throw runtime.error() calls; log other per-bar errors
                        if (e instanceof Error && e.isRuntimeError) {
                            throw e;
                        }
                        if (i === bars.length - 1 || i === 0) {
                            console.error(`[Bar ${i} Error]`, e);
                        }
                    }
                }
            }
            const defaultMeta = {
                type: 'indicator',
                title: 'Unnamed Script',
                shorttitle: '',
                overlay: false,
                inputs: [],
                plots: [],
            };
            const meta = windowedContext.metadata ?? defaultMeta;
            // Convert plots map to array
            const plotsArray = Array.from(windowedContext.plots.values());
            // Get strategy results if this is a strategy script
            let strategyResult;
            if (meta.type === 'strategy') {
                strategyResult = windowedContext.strategyEngine.getResult();
            }
            // Collect drawing objects from runtime context
            const lines = winCtx.line?.all ?? [];
            const labels = winCtx.label?.all ?? [];
            const boxes = winCtx.box?.all ?? [];
            const tables = winCtx.table?.all ?? [];
            return {
                metadata: meta,
                plots: plotsArray,
                hlines: windowedContext.hlines,
                fills: windowedContext.fills,
                bgcolors: windowedContext.bgcolors,
                barcolors: windowedContext.barcolors,
                plotshapes: Array.from(windowedContext.plotshapes.values()),
                plotchars: Array.from(windowedContext.plotchars.values()),
                plotarrows: Array.from(windowedContext.plotarrows.values()),
                plotcandles: Array.from(windowedContext.plotcandles.values()),
                plotbars: Array.from(windowedContext.plotbars.values()),
                strategy: strategyResult,
                lines,
                labels,
                boxes,
                tables,
            };
        },
    };
}
// Windowed builtins use a Series with only 1 bar slot replaced each iteration
const series_1 = require("./types/series");
function createWindowedBuiltins(bars) {
    const size = Math.max(bars.length + 10, 510);
    return {
        open: new series_1.Series(size),
        high: new series_1.Series(size),
        low: new series_1.Series(size),
        close: new series_1.Series(size),
        volume: new series_1.Series(size),
        time: new series_1.Series(size),
        bar_index: new series_1.Series(size),
        hl2: new series_1.Series(size),
        hlc3: new series_1.Series(size),
        ohlc4: new series_1.Series(size),
    };
}
function updateWindowedBuiltins(wb, bars, i) {
    const bar = bars[i];
    wb.open.push(bar.open);
    wb.high.push(bar.high);
    wb.low.push(bar.low);
    wb.close.push(bar.close);
    wb.volume.push(bar.volume);
    wb.time.push(bar.time);
    wb.bar_index.push(i);
    wb.hl2.push((bar.high + bar.low) / 2);
    wb.hlc3.push((bar.high + bar.low + bar.close) / 3);
    wb.ohlc4.push((bar.open + bar.high + bar.low + bar.close) / 4);
}
//# sourceMappingURL=engine.js.map