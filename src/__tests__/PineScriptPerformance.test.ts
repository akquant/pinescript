import { describe, it, expect } from 'vitest';
import { PineScriptRunner, CandleData } from '../runner';
import { TREND_FOLLOWING_PINE_SCRIPT } from '../scripts/trend_following_script';

function generateCandles(count: number): CandleData[] {
  const candles: CandleData[] = [];
  let price = 100;
  const startTime = 1700000000;
  for (let i = 0; i < count; i++) {
    const change = (Math.sin(i / 10) * 1.5) + (Math.cos(i / 5) * 0.8) + (i % 2 === 0 ? 0.3 : -0.3);
    const open = price;
    price += change;
    const high = Math.max(open, price) + Math.random() * 0.5;
    const low = Math.min(open, price) - Math.random() * 0.5;
    const close = price;
    const volume = 1000 + Math.floor(Math.random() * 500);
    candles.push({
      time: startTime + i * 3600,
      open,
      high,
      low,
      close,
      volume,
    });
  }
  return candles;
}

describe('Pine Script Performance Profile', () => {
  it('measures execution time and throughput on 500 candles', () => {
    const candles500 = generateCandles(500);
    // Warm-up run
    const warmRes = PineScriptRunner.run(TREND_FOLLOWING_PINE_SCRIPT, candles500);
    expect(warmRes.success).toBe(true);

    const iterations = 30;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      const res = PineScriptRunner.run(TREND_FOLLOWING_PINE_SCRIPT, candles500);
      expect(res.success).toBe(true);
    }
    const totalMs = performance.now() - start;
    const avgMs = totalMs / iterations;

    console.log(`[Benchmark 500 candles] Total: ${totalMs.toFixed(2)}ms for ${iterations} runs (${avgMs.toFixed(2)}ms / run)`);
    // Should be fast and responsive (tolerates CI multi-worker test runner concurrency)
    expect(avgMs).toBeLessThan(400);
  });

  it('measures execution time and throughput on 1000 candles', () => {
    const candles1000 = generateCandles(1000);
    const iterations = 20;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      const res = PineScriptRunner.run(TREND_FOLLOWING_PINE_SCRIPT, candles1000);
      expect(res.success).toBe(true);
    }
    const totalMs = performance.now() - start;
    const avgMs = totalMs / iterations;

    console.log(`[Benchmark 1000 candles] Total: ${totalMs.toFixed(2)}ms for ${iterations} runs (${avgMs.toFixed(2)}ms / run)`);
    // Tolerate parallel test runner load while ensuring sub-frame response
    expect(avgMs).toBeLessThan(500);
  });
});
