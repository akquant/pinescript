/**
 * PineScript Compiler - Compiles AST to executable code with Plot and Signal extraction
 * Adapted for QuantTrade Web & Bot Engine
 */
import * as AST from './ast';
export interface PlotData {
    id: string;
    title: string;
    color: string;
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
export interface ExecutionContext {
    open: number[];
    high: number[];
    low: number[];
    close: number[];
    volume: number[];
    timestamp: number[];
}
export interface ExecutionResult {
    plots: PlotData[];
    signals: StrategySignal[];
    overlay?: boolean;
    lines?: any[];
    labels?: any[];
    boxes?: any[];
    tables?: any[];
}
export interface CompiledStrategy {
    name: string;
    parameters: Record<string, any>;
    execute: (context: ExecutionContext) => ExecutionResult;
}
export declare class Compiler {
    private variables;
    private functions;
    constructor();
    compile(ast: AST.Program): CompiledStrategy;
    private evaluateNode;
    private evaluateTupleAssignment;
    private evaluateFunctionDeclaration;
    private evaluateSwitchExpression;
    private evaluateConditional;
    private evaluateIndex;
    private hasIdentifier;
    private evaluateNodeAtBar;
    private evaluateVariableDeclaration;
    private evaluateAssignment;
    private evaluateFunctionCall;
    private evaluateBinaryExpression;
    private evaluateUnaryExpression;
    private evaluateIdentifier;
    private registerBuiltInFunctions;
}
