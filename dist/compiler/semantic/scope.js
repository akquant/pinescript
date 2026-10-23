"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScopeManager = exports.Scope = void 0;
exports.makeSymbol = makeSymbol;
/**
 * Single lexical scope frame.  Pine Script uses function-level scoping
 * (variables declared inside if/for/while ARE visible outside those blocks
 * within the same function), but we still layer scopes for correctness —
 * a lookup that finds nothing in the current frame bubbles up to parent.
 */
class Scope {
    symbols = new Map();
    parent;
    constructor(parent = null) {
        this.parent = parent;
    }
    /** Declare a symbol in this scope. Returns false if already declared here. */
    declare(info) {
        if (this.symbols.has(info.name))
            return false;
        this.symbols.set(info.name, info);
        return true;
    }
    /** Look up a symbol, walking parent chain. Returns undefined if not found. */
    lookup(name) {
        const sym = this.symbols.get(name);
        if (sym !== undefined)
            return sym;
        return this.parent?.lookup(name);
    }
    /** Mark a symbol as used (walks parent chain). */
    markUsed(name) {
        const sym = this.symbols.get(name);
        if (sym) {
            sym.used = true;
            return;
        }
        this.parent?.markUsed(name);
    }
    /** Get all symbols declared directly in this scope (not parents). */
    ownSymbols() {
        return [...this.symbols.values()];
    }
}
exports.Scope = Scope;
/**
 * Manages a stack of scopes throughout analysis.
 */
class ScopeManager {
    stack = [];
    constructor() {
        this.push(); // global scope
    }
    get current() {
        return this.stack[this.stack.length - 1];
    }
    push() {
        const scope = new Scope(this.stack.length > 0 ? this.current : null);
        this.stack.push(scope);
        return scope;
    }
    pop() {
        if (this.stack.length === 1)
            throw new Error('Cannot pop global scope');
        return this.stack.pop();
    }
    lookup(name) {
        return this.current.lookup(name);
    }
    declare(info) {
        return this.current.declare(info);
    }
    markUsed(name) {
        this.current.markUsed(name);
    }
    /** Collect all own symbols from the current scope (for unused-var checking). */
    ownSymbols() {
        return this.current.ownSymbols();
    }
    isGlobal() {
        return this.stack.length === 1;
    }
    /** Depth of the scope stack (1 = global). */
    depth() {
        return this.stack.length;
    }
    /** Declare a built-in symbol in the global scope. */
    declareBuiltin(name, type) {
        const dummyLoc = { line: 0, column: 0, offset: 0 };
        this.stack[0].declare({
            name,
            type,
            mutable: false,
            used: true,
            loc: dummyLoc,
            builtin: true,
            isInput: false,
        });
    }
    /** Re-declare a symbol (update its type) — used for reassignment narrowing. */
    update(name, type) {
        // Walk from innermost scope outward, update first match
        for (let i = this.stack.length - 1; i >= 0; i--) {
            const sym = this.stack[i].ownSymbols().find(s => s.name === name);
            if (sym) {
                sym.type = type;
                return;
            }
        }
    }
}
exports.ScopeManager = ScopeManager;
/** Create a SymbolInfo for a user-defined variable */
function makeSymbol(name, type, loc, options = {}) {
    return {
        name,
        type,
        mutable: options.mutable ?? true,
        used: false,
        loc,
        builtin: options.builtin ?? false,
        isInput: options.isInput ?? false,
    };
}
//# sourceMappingURL=scope.js.map