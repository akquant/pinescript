/**
 * PineScript Compiler - Compiles AST to executable code with Plot and Signal extraction
 * Adapted for QuantTrade Web & Bot Engine
 */

import * as AST from './ast';
import { TechnicalIndicators, MathFunctions } from './indicators';

export interface PlotData {
  id: string;
  title: string;
  color: string;
  data: Array<{ time: number; value: number }>;
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
  timestamp: number[]; // in seconds or milliseconds
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

const COLOR_MAP: Record<string, string> = {
  'color.blue': '#3b82f6',
  'color.red': '#ef4444',
  'color.green': '#10b981',
  'color.yellow': '#eab308',
  'color.orange': '#f97316',
  'color.purple': '#a855f7',
  'color.white': '#ffffff',
  'color.gray': '#9ca3af',
  'color.cyan': '#06b6d4',
  'color.lime': '#84cc16',
  'color.teal': '#14b8a6',
};

export class Compiler {
  private variables: Map<string, any> = new Map();
  private functions: Map<string, Function> = new Map();

  constructor() {
    this.registerBuiltInFunctions();
  }

  compile(ast: AST.Program): CompiledStrategy {
    let strategyName = 'PineScript Indicator / Strategy';
    const strategyParams: Record<string, any> = {};
    const statements: AST.ASTNode[] = [];

    for (const node of ast.body) {
      if (node.type === AST.NodeType.STRATEGY_DECLARATION) {
        const strategy = node as AST.StrategyDeclaration;
        strategyName = strategy.name;
        Object.assign(strategyParams, strategy.parameters);
      } else if (node.type === AST.NodeType.INDICATOR_DECLARATION) {
        const indicator = node as AST.IndicatorDeclaration;
        strategyName = indicator.name;
        Object.assign(strategyParams, indicator.parameters);
      } else {
        statements.push(node);
      }
    }

    const execute = (context: ExecutionContext): ExecutionResult => {
      this.variables.clear();
      
      // Inject series variables
      this.variables.set('open', context.open);
      this.variables.set('high', context.high);
      this.variables.set('low', context.low);
      this.variables.set('close', context.close);
      this.variables.set('volume', context.volume);
      this.variables.set('time', context.timestamp);
      this.variables.set('time_close', context.timestamp);

      // Derived price series
      const hlc3 = context.high.map((h, i) => (h + context.low[i] + context.close[i]) / 3);
      const hl2 = context.high.map((h, i) => (h + context.low[i]) / 2);
      const ohlc4 = context.open.map((o, i) => (o + context.high[i] + context.low[i] + context.close[i]) / 4);
      this.variables.set('hlc3', hlc3);
      this.variables.set('hl2', hl2);
      this.variables.set('ohlc4', ohlc4);

      // Inject built-in constants
      this.variables.set('strategy.long', 'long');
      this.variables.set('strategy.short', 'short');
      this.variables.set('true', true);
      this.variables.set('false', false);
      this.variables.set('na', NaN);
      this.variables.set('timenow', Date.now());
      this.variables.set('barstate.isconfirmed', true);
      this.variables.set('barstate.islast', true);
      this.variables.set('barstate.isrealtime', false);
      this.variables.set('shape.labeldown', 'labeldown');
      this.variables.set('shape.labelup', 'labelup');
      this.variables.set('location.abovebar', 'abovebar');
      this.variables.set('location.belowbar', 'belowbar');
      this.variables.set('size.tiny', 'tiny');
      this.variables.set('size.small', 'small');
      this.variables.set('syminfo.tickerid', 'BTCUSDT');
      this.variables.set('syminfo.root', 'HG');
      this.variables.set('syminfo.mintick', 0.0005);
      this.variables.set('timeframe.period', '15');
      this.variables.set('format.mintick', 'mintick');
      this.variables.set('barmerge.lookahead_off', 0);
      this.variables.set('barmerge.lookahead_on', 1);
      this.variables.set('display.all', 'all');
      this.variables.set('display.none', 'none');

      // Colors
      Object.entries(COLOR_MAP).forEach(([k, v]) => {
        this.variables.set(k, v);
      });

      const signals: StrategySignal[] = [];
      const plots: PlotData[] = [];
      let plotCounter = 1;

      // Register plot function with context capture
      this.functions.set('plot', (series: any, ...restArgs: any[]) => {
        if (!series || !Array.isArray(series)) return null;

        let title = `Plot ${plotCounter}`;
        let color = '#06b6d4';

        // Check positional or named args
        for (const arg of restArgs) {
          if (typeof arg === 'string') {
            if (arg.startsWith('#') || arg.startsWith('rgb')) {
              color = arg;
            } else if (COLOR_MAP[arg]) {
              color = COLOR_MAP[arg];
            } else {
              title = arg;
            }
          } else if (arg && typeof arg === 'object') {
            if (arg.title) title = String(arg.title);
            if (arg.color) {
              if (Array.isArray(arg.color)) {
                const valid = arg.color.find((c: any) => typeof c === 'string' && (c.startsWith('#') || c.startsWith('rgb') || COLOR_MAP[c]));
                if (valid) color = COLOR_MAP[valid] || valid;
              } else if (typeof arg.color === 'string') {
                color = COLOR_MAP[arg.color] || (arg.color.startsWith('#') || arg.color.startsWith('rgb') ? arg.color : color);
              }
            }
          }
        }

        const data: Array<{ time: number; value: number }> = [];
        for (let i = 0; i < series.length; i++) {
          const val = series[i];
          if (val !== undefined && val !== null && !isNaN(val)) {
            data.push({
              time: context.timestamp[i],
              value: Number(val),
            });
          }
        }

        plots.push({
          id: `plot_${plotCounter++}`,
          title,
          color,
          data,
        });

        return null;
      });

      // Register plotshape function
      this.functions.set('plotshape', (condition: any, ...args: any[]) => {
        if (!Array.isArray(condition)) return null;
        let text = 'Signal';
        let title = '';
        let style = '';
        let location = '';

        for (const arg of args) {
          if (arg && typeof arg === 'object') {
            if (arg.text) text = String(arg.text);
            if (arg.title) title = String(arg.title);
            if (arg.style) style = String(arg.style);
            if (arg.location) location = String(arg.location);
          }
        }

        const combined = `${text} ${title} ${style} ${location}`.toLowerCase();
        const isBuy =
          combined.includes('buy') ||
          combined.includes('bull') ||
          combined.includes('long') ||
          combined.includes('labelup') ||
          combined.includes('belowbar') ||
          text === 'B';

        for (let i = 0; i < condition.length; i++) {
          if (condition[i]) {
            signals.push({
              type: isBuy ? 'BUY' : 'SELL',
              price: context.close[i],
              timestamp: context.timestamp[i],
              reason: text || title || (isBuy ? 'BUY' : 'SELL'),
            });
          }
        }
        return null;
      });

      // Register alertcondition function (graceful stub)
      this.functions.set('alertcondition', () => null);

      // Register strategy functions with signal recording
      this.functions.set('strategy.entry', (idOrDirection: string, directionOrQty: any) => {
        const direction = String(directionOrQty || idOrDirection).toLowerCase();
        const type: 'BUY' | 'SELL' = direction.includes('long') || direction.includes('buy') ? 'BUY' : 'SELL';
        return { isSignalAction: true, type, id: idOrDirection };
      });

      this.functions.set('strategy.close', (id: string) => {
        return { isSignalAction: true, type: 'CLOSE', id };
      });

      // Execute each statement
      for (const statement of statements) {
        if (statement.type === AST.NodeType.IF_STATEMENT) {
          const ifNode = statement as AST.IfStatement;
          const condVal = this.evaluateNode(ifNode.condition, context);

          // If condition is an array of booleans (e.g. from ta.crossover or boolean series)
          if (Array.isArray(condVal)) {
            // Evaluate statement across bars where condition is true
            for (let i = 0; i < condVal.length; i++) {
              if (condVal[i] === true) {
                const actionResult = this.evaluateNode(ifNode.thenBranch, context);
                if (actionResult && actionResult.isSignalAction) {
                  signals.push({
                    type: actionResult.type,
                    price: context.close[i],
                    timestamp: context.timestamp[i],
                    reason: `${actionResult.id || 'Signal'} triggered`,
                  });
                }
              }
            }
          } else if (condVal === true) {
            const actionResult = this.evaluateNode(ifNode.thenBranch, context);
            if (actionResult && actionResult.isSignalAction) {
              const lastIdx = context.close.length - 1;
              signals.push({
                type: actionResult.type,
                price: context.close[lastIdx],
                timestamp: context.timestamp[lastIdx],
                reason: `${actionResult.id || 'Signal'} triggered`,
              });
            }
          }
        } else {
          this.evaluateNode(statement, context);
        }
      }

      const isOverlay = strategyParams.overlay !== undefined
        ? Boolean(strategyParams.overlay?.value !== undefined ? strategyParams.overlay.value : strategyParams.overlay)
        : true;

      return { plots, signals, overlay: isOverlay };
    };

    return {
      name: strategyName,
      parameters: strategyParams,
      execute,
    };
  }

