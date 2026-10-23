export declare const NA: number;
export type NaType = number;
export declare function isNa(val: unknown): boolean;
export declare function nz(val: unknown, replacement?: number): number;
export declare function fixnan(val: unknown): number;
export declare function naAdd(a: unknown, b: unknown): number | typeof NA;
export declare function naSub(a: unknown, b: unknown): number | typeof NA;
export declare function naMul(a: unknown, b: unknown): number | typeof NA;
export declare function naDiv(a: unknown, b: unknown): number | typeof NA;
