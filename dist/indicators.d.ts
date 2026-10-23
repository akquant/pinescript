/**
 * Technical Indicator Functions for PineScript
 * Adapted for QuantTrade Web & Bot Engine
 */
export declare class TechnicalIndicators {
    static sma(data: number[], period: number): number[];
    static ema(data: number[], period: number): number[];
    static rsi(data: number[], period?: number): number[];
    static atr(high: number[], low: number[], close: number[], period?: number): number[];
    static macd(data: number[], fastPeriod?: number, slowPeriod?: number, signalPeriod?: number): {
        macd: number[];
        signal: number[];
        histogram: number[];
    };
    static bollingerBands(data: number[], period?: number, mult?: number): {
        middle: number[];
        upper: number[];
        lower: number[];
    };
    static crossover(series1: number[], series2: number[] | number): boolean[];
    static crossunder(series1: number[], series2: number[] | number): boolean[];
    static highest(data: number[], period: number): number[];
    static lowest(data: number[], period: number): number[];
    static pivothigh(source: number[], leftBars: number, rightBars: number): number[];
    static pivotlow(source: number[], leftBars: number, rightBars: number): number[];
    static fixnan(data: number[]): number[];
    static change(data: number[]): number[];
    static wma(data: number[], period: number): number[];
    static tr(high: number[], low: number[], close: number[]): number[];
    static supertrend(high: number[], low: number[], close: number[], factor?: number, atrPeriod?: number): {
        supertrend: number[];
        direction: number[];
    };
    static stoch(close: number[], high: number[], low: number[], period?: number, smoothK?: number): number[];
    static vwap(high: number[], low: number[], close: number[], volume: number[]): number[];
    static cum(data: number[]): number[];
    static roc(data: number[], length?: number): number[];
    static cci(high: number[], low: number[], close: number[], period?: number): number[];
}
export declare class MathFunctions {
    static max(...values: any[]): any;
    static min(...values: any[]): any;
    static abs(value: any): any;
    static sqrt(value: any): any;
    static log(value: any): any;
    static exp(value: any): any;
    static sign(value: any): any;
    static avg(...values: number[]): number;
    static sum(...values: number[]): number;
    static round(value: number, decimals?: number): number;
    static floor(value: number): number;
    static ceil(value: number): number;
    static pow(base: number, exponent: number): number;
}
