import { Bar } from '../../data/types';
export interface RequestModule {
    security(symbol: string | any, timeframe: string, expression: any, gaps?: string, lookahead?: string): any;
}
export declare function createRequestModule(bars: Bar[], getCurrentBarIndex: () => number, getCurrentTimeframe: () => string): RequestModule;