  private evaluateNode(node: AST.ASTNode, context: ExecutionContext): any {
    if (!node) return null;

    switch (node.type) {
      case AST.NodeType.VARIABLE_DECLARATION:
        return this.evaluateVariableDeclaration(node as AST.VariableDeclaration, context);

      case AST.NodeType.ASSIGNMENT:
        return this.evaluateAssignment(node as AST.Assignment, context);

      case AST.NodeType.FUNCTION_CALL:
        return this.evaluateFunctionCall(node as AST.FunctionCall, context);

      case AST.NodeType.BINARY_EXPRESSION:
        return this.evaluateBinaryExpression(node as AST.BinaryExpression, context);

      case AST.NodeType.UNARY_EXPRESSION:
        return this.evaluateUnaryExpression(node as AST.UnaryExpression, context);

      case AST.NodeType.IDENTIFIER:
        return this.evaluateIdentifier(node as AST.Identifier);

      case AST.NodeType.NUMBER_LITERAL:
        return (node as AST.NumberLiteral).value;

      case AST.NodeType.STRING_LITERAL:
        return (node as AST.StringLiteral).value;

      case AST.NodeType.BOOLEAN_LITERAL:
        return (node as AST.BooleanLiteral).value;

      case AST.NodeType.CONDITIONAL_EXPRESSION:
        return this.evaluateConditional(node as AST.ConditionalExpression, context);

      case AST.NodeType.INDEX_EXPRESSION:
        return this.evaluateIndex(node as AST.IndexExpression, context);

      case AST.NodeType.ARRAY_LITERAL:
        return (node as AST.ArrayLiteral).elements.map(e => this.evaluateNode(e, context));

      case AST.NodeType.TUPLE_ASSIGNMENT:
        return this.evaluateTupleAssignment(node as AST.TupleAssignment, context);

      case AST.NodeType.FUNCTION_DECLARATION:
        return this.evaluateFunctionDeclaration(node as AST.FunctionDeclaration, context);

      case AST.NodeType.SWITCH_EXPRESSION:
        return this.evaluateSwitchExpression(node as AST.SwitchExpression, context);

      case AST.NodeType.TYPE_DECLARATION: {
        const typeNode = node as AST.TypeDeclaration;
        const typeName = typeNode.name;
        const fields = typeNode.fields || [];
        this.functions.set(`${typeName}.new`, (...args: any[]) => {
          const instance: Record<string, any> = {};
          fields.forEach((f, idx) => {
            if (args[idx] !== undefined) {
              instance[f.name] = args[idx];
            } else if (f.defaultValue) {
              instance[f.name] = this.evaluateNode(f.defaultValue, context);
            } else {
              instance[f.name] = null;
            }
          });
          return instance;
        });
        return null;
      }

      case AST.NodeType.BLOCK: {
        const block = node as AST.Block;
        let lastResult: any = null;
        for (const stmt of block.statements) {
          lastResult = this.evaluateNode(stmt, context);
        }
        return lastResult;
      }

      case AST.NodeType.IF_STATEMENT: {
        const ifNode = node as AST.IfStatement;
        const cond = this.evaluateNode(ifNode.condition, context);
        const isTrue = Array.isArray(cond)
          ? cond[cond.length - 1] === true || (typeof cond[cond.length - 1] === 'number' && cond[cond.length - 1] !== 0)
          : cond === true || (typeof cond === 'number' && cond !== 0) || (Boolean(cond) && cond !== 'na');
        if (isTrue) {
          return this.evaluateNode(ifNode.thenBranch, context);
        } else if (ifNode.elseBranch) {
          return this.evaluateNode(ifNode.elseBranch, context);
        }
        return null;
      }

      case AST.NodeType.FOR_STATEMENT: {
        const forStmt = node as AST.ForStatement;
        if (forStmt.iterable) {
          const iterVal = this.evaluateNode(forStmt.iterable, context);
          if (Array.isArray(iterVal)) {
            for (const item of iterVal) {
              this.variables.set(forStmt.variable, item);
              this.evaluateNode(forStmt.body, context);
            }
          } else if (iterVal instanceof Map) {
            for (const [k, v] of iterVal.entries()) {
              this.variables.set(forStmt.variable, k);
              this.evaluateNode(forStmt.body, context);
            }
          }
          return null;
        }

        const startVal = Number(this.evaluateNode(forStmt.start!, context)) || 0;
        const endVal = Number(this.evaluateNode(forStmt.end!, context)) || 0;
        for (let i = startVal; i <= endVal; i++) {
          this.variables.set(forStmt.variable, i);
          this.evaluateNode(forStmt.body, context);
        }
        return null;
      }

      case AST.NodeType.WHILE_STATEMENT: {
        const whileStmt = node as AST.WhileStatement;
        let iters = 0;
        while (iters++ < 1000) {
          const cond = this.evaluateNode(whileStmt.condition, context);
          const isTrue = Array.isArray(cond)
            ? cond[cond.length - 1] === true
            : cond === true || (typeof cond === 'number' && cond !== 0);
          if (!isTrue) break;
          this.evaluateNode(whileStmt.body, context);
        }
        return null;
      }

      default:
        return null;
    }
  }

