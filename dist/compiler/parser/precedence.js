"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INFIX_OPERATORS = void 0;
exports.getInfixInfo = getInfixInfo;
const token_1 = require("../lexer/token");
// Map from TokenType to infix operator info
exports.INFIX_OPERATORS = {
    [token_1.TokenType.QUESTION]: { precedence: 1 /* Precedence.TERNARY */, associativity: 'right' },
    [token_1.TokenType.OR]: { precedence: 2 /* Precedence.OR */, associativity: 'left' },
    [token_1.TokenType.AND]: { precedence: 3 /* Precedence.AND */, associativity: 'left' },
    [token_1.TokenType.EQ]: { precedence: 5 /* Precedence.EQUALITY */, associativity: 'left' },
    [token_1.TokenType.NEQ]: { precedence: 5 /* Precedence.EQUALITY */, associativity: 'left' },
    [token_1.TokenType.LT]: { precedence: 6 /* Precedence.COMPARISON */, associativity: 'left' },
    [token_1.TokenType.LTE]: { precedence: 6 /* Precedence.COMPARISON */, associativity: 'left' },
    [token_1.TokenType.GT]: { precedence: 6 /* Precedence.COMPARISON */, associativity: 'left' },
    [token_1.TokenType.GTE]: { precedence: 6 /* Precedence.COMPARISON */, associativity: 'left' },
    [token_1.TokenType.PLUS]: { precedence: 7 /* Precedence.TERM */, associativity: 'left' },
    [token_1.TokenType.MINUS]: { precedence: 7 /* Precedence.TERM */, associativity: 'left' },
    [token_1.TokenType.STAR]: { precedence: 8 /* Precedence.FACTOR */, associativity: 'left' },
    [token_1.TokenType.SLASH]: { precedence: 8 /* Precedence.FACTOR */, associativity: 'left' },
    [token_1.TokenType.PERCENT]: { precedence: 8 /* Precedence.FACTOR */, associativity: 'left' },
};
function getInfixInfo(type) {
    return exports.INFIX_OPERATORS[type] ?? null;
}
//# sourceMappingURL=precedence.js.map