"use strict";
// Strategy backtesting engine for Pine Script v6
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStrategyEngine = createStrategyEngine;
function createStrategyEngine(initialCapital) {
    const capital = initialCapital ?? 100000;
    let currentEquity = capital;
    let position = null;
    const pendingOrders = [];
    const closedTrades = [];
    const equityCurve = [];
    const recordedSignals = [];
    let grossProfit = 0;
    let grossLoss = 0;
    // Current bar data (set by processBar before user code runs)
    let barIndex = 0;
    let barOpen = 0;
    let barHigh = 0;
    let barLow = 0;
    let barClose = 0;
    let barTime = 0;
    // Orders queued during user script execution (applied at NEXT bar)
    let queuedOrders = [];
    function fillOrder(order, fillPrice) {
        if (order.isEntry) {
            // Close any opposite position first
            if (position && position.direction !== order.direction) {
                closePosition(fillPrice, order.id);
            }
            // Open new position or add to existing
            if (!position) {
                position = {
                    direction: order.direction,
                    qty: order.qty,
                    avgPrice: fillPrice,
                    entryBar: barIndex,
                    entryTime: barTime,
                    entryId: order.id,
                };
            }
            else if (position.direction === order.direction) {
                // Pyramiding: average in
                const totalQty = position.qty + order.qty;
                position.avgPrice = (position.avgPrice * position.qty + fillPrice * order.qty) / totalQty;
                position.qty = totalQty;
            }
        }
        else {
            // Exit / close order
            if (position) {
                const qtyToClose = Math.min(order.qty, position.qty);
                closePositionPartial(fillPrice, qtyToClose, order.id);
            }
        }
    }
    function closePosition(exitPrice, exitId) {
        if (!position)
            return;
        closePositionPartial(exitPrice, position.qty, exitId);
    }
    function closePositionPartial(exitPrice, qty, exitId) {
        if (!position)
            return;
        const qtyToClose = Math.min(qty, position.qty);
        let profit;
        if (position.direction === 'long') {
            profit = (exitPrice - position.avgPrice) * qtyToClose;
        }
        else {
            profit = (position.avgPrice - exitPrice) * qtyToClose;
        }
        closedTrades.push({
            id: exitId,
            direction: position.direction,
            entryPrice: position.avgPrice,
            exitPrice,
            qty: qtyToClose,
            profit,
            entryBar: position.entryBar,
            exitBar: barIndex,
            entryTime: position.entryTime,
            exitTime: barTime,
        });
        if (profit > 0) {
            grossProfit += profit;
        }
        else {
            grossLoss += Math.abs(profit);
        }
        currentEquity += profit;
        if (qtyToClose >= position.qty) {
            position = null;
        }
        else {
            position.qty -= qtyToClose;
        }
    }
    function tryFillPending() {
        // Process pending orders against current bar's OHLC
        const remaining = [];
        for (const order of pendingOrders) {
            let filled = false;
            if (order.type === 'market') {
                // Market orders fill at this bar's open
                fillOrder(order, barOpen);
                filled = true;
            }
            else if (order.type === 'limit') {
                // Limit buy fills if low <= limitPrice; limit sell fills if high >= limitPrice
                const limitPrice = order.limitPrice;
                if (order.direction === 'long' && barLow <= limitPrice) {
                    fillOrder(order, limitPrice);
                    filled = true;
                }
                else if (order.direction === 'short' && barHigh >= limitPrice) {
                    fillOrder(order, limitPrice);
                    filled = true;
                }
            }
            else if (order.type === 'stop') {
                // Stop buy fills if high >= stopPrice; stop sell fills if low <= stopPrice
                const stopPrice = order.stopPrice;
                if (order.direction === 'long' && barHigh >= stopPrice) {
                    fillOrder(order, stopPrice);
                    filled = true;
                }
                else if (order.direction === 'short' && barLow <= stopPrice) {
                    fillOrder(order, stopPrice);
                    filled = true;
                }
            }
            if (!filled) {
                remaining.push(order);
            }
        }
        pendingOrders.length = 0;
        pendingOrders.push(...remaining);
    }
    function getUnrealizedPnL() {
        if (!position)
            return 0;
        if (position.direction === 'long') {
            return (barClose - position.avgPrice) * position.qty;
        }
        else {
            return (position.avgPrice - barClose) * position.qty;
        }
    }
    const engine = {
        entry(id, direction, qty, limit, stop) {
            const dir = direction === 'long' ? 'long' : 'short';
            const orderQty = qty ?? 1;
            // Guard: if position is already open in the same direction, avoid duplicate entry
            if (position && position.direction === dir) {
                return;
            }
            // Guard: if an entry in the same direction is already queued, avoid duplicate queue
            if (queuedOrders.some(o => o.isEntry && o.direction === dir)) {
                return;
            }
            let orderType = 'market';
            if (limit !== undefined)
                orderType = 'limit';
            else if (stop !== undefined)
                orderType = 'stop';
            // Remove any existing entry order with same id
            const idx = queuedOrders.findIndex(o => o.id === id && o.isEntry);
            if (idx >= 0)
                queuedOrders.splice(idx, 1);
            queuedOrders.push({
                id,
                direction: dir,
                qty: orderQty,
                type: orderType,
                limitPrice: limit,
                stopPrice: stop,
                isEntry: true,
            });
            // Avoid pushing duplicate signal for the same bar and direction
            const alreadySignaled = recordedSignals.some(s => s.timestamp === barTime && s.type === (dir === 'long' ? 'BUY' : 'SELL'));
            if (!alreadySignaled) {
                recordedSignals.push({
                    type: dir === 'long' ? 'BUY' : 'SELL',
                    price: barClose,
                    timestamp: barTime,
                    reason: id,
                });
            }
        },
        close(id, qty) {
            if (!position)
                return;
            // If id is specified, only close if position was entered with that id
            if (id && position.entryId !== id)
                return;
            queuedOrders.push({
                id: id ?? '__close__',
                direction: position.direction === 'long' ? 'short' : 'long',
                qty: qty ?? position.qty,
                type: 'market',
                isEntry: false,
            });
            recordedSignals.push({
                type: 'CLOSE',
                price: barClose,
                timestamp: barTime,
                reason: id ?? 'close',
            });
        },
        exit(id, fromEntry, profit, loss, limit, stop) {
            if (!position)
                return;
            if (fromEntry && position.entryId !== fromEntry)
                return;
            // Calculate limit/stop from profit/loss ticks relative to entry
            let exitLimit = limit;
            let exitStop = stop;
            if (profit !== undefined && exitLimit === undefined) {
                if (position.direction === 'long') {
                    exitLimit = position.avgPrice + profit;
                }
                else {
                    exitLimit = position.avgPrice - profit;
                }
            }
            if (loss !== undefined && exitStop === undefined) {
                if (position.direction === 'long') {
                    exitStop = position.avgPrice - loss;
                }
                else {
                    exitStop = position.avgPrice + loss;
                }
            }
            // Create limit exit if specified
            if (exitLimit !== undefined) {
                queuedOrders.push({
                    id,
                    direction: position.direction === 'long' ? 'short' : 'long',
                    qty: position.qty,
                    type: 'limit',
                    limitPrice: exitLimit,
                    isEntry: false,
                    fromEntry,
                });
            }
            // Create stop exit if specified
            if (exitStop !== undefined) {
                queuedOrders.push({
                    id: id + '_stop',
                    direction: position.direction === 'long' ? 'short' : 'long',
                    qty: position.qty,
                    type: 'stop',
                    stopPrice: exitStop,
                    isEntry: false,
                    fromEntry,
                });
            }
            // If neither limit nor stop, market exit
            if (exitLimit === undefined && exitStop === undefined) {
                queuedOrders.push({
                    id,
                    direction: position.direction === 'long' ? 'short' : 'long',
                    qty: position.qty,
                    type: 'market',
                    isEntry: false,
                    fromEntry,
                });
            }
        },
        order(id, direction, qty, limit, stop) {
            const dir = direction === 'long' ? 'long' : 'short';
            let orderType = 'market';
            if (limit !== undefined)
                orderType = 'limit';
            else if (stop !== undefined)
                orderType = 'stop';
            queuedOrders.push({
                id,
                direction: dir,
                qty,
                type: orderType,
                limitPrice: limit,
                stopPrice: stop,
                isEntry: true,
            });
        },
        cancel(id) {
            // Remove pending orders with this id
            for (let i = pendingOrders.length - 1; i >= 0; i--) {
                if (pendingOrders[i].id === id) {
                    pendingOrders.splice(i, 1);
                }
            }
            for (let i = queuedOrders.length - 1; i >= 0; i--) {
                if (queuedOrders[i].id === id) {
                    queuedOrders.splice(i, 1);
                }
            }
        },
        cancelAll() {
            pendingOrders.length = 0;
            queuedOrders.length = 0;
        },
        // Properties
        get position_size() {
            if (!position)
                return 0;
            return position.direction === 'long' ? position.qty : -position.qty;
        },
        get position_avg_price() {
            return position?.avgPrice ?? 0;
        },
        get equity() {
            return currentEquity + getUnrealizedPnL();
        },
        get closedtrades() {
            return closedTrades.length;
        },
        get opentrades() {
            return position ? 1 : 0;
        },
        get netprofit() {
            return currentEquity - capital;
        },
        get grossprofit() {
            return grossProfit;
        },
        get grossloss() {
            return grossLoss;
        },
        // Constants
        long: 'long',
        short: 'short',
        processBar(idx, open, high, low, close, time) {
            barIndex = idx;
            barOpen = open;
            barHigh = high;
            barLow = low;
            barClose = close;
            barTime = time;
            // Move queued orders from previous bar into pending
            // (Market orders from previous bar fill at this bar's open)
            if (queuedOrders.length > 0) {
                pendingOrders.push(...queuedOrders);
                queuedOrders = [];
            }
            // Try to fill pending orders
            tryFillPending();
            // Record equity curve point
            equityCurve.push({
                time: barTime,
                equity: currentEquity + getUnrealizedPnL(),
            });
        },
        getResult() {
            const totalTrades = closedTrades.length;
            const wins = closedTrades.filter(t => t.profit > 0).length;
            const winRate = totalTrades > 0 ? wins / totalTrades : 0;
            const totalProfit = closedTrades.filter(t => t.profit > 0).reduce((s, t) => s + t.profit, 0);
            const totalLoss = closedTrades.filter(t => t.profit < 0).reduce((s, t) => s + Math.abs(t.profit), 0);
            const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : (totalProfit > 0 ? Infinity : 0);
            // Calculate max drawdown from equity curve
            let peak = capital;
            let maxDrawdown = 0;
            for (const point of equityCurve) {
                if (point.equity > peak)
                    peak = point.equity;
                const drawdown = peak - point.equity;
                if (drawdown > maxDrawdown)
                    maxDrawdown = drawdown;
            }
            return {
                trades: closedTrades,
                equityCurve,
                netProfit: currentEquity - capital + getUnrealizedPnL(),
                totalTrades,
                winRate,
                profitFactor,
                maxDrawdown,
                signals: recordedSignals,
            };
        },
    };
    return engine;
}
//# sourceMappingURL=strategy.js.map