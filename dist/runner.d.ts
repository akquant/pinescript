/**
 * PineScriptRunner Facade Adapter
 * Provides 100% backward compatibility with QuantTrade Bot & Client
 * Powered by Pine Script v6 Compiler & Bar-by-Bar Runtime Engine
 */
import { ScriptMetadata } from './compiler/index';
import { ExecutionResult } from './runtime/index';
export interface CandleData {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    time: number;
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
    data: Array<{
        time: number;
        value: number;
    }>;
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
export declare class PineScriptRunner {
    /**
     * Clears the compilation cache.
     */
    static clearCache(): void;
    /**
     * Validates script syntax without running it against candles.
     */
    static validate(code: string): PineScriptValidation;
    /**
     * Compiles and executes script against historical candle bars.
     */
    static run(code: string, candles: CandleData[], inputs?: Record<string, any>): PineScriptRunResult;
}