  private evaluateTupleAssignment(node: AST.TupleAssignment, context: ExecutionContext): any {
    const rhs = this.evaluateNode(node.value, context);
    if (Array.isArray(rhs)) {
      node.names.forEach((name, idx) => {
        this.variables.set(name, rhs[idx]);
      });
    } else if (rhs && typeof rhs === 'object') {
      const vals = Object.values(rhs);
      node.names.forEach((name, idx) => {
        this.variables.set(name, vals[idx] !== undefined ? vals[idx] : (rhs as any)[name]);
      });
    }
    return null;
  }

  private evaluateFunctionDeclaration(node: AST.FunctionDeclaration, context: ExecutionContext): any {
    this.functions.set(node.name, (...args: any[]) => {
      const prevVals = new Map<string, any>();
      node.parameters.forEach((param, idx) => {
        prevVals.set(param, this.variables.get(param));
        this.variables.set(param, args[idx]);
      });
      const result = this.evaluateNode(node.body, context);
      prevVals.forEach((val, key) => {
        if (val === undefined) this.variables.delete(key);
        else this.variables.set(key, val);
      });
      return result;
    });
    return null;
  }

  private evaluateSwitchExpression(node: AST.SwitchExpression, context: ExecutionContext): any {
    let discVal: any = undefined;
    if (node.discriminant) {
      discVal = this.evaluateNode(node.discriminant, context);
    }
    for (const c of node.cases) {
      if (!c.pattern) {
        return this.evaluateNode(c.body, context);
      }
      const pVal = this.evaluateNode(c.pattern, context);
      if (discVal !== undefined) {
        if (discVal === pVal) {
          return this.evaluateNode(c.body, context);
        }
      } else {
        if (pVal === true || (typeof pVal === 'number' && !isNaN(pVal) && pVal !== 0)) {
          return this.evaluateNode(c.body, context);
        }
      }
    }
    return null;
  }

