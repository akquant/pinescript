"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContext = createContext;
const series_1 = require("./types/series");
const na_1 = require("./types/na");
const color_1 = require("./types/color");
const math_1 = require("./builtins/math");
const str_1 = require("./builtins/str");
const collections_1 = require("./builtins/collections");
const syminfo_1 = require("./builtins/syminfo");
const timeframe_1 = require("./builtins/timeframe");
const strategy_1 = require("./builtins/strategy");
const line_1 = require("./builtins/line");
const label_1 = require("./builtins/label");
const box_1 = require("./builtins/box");
const table_1 = require("./builtins/table");
const time_functions_1 = require("./builtins/time-functions");
/**
 * Parse session state for a bar timestamp.
 * Regular market hours: 09:30 - 16:00 Eastern Time (NYSE/NASDAQ default).
 * Pre-market: 04:00 - 09:30
 * Post-market: 16:00 - 20:00
 */
function parseSessionState(barTimeMs, _timezone) {
    // Get hour and minute in Eastern Time (ET, UTC-5/UTC-4)
    // We use a simple offset: EST = UTC-5, EDT = UTC-4. Use approximate UTC-5 for simplicity.
    // For proper TZ support, we convert using Intl.DateTimeFormat.
    const date = new Date(barTimeMs);
    const etFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
    });
    const parts = etFormatter.formatToParts(date);
    const hourPart = parts.find(p => p.type === 'hour');
    const minPart = parts.find(p => p.type === 'minute');
    const hour = parseInt(hourPart?.value ?? '0', 10);
    const minute = parseInt(minPart?.value ?? '0', 10);
    const timeMinutes = hour * 60 + minute;
    const marketOpen = 9 * 60 + 30; // 09:30
    const marketClose = 16 * 60; // 16:00
    const preOpen = 4 * 60; // 04:00
    const postClose = 20 * 60; // 20:00
    const ismarket = timeMinutes >= marketOpen && timeMinutes < marketClose;
    const ispremarket = timeMinutes >= preOpen && timeMinutes < marketOpen;
    const ispostmarket = timeMinutes >= marketClose && timeMinutes < postClose;
    return { ismarket, ispremarket, ispostmarket };
}
function createContext(builtins, ta, barsCount, lastBarTime = 0, executionTimenow = Date.now(), userInputs = {}) {
    const state = {};
    const persistentState = {};
    const inputs = { ...userInputs };
    let metadata = null;
    let initFn = null;
    let executeFn = null;
    let currentBarIndex = 0;
    let lastIndex = barsCount - 1;
    const plots = new Map();
    const hlines = [];
    const fills = [];
    const bgcolors = [];
    const barcolors = [];
    const plotshapes = new Map();
    const plotchars = new Map();
    const plotarrows = new Map();
    const plotcandles = new Map();
    const plotbars = new Map();
    const strategyEngine = (0, strategy_1.createStrategyEngine)();
    const userSeries = new Map();
    const lineModule = (0, line_1.createLineModule)();
    const labelModule = (0, label_1.createLabelModule)();
    const boxModule = (0, box_1.createBoxModule)();
    const tableModule = (0, table_1.createTableModule)();
    const timeFns = (0, time_functions_1.createTimeFunctions)(() => builtins.time.get(0));
    const barstateObj = {
        isfirst: true,
        islast: false,
        ishistory: true,
        isrealtime: false,
        isconfirmed: true,
    };
    const ctx = {
        // Expose Series objects directly. They have valueOf() which returns .get(0),
        // so they work as numbers in arithmetic (close + 1) and as Series for ta.sma(close, 20)
        get open() { return builtins.open; },
        get high() { return builtins.high; },
        get low() { return builtins.low; },
        get close() { return builtins.close; },
        get volume() { return builtins.volume; },
        get time() { return builtins.time.get(0); },
        get time_close() { return builtins.time.get(0); }, // approximation: same as time for now
        timenow: executionTimenow,
        get bar_index() { return currentBarIndex; },
        get last_bar_index() { return lastIndex; },
        last_bar_time: lastBarTime,
        get hl2() { return builtins.hl2; },
        get hlc3() { return builtins.hlc3; },
        get ohlc4() { return builtins.ohlc4; },
        series(name) {
            const b = builtins;
            return b[name];
        },
        ta,
        math: math_1.math,
        color: color_1.color,
        str: str_1.str,
        array: collections_1.arrayModule,
        map: collections_1.mapModule,
        matrix: collections_1.matrixModule,
        syminfo: (0, syminfo_1.createSyminfo)(),
        timeframe: (0, timeframe_1.createTimeframe)(undefined, () => builtins.time, () => currentBarIndex),
        chart: {
            fg_color: '#d1d4dc',
            bg_color: '#131722',
            is_standard: true,
            is_heikinashi: false,
            is_renko: false,
            is_kagi: false,
            is_pnf: false,
            is_linebreak: false,
            point: {
                now: (price) => ({ price, time: builtins.time ? builtins.time.get(0) : 0, index: currentBarIndex }),
                from_index: (index, price) => ({ index, price, time: 0 }),
                from_time: (time, price) => ({ time, price, index: 0 }),
            },
        },
        // Drawing objects
        line: lineModule,
        label: labelModule,
        box: boxModule,
        table: tableModule,
        // Time functions
        hour: timeFns.hour,
        minute: timeFns.minute,
        second: timeFns.second,
        dayofweek: timeFns.dayofweek,
        dayofmonth: timeFns.dayofmonth,
        month: timeFns.month,
        year: timeFns.year,
        timestamp: timeFns.timestamp,
        weekofyear: timeFns.weekofyear,
        timeInSession: timeFns.timeInSession,
        // Request module (stub — will be fully wired from engine)
        request: {
            security(..._args) { return na_1.NA; },
        },
        // Ticker module
        ticker: {
            new(...args) {
                return args.length >= 2 ? `${args[0]}:${args[1]}` : String(args[0] ?? '');
            },
            heikinashi(t) {
                return `${t}:heikinashi`;
            },
            renko(t) {
                return `${t}:renko`;
            },
            kagi(t) {
                return `${t}:kagi`;
            },
            linebreak(t) {
                return `${t}:linebreak`;
            },
            pointfigure(t) {
                return `${t}:pointfigure`;
            },
        },
        // Session module — check current bar time against regular market hours
        get session() {
            const barTime = builtins.time.get(0);
            const prevBarTime = builtins.time.get(1);
            const isFirst = currentBarIndex === 0 || (prevBarTime !== undefined && !isNaN(prevBarTime) &&
                new Date(barTime).getUTCDate() !== new Date(prevBarTime).getUTCDate());
            const isLast = currentBarIndex === lastIndex;
            const base = parseSessionState(barTime, 'America/New_York');
            return {
                ...base,
                isfirstbar: isFirst,
                islastbar: isLast,
                isfirstbar_regular: isFirst,
                islastbar_regular: isLast,
            };
        },
        // Runtime module
        runtime: {
            error(message) {
                const err = new Error(message);
                err.isRuntimeError = true;
                throw err;
            },
        },
        barstate: barstateObj,
        state,
        persistentState,
        plot(index, value, opts) {
            let plotData = plots.get(index);
            if (!plotData) {
                plotData = {
                    index,
                    title: opts?.title ?? `plot_${index}`,
                    color: (opts?.color && typeof opts.color === 'string') ? opts.color : '#2962FF',
                    linewidth: opts?.linewidth ?? 1,
                    style: opts?.style ?? 'line',
                    display: opts?.display,
                    values: [],
                };
                plots.set(index, plotData);
            }
            if (opts?.color && typeof opts.color === 'string' && opts.color !== 'transparent') {
                const cLower = opts.color.toLowerCase();
                if (plotData.color === '#2962FF' ||
                    plotData.color.startsWith('rgba(0,0,0') ||
                    plotData.color.startsWith('#d1d4dc') ||
                    plotData.color.startsWith('#787b86') ||
                    (!cLower.startsWith('#d1d4dc') && !cLower.startsWith('#787b86'))) {
                    plotData.color = opts.color;
                }
            }
            if (opts?.display && !plotData.display) {
                plotData.display = opts.display;
            }
            // Coerce Series objects to their current bar value
            const numValue = (value !== null && typeof value === 'object' && 'get' in value)
                ? value.get(0)
                : value;
            plotData.values.push({
                time: builtins.time.get(0),
                value: (0, na_1.isNa)(numValue) ? null : numValue,
            });
            return index;
        },
        hline(index, price, opts) {
            hlines.push({
                index,
                price,
                title: opts?.title ?? `hline_${index}`,
                color: opts?.color ?? '#787B86',
            });
            return index;
        },
        fill(p1, p2, opts) {
            const idx1 = typeof p1 === 'number' ? p1 : (typeof p1 === 'object' && p1 !== null && 'index' in p1 ? p1.index : 0);
            const idx2 = typeof p2 === 'number' ? p2 : (typeof p2 === 'object' && p2 !== null && 'index' in p2 ? p2.index : 1);
            const clr = opts?.color ?? 'rgba(0,0,0,0.1)';
            const existing = fills.find(f => f.plot1 === idx1 && f.plot2 === idx2);
            if (existing) {
                if (clr && clr !== 'transparent')
                    existing.color = clr;
            }
            else {
                fills.push({ plot1: idx1, plot2: idx2, color: clr, title: opts?.title });
            }
        },
        bgcolor(clr) {
            bgcolors.push({ time: builtins.time.get(0), color: clr });
        },
        barcolor(clr) {
            barcolors.push({ time: builtins.time.get(0), color: clr });
        },
        plotshape(index, series, opts) {
            let data = plotshapes.get(index);
            if (!data) {
                data = {
                    index,
                    title: opts?.title ?? `plotshape_${index}`,
                    style: opts?.style ?? 'triangleup',
                    location: opts?.location ?? 'abovebar',
                    color: opts?.color ?? '#2962FF',
                    size: opts?.size ?? 'normal',
                    values: [],
                };
                plotshapes.set(index, data);
            }
            const numValue = (series !== null && typeof series === 'object' && 'get' in series)
                ? series.get(0)
                : series;
            data.values.push({
                time: builtins.time.get(0),
                value: (0, na_1.isNa)(numValue) ? null : (numValue ? Number(numValue) : null),
                text: opts?.text ?? undefined,
            });
        },
        plotchar(index, series, opts) {
            let data = plotchars.get(index);
            if (!data) {
                data = {
                    index,
                    title: opts?.title ?? `plotchar_${index}`,
                    char: opts?.char ?? '•',
                    location: opts?.location ?? 'abovebar',
                    color: opts?.color ?? '#2962FF',
                    size: opts?.size ?? 'normal',
                    values: [],
                };
                plotchars.set(index, data);
            }
            const numValue = (series !== null && typeof series === 'object' && 'get' in series)
                ? series.get(0)
                : series;
            data.values.push({
                time: builtins.time.get(0),
                value: (0, na_1.isNa)(numValue) ? null : (numValue ? Number(numValue) : null),
                text: opts?.text ?? undefined,
            });
        },
        plotarrow(index, series, opts) {
            let data = plotarrows.get(index);
            if (!data) {
                data = {
                    index,
                    title: opts?.title ?? `plotarrow_${index}`,
                    colorup: opts?.colorup ?? '#4CAF50',
                    colordown: opts?.colordown ?? '#FF5252',
                    values: [],
                };
                plotarrows.set(index, data);
            }
            const numValue = (series !== null && typeof series === 'object' && 'get' in series)
                ? series.get(0)
                : series;
            data.values.push({
                time: builtins.time.get(0),
                value: (0, na_1.isNa)(numValue) ? null : Number(numValue),
            });
        },
        plotcandle(index, open, high, low, close, opts) {
            let data = plotcandles.get(index);
            if (!data) {
                data = {
                    index,
                    title: opts?.title ?? `plotcandle_${index}`,
                    color: opts?.color ?? '#2962FF',
                    wickcolor: opts?.wickcolor ?? '#737375',
                    bordercolor: opts?.bordercolor ?? '#2962FF',
                    values: [],
                };
                plotcandles.set(index, data);
            }
            const coerce = (v) => (v !== null && typeof v === 'object' && 'get' in v) ? v.get(0) : v;
            data.values.push({
                time: builtins.time.get(0),
                open: Number(coerce(open)),
                high: Number(coerce(high)),
                low: Number(coerce(low)),
                close: Number(coerce(close)),
            });
        },
        plotbar(index, open, high, low, close, opts) {
            let data = plotbars.get(index);
            if (!data) {
                data = {
                    index,
                    title: opts?.title ?? `plotbar_${index}`,
                    color: opts?.color ?? '#2962FF',
                    values: [],
                };
                plotbars.set(index, data);
            }
            const coerce = (v) => (v !== null && typeof v === 'object' && 'get' in v) ? v.get(0) : v;
            data.values.push({
                time: builtins.time.get(0),
                open: Number(coerce(open)),
                high: Number(coerce(high)),
                low: Number(coerce(low)),
                close: Number(coerce(close)),
            });
        },
        userSeriesSet(name, value) {
            let s = userSeries.get(name);
            if (!s) {
                s = new series_1.Series(510);
                userSeries.set(name, s);
            }
            // Extract scalar from Series objects
            const scalar = (value !== null && typeof value === 'object' && value && 'get' in value)
                ? value.get(0) : value;
            s.push(scalar);
        },
        userSeriesGet(name, offset) {
            const s = userSeries.get(name);
            if (!s)
                return na_1.NA;
            const val = s.get(offset);
            return val === undefined ? na_1.NA : val;
        },
        setMetadata(meta) {
            metadata = meta;
        },
        setInit(fn) {
            initFn = fn;
        },
        setExecute(fn) {
            executeFn = fn;
        },
        getInput(id) {
            if (id in inputs)
                return inputs[id];
            // Match case-insensitively or normalized (ignoring non-alphanumeric chars)
            const normId = id.toLowerCase().replace(/[^a-z0-9]/g, '');
            for (const [k, v] of Object.entries(inputs)) {
                if (k.toLowerCase() === id.toLowerCase() || k.toLowerCase().replace(/[^a-z0-9]/g, '') === normId) {
                    return v;
                }
            }
            // Fall back to metadata input defaults
            if (metadata) {
                const inputDef = metadata.inputs.find(i => i.id === id);
                if (inputDef)
                    return inputDef.defaultValue;
            }
            return undefined;
        },
        isNa: na_1.isNa,
        nz: na_1.nz,
        fixnan: na_1.fixnan,
        na: na_1.NA,
        toInt(val) {
            if (val === null || val === undefined || (0, na_1.isNa)(val))
                return null;
            const scalar = (val !== null && typeof val === 'object' && 'get' in val) ? val.get(0) : val;
            if (scalar === null || scalar === undefined || (0, na_1.isNa)(scalar))
                return null;
            const n = Number(scalar);
            return isNaN(n) ? null : Math.trunc(n);
        },
        toFloat(val) {
            if (val === null || val === undefined || (0, na_1.isNa)(val))
                return null;
            const scalar = (val !== null && typeof val === 'object' && 'get' in val) ? val.get(0) : val;
            if (scalar === null || scalar === undefined || (0, na_1.isNa)(scalar))
                return null;
            const n = Number(scalar);
            return isNaN(n) ? null : n;
        },
        toBool(val) {
            if (val === null || val === undefined || (0, na_1.isNa)(val))
                return false;
            const scalar = (val !== null && typeof val === 'object' && 'get' in val) ? val.get(0) : val;
            return Boolean(scalar);
        },
        toScalar: (v) => {
            if (v !== null && typeof v === 'object' && typeof v.valueOf === 'function' && ('buffer' in v || 'get' in v)) {
                return v.get(0);
            }
            return v;
        },
        strategy: strategyEngine,
        alert(_message, _freq) {
            // no-op stub
        },
        alertcondition(_condition, _title, _message) {
            // no-op stub
        },
        log: {
            info(_message) { },
            warning(_message) { },
            error(_message) { },
        },
    };
    function updateBar(barIdx, _builtins, _lastIndex) {
        currentBarIndex = barIdx;
        lastIndex = _lastIndex;
        barstateObj.isfirst = barIdx === 0;
        barstateObj.islast = barIdx === _lastIndex;
    }
    return {
        ctx,
        get metadata() { return metadata; },
        get initFn() { return initFn; },
        get executeFn() { return executeFn; },
        plots,
        hlines,
        fills,
        bgcolors,
        barcolors,
        plotshapes,
        plotchars,
        plotarrows,
        plotcandles,
        plotbars,
        strategyEngine,
        updateBar,
    };
}
//# sourceMappingURL=context.js.map