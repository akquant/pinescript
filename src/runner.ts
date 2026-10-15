/**
 * PineScriptRunner Facade Adapter
 * Provides 100% backward compatibility with QuantTrade Bot & Client
 * Powered by Pine Script v6 Compiler & Bar-by-Bar Runtime Engine
 */

import { compile, ScriptMetadata } from './compiler/index';
import { createRuntime, ExecutionResult } from './runtime/index';
import { Bar } from './data/types';

export interface CandleData {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  time: number; // seconds or milliseconds
}

export interface PineScriptValidation {
  valid: boolean;
  errors: string[];
}

export interface PlotData {
  id: string;
  title: string;
  color: string;
  linewidth?: number;
  style?: string;
  display?: string;
  data: Array<{ time: number; value: number }>;
}

export interface StrategySignal {
  type: 'BUY' | 'SELL' | 'CLOSE';
  price: number;
  timestamp: number;
  reason: string;
}

export interface StrategyPerformanceMetrics {
  netProfit: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  totalTrades: number;
  closedTrades: any[];
}

export interface PineScriptRunResult {
  success: boolean;
  strategyName?: string;
  overlay?: boolean;
  plots: PlotData[];
  signals: StrategySignal[];
  errors: string[];
  executionResult?: ExecutionResult;
  metadata?: ScriptMetadata;
  strategyMetrics?: StrategyPerformanceMetrics;
  lines?: any[];
  labels?: any[];
  boxes?: any[];
  tables?: any[];
  fills?: any[];
}

const COMPILE_CACHE_LIMIT = 50;
const compileCache = new Map<string, ReturnType<typeof compile>>();

function getCompiledScript(code: string) {
  let cached = compileCache.get(code);
  if (!cached) {
    if (compileCache.size >= COMPILE_CACHE_LIMIT) {
      const firstKey = compileCache.keys().next().value;
      if (firstKey !== undefined) compileCache.delete(firstKey);
    }
    cached = compile(code);
    compileCache.set(code, cached);
  }
  return cached;
}

export class PineScriptRunner {
  /**
   * Clears the compilation cache.
   */
  static clearCache(): void {
    compileCache.clear();
  }

  /**
   * Validates script syntax without running it against candles.
   */
  static validate(code: string): PineScriptValidation {
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
    } catch (err: any) {
      return {
        valid: false,
        errors: [err.message || String(err)],
      };
    }
  }

  /**
   * Compiles and executes script against historical candle bars.
   */
  static run(code: string, candles: CandleData[], inputs?: Record<string, any>): PineScriptRunResult {
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
      const bars: Bar[] = candles.map((c) => ({
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
      const exec = createRuntime(comp.code, bars, inputs);

      // 4. Map plots
      const plots: PlotData[] = exec.plots.map((p) => {
        let color = p.color;
        if (!color || color === 'na') color = '#2962FF';
        return {
          id: String(p.index),
          title: p.title || `Plot ${p.index}`,
          color,
          linewidth: p.linewidth,
          style: p.style,
          display: p.display,
          data: p.values
            .filter((v) => v.value !== null && !isNaN(v.value))
            .map((v) => ({ time: v.time, value: v.value! })),
        };
      });

      // 5. Extract signals
      const signals: StrategySignal[] = [];

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
        const barMap = new Map<number, Bar>();
        for (let bIdx = 0; bIdx < bars.length; bIdx++) {
          barMap.set(bars[bIdx].time, bars[bIdx]);
        }

        for (const shape of exec.plotshapes) {
          const combined = `${shape.title || ''} ${shape.style || ''} ${shape.location || ''}`.toLowerCase();
          for (const val of shape.values) {
            if (val.value !== null && val.value !== 0 && !isNaN(val.value)) {
              const textStr = val.text || '';
              const fullText = `${textStr} ${combined}`.toLowerCase();
              const isBuy =
                fullText.includes('buy') ||
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
      const seenSignalKeys = new Set<string>();
      const dedupedSignals: StrategySignal[] = [];
      for (const sig of signals) {
        const key = `${sig.timestamp}_${sig.type}`;
        if (!seenSignalKeys.has(key)) {
          seenSignalKeys.add(key);
          dedupedSignals.push(sig);
        }
      }

      // 6. Strategy Performance Metrics
      const strategyMetrics: StrategyPerformanceMetrics | undefined = exec.strategy
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
    } catch (err: any) {
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