  private evaluateConditional(node: AST.ConditionalExpression, context: ExecutionContext): any {
    const cond = this.evaluateNode(node.condition, context);
    const cons = this.evaluateNode(node.consequent, context);
    const alt = this.evaluateNode(node.alternate, context);

    if (Array.isArray(cond)) {
      const len = cond.length;
      const res: any[] = [];
      for (let i = 0; i < len; i++) {
        const c = cond[i];
        const isTrue = c === true || (typeof c === 'number' && !isNaN(c) && c !== 0);
        const cVal = Array.isArray(cons) ? cons[i] : cons;
        const aVal = Array.isArray(alt) ? alt[i] : alt;
        res.push(isTrue ? cVal : aVal);
      }
      return res;
    }

    const isTrue = cond === true || (typeof cond === 'number' && !isNaN(cond) && cond !== 0) || (Boolean(cond) && cond !== 'na');
    return isTrue ? cons : alt;
  }

  private evaluateIndex(node: AST.IndexExpression, context: ExecutionContext): any {
    const target = this.evaluateNode(node.target, context);
    const index = this.evaluateNode(node.index, context);
    const shift = typeof index === 'number' ? Math.floor(index) : 0;

    if (Array.isArray(target)) {
      const res: any[] = [];
      for (let i = 0; i < target.length; i++) {
        const targetIdx = i - shift;
        if (targetIdx >= 0 && targetIdx < target.length) {
          res.push(target[targetIdx]);
        } else {
          res.push(NaN);
        }
      }
      return res;
    }

    return target;
  }

  private hasIdentifier(node: AST.ASTNode, name: string): boolean {
    if (!node) return false;
    if (node.type === AST.NodeType.IDENTIFIER && (node as AST.Identifier).name === name) {
      return true;
    }
    if (node.type === AST.NodeType.INDEX_EXPRESSION) {
      const idx = node as AST.IndexExpression;
      return this.hasIdentifier(idx.target, name) || this.hasIdentifier(idx.index, name);
    }
    if (node.type === AST.NodeType.CONDITIONAL_EXPRESSION) {
      const cond = node as AST.ConditionalExpression;
      return this.hasIdentifier(cond.condition, name) || this.hasIdentifier(cond.consequent, name) || this.hasIdentifier(cond.alternate, name);
    }
    if (node.type === AST.NodeType.BINARY_EXPRESSION) {
      const bin = node as AST.BinaryExpression;
      return this.hasIdentifier(bin.left, name) || this.hasIdentifier(bin.right, name);
    }
    if (node.type === AST.NodeType.UNARY_EXPRESSION) {
      return this.hasIdentifier((node as AST.UnaryExpression).operand, name);
    }
    if (node.type === AST.NodeType.FUNCTION_CALL) {
      const fn = node as AST.FunctionCall;
      return fn.arguments.some(arg => this.hasIdentifier(arg, name));
    }
    return false;
  }

  private evaluateNodeAtBar(
    node: AST.ASTNode,
    context: ExecutionContext,
    barIdx: number,
    targetName: string,
    accumulated: number[]
  ): any {
    if (!node) return null;

    switch (node.type) {
      case AST.NodeType.NUMBER_LITERAL:
        return (node as AST.NumberLiteral).value;

      case AST.NodeType.STRING_LITERAL:
        return (node as AST.StringLiteral).value;

      case AST.NodeType.BOOLEAN_LITERAL:
        return (node as AST.BooleanLiteral).value;

      case AST.NodeType.IDENTIFIER: {
        const name = (node as AST.Identifier).name;
        if (name === 'true') return true;
        if (name === 'false') return false;
        if (name === 'na') return NaN;
        if (name === targetName) {
          return barIdx < accumulated.length ? accumulated[barIdx] : (accumulated[barIdx - 1] ?? 0);
        }
        if (this.variables.has(name)) {
          const v = this.variables.get(name);
          if (Array.isArray(v)) {
            return v[barIdx] !== undefined ? v[barIdx] : NaN;
          }
          return v;
        }
        return null;
      }

      case AST.NodeType.INDEX_EXPRESSION: {
        const idxNode = node as AST.IndexExpression;
        const shift = Math.floor(Number(this.evaluateNodeAtBar(idxNode.index, context, barIdx, targetName, accumulated)) || 0);
        const targetIdx = barIdx - shift;

        if (idxNode.target.type === AST.NodeType.IDENTIFIER && (idxNode.target as AST.Identifier).name === targetName) {
          return targetIdx >= 0 && targetIdx < accumulated.length ? accumulated[targetIdx] : NaN;
        }

        const targetVal = this.evaluateNode(idxNode.target, context);
        if (Array.isArray(targetVal)) {
          return targetIdx >= 0 && targetIdx < targetVal.length ? targetVal[targetIdx] : NaN;
        }
        return targetIdx >= 0 ? targetVal : NaN;
      }

      case AST.NodeType.CONDITIONAL_EXPRESSION: {
        const condNode = node as AST.ConditionalExpression;
        const cond = this.evaluateNodeAtBar(condNode.condition, context, barIdx, targetName, accumulated);
        const isTrue = cond === true || (typeof cond === 'number' && !isNaN(cond) && cond !== 0);
        return isTrue
          ? this.evaluateNodeAtBar(condNode.consequent, context, barIdx, targetName, accumulated)
          : this.evaluateNodeAtBar(condNode.alternate, context, barIdx, targetName, accumulated);
      }

      case AST.NodeType.BINARY_EXPRESSION: {
        const bin = node as AST.BinaryExpression;
        const left = this.evaluateNodeAtBar(bin.left, context, barIdx, targetName, accumulated);
        const right = this.evaluateNodeAtBar(bin.right, context, barIdx, targetName, accumulated);
        switch (bin.operator) {
          case '+': return left + right;
          case '-': return left - right;
          case '*': return left * right;
          case '/': return left / right;
          case '%': return left % right;
          case '==': return left === right;
          case '!=': return left !== right;
          case '<': return left < right;
          case '<=': return left <= right;
          case '>': return left > right;
          case '>=': return left >= right;
          case 'and': return Boolean(left && right);
          case 'or': return Boolean(left || right);
          default: return left;
        }
      }

      case AST.NodeType.UNARY_EXPRESSION: {
        const un = node as AST.UnaryExpression;
        const op = this.evaluateNodeAtBar(un.operand, context, barIdx, targetName, accumulated);
        if (un.operator === '-') return -op;
        if (un.operator === 'not' || un.operator === '!') return !op;
        return op;
      }

      case AST.NodeType.FUNCTION_CALL: {
        const fn = node as AST.FunctionCall;
        const func = this.functions.get(fn.name);
        if (!func) return null;
        const args = fn.arguments.map(arg => this.evaluateNodeAtBar(arg, context, barIdx, targetName, accumulated));
        return func(...args);
      }

      default:
        return null;
    }
  }

