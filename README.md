# @loctai/pinescript

High-performance Pine Script v5 / v6 compiler, AST parser, and bar-by-bar execution engine written in TypeScript. Designed for real-time charting terminals and institutional algorithmic trading bots.

[![GitHub license](https://img.shields.io/badge/license-UNLICENSED-blue.svg)](https://github.com/loctai/pinescript)
[![Node Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org)

---

## Key Features

- **Pine Script v5/v6 Lexer & AST Parser:** Full tokenizer and grammar parser that compiles Pine Script into an optimized Abstract Syntax Tree (AST).
- **Bar-by-Bar Runtime Engine:** Replicates TradingView execution semantics with tick-level and close-of-bar calculations.
- **Built-in Functions & Namespaces:**
  - `ta.*`: EMA, SMA, RMA, WMA, VWMA, RSI, ATR, Supertrend, MACD, Bollinger Bands, Stochastics, etc.
  - `strategy.*`: `entry()`, `exit()`, `close()`, `cancel()`, `position_size`, `position_avg_price`, `equity`, and closed trade metrics.
  - Visual primitives: `plot()`, `hline()`, `fill()`, `line.*`, `label.*`, `box.*`, and `table.*`.
  - Environmental variables: `time`, `timenow`, `bar_index`, `barstate.*`, and `syminfo.*`.
  - Multi-timeframe requests: `request.security()`.
- **Zero External Runtime Dependencies:** 100% pure TypeScript. Ultra-fast, lightweight, and tree-shakeable.
- **Universal Dual Compatibility:** Runs seamlessly in the browser (Vite, Next.js, React) and on the server (Node.js Fastify, Express, Web Workers).
- **Guaranteed Parity:** Assures 1:1 identical signals and calculations across UI charts and execution engines.

---

## Installation

### 1. Configure Authentication (`.npmrc`)

GitHub Packages requires authentication to download packages. Create or update `.npmrc` in your project root or home directory (`~/.npmrc`):

```ini
@loctai:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_PERSONAL_ACCESS_TOKEN
```

> **Note:** The GitHub Personal Access Token (PAT) must have the `read:packages` scope enabled.

### 2. Install Package

```bash
npm install @loctai/pinescript
```

Or using Yarn / PNPM:

```bash
yarn add @loctai/pinescript
# or
pnpm add @loctai/pinescript
```

---

## Quick Start

```typescript
import { PineScriptRunner, type CandleData } from '@loctai/pinescript';

// 1. Prepare historical candle data
const candles: CandleData[] = [
  { time: 1710000000, open: 100, high: 105, low: 99, close: 104, volume: 1500 },
  { time: 1710000900, open: 104, high: 108, low: 103, close: 107, volume: 1800 },
  // ...
];

const pineScriptSource = `
//@version=5
strategy("EMA Trend Crossover", overlay=true, initial_capital=10000)

fastLen = input.int(9, "Fast Length")
slowLen = input.int(21, "Slow Length")

fastMA = ta.ema(close, fastLen)
slowMA = ta.ema(close, slowLen)

plot(fastMA, color=color.cyan, title="Fast EMA")
plot(slowMA, color=color.orange, title="Slow EMA")

longCondition = ta.crossover(fastMA, slowMA)
shortCondition = ta.crossunder(fastMA, slowMA)

if longCondition
    strategy.entry("Long", strategy.long)
if shortCondition
    strategy.entry("Short", strategy.short)
`;

// 2. Validate syntax
const validation = PineScriptRunner.validate(pineScriptSource);
if (!validation.valid) {
  console.error("Syntax Errors:", validation.errors);
}

// 3. Execute script across candles
const result = PineScriptRunner.run(pineScriptSource, candles);

if (result.success) {
  console.log("Plots:", result.plots);
  console.log("Signals:", result.signals);
  console.log("Performance Metrics:", result.strategyMetrics);
}
```

---

## API Reference

### `PineScriptRunner.validate(code: string): PineScriptValidation`
Performs static analysis, lexical analysis, and syntax validation without executing against data.
- **Returns:** `{ valid: boolean; errors: string[] }`

### `PineScriptRunner.run(code: string, candles: CandleData[], options?: RunnerOptions): PineScriptRunResult`
Executes Pine Script logic sequentially across the given array of OHLCV candles.
- **Returns:**
  - `success: boolean`
  - `plots: PlotData[]`
  - `signals: StrategySignal[]`
  - `strategyMetrics?: StrategyPerformanceMetrics`
  - `lines?: LineObject[]`
  - `labels?: LabelObject[]`
  - `boxes?: BoxObject[]`
  - `tables?: TableObject[]`
  - `fills?: FillDrawing[]`
  - `errors: string[]`

---

## Publishing Guide (How to Publish to GitHub Packages)

### Option A: Automatic via GitHub Actions (Recommended)

The repository includes an automated workflow at `.github/workflows/publish.yml`. Every time you push to the `main` branch or create a GitHub Release, GitHub Actions will:
1. Run automated test suites (`npm test`).
2. Build the production distribution (`npm run build`).
3. Publish to GitHub Packages automatically using the repository's `GITHUB_TOKEN`.

#### Workflow Steps:
1. Bump the version in `package.json`:
   ```bash
   npm version patch # or minor, or major
   ```
2. Push commits and tags to GitHub:
   ```bash
   git push origin main --tags
   ```
3. GitHub Actions will handle testing, building, and publishing automatically.

---

### Option B: Manual Publishing via Terminal

If you prefer to publish manually from your local development environment:

#### 1. Generate a GitHub Personal Access Token (Classic)
1. Go to **GitHub Settings** -> **Developer Settings** -> **Personal Access Tokens** -> **Tokens (classic)**.
2. Click **Generate new token**.
3. Select scopes:
   - `write:packages` (Upload packages to GitHub Package Registry)
   - `read:packages` (Download packages)
   - `repo` (Optional: needed for private repository metadata)
4. Copy the generated token (`ghp_xxxxxxxxxxxx`).

#### 2. Authenticate NPM CLI
```bash
npm login --scope=@loctai --registry=https://npm.pkg.github.com
```
When prompted:
- **Username:** Your GitHub username (`loctai`)
- **Password:** Paste the GitHub Personal Access Token (`ghp_...`)
- **Email:** Your GitHub account email

#### 3. Build and Publish
```bash
# 1. Clean and build the distribution
npm run build

# 2. Publish to GitHub Packages
npm publish
```

#### 4. Publishing Future Versions
Always bump the version number before running `npm publish`:
```bash
npm version patch   # 1.0.0 -> 1.0.1
npm run build
npm publish
```

---

## Development & Testing

```bash
# Clone the repository
git clone git@github.com:loctai/pinescript.git
cd pinescript

# Install dependencies
npm install

# Run Vitest test suite
npm test

# Build production dist
npm run build
```

---

## License

Proprietary & Confidential. All rights reserved by QuantTrade.
