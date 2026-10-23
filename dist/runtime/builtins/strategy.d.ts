export interface ClosedTrade {
    id: string;
    direction: 'long' | 'short';
    entryPrice: number;
    exitPrice: number;
    qty: number;
    profit: number;
    entryBar: number;
    exitBar: number;
    entryTime: number;
    exitTime: number;
}
export interface StrategySignalItem {
    type: 'BUY' | 'SELL' | 'CLOSE';
    price: number;
    timestamp: number;
    reason: string;
}
export interface StrategyResult {
    trades: ClosedTrade[];
    equityCurve: {
        time: number;
        equity: number;
    }[];
    netProfit: number;
    totalTrades: number;
    winRate: number;
    profitFactor: number;
    maxDrawdown: number;
    signals?: StrategySignalItem[];
}
export interface StrategyEngine {
    entry(id: string, direction: string, qty?: number, limit?: number, stop?: number): void;
    close(id?: string, qty?: number): void;
    exit(id: string, fromEntry?: string, profit?: number, loss?: number, limit?: number, stop?: number): void;
    order(id: string, direction: string, qty: number, limit?: number, stop?: number): void;
    cancel(id: string): void;
    cancelAll(): void;
    position_size: number;
    position_avg_price: number;
    equity: number;
    closedtrades: number;
    opentrades: number;
    netprofit: number;
    grossprofit: number;
    grossloss: number;
    long: string;
    short: string;
    processBar(barIndex: number, open: number, high: number, low: number, close: number, time: number): void;
    getResult(): StrategyResult;
}
export declare function createStrategyEngine(initialCapital?: number): StrategyEngine;
