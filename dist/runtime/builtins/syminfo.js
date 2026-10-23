"use strict";
// Pine Script v6 syminfo built-in module
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSyminfo = createSyminfo;
/**
 * Create a default syminfo object.
 * Users can override individual fields when loading real market data.
 */
function createSyminfo() {
    return {
        ticker: 'AAPL',
        tickerid: 'NASDAQ:AAPL',
        prefix: 'NASDAQ',
        root: 'AAPL',
        mintick: 0.01,
        pointvalue: 1,
        timezone: 'America/New_York',
        type: 'stock',
        session: 'regular',
        basecurrency: 'USD',
        currency: 'USD',
        description: 'Apple Inc.',
    };
}
//# sourceMappingURL=syminfo.js.map