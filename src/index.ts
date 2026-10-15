export * from './ast';
export * from './lexer';
export * from './parser';
export * from './indicators';
export * from './compiler';
export * from './executor';
export * from './scripts/trend_following_script';
export {
  PineScriptRunner,
  type CandleData,
  type PineScriptValidation,
  type PineScriptRunResult,
  type StrategyPerformanceMetrics,
  type PlotData,
  type StrategySignal,
} from './runner';

export type LineDrawing = import('./runtime/builtins/line').LineObject;
export type LabelDrawing = import('./runtime/builtins/label').LabelObject;
export type BoxDrawing = import('./runtime/builtins/box').BoxObject;
export type TableDrawing = import('./runtime/builtins/table').TableObject;
export type FillDrawing = { plot1: number | any; plot2: number | any; color: string; title?: string };

export type ExecutionResult = import('./runner').PineScriptRunResult;
