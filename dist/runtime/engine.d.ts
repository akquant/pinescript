import { Bar } from '../data/types';
import { ExecutionResult } from './index';
export interface Engine {
    execute(compiledCode: string): ExecutionResult;
}
export declare function createEngine(bars: Bar[], initialInputs?: Record<string, any>): Engine;
