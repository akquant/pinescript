"use strict";
/**
 * PineScriptRunner Facade Adapter
 * Provides 100% backward compatibility with QuantTrade Bot & Client
 * Powered by Pine Script v6 Compiler & Bar-by-Bar Runtime Engine
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PineScriptRunner = void 0;
const index_1 = require("./compiler/index");
const index_2 = require("./runtime/index");
const COMPILE_CACHE_LIMIT = 50;
const compileCache = new Map();
function getCompiledScript(code) {
    let cached = compileCache.get(code);
    if (!cached) {
        if (compileCache.size >= COMPILE_CACHE_LIMIT) {
            const firstKey = compileCache.keys().next().value;
            if (firstKey !== undefined)
                compileCache.delete(firstKey);
        }
        cached = (0, index_1.compile)(code);
        compileCache.set(code, cached);
    }
    return cached;
}
class PineScriptRunner {
    /**
     * Clears the compilation cache.
     */
    static clearCache() {
        compileCache.clear();
    }
    /**
     * Validates script syntax without running it against candles.
     */
    static validate(code) {
        if (!code || !code.trim()) {
            return { valid: false, errors: ['Script code cannot be empty'] };
        }
        try {
            const result = getCompiledScript(code);
            if (result.success) {
                return { valid: true, errors: [] };
            }
            return {
                valid: false,
                errors: result.diagnostics.map((d) => `[Line ${d.loc?.line ?? 1}] ${d.message}`),
            };
        }
        catch (err) {
            return {
                valid: false,
                errors: [err.message || String(err)],
            };
        }
    }
    /**
     * Compiles and executes script against historical candle bars.
     */
    static run(code, candles, inputs) {
        if (!candles || candles.length === 0) {
            return {
                success: false,
                strategyName: 'Empty',
                plots: [],
                signals: [],
                errors: ['Không có dữ liệu nến để tính toán'],
            };
        }
        try {
            // 1. Normalize candles to Bar[]
            const bars = candles.map((c) => ({
                time: c.time > 1e11 ? Math.floor(c.time / 1000) : c.time,
                open: Number(c.open),
                high: Number(c.high),
                low: Number(c.low),
                close: Number(c.close),
                volume: Number(c.volume ?? 0),
            }));
            // 2. Compile Pine Script to JavaScript executable (cached)
            const comp = getCompiledScript(code);
            if (!comp.success || !comp.code) {
                return {
                    success: false,
                    strategyName: 'Error',
                    plots: [],
                    signals: [],
                    errors: comp.diagnostics.map((d) => `[Line ${d.loc?.line ?? 1}] ${d.message}`),
                };
            }
            // 3. Execute with Bar-by-Bar Runtime Engine
            const exec = (0, index_2.createRuntime)(comp.code, bars, inputs);
            // 4. Map plots
            const plots = exec.plots.map((p) => {
                let color = p.color;
                if (!color || color === 'na')
                    color = '#2962FF';
                return {
                    id: String(p.index),
                    title: p.title || `Plot ${p.index}`,
                    color,
                    linewidth: p.linewidth,
                    style: p.style,
                    display: p.display,
                    data: p.values
                        .filter((v) => v.value !== null && !isNaN(v.value))
                        .map((v) => ({ time: v.time, value: v.value })),
                };
            });
            // 5. Extract signals
            const signals = [];
            // 5a. Strategy signals (from strategy.entry / strategy.close / strategy.exit)
            if (exec.strategy?.signals && exec.strategy.signals.length > 0) {
                for (const sig of exec.strategy.signals) {
                    signals.push({
                        type: sig.type,
                        price: sig.price,
                        timestamp: sig.timestamp,
                        reason: sig.reason,
                    });
                }
            }
            // 5b. Indicator signals (only if no strategy signals exist, to prevent duplicating plotshapes as trade orders)
            if (signals.length === 0 && exec.plotshapes && exec.plotshapes.length > 0) {
                // Fast O(1) time-to-bar lookup
                const barMap = new Map();
                for (let bIdx = 0; bIdx < bars.length; bIdx++) {
                    barMap.set(bars[bIdx].time, bars[bIdx]);
                }
                for (const shape of exec.plotshapes) {
                    const combined = `${shape.title || ''} ${shape.style || ''} ${shape.location || ''}`.toLowerCase();
                    for (const val of shape.values) {
                        if (val.value !== null && val.value !== 0 && !isNaN(val.value)) {
                            const textStr = val.text || '';
                            const fullText = `${textStr} ${combined}`.toLowerCase();
                            const isBuy = fullText.includes('buy') ||
                                fullText.includes('bull') ||
                                fullText.includes('long') ||
                                fullText.includes('labelup') ||
                                fullText.includes('triangleup') ||
                                fullText.includes('belowbar') ||
                                textStr === 'B';
                            const bar = barMap.get(val.time);
                            signals.push({
                                type: isBuy ? 'BUY' : 'SELL',
                                price: bar ? bar.close : 0,
                                timestamp: val.time,
                                reason: textStr || shape.title || (isBuy ? 'BUY' : 'SELL'),
                            });
                        }
                    }
                }
            }
            // Deduplicate signals: at most 1 signal of same action per bar timestamp
            const seenSignalKeys = new Set();
            const dedupedSignals = [];
            for (const sig of signals) {
                const key = `${sig.timestamp}_${sig.type}`;
                if (!seenSignalKeys.has(key)) {
                    seenSignalKeys.add(key);
                    dedupedSignals.push(sig);
                }
            }
            // 6. Strategy Performance Metrics
            const strategyMetrics = exec.strategy
                ? {
                    netProfit: exec.strategy.netProfit,
                    winRate: exec.strategy.winRate,
                    profitFactor: exec.strategy.profitFactor,
                    maxDrawdown: exec.strategy.maxDrawdown,
                    totalTrades: exec.strategy.totalTrades,
                    closedTrades: exec.strategy.trades,
                }
                : undefined;
            const strategyName = exec.metadata?.title || comp.metadata?.title || 'Pine Strategy';
            return {
                success: true,
                strategyName,
                plots,
                signals: dedupedSignals,
                errors: [],
                executionResult: exec,
                metadata: exec.metadata,
                strategyMetrics,
                lines: exec.lines,
                labels: exec.labels,
                boxes: exec.boxes,
                tables: exec.tables,
                fills: exec.fills,
            };
        }
        catch (err) {
            return {
                success: false,
                strategyName: 'Error',
                plots: [],
                signals: [],
                errors: [err.message || String(err)],
            };
        }
    }
}
exports.PineScriptRunner = PineScriptRunner;
//# sourceMappingURL=runner.js.map