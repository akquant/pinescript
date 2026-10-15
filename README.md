# @quanttrade/pinescript

Enterprise Pine Script v5 / v6 compiler, lexer, AST parser, and high-performance execution engine designed for QuantTrade Client Terminal & FCOM Trading Bot.

## Features

- **Pine Script Parser & AST:** Parses Pine Script indicators and strategies into structured AST.
- **Built-in Functions:** Full support for `ta.*` (EMA, SMA, RSI, ATR, SuperTrend, MACD, Bollinger Bands, Stochastics, etc.), `strategy.*` (entry, close, exit, equity, open/closed trades), `table.*`, `line.*`, `label.*`, `box.*`, and `request.security`.
- **Zero External Runtime Dependencies:** 100% pure TypeScript, ultra-fast and lightweight.
- **Dual Support:** Runs directly in browser (Vite/React) and server-side Node.js (Fastify/Worker threads).
- **Guaranteed Parity:** Ensures 1:1 identical signals and calculations between client chart rendering and trading bot execution.

---

## Installation

### Từ GitHub Packages

1. Tạo file `.npmrc` trong thư mục dự án (hoặc `~/.npmrc`):
```ini
@quanttrade:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_PAT
```
*(Token cần quyền `read:packages`)*

2. Cài đặt package:
```bash
npm install @quanttrade/pinescript
```

### Dùng Local File (Development)
```bash
npm install file:../pinescript
```

---

## Quick Start

```typescript
import { PineScriptRunner, type CandleData } from '@quanttrade/pinescript';

const candles: CandleData[] = [
  { time: 1710000000, open: 100, high: 105, low: 99, close: 104, volume: 1500 },
  // ...
];

const pineCode = `
//@version=5
strategy("EMA Cross", overlay=true)
fastMA = ta.ema(close, 9)
slowMA = ta.ema(close, 21)

plot(fastMA, color=color.cyan, title="Fast EMA")
plot(slowMA, color=color.orange, title="Slow EMA")

if ta.crossover(fastMA, slowMA)
    strategy.entry("Long", strategy.long)
if ta.crossunder(fastMA, slowMA)
    strategy.entry("Short", strategy.short)
`;

// 1. Kiểm tra cú pháp
const validation = PineScriptRunner.validate(pineCode);
if (!validation.valid) {
  console.error("Syntax errors:", validation.errors);
}

// 2. Chạy tính toán trên nến
const result = PineScriptRunner.run(pineCode, candles);
if (result.success) {
  console.log("Plots:", result.plots);
  console.log("Signals:", result.signals);
  console.log("Performance:", result.performance);
}
```

---

## Publishing to GitHub Packages

### Tự động qua GitHub Actions
Khi push code hoặc tạo Release trên nhánh `main`, file `.github/workflows/publish.yml` sẽ tự động build và publish package lên `npm.pkg.github.com` bằng `GITHUB_TOKEN`.

### Đăng thủ công bằng Terminal
```bash
# 1. Đăng nhập npm với GitHub Packages
npm login --scope=@quanttrade --registry=https://npm.pkg.github.com
# Username: <your-github-username>
# Password: <your-github-personal-access-token-with-write:packages>

# 2. Build & Publish
npm run build
npm publish
```
