"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBarstate = createBarstate;
exports.makeBarstateProxy = makeBarstateProxy;
function createBarstate(barIndex, lastIndex) {
    return {
        isfirst: barIndex === 0,
        islast: barIndex === lastIndex,
        ishistory: true,
        isrealtime: false,
        isconfirmed: true,
    };
}
function makeBarstateProxy(state) {
    return state;
}
//# sourceMappingURL=barstate.js.map