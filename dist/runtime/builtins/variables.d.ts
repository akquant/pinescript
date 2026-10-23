import { Bar } from '../../data/types';
import { Series } from '../types/series';
export interface BuiltinVariables {
    open: Series<number>;
    high: Series<number>;
    low: Series<number>;
    close: Series<number>;
    volume: Series<number>;
    time: Series<number>;
    bar_index: Series<number>;
    hl2: Series<number>;
    hlc3: Series<number>;
    ohlc4: Series<number>;
}
export declare function createBuiltinVariables(bars: Bar[]): BuiltinVariables;