  private evaluateVariableDeclaration(node: AST.VariableDeclaration, context: ExecutionContext): void {
    if (this.hasIdentifier(node.value, node.name)) {
      const len = context.close.length;
      const series: number[] = [];
      for (let i = 0; i < len; i++) {
        const val = this.evaluateNodeAtBar(node.value, context, i, node.name, series);
        series.push(typeof val === 'number' && !isNaN(val) ? val : 0);
      }
      this.variables.set(node.name, series);
      return;
    }
    const value = this.evaluateNode(node.value, context);
    this.variables.set(node.name, value);
  }

  private evaluateAssignment(node: AST.Assignment, context: ExecutionContext): void {
    if (node.name.includes('.')) {
      const parts = node.name.split('.');
      const obj = this.variables.get(parts[0]);
      if (obj && typeof obj === 'object') {
        const val = this.evaluateNode(node.value, context);
        obj[parts[1]] = val;
        return;
      }
    }

    if (this.hasIdentifier(node.value, node.name)) {
      const len = context.close.length;
      const series: number[] = [];
      for (let i = 0; i < len; i++) {
        const val = this.evaluateNodeAtBar(node.value, context, i, node.name, series);
        series.push(typeof val === 'number' && !isNaN(val) ? val : 0);
      }
      this.variables.set(node.name, series);
      return;
    }
    const value = this.evaluateNode(node.value, context);
    this.variables.set(node.name, value);
  }

  private evaluateFunctionCall(node: AST.FunctionCall, context: ExecutionContext): any {
    let func = this.functions.get(node.name);
    let targetThis: any = undefined;

    // Check for method dispatch: e.g. trade.closeAt(price, reason)
    if (!func && node.name.includes('.')) {
      const parts = node.name.split('.');
      const objName = parts[0];
      const methodName = parts.slice(1).join('.');
      const obj = this.variables.get(objName);
      if (obj !== undefined) {
        const methodFunc = this.functions.get(methodName);
        if (methodFunc) {
          func = methodFunc;
          targetThis = obj;
        }
      }
    }

    if (!func) {
      // Graceful fallback for unknown functions like input.int / alert
      if (node.name.startsWith('input')) {
        return node.arguments[0] ? this.evaluateNode(node.arguments[0], context) : 0;
      }
      return null;
    }

    const args = node.arguments.map(arg => {
      if (arg.type === AST.NodeType.ASSIGNMENT) {
        const assign = arg as AST.Assignment;
        return { [assign.name]: this.evaluateNode(assign.value, context) };
      }
      return this.evaluateNode(arg, context);
    });

    if (targetThis !== undefined) {
      return func(targetThis, ...args);
    }

    return func(...args);
  }

  private evaluateBinaryExpression(node: AST.BinaryExpression, context: ExecutionContext): any {
    const left = this.evaluateNode(node.left, context);
    const right = this.evaluateNode(node.right, context);

    // Array vs Array or Array vs Number operations
    if (Array.isArray(left) || Array.isArray(right)) {
      const len = Array.isArray(left) ? left.length : right.length;
      const res: any[] = [];
      for (let i = 0; i < len; i++) {
        const l = Array.isArray(left) ? left[i] : left;
        const r = Array.isArray(right) ? right[i] : right;
        switch (node.operator) {
          case '+': res.push(l + r); break;
          case '-': res.push(l - r); break;
          case '*': res.push(l * r); break;
          case '/': res.push(l / r); break;
          case '>': res.push(l > r); break;
          case '>=': res.push(l >= r); break;
          case '<': res.push(l < r); break;
          case '<=': res.push(l <= r); break;
          case '==': res.push(l === r); break;
          case '!=': res.push(l !== r); break;
          case 'and': res.push(l && r); break;
          case 'or': res.push(l || r); break;
          default: res.push(l); break;
        }
      }
      return res;
    }

    switch (node.operator) {
      case '+': return left + right;
      case '-': return left - right;
      case '*': return left * right;
      case '/': return left / right;
      case '%': return left % right;
      case '==': return left === right;
      case '!=': return left !== right;
      case '<': return left < right;
      case '<=': return left <= right;
      case '>': return left > right;
      case '>=': return left >= right;
      case 'and': return left && right;
      case 'or': return left || right;
      default: return left;
    }
  }

  private evaluateUnaryExpression(node: AST.UnaryExpression, context: ExecutionContext): any {
    const operand = this.evaluateNode(node.operand, context);
    if (Array.isArray(operand)) {
      return operand.map(v => (node.operator === '-' ? -v : !v));
    }
    switch (node.operator) {
      case '-': return -operand;
      case 'not':
      case '!': return !operand;
      default: return operand;
    }
  }

  private evaluateIdentifier(node: AST.Identifier): any {
    if (this.variables.has(node.name)) {
      return this.variables.get(node.name);
    }
    // Check color constant
    if (COLOR_MAP[node.name]) {
      return COLOR_MAP[node.name];
    }
    return null;
  }

  private registerBuiltInFunctions(): void {
    // Technical Indicators
    this.functions.set('ta.sma', (source: number[], length: number) => {
      return TechnicalIndicators.sma(source, length);
    });

    this.functions.set('ta.ema', (source: number[], length: number) => {
      return TechnicalIndicators.ema(source, length);
    });

    this.functions.set('ta.rsi', (source: number[], length: number = 14) => {
      return TechnicalIndicators.rsi(source, length);
    });

    this.functions.set('ta.atr', (period: number = 14) => {
      const high = this.variables.get('high') || [];
      const low = this.variables.get('low') || [];
      const close = this.variables.get('close') || [];
      return TechnicalIndicators.atr(high, low, close, period);
    });

    this.functions.set('ta.macd', (source: number[], fast: number = 12, slow: number = 26, signal: number = 9) => {
      return TechnicalIndicators.macd(source, fast, slow, signal);
    });

    this.functions.set('ta.bb', (source: number[], length: number = 20, mult: number = 2) => {
      return TechnicalIndicators.bollingerBands(source, length, mult);
    });

    this.functions.set('ta.crossover', (series1: number[], series2: number[] | number) => {
      return TechnicalIndicators.crossover(series1, series2);
    });

    this.functions.set('ta.crossunder', (series1: number[], series2: number[] | number) => {
      return TechnicalIndicators.crossunder(series1, series2);
    });

    this.functions.set('ta.highest', (source: number[], length: number) => {
      return TechnicalIndicators.highest(source, length);
    });

    this.functions.set('ta.lowest', (source: number[], length: number) => {
      return TechnicalIndicators.lowest(source, length);
    });

    // Pivots & v4 compatibility
    const handlePivotHigh = (arg1: any, arg2?: any, arg3?: any) => {
      let source = this.variables.get('high') || [];
      let left = 15;
      let right = 15;
      if (Array.isArray(arg1)) {
        source = arg1;
        left = Number(arg2) || 15;
        right = Number(arg3) || 15;
      } else {
        left = Number(arg1) || 15;
        right = Number(arg2) || 15;
      }
      return TechnicalIndicators.pivothigh(source, left, right);
    };
    this.functions.set('pivothigh', handlePivotHigh);
    this.functions.set('ta.pivothigh', handlePivotHigh);

    const handlePivotLow = (arg1: any, arg2?: any, arg3?: any) => {
      let source = this.variables.get('low') || [];
      let left = 15;
      let right = 15;
      if (Array.isArray(arg1)) {
        source = arg1;
        left = Number(arg2) || 15;
        right = Number(arg3) || 15;
      } else {
        left = Number(arg1) || 15;
        right = Number(arg2) || 15;
      }
      return TechnicalIndicators.pivotlow(source, left, right);
    };
    this.functions.set('pivotlow', handlePivotLow);
    this.functions.set('ta.pivotlow', handlePivotLow);

    // Fix NaN & Change
    this.functions.set('fixnan', (source: any) => {
      return TechnicalIndicators.fixnan(Array.isArray(source) ? source : [source]);
    });

    const handleChange = (source: any) => {
      return TechnicalIndicators.change(Array.isArray(source) ? source : [source]);
    };
    this.functions.set('change', handleChange);
    this.functions.set('ta.change', handleChange);

    // Pine v4 indicator aliases
    this.functions.set('ema', (source: number[], length: number) => TechnicalIndicators.ema(source, length));
    this.functions.set('sma', (source: number[], length: number) => TechnicalIndicators.sma(source, length));
    this.functions.set('rsi', (source: number[], length: number = 14) => TechnicalIndicators.rsi(source, length));
    this.functions.set('atr', (period: number = 14) => {
      const high = this.variables.get('high') || [];
      const low = this.variables.get('low') || [];
      const close = this.variables.get('close') || [];
      return TechnicalIndicators.atr(high, low, close, period);
    });
    this.functions.set('crossover', (series1: any, series2: any) => TechnicalIndicators.crossover(series1, series2));
    this.functions.set('crossunder', (series1: any, series2: any) => TechnicalIndicators.crossunder(series1, series2));
    this.functions.set('highest', (source: any, length: number) => TechnicalIndicators.highest(source, length));
    this.functions.set('lowest', (source: any, length: number) => TechnicalIndicators.lowest(source, length));

    // Inputs
    this.functions.set('input.int', (defval: number) => defval);
    this.functions.set('input.float', (defval: number) => defval);
    this.functions.set('input.bool', (defval: boolean) => defval);
    this.functions.set('input', (defval: any, ...rest: any[]) => {
      if (defval && typeof defval === 'object' && 'defval' in defval) return defval.defval;
      for (const r of rest) {
        if (r && typeof r === 'object' && 'defval' in r) return r.defval;
      }
      return defval;
    });

    // Additional v5 Technical Indicators
    this.functions.set('ta.wma', (source: number[], length: number) => TechnicalIndicators.wma(source, length));
    this.functions.set('wma', (source: number[], length: number) => TechnicalIndicators.wma(source, length));

    this.functions.set('ta.tr', () => {
      const high = this.variables.get('high') || [];
      const low = this.variables.get('low') || [];
      const close = this.variables.get('close') || [];
      return TechnicalIndicators.tr(high, low, close);
    });
    this.functions.set('tr', () => {
      const high = this.variables.get('high') || [];
      const low = this.variables.get('low') || [];
      const close = this.variables.get('close') || [];
      return TechnicalIndicators.tr(high, low, close);
    });

    this.functions.set('ta.supertrend', (factor: number = 3, atrPeriod: number = 10) => {
      const high = this.variables.get('high') || [];
      const low = this.variables.get('low') || [];
      const close = this.variables.get('close') || [];
      return TechnicalIndicators.supertrend(high, low, close, factor, atrPeriod);
    });

    this.functions.set('ta.stoch', (close: number[], high: number[], low: number[], period: number = 14, smoothK: number = 3) => {
      return TechnicalIndicators.stoch(close, high, low, period, smoothK);
    });

    this.functions.set('ta.vwap', () => {
      const high = this.variables.get('high') || [];
      const low = this.variables.get('low') || [];
      const close = this.variables.get('close') || [];
      const volume = this.variables.get('volume') || [];
      return TechnicalIndicators.vwap(high, low, close, volume);
    });
    this.functions.set('vwap', () => {
      const high = this.variables.get('high') || [];
      const low = this.variables.get('low') || [];
      const close = this.variables.get('close') || [];
      const volume = this.variables.get('volume') || [];
      return TechnicalIndicators.vwap(high, low, close, volume);
    });

    this.functions.set('ta.cum', (source: number[]) => TechnicalIndicators.cum(source));
    this.functions.set('cum', (source: number[]) => TechnicalIndicators.cum(source));

    this.functions.set('ta.roc', (source: number[], length: number = 9) => TechnicalIndicators.roc(source, length));
    this.functions.set('roc', (source: number[], length: number = 9) => TechnicalIndicators.roc(source, length));

    this.functions.set('ta.cci', (sourceOrPeriod: any, period: number = 20) => {
      const high = this.variables.get('high') || [];
      const low = this.variables.get('low') || [];
      const close = this.variables.get('close') || [];
      const len = typeof sourceOrPeriod === 'number' ? sourceOrPeriod : period;
      return TechnicalIndicators.cci(high, low, close, len);
    });
    this.functions.set('cci', (sourceOrPeriod: any, period: number = 20) => {
      const high = this.variables.get('high') || [];
      const low = this.variables.get('low') || [];
      const close = this.variables.get('close') || [];
      const len = typeof sourceOrPeriod === 'number' ? sourceOrPeriod : period;
      return TechnicalIndicators.cci(high, low, close, len);
    });

    // Math Functions
    this.functions.set('math.max', (...values: any[]) => MathFunctions.max(...values));
    this.functions.set('math.min', (...values: any[]) => MathFunctions.min(...values));
    this.functions.set('math.abs', (val: any) => MathFunctions.abs(val));
    this.functions.set('math.round', (val: number, dec: number = 0) => MathFunctions.round(val, dec));
    this.functions.set('math.floor', (val: number) => MathFunctions.floor(val));
    this.functions.set('math.ceil', (val: number) => MathFunctions.ceil(val));
    this.functions.set('math.pow', (b: number, e: number) => MathFunctions.pow(b, e));
    this.functions.set('math.sqrt', (val: any) => MathFunctions.sqrt(val));
    this.functions.set('math.log', (val: any) => MathFunctions.log(val));
    this.functions.set('math.exp', (val: any) => MathFunctions.exp(val));
    this.functions.set('math.sign', (val: any) => MathFunctions.sign(val));

    // Array Namespace Functions (v5 / v6)
    this.functions.set('array.new_float', (size: number = 0, initial_value: number = 0) => {
      return Array.from({ length: Math.max(0, size) }, () => initial_value);
    });
    this.functions.set('array.new_int', (size: number = 0, initial_value: number = 0) => {
      return Array.from({ length: Math.max(0, size) }, () => initial_value);
    });
    this.functions.set('array.new_bool', (size: number = 0, initial_value: boolean = false) => {
      return Array.from({ length: Math.max(0, size) }, () => initial_value);
    });
    this.functions.set('array.push', (arr: any[], val: any) => {
      if (Array.isArray(arr)) arr.push(val);
      return null;
    });
    this.functions.set('array.pop', (arr: any[]) => {
      return Array.isArray(arr) ? arr.pop() : null;
    });
    this.functions.set('array.get', (arr: any[], index: number) => {
      return Array.isArray(arr) ? arr[index] : null;
    });
    this.functions.set('array.set', (arr: any[], index: number, val: any) => {
      if (Array.isArray(arr)) arr[index] = val;
      return null;
    });
    this.functions.set('array.size', (arr: any[]) => {
      return Array.isArray(arr) ? arr.length : 0;
    });
    this.functions.set('array.clear', (arr: any[]) => {
      if (Array.isArray(arr)) arr.length = 0;
      return null;
    });
    this.functions.set('array.avg', (arr: any[]) => {
      if (!Array.isArray(arr) || arr.length === 0) return 0;
      const valid = arr.map(Number).filter(v => !isNaN(v));
      return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
    });
    this.functions.set('array.min', (arr: any[]) => {
      if (!Array.isArray(arr) || arr.length === 0) return NaN;
      return Math.min(...arr.map(Number).filter(v => !isNaN(v)));
    });
    this.functions.set('array.max', (arr: any[]) => {
      if (!Array.isArray(arr) || arr.length === 0) return NaN;
      return Math.max(...arr.map(Number).filter(v => !isNaN(v)));
    });

    // Map Namespace Functions (Pine Script v5.1 / v6)
    this.functions.set('map.new', () => new Map());
    this.functions.set('map.put', (m: Map<any, any>, k: any, v: any) => { if (m instanceof Map) m.set(k, v); return null; });
    this.functions.set('map.get', (m: Map<any, any>, k: any) => m instanceof Map ? m.get(k) : null);
    this.functions.set('map.has', (m: Map<any, any>, k: any) => m instanceof Map ? m.has(k) : false);
    this.functions.set('map.remove', (m: Map<any, any>, k: any) => { if (m instanceof Map) m.delete(k); return null; });
    this.functions.set('map.size', (m: Map<any, any>) => m instanceof Map ? m.size : 0);
    this.functions.set('map.clear', (m: Map<any, any>) => { if (m instanceof Map) m.clear(); return null; });

    // PineScript v5 nz (null/NaN fallback)
    const handleNz = (x: any, y: any = 0) => {
      const replacement = typeof y === 'number' && !isNaN(y) ? y : 0;
      if (Array.isArray(x)) {
        return x.map(v => (v === null || v === undefined || isNaN(v) ? replacement : v));
      }
      return x === null || x === undefined || isNaN(x) ? replacement : x;
    };
    this.functions.set('nz', handleNz);
    this.functions.set('math.nz', handleNz);

    // DMI and ADX
    this.functions.set('ta.dmi', (diLen: number = 14, adxLen: number = 14) => {
      const high = this.variables.get('high') || [];
      const low = this.variables.get('low') || [];
      const close = this.variables.get('close') || [];
      const tr = TechnicalIndicators.tr(high, low, close);
      const atr = TechnicalIndicators.ema(tr, diLen);
      const plusDm: number[] = [];
      const minusDm: number[] = [];
      for (let i = 0; i < close.length; i++) {
        if (i === 0) {
          plusDm.push(0);
          minusDm.push(0);
        } else {
          const up = high[i] - high[i - 1];
          const down = low[i - 1] - low[i];
          plusDm.push(up > down && up > 0 ? up : 0);
          minusDm.push(down > up && down > 0 ? down : 0);
        }
      }
      const smoothPlus = TechnicalIndicators.ema(plusDm, diLen);
      const smoothMinus = TechnicalIndicators.ema(minusDm, diLen);
      const diPlus: number[] = [];
      const diMinus: number[] = [];
      const dx: number[] = [];
      for (let i = 0; i < close.length; i++) {
        const a = atr[i] || 1;
        const p = ((smoothPlus[i] || 0) / a) * 100;
        const m = ((smoothMinus[i] || 0) / a) * 100;
        diPlus.push(p);
        diMinus.push(m);
        const sum = p + m;
        dx.push(sum > 0 ? (Math.abs(p - m) / sum) * 100 : 0);
      }
      const adx = TechnicalIndicators.ema(dx, adxLen);
      return [diPlus, diMinus, adx];
    });

    this.functions.set('ta.mfi', (source: number[], length: number = 14) => {
      return TechnicalIndicators.rsi(source, length);
    });

    this.functions.set('ta.barssince', (condition: any) => {
      if (!Array.isArray(condition)) return 0;
      const result: number[] = [];
      let count = NaN;
      for (let i = 0; i < condition.length; i++) {
        if (condition[i] === true) {
          count = 0;
        } else if (!isNaN(count)) {
          count++;
        }
        result.push(count);
      }
      return result;
    });

    // String and Type Formatters
    this.functions.set('str.tostring', (val: any, _fmt?: any) => String(val !== undefined && val !== null ? val : ''));
    this.functions.set('timeframe.in_seconds', () => 900);
    this.functions.set('input.session', (defval: any) => defval);
    this.functions.set('input.string', (defval: any) => defval);
    this.functions.set('input.time', (defval: any) => defval);
    this.functions.set('array.indexof', (arr: any[], val: any) => (Array.isArray(arr) ? arr.indexOf(val) : -1));
    this.functions.set('timestamp', () => Date.now());
    this.functions.set('time', () => Date.now());
    this.functions.set('year', () => 2026);
    this.functions.set('month', () => 10);

    // Color and visual stubs
    this.functions.set('color.rgb', (r: number, g: number, b: number, a?: number) => {
      const alpha = a !== undefined ? Math.max(0, 1 - a / 100) : 1;
      return `rgba(${r},${g},${b},${alpha})`;
    });
    this.functions.set('color.new', (c: any, _t?: any) => c);
    this.functions.set('fill', () => null);
    this.functions.set('barcolor', () => null);

    // Object and Drawing Stubs (non-crashing)
    this.functions.set('table.new', () => ({}));
    this.functions.set('table.cell', () => null);
    this.functions.set('table.clear', () => null);
    this.functions.set('line.new', () => ({}));
    this.functions.set('line.delete', () => null);
    this.functions.set('line.set_xy1', () => null);
    this.functions.set('line.set_xy2', () => null);
    this.functions.set('label.new', () => ({}));
    this.functions.set('label.delete', () => null);
    this.functions.set('label.set_text', () => null);
    this.functions.set('box.new', () => ({}));
    this.functions.set('box.delete', () => null);

    // Multi-timeframe and ticker stubs
    this.functions.set('request.security', (_ticker: any, _timeframe: any, expression: any) => {
      return expression !== undefined ? expression : (this.variables.get('close') || []);
    });
    this.functions.set('ticker.heikinashi', (ticker: any) => ticker);
  }
}
