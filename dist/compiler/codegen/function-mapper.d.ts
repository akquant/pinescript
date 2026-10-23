export declare const BUILTIN_VARS: Set<string>;
export declare const COLOR_CONSTANTS: Record<string, string>;
export declare const BUILTIN_FUNCTIONS: Record<string, string | null>;
export declare class FunctionMapper {
    /**
     * Map a dotted name (e.g. "ta.sma") to its runtime equivalent.
     * Returns null if not found (user-defined or unmapped).
     */
    mapFunction(name: string): string | undefined;
    /**
     * Map a color constant (e.g. "color.blue") to its hex string.
     * Returns null if not a color constant.
     */
    mapColor(name: string): string | undefined;
    /**
     * Check if an identifier is a built-in variable (open, close, etc.)
     */
    isBuiltinVar(name: string): boolean;
    /**
     * Map a built-in var name to its runtime path.
     */
    mapBuiltinVar(name: string): string;
    /**
     * Map a series builtin accessed with index (e.g. close[1]) to seriesGet call.
     */
    mapSeriesGet(name: string, indexExpr: string): string;
}
