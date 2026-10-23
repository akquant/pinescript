export type PineQualifier = 'const' | 'input' | 'simple' | 'series';
export type PineBaseType = 'int' | 'float' | 'bool' | 'string' | 'color' | 'na' | 'void' | 'line' | 'label' | 'box' | 'table' | 'array' | 'map' | 'matrix' | 'udt' | 'unknown';
export interface PineType {
    qualifier: PineQualifier;
    base: PineBaseType;
    /** For array<T>, map<K,V>, series<T> */
    typeArgs?: PineType[];
    /** For UDT — the declared type name */
    udtName?: string;
    /** Whether this type can be NA */
    nullable: boolean;
}
/** Return true if `q` can be used where `expected` is required. */
export declare function qualifierCompatible(q: PineQualifier, expected: PineQualifier): boolean;
export declare function makePineType(base: PineBaseType, qualifier?: PineQualifier, nullable?: boolean, typeArgs?: PineType[]): PineType;
/** SERIES float (the most common inferred type) */
export declare const FLOAT_SERIES: PineType;
/** SERIES int */
export declare const INT_SERIES: PineType;
/** SERIES bool */
export declare const BOOL_SERIES: PineType;
/** SERIES string */
export declare const STRING_SERIES: PineType;
/** SERIES color */
export declare const COLOR_SERIES: PineType;
/** NA type */
export declare const NA_TYPE: PineType;
/** void */
export declare const VOID_TYPE: PineType;
/** unknown (for inference failure) */
export declare const UNKNOWN_TYPE: PineType;
/** Base type compatibility — ignoring qualifiers */
export declare function baseTypesCompatible(a: PineBaseType, b: PineBaseType): boolean;
/** Full type compatibility check */
export declare function typesCompatible(actual: PineType, expected: PineType): boolean;
/** Widen two types to their common supertype (e.g. int + float -> float) */
export declare function widenTypes(a: PineType, b: PineType): PineType;
export declare function typeToString(t: PineType): string;
export interface BuiltinParam {
    name: string;
    type: PineType;
    optional?: boolean;
}
export interface BuiltinSignature {
    params: BuiltinParam[];
    returnType: PineType;
}
export interface BuiltinFunction {
    name: string;
    signatures: BuiltinSignature[];
}
