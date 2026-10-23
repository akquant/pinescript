"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndentTracker = void 0;
const token_1 = require("./token");
class IndentTracker {
    stack = [0];
    /**
     * Given the indentation level at the start of a new non-blank line,
     * return any INDENT or DEDENT tokens that should be emitted.
     */
    process(indentLevel, loc) {
        const tokens = [];
        const current = this.stack[this.stack.length - 1];
        if (indentLevel > current) {
            this.stack.push(indentLevel);
            tokens.push({ type: token_1.TokenType.INDENT, value: '', loc });
        }
        else if (indentLevel < current) {
            while (this.stack.length > 1 && this.stack[this.stack.length - 1] > indentLevel) {
                this.stack.pop();
                tokens.push({ type: token_1.TokenType.DEDENT, value: '', loc });
            }
        }
        return tokens;
    }
    /**
     * At EOF, emit DEDENTs for all remaining open indent levels.
     */
    finalize(loc) {
        const tokens = [];
        while (this.stack.length > 1) {
            this.stack.pop();
            tokens.push({ type: token_1.TokenType.DEDENT, value: '', loc });
        }
        return tokens;
    }
    currentLevel() {
        return this.stack[this.stack.length - 1];
    }
}
exports.IndentTracker = IndentTracker;
//# sourceMappingURL=indent-tracker.js.map