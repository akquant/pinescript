# @quanttrade/pinescript

[![npm version](https://img.shields.io/npm/v/@quanttrade/pinescript.svg)](https://www.npmjs.com/package/@quanttrade/pinescript)
[![npm downloads](https://img.shields.io/npm/dm/@quanttrade/pinescript.svg)](https://www.npmjs.com/package/@quanttrade/pinescript)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org)

> A high-performance **Pine Script v5 / v6** compiler, AST parser, and bar-by-bar execution engine written in pure TypeScript. Run TradingView Pine Script strategies and indicators programmatically — in Node.js or the browser — with deterministic, chart-accurate results.

---

## Table of Contents

- [Highlights](#highlights)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Supported Built-ins](#supported-built-ins)
- [TypeScript Types](#typescript-types)
- [Requirements](#requirements)
- [Development](#development)
- [Testing](#testing)
- [Releasing a New Version](#releasing-a-new-version)
- [Contributing](#contributing)
- [Author](#author)
- [License](#license)

---

## Highlights

- **Full v5/v6 Frontend** — Lexer (tokenizer) with indentation tracking, recursive-descent parser, and an optimized Abstract Syntax Tree.
- **Bar-by-Bar Runtime** — Replicates TradingView execution semantics for tick-level and close-of-bar calculations.
- **Rich Built-in Library** — `ta.*` (EMA, SMA, RSI, ATR, Supertrend, MACD, Bollinger, Stochastic, VWAP…), `strategy.*` (entries/exits, position & trade metrics), visual primitives (`plot`, `line`, `label`, `box`, `table`, `fill`), `barstate.*`, `syminfo.*`, `request.security()`, and more.
- **Strategy Metrics** — Computes net profit, win rate, profit factor, max drawdown, and closed-trade records.
- **Zero Runtime Dependencies** — 100% pure TypeScript, lightweight and tree-shakeable.
- **Universal** — Runs on Node.js (Fastify, Express, Web Workers) and in browsers (Vite, Next.js, React).
- **Compiled & Cached** — Pine Script is compiled to JavaScript and cached (LRU, 50 scripts) for fast repeated execution.

---

## Installation

### From Git (QuantTrade Ecosystem)

```bash
npm install git+https://github.com/akquant/pinescript.git#v1.0.0
```

### From npm Registry

```bash
npm install @quanttrade/pinescript
```

Or with Yarn / pnpm:

```bash
yarn add @quanttrade/pinescript
# or
pnpm add @quanttrade/pinescript
```

---

## Quick Start

```typescript
import { PineScriptRunner, type CandleData } from '@quanttrade/pinescript';

// 1. Prepare historical OHLCV candle data
const candles: CandleData[] = [
  { time: 1710000000, open: 100, high: 105, low: 99,  close: 104, volume: 1500 },
  { time: 1710000900, open: 104, high: 108, low: 103, close: 107, volume: 1800 },
  // ... more candles
];

// 2. Write (or load) a Pine Script
const source = `
//@version=5
strategy("EMA Trend Crossover", overlay=true, initial_capital=10000)

fastLen = input.int(9, "Fast Length")
slowLen = input.int(21, "Slow Length")

fastMA = ta.ema(close, fastLen)
slowMA = ta.ema(close, slowLen)

plot(fastMA, color=color.cyan,  title="Fast EMA")
plot(slowMA, color=color.orange, title="Slow EMA")

longCondition  = ta.crossover(fastMA, slowMA)
shortCondition = ta.crossunder(fastMA, slowMA)

if longCondition
    strategy.entry("Long", strategy.long)
if shortCondition
    strategy.entry("Short", strategy.short)
`;

// 3. Validate syntax (optional, no data needed)
const validation = PineScriptRunner.validate(source);
if (!validation.valid) {
  console.error('Syntax errors:', validation.errors);
}

// 4. Compile & execute against the candles
const result = PineScriptRunner.run(source, candles);

if (result.success) {
  console.log('Strategy:',        result.strategyName);
  console.log('Plots:',           result.plots);
  console.log('Signals:',         result.signals);
  console.log('Performance:',     result.strategyMetrics);
} else {
  console.error('Runtime errors:', result.errors);
}
```

### Overriding script inputs

The optional third argument to `run()` overrides `input.*` values declared in the script:

```typescript
const result = PineScriptRunner.run(source, candles, {
  fastLen: 12,
  slowLen: 26,
});
```

---

## API Reference

The primary entry point is the static `PineScriptRunner` class.

### `PineScriptRunner.validate(code: string): PineScriptValidation`

Performs lexical + syntax validation **without** executing against data. Fast way to check a script for errors.

- **Returns:** `{ valid: boolean; errors: string[] }`

### `PineScriptRunner.run(code: string, candles: CandleData[], inputs?: Record<string, any>): PineScriptRunResult`

Compiles the script (with caching) and executes it bar-by-bar over the given OHLCV candles.

- **`candles`** — ordered array of [`CandleData`](#candledata). Timestamps may be in seconds or milliseconds (ms values are auto-normalized).
- **`inputs`** — optional map to override `input.*` values declared in the script.
- **Returns:** [`PineScriptRunResult`](#pinescriptrunresult)

### `PineScriptRunner.clearCache(): void`

Empties the internal compilation cache (useful in long-running processes or tests).

---

## Supported Built-ins

### `ta.*` — Technical Analysis
`ema` · `sma` · `rma` · `wma` · `vwma` · `rsi` · `atr` · `tr` · `supertrend` · `macd` · `bollingerBands` · `stoch` · `cci` · `vwap` · `roc` · `change` · `crossover` · `crossunder` · `cum` · `highest` · `lowest` · `pivothigh` · `pivotlow` · `fixnan` · `sum` · `avg` · `barssince` and more.

### `strategy.*` — Strategy Execution
`strategy.entry` · `strategy.exit` · `strategy.close` · `strategy.cancel` · plus state such as `position_size`, `position_avg_price`, `equity`, and closed-trade metrics.

### Visual Primitives
`plot` · `hline` · `fill` · `plotshape` · `line.*` · `label.*` · `box.*` · `table.*`

### Environment & Context
`time` · `timenow` · `bar_index` · `barstate.*` · `syminfo.*` · `timeframe.*` · `math.*` · `str.*`

### Multi-Timeframe
`request.security()`

> The engine aims for 1:1 parity with TradingView's calculated values so signals match between your charts and the runtime.

---

## TypeScript Types

All major types are exported for full type-safety:

| Type | Description |
|------|-------------|
| `CandleData` | `{ open, high, low, close, volume, time }` input bar. |
| `PineScriptValidation` | `{ valid, errors }` returned by `validate()`. |
| `PineScriptRunResult` | Full result of `run()` (plots, signals, metrics, visual objects, errors). |
| `PlotData` | A single plot with its `{ time, value }` series. |
| `StrategySignal` | `{ type: 'BUY' \| 'SELL' \| 'CLOSE', price, timestamp, reason }`. |
| `StrategyPerformanceMetrics` | `{ netProfit, winRate, profitFactor, maxDrawdown, totalTrades, closedTrades }`. |
| `LineDrawing` / `LabelDrawing` / `BoxDrawing` / `TableDrawing` / `FillDrawing` | Visual drawing objects produced by the script. |

```typescript
import type {
  CandleData,
  PineScriptRunResult,
  StrategySignal,
  StrategyPerformanceMetrics,
} from '@quanttrade/pinescript';
```

### `PineScriptRunResult` shape

```typescript
interface PineScriptRunResult {
  success: boolean;
  strategyName?: string;
  overlay?: boolean;
  plots: PlotData[];
  signals: StrategySignal[];
  errors: string[];
  strategyMetrics?: StrategyPerformanceMetrics;
  lines?: LineDrawing[];
  labels?: LabelDrawing[];
  boxes?: BoxDrawing[];
  tables?: TableDrawing[];
  fills?: FillDrawing[];
  executionResult?: unknown;
  metadata?: unknown;
}
```

---

## Requirements

- **Node.js** `>= 20` (or any modern browser)
- **TypeScript** `>= 5` (for type consumption; the package ships its own `.d.ts`)

---

## Development

```bash
# 1. Clone the repository
git clone https://github.com/loctai/pinescript.git
cd pinescript

# 2. Install dependencies
npm install

# 3. Build the production bundle (outputs to dist/)
npm run build

# 4. Remove build output
npm run clean
```

---

## Testing

```bash
npm test
```

Runs the [Vitest](https://vitest.dev) test suite.

---

## Releasing a New Version

> **Maintainers only.** npm does not allow re-publishing an existing version — you must bump the version first.

1. Bump the version (this also updates `package-lock.json`):

   ```bash
   npm version patch    # 1.0.0 -> 1.0.1  (bug fixes)
   npm version minor    # 1.0.0 -> 1.1.0  (new features, backward compatible)
   npm version major    # 1.0.0 -> 2.0.0  (breaking changes)
   ```

2. Publish (a `prepublishOnly` hook runs the build automatically):

   ```bash
   npm publish
   ```

3. Push the commit and version tag:

   ```bash
   git push origin main --tags
   ```

### Publishing with a token

Publishing requires an npm **Granular Access Token** with **Read and write** permission (enable **"Bypass two-factor authentication"** if your account has 2FA). Create one at <https://www.npmjs.com/settings/loctaivan/tokens>, then either:

```bash
export NPM_TOKEN="npm_xxxxxxxxxxxx"
npm publish
```

…or log in interactively with `npm login --registry=https://registry.npmjs.org`.

> `publishConfig` in `package.json` already targets `https://registry.npmjs.org` with `access: public`, so scoped packages are published publicly by default.

### Automated releases via GitHub Actions

The workflow at [`.github/workflows/publish.yml`](.github/workflows/publish.yml) publishes automatically when a **GitHub Release** is created (or via manual dispatch). It runs tests, builds, and publishes using the `NPM_TOKEN` repository secret.

---

## Contributing

Contributions are welcome and appreciated! Whether it's a bug report, a feature request, or a pull request — thank you for helping improve the project.

1. **Fork** the repository and create a feature branch:
   ```bash
   git checkout -b feature/my-amazing-feature
   ```
2. **Make your changes** and add/update tests where it makes sense.
3. **Ensure the suite passes** and the build is clean:
   ```bash
   npm test
   npm run build
   ```
4. **Commit** with a clear message and open a **Pull Request**.

### Reporting Bugs / Requesting Features

Open an issue at <https://github.com/loctai/pinescript/issues>. When filing a bug, please include:
- A minimal Pine Script that reproduces the problem
- The input candle data (or a small synthetic sample)
- Expected vs. actual behavior, and your Node.js / package versions

### Good First Issues

Look for issues tagged `good first issue` — they're a great way to get started.

---

## Author

**loctaivan** — [github.com/loctaivan](https://github.com/loctaivan)

Repository: <https://github.com/loctai/pinescript>

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for the full text.

```
MIT © QuantTrade Team
```
