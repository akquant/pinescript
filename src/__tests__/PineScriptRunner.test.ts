import { describe, it, expect } from 'vitest';
import { PineScriptRunner, CandleData } from '../executor';

describe('PineScriptRunner', () => {
  const mockCandles: CandleData[] = [];
  let basePrice = 100;
  for (let i = 0; i < 50; i++) {
    const time = 1700000000 + i * 900;
    // create a swing up then down
    basePrice += i < 25 ? 1 : -1;
    mockCandles.push({
      time,
      open: basePrice,
      high: basePrice + 1.5,
      low: basePrice - 1.5,
      close: basePrice + 0.5,
      volume: 1000 + i * 50,
    });
  }

  it('validates syntax correctly', () => {
    const validCode = `//@version=5
strategy("Test Strategy", overlay=true)
fastMA = ta.sma(close, 5)
slowMA = ta.sma(close, 10)
plot(fastMA, color=color.blue, title="Fast MA")
`;
    const res = PineScriptRunner.validate(validCode);
    expect(res.valid).toBe(true);
    expect(res.errors.length).toBe(0);
  });

  it('detects syntax errors properly', () => {
    const invalidCode = `//@version=5
strategy("Broken"
fastMA = ta.sma(close, 5
`;
    const res = PineScriptRunner.validate(invalidCode);
    expect(res.valid).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
  });

  it('compiles and executes SMA Crossover with plots and signals', () => {
    const script = `//@version=5
strategy("MA Cross", overlay=true)
fastMA = ta.sma(close, 5)
slowMA = ta.sma(close, 15)

if ta.crossover(fastMA, slowMA)
    strategy.entry("Long", strategy.long)

if ta.crossunder(fastMA, slowMA)
    strategy.entry("Short", strategy.short)

plot(fastMA, color=color.blue, title="Fast")
plot(slowMA, color=color.red, title="Slow")
`;

    const res = PineScriptRunner.run(script, mockCandles);
    expect(res.success).toBe(true);
    expect(res.strategyName).toBe('MA Cross');
    expect(res.plots.length).toBe(2);
    expect(res.plots[0].title).toBe('Fast');
    expect(res.plots[0].color).toBe('#3b82f6');
    expect(res.plots[0].data.length).toBeGreaterThan(0);
    expect(res.plots[1].title).toBe('Slow');
    expect(res.plots[1].color).toBe('#ef4444');

    // Should generate signals when crossover occurs
    expect(res.signals.length).toBeGreaterThan(0);
    expect(['BUY', 'SELL']).toContain(res.signals[0].type);
  });

  it('compiles and executes RSI Reversal strategy with plot', () => {
    const script = `//@version=5
strategy("RSI Reversal", overlay=false)
rsiVal = ta.rsi(close, 14)

if ta.crossover(rsiVal, 30)
    strategy.entry("RSI_Long", strategy.long)

if ta.crossunder(rsiVal, 70)
    strategy.entry("RSI_Short", strategy.short)

plot(rsiVal, color=color.purple, title="RSI")
`;

    const res = PineScriptRunner.run(script, mockCandles);
    expect(res.success).toBe(true);
    expect(res.strategyName).toBe('RSI Reversal');
    expect(res.plots.length).toBe(1);
    expect(res.plots[0].title).toBe('RSI');
    expect(res.plots[0].color).toBe('#a855f7');
    expect(res.plots[0].data.length).toBeGreaterThan(0);
  });

  it('compiles and executes LuxAlgo Support and Resistance Pine v4 script with ternary and pivots', () => {
    const luxAlgoScript = `// © LuxAlgo
//@version = 4
study(title=" Support and Resistance Levels with Breaks",shorttitle = " Support and Resistance Levels with Breaks [LuxAlgo]", overlay = true ,  max_bars_back=1000)
//
toggleBreaks  = input(true, title = "Show Breaks" )
leftBars  = input(15, title = "Left Bars ")
rightBars  = input(15, title = "Right Bars")
volumeThresh  = input(20, title = "Volume Threshold")
//
highUsePivot = fixnan(pivothigh(leftBars, rightBars)[1])
lowUsePivot = fixnan(pivotlow(leftBars, rightBars)[1])
r1 = plot(highUsePivot, color=change(highUsePivot) ? na : #FF0000,  linewidth=3, offset=-(rightBars+1), title="Resistance")
s1 = plot(lowUsePivot, color=change(lowUsePivot) ? na : #233dee,  linewidth=3, offset=-(rightBars+1), title="Support")

//Volume %
short = ema(volume, 5)
long = ema(volume, 10)
osc = 100 * (short - long) / long

//For breaks with volume
plotshape(toggleBreaks and crossunder(close,lowUsePivot) and not (open - close < high - open) and osc > volumeThresh, title = "Break", text = 'B', style = shape.labeldown, location = location.abovebar, color= color.red,textcolor = color.white, transp = 0, size = size.tiny)
plotshape(toggleBreaks and crossover(close,highUsePivot ) and not(open - low > close - open) and osc > volumeThresh, title = "Break", text = 'B', style = shape.labelup, location = location.belowbar, color= color.green,textcolor = color.white, transp = 0, size = size.tiny)

//For bull / bear wicks
plotshape(toggleBreaks and crossover(close,highUsePivot ) and open - low > close - open , title = "Break", text = 'Bull Wick', style = shape.labelup, location = location.belowbar, color= color.green,textcolor = color.white, transp = 0, size = size.tiny)
plotshape(toggleBreaks and crossunder(close,lowUsePivot) and open - close < high - open , title = "Break", text = 'Bear Wick', style = shape.labeldown, location = location.abovebar, color= color.red,textcolor = color.white, transp = 0, size = size.tiny)

alertcondition(crossunder(close,lowUsePivot) and osc > volumeThresh , title = "Support Broken" , message = "Support Broken")
alertcondition(crossover(close,highUsePivot) and osc > volumeThresh, title = "Resistance Broken" , message = "Resistance Broken")
`;

    const validation = PineScriptRunner.validate(luxAlgoScript);
    expect(validation.errors).toEqual([]);
    expect(validation.valid).toBe(true);

    const res = PineScriptRunner.run(luxAlgoScript, mockCandles);
    expect(res.success).toBe(true);
    expect(res.errors).toEqual([]);
    expect(res.plots.length).toBe(2);
    expect(res.plots[0].title).toBe('Resistance');
    expect(res.plots[1].title).toBe('Support');
  });

  it('compiles and executes SACT 3-in-1 script and extracts signals', () => {
    const sactScript = `//@version=5
indicator("SACT | UT Bot + Sonic R + Support Resistance", shorttitle="SACT 3-in-1", overlay=true, max_bars_back=1000)

sact_green = #4CAF50
sact_red = #FF5252
sact_white = #FFFFFF

sact_showUT = input.bool(true, "Show UT Bot Alerts", group="Display")
sact_showSonic = input.bool(true, "Show Sonic R", group="Display")
sact_showSR = input.bool(true, "Show Support and Resistance", group="Display")

ut_key = input.float(1.0, "Key Value. 'This changes the sensitivity'", group="UT Bot Alerts")
ut_atrPeriod = input.int(10, "ATR Period", minval=1, group="UT Bot Alerts")
ut_useHA = input.bool(false, "Signals from Heikin Ashi Candles", group="UT Bot Alerts")
ut_colorBars = input.bool(true, "Color bars", group="UT Bot Alerts")

ut_atr = ta.atr(ut_atrPeriod)
ut_loss = ut_key * ut_atr
ut_haClose = request.security(ticker.heikinashi(syminfo.tickerid), timeframe.period, close, lookahead=barmerge.lookahead_off)
ut_src = ut_useHA ? ut_haClose : close

ut_stop = 0.0
ut_stop := ut_src > nz(ut_stop[1], 0) and ut_src[1] > nz(ut_stop[1], 0) ? math.max(nz(ut_stop[1]), ut_src - ut_loss) : ut_src < nz(ut_stop[1], 0) and ut_src[1] < nz(ut_stop[1], 0) ? math.min(nz(ut_stop[1]), ut_src + ut_loss) : ut_src > nz(ut_stop[1], 0) ? ut_src - ut_loss : ut_src + ut_loss

ut_ema = ta.ema(ut_src, 1)
ut_above = ta.crossover(ut_ema, ut_stop)
ut_below = ta.crossover(ut_stop, ut_ema)
ut_buy = ut_src > ut_stop and ut_above
ut_sell = ut_src < ut_stop and ut_below
ut_barBuy = ut_src > ut_stop
ut_barSell = ut_src < ut_stop

plotshape(sact_showUT and ut_buy, title="UT Buy", text="Buy", style=shape.labelup, location=location.belowbar, color=sact_green, textcolor=sact_white, size=size.tiny)
plotshape(sact_showUT and ut_sell, title="UT Sell", text="Sell", style=shape.labeldown, location=location.abovebar, color=sact_red, textcolor=sact_white, size=size.tiny)
barcolor(sact_showUT and ut_colorBars and ut_barBuy ? sact_green : na, title="UT bullish bars")
barcolor(sact_showUT and ut_colorBars and ut_barSell ? sact_red : na, title="UT bearish bars")

alertcondition(ut_buy, title="UT Long", message="UT Long")
alertcondition(ut_sell, title="UT Short", message="UT Short")

// ---------------- Sonic R / VuTienTurtleTrader ----------------
sonic_signalLength = input.int(89, "EMA Signal", minval=1, group="Sonic R")
sonic_channelLength = input.int(50, "HiLo PAC EMA Length", minval=2, group="Sonic R")
sonic_showSignal = input.bool(false, "Show signal EMA", group="Sonic R")
sonic_showEMA200 = input.bool(false, "Show EMA 200", group="Sonic R")
sonic_showEMA610 = input.bool(false, "Show EMA 610", group="Sonic R")

sonic_pacC = ta.ema(close, sonic_channelLength)
sonic_pacL = ta.ema(low, sonic_channelLength)
sonic_pacH = ta.ema(high, sonic_channelLength)
sonic_signalMA = ta.ema(close, sonic_signalLength)
sonic_ema610 = ta.ema(close, 610)
sonic_ema200 = ta.ema(close, 200)
sonic_dodgerBlue = #1E90FF

// High/Low plot titles are swapped in the original source and retained here.
sonic_plotL = plot(sact_showSonic ? sonic_pacL : na, color=sonic_dodgerBlue, linewidth=1, title="High PAC EMA")
sonic_plotH = plot(sact_showSonic ? sonic_pacH : na, color=sonic_dodgerBlue, linewidth=1, title="Low PAC EMA")
sonic_plotC = plot(sact_showSonic ? sonic_pacC : na, color=sonic_dodgerBlue, linewidth=2, title="Close PAC EMA")
fill(sonic_plotL, sonic_plotH, color=color.new(#00FFFF, 90), title="Fill HiLo PAC")
plot(sact_showSonic and sonic_showEMA610 ? sonic_ema610 : na, color=sact_white, linewidth=1, title="EMA 610", display=sonic_showEMA610 ? display.all : display.none)
plot(sact_showSonic and sonic_showEMA200 ? sonic_ema200 : na, color=#FF00FF, linewidth=1, title="EMA 200", display=sonic_showEMA200 ? display.all : display.none)
plot(sact_showSonic and sonic_showSignal ? sonic_signalMA : na, color=#FF7F00, linewidth=4, title="Signal EMA", display=sonic_showSignal ? display.all : display.none)

// ---------------- Support and Resistance / LuxAlgo ----------------
sr_showBreaks = input.bool(true, "Show Breaks", group="Support and Resistance")
sr_leftBars = input.int(15, "Left Bars", minval=1, group="Support and Resistance")
sr_rightBars = input.int(15, "Right Bars", minval=1, group="Support and Resistance")
sr_volumeThreshold = input.float(20.0, "Volume Threshold", group="Support and Resistance")

sr_highPivot = fixnan(ta.pivothigh(sr_leftBars, sr_rightBars)[1])
sr_lowPivot = fixnan(ta.pivotlow(sr_leftBars, sr_rightBars)[1])
plot(sact_showSR ? sr_highPivot : na, color=ta.change(sr_highPivot) != 0 ? na : #FF0000, linewidth=3, offset=-(sr_rightBars + 1), title="Resistance")
plot(sact_showSR ? sr_lowPivot : na, color=ta.change(sr_lowPivot) != 0 ? na : #233DEE, linewidth=3, offset=-(sr_rightBars + 1), title="Support")

sr_shortVolume = ta.ema(volume, 5)
sr_longVolume = ta.ema(volume, 10)
sr_volumeOscillator = 100 * (sr_shortVolume - sr_longVolume) / sr_longVolume
sr_crossUnder = ta.crossunder(close, sr_lowPivot)
sr_crossOver = ta.crossover(close, sr_highPivot)

sr_breakDown = sr_showBreaks and sr_crossUnder and not (open - close < high - open) and sr_volumeOscillator > sr_volumeThreshold
sr_breakUp = sr_showBreaks and sr_crossOver and not (open - low > close - open) and sr_volumeOscillator > sr_volumeThreshold
sr_bullWick = sr_showBreaks and sr_crossOver and open - low > close - open
sr_bearWick = sr_showBreaks and sr_crossUnder and open - close < high - open

plotshape(sact_showSR and sr_breakDown, title="Support Break", text="B", style=shape.labeldown, location=location.abovebar, color=sact_red, textcolor=sact_white, size=size.tiny)
plotshape(sact_showSR and sr_breakUp, title="Resistance Break", text="B", style=shape.labelup, location=location.belowbar, color=sact_green, textcolor=sact_white, size=size.tiny)
plotshape(sact_showSR and sr_bullWick, title="Bull Wick", text="Bull Wick", style=shape.labelup, location=location.belowbar, color=sact_green, textcolor=sact_white, size=size.tiny)
plotshape(sact_showSR and sr_bearWick, title="Bear Wick", text="Bear Wick", style=shape.labeldown, location=location.abovebar, color=sact_red, textcolor=sact_white, size=size.tiny)

alertcondition(sr_crossUnder and sr_volumeOscillator > sr_volumeThreshold, title="Support Broken", message="Support Broken")
alertcondition(sr_crossOver and sr_volumeOscillator > sr_volumeThreshold, title="Resistance Broken", message="Resistance Broken")
`;
    const multiSwingCandles: CandleData[] = [];
    let price = 100;
    for (let i = 0; i < 90; i++) {
      const time = 1700000000 + i * 900;
      if (i < 30) price += 1;
      else if (i < 60) price -= 1;
      else price += 1;
      multiSwingCandles.push({
        time,
        open: price,
        high: price + 1.5,
        low: price - 1.5,
        close: price + 0.5,
        volume: 2000,
      });
    }

    const validation = PineScriptRunner.validate(sactScript);
    expect(validation.valid).toBe(true);

    const res = PineScriptRunner.run(sactScript, multiSwingCandles);
    expect(res.success).toBe(true);
    expect(res.plots.length).toBeGreaterThan(0);
    expect(res.signals.length).toBeGreaterThan(0);
  });

  it('compiles and executes Pine v5 Supertrend, Stochastic, VWAP, Arrays, and Math functions', () => {
    const v5Script = `//@version=5
indicator("V5 Advanced Test", overlay=true)

wmaVal = ta.wma(close, 10)
vwapVal = ta.vwap()
stochK = ta.stoch(close, high, low, 14, 3)
stResult = ta.supertrend(3.0, 10)
cciVal = ta.cci(close, 14)
sq = math.sqrt(100)

var floatArr = array.new_float(0, 0.0)
array.push(floatArr, close[0])

plot(wmaVal, title="WMA 10", color=color.blue)
plot(vwapVal, title="VWAP", color=color.purple)
plot(stochK, title="Stoch K", color=color.orange)
plot(cciVal, title="CCI", color=color.yellow)
`;

    const validation = PineScriptRunner.validate(v5Script);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);

    const res = PineScriptRunner.run(v5Script, mockCandles);
    expect(res.success).toBe(true);
    expect(res.plots.length).toBe(4);
    expect(res.plots[0].title).toBe('WMA 10');
    expect(res.plots[1].title).toBe('VWAP');
    expect(res.plots[2].title).toBe('Stoch K');
    expect(res.plots[3].title).toBe('CCI');
  });

  it('correctly isolates multiple EMA calls in the same script without state collision', () => {
    const script = `
//@version=5
indicator("EMA Isolation Test")
emaH = ta.ema(high, 50)
emaL = ta.ema(low, 50)
emaC = ta.ema(close, 50)
ema89 = ta.ema(close, 89)
plot(emaH, title="emaH")
plot(emaL, title="emaL")
plot(emaC, title="emaC")
plot(ema89, title="ema89")
`;
    const candles: CandleData[] = Array.from({ length: 60 }, (_, i) => ({
      time: 1700000000 + i * 60,
      open: 100 + i,
      high: 100 + i + 2,
      low: 100 + i - 2,
      close: 100 + i + 1,
      volume: 1000,
    }));

    const res = PineScriptRunner.run(script, candles);
    expect(res.success).toBe(true);

    const plotH = res.plots.find(p => p.title === 'emaH')!;
    const plotL = res.plots.find(p => p.title === 'emaL')!;
    const plotC = res.plots.find(p => p.title === 'emaC')!;
    const plot89 = res.plots.find(p => p.title === 'ema89')!;

    const lastBar = candles.length - 1;
    const lastCandle = candles[lastBar];

    const valH = plotH.data[lastBar].value;
    const valL = plotL.data[lastBar].value;
    const valC = plotC.data[lastBar].value;
    const val89 = plot89.data[lastBar].value;

    // EMA values should NOT equal raw candle prices (which was the bug where state reset every bar)
    expect(valH).not.toBe(lastCandle.high);
    expect(valL).not.toBe(lastCandle.low);
    expect(valC).not.toBe(lastCandle.close);

    // And EMA 89 should lag EMA 50
    expect(val89).toBeLessThan(valC);
    // High EMA should be higher than Low EMA
    expect(valH).toBeGreaterThan(valL);
  });

  it('compiles and executes Q Neon Pulse (qneo.pine) regime script', () => {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.resolve('/Users/aka/workspace/akabazan/quanttrade/fcom-trading-bot/qneo.pine');
    if (!fs.existsSync(filePath)) return;

    const code = fs.readFileSync(filePath, 'utf-8');
    const validation = PineScriptRunner.validate(code);
    expect(validation.errors).toEqual([]);
    expect(validation.valid).toBe(true);

    const testCandles: CandleData[] = Array.from({ length: 150 }, (_, i) => ({
      time: 1700000000 + i * 900,
      open: 100 + i * 0.1,
      high: 101 + i * 0.1,
      low: 99 + i * 0.1,
      close: 100.5 + i * 0.1,
      volume: 500 + i * 10,
    }));

    const res = PineScriptRunner.run(code, testCandles);
    expect(res.success).toBe(true);
    expect(res.errors).toEqual([]);
    expect(res.plots.length).toBeGreaterThan(0);
  });

  it('compiles and executes trend_following.pine strategy script', () => {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.resolve(__dirname, '../scripts/trend_following.pine');
    expect(fs.existsSync(filePath)).toBe(true);

    const code = fs.readFileSync(filePath, 'utf-8');
    const validation = PineScriptRunner.validate(code);
    expect(validation.errors).toEqual([]);
    expect(validation.valid).toBe(true);

    const testCandles: CandleData[] = Array.from({ length: 100 }, (_, i) => ({
      time: 1700000000 + i * 900,
      open: 100 + i * 0.5,
      high: 101 + i * 0.5,
      low: 99.5 + i * 0.5,
      close: 100.8 + i * 0.5,
      volume: 1000 + i * 10,
    }));

    const res = PineScriptRunner.run(code, testCandles);
    expect(res.success).toBe(true);
    expect(res.errors).toEqual([]);
    expect(res.plots.length).toBeGreaterThan(0);
    const emaPlot = res.plots.find(p => p.title === 'EMA basis' || p.title === 'Dynamic EMA');
    expect(emaPlot).toBeDefined();

    // Test custom input overriding
    const resCustom = PineScriptRunner.run(code, testCandles, {
      'EMA basis length': 10,
    });
    expect(resCustom.success).toBe(true);
    const customEma = resCustom.plots.find(p => p.title === 'EMA basis' || p.title === 'Dynamic EMA');
    expect(customEma).toBeDefined();
    expect(customEma?.data[99].value).not.toEqual(emaPlot?.data[99].value);
  });

  it('compiles and executes advanced Pine v6 indicator ETFSI Trend Stack with tables, functions, and EMAs', () => {
    const etfsiScript = `//@version=6
indicator("ETFSI Trend Stack", shorttitle = "Trend Stack", overlay = true, max_labels_count = 200)

len1 = input.int(20,  "Fast EMA")
len2 = input.int(50,  "Pullback EMA")
len3 = input.int(100, "EMA 3")
len4 = input.int(200, "EMA 4")

e1 = ta.ema(close, len1)
e2 = ta.ema(close, len2)
e3 = ta.ema(close, len3)
e4 = ta.ema(close, len4)

plot(e1, "Fast EMA", color = color.white)
plot(e2, "Pullback EMA", color = color.orange)
plot(e3, "EMA 3", color = color.aqua)
plot(e4, "EMA 4", color = color.blue)

bool crossUp = ta.crossover(e1, e2)
bool crossDn = ta.crossunder(e1, e2)
var bool trendOn = true
if crossDn
    trendOn := false
if crossUp
    trendOn := true

f_pct(v) =>
    na(v) ? "n/a" : (v >= 0 ? "+" : "") + str.tostring(v, "0.0") + "%"

if barstate.islast
    var table t = na
    table.delete(t)
    t := table.new(position.top_right, 2, 7)
    table.cell(t, 0, 0, "TREND STACK " + syminfo.ticker)
    table.merge_cells(t, 0, 0, 1, 0)
    table.cell(t, 0, 1, "Stack")
    table.cell(t, 1, 1, f_pct((close / e1 - 1) * 100.0))
`;

    const validation = PineScriptRunner.validate(etfsiScript);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);

    const testCandles: CandleData[] = Array.from({ length: 150 }, (_, i) => ({
      time: 1700000000 + i * 900,
      open: 100 + i * 0.2,
      high: 101 + i * 0.2,
      low: 99 + i * 0.2,
      close: 100.5 + i * 0.2,
      volume: 1000,
    }));

    const res = PineScriptRunner.run(etfsiScript, testCandles);
    expect(res.success).toBe(true);
    expect(res.errors).toEqual([]);
    expect(res.plots.length).toBe(4);
    expect(res.plots[0].title).toBe('Fast EMA');
    expect(res.plots[1].title).toBe('Pullback EMA');
    expect(res.plots[2].title).toBe('EMA 3');
    expect(res.plots[3].title).toBe('EMA 4');
  });

  it('compiles and executes script with scalar technical analysis expressions and chart builtins', () => {
    const script = `
//@version=6
indicator("Scalar Test", overlay=true)
len = input.int(14, "Length")
w1 = ta.wma(ta.tr(true), len)
r1 = ta.rma(ta.tr(true), len)
h1 = ta.hma(ta.tr(true), len)
s1 = ta.stdev(ta.tr(true), len)
c1 = color.new(color.blue, 50)
plot(w1, title="WMA TR", color=c1)
plot(r1, title="RMA TR", color=chart.fg_color)
`;

    const validation = PineScriptRunner.validate(script);
    expect(validation.valid).toBe(true);

    const testCandles: CandleData[] = Array.from({ length: 50 }, (_, i) => ({
      time: 1700000000 + i * 900,
      open: 100 + i,
      high: 102 + i,
      low: 99 + i,
      close: 101 + i,
      volume: 1000,
    }));

    const res = PineScriptRunner.run(script, testCandles);
    expect(res.success).toBe(true);
    expect(res.errors).toEqual([]);
    expect(res.plots.length).toBe(2);
    expect(res.plots[0].title).toBe('WMA TR');
    expect(res.plots[1].title).toBe('RMA TR');
  });

  it('compiles and executes script with dynamic plot colors and fills', () => {
    const script = `//@version=6
indicator("Fill and Color Test", overlay=true)
cBull = #089981
cBear = #F23645
e1 = ta.ema(close, 10)
e2 = ta.ema(close, 20)
p1 = plot(e1, "Fast", color=cBull)
p2 = plot(e2, "Slow", color=cBear)
fill(p1, p2, color=color.new(cBull, 80), title="Cloud Fill")
`;

    const validation = PineScriptRunner.validate(script);
    expect(validation.valid).toBe(true);

    const testCandles: CandleData[] = Array.from({ length: 30 }, (_, i) => ({
      time: 1700000000 + i * 900,
      open: 100 + i,
      high: 102 + i,
      low: 99 + i,
      close: 101 + i,
      volume: 1000,
    }));

    const res = PineScriptRunner.run(script, testCandles);
    expect(res.success).toBe(true);
    expect(res.plots.length).toBe(2);
    expect(res.plots[0].color).toBe('#089981');
    expect(res.plots[1].color).toBe('#F23645');
    expect(res.fills).toBeDefined();
    expect(res.fills!.length).toBe(1);
    expect(res.fills![0].plot1).toBe(0);
    expect(res.fills![0].plot2).toBe(1);
    expect(res.fills![0].color).toBe('#08998133');
    expect(res.fills![0].title).toBe('Cloud Fill');
  });
});


