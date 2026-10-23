"use strict";
// Pine Script type system definitions
Object.defineProperty(exports, "__esModule", { value: true });
exports.UNKNOWN_TYPE = exports.VOID_TYPE = exports.NA_TYPE = exports.COLOR_SERIES = exports.STRING_SERIES = exports.BOOL_SERIES = exports.INT_SERIES = exports.FLOAT_SERIES = void 0;
exports.qualifierCompatible = qualifierCompatible;
exports.makePineType = makePineType;
exports.baseTypesCompatible = baseTypesCompatible;
exports.typesCompatible = typesCompatible;
exports.widenTypes = widenTypes;
exports.typeToString = typeToString;
// ── Qualifier ordering ──────────────────────────────────────────────────────
const QUALIFIER_ORDER = {
    const: 0,
    input: 1,
    simple: 2,
    series: 3,
};
/** Return true if `q` can be used where `expected` is required. */
function qualifierCompatible(q, expected) {
    return QUALIFIER_ORDER[q] <= QUALIFIER_ORDER[expected];
}
// ── Helpers ─────────────────────────────────────────────────────────────────
function makePineType(base, qualifier = 'series', nullable = true, typeArgs) {
    return { qualifier, base, nullable, typeArgs };
}
/** SERIES float (the most common inferred type) */
exports.FLOAT_SERIES = makePineType('float', 'series');
/** SERIES int */
exports.INT_SERIES = makePineType('int', 'series');
/** SERIES bool */
exports.BOOL_SERIES = makePineType('bool', 'series');
/** SERIES string */
exports.STRING_SERIES = makePineType('string', 'series');
/** SERIES color */
exports.COLOR_SERIES = makePineType('color', 'series');
/** NA type */
exports.NA_TYPE = makePineType('na', 'series');
/** void */
exports.VOID_TYPE = makePineType('void', 'const', false);
/** unknown (for inference failure) */
exports.UNKNOWN_TYPE = makePineType('unknown', 'series');
/** Base type compatibility — ignoring qualifiers */
function baseTypesCompatible(a, b) {
    if (a === 'unknown' || b === 'unknown')
        return true;
    if (a === 'na' || b === 'na')
        return true; // na is compatible with everything
    if (a === b)
        return true;
    // int <-> float widening
    if ((a === 'int' && b === 'float') || (a === 'float' && b === 'int'))
        return true;
    return false;
}
/** Full type compatibility check */
function typesCompatible(actual, expected) {
    if (!baseTypesCompatible(actual.base, expected.base))
        return false;
    if (!qualifierCompatible(actual.qualifier, expected.qualifier))
        return false;
    return true;
}
/** Widen two types to their common supertype (e.g. int + float -> float) */
function widenTypes(a, b) {
    const qual = QUALIFIER_ORDER[a.qualifier] > QUALIFIER_ORDER[b.qualifier]
        ? a.qualifier
        : b.qualifier;
    let base = a.base;
    if (a.base === 'na')
        base = b.base;
    else if (b.base === 'na')
        base = a.base;
    else if (a.base === 'int' && b.base === 'float')
        base = 'float';
    else if (a.base === 'float' && b.base === 'int')
        base = 'float';
    else if (a.base !== b.base)
        base = 'unknown';
    return { qualifier: qual, base, nullable: a.nullable || b.nullable };
}
function typeToString(t) {
    const q = t.qualifier !== 'series' ? `${t.qualifier} ` : '';
    const b = t.udtName ?? t.base;
    if (t.typeArgs && t.typeArgs.length > 0) {
        return `${q}${b}<${t.typeArgs.map(typeToString).join(', ')}>`;
    }
    return `${q}${b}`;
}
//# sourceMappingURL=types.js.map