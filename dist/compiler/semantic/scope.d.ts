import { PineType } from './types';
import { SourceLocation } from '../lexer/token';
export interface SymbolInfo {
    name: string;
    type: PineType;
    /** true for `var`/`varip`/normal mutable, false for `const` inputs */
    mutable: boolean;
    /** Whether this symbol has been read at least once */
    used: boolean;
    loc: SourceLocation;
    /** true for built-in symbols (never warn as unused) */
    builtin: boolean;
    /** true if this is an input variable — cannot be reassigned */
    isInput: boolean;
}
/**
 * Single lexical scope frame.  Pine Script uses function-level scoping
 * (variables declared inside if/for/while ARE visible outside those blocks
 * within the same function), but we still layer scopes for correctness —
 * a lookup that finds nothing in the current frame bubbles up to parent.
 */
export declare class Scope {
    private symbols;
    readonly parent: Scope | null;
    constructor(parent?: Scope | null);
    /** Declare a symbol in this scope. Returns false if already declared here. */
    declare(info: SymbolInfo): boolean;
    /** Look up a symbol, walking parent chain. Returns undefined if not found. */
    lookup(name: string): SymbolInfo | undefined;
    /** Mark a symbol as used (walks parent chain). */
    markUsed(name: string): void;
    /** Get all symbols declared directly in this scope (not parents). */
    ownSymbols(): SymbolInfo[];
}
/**
 * Manages a stack of scopes throughout analysis.
 */
export declare class ScopeManager {
    private stack;
    constructor();
    get current(): Scope;
    push(): Scope;
    pop(): Scope;
    lookup(name: string): SymbolInfo | undefined;
    declare(info: SymbolInfo): boolean;
    markUsed(name: string): void;
    /** Collect all own symbols from the current scope (for unused-var checking). */
    ownSymbols(): SymbolInfo[];
    isGlobal(): boolean;
    /** Depth of the scope stack (1 = global). */
    depth(): number;
    /** Declare a built-in symbol in the global scope. */
    declareBuiltin(name: string, type: PineType): void;
    /** Re-declare a symbol (update its type) — used for reassignment narrowing. */
    update(name: string, type: PineType): void;
}
/** Create a SymbolInfo for a user-defined variable */
export declare function makeSymbol(name: string, type: PineType, loc: SourceLocation, options?: Partial<Pick<SymbolInfo, 'mutable' | 'isInput' | 'builtin'>>): SymbolInfo;
