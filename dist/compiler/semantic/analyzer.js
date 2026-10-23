"use strict";
/**
 * Pine Script v6 Semantic Analyzer
 *
 * Walks the AST produced by the parser and:
 *  - Checks type compatibility in assignments and expressions
 *  - Validates scope (undeclared variables, shadowing)
 *  - Enforces qualifier rules (const / input / simple / series)
 *  - Warns about unused variables
 *  - Validates return types within user-defined functions
 *
 * The analyzer is NON-BLOCKING: it only appends to DiagnosticReporter and
 * never throws.  Compilation continues even when errors are found.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemanticAnalyzer = void 0;
exports.analyze = analyze;
const scope_1 = require("./scope");
const types_1 = require("./types");
// ── Built-in variable types ──────────────────────────────────────────────────
const BUILTIN_VARS = {
    open: types_1.FLOAT_SERIES,
    high: types_1.FLOAT_SERIES,
    low: types_1.FLOAT_SERIES,
    close: types_1.FLOAT_SERIES,
    volume: types_1.FLOAT_SERIES,
    time: types_1.INT_SERIES,
    bar_index: (0, types_1.makePineType)('int', 'series'),
    last_bar_index: (0, types_1.makePineType)('int', 'simple'),
    timenow: (0, types_1.makePineType)('int', 'simple'),
    hl2: types_1.FLOAT_SERIES,
    hlc3: types_1.FLOAT_SERIES,
    ohlc4: types_1.FLOAT_SERIES,
    hlcc4: types_1.FLOAT_SERIES,
    na: types_1.NA_TYPE,
    true: (0, types_1.makePineType)('bool', 'const', false),
    false: (0, types_1.makePineType)('bool', 'const', false),
};
// ── Namespace return types (simplified) ────────────────────────────────────
const NAMESPACE_RETURN_TYPES = {
    // ta.*
    'ta.sma': types_1.FLOAT_SERIES,
    'ta.ema': types_1.FLOAT_SERIES,
    'ta.rsi': types_1.FLOAT_SERIES,
    'ta.macd': types_1.FLOAT_SERIES,
    'ta.bbands': types_1.FLOAT_SERIES,
    'ta.atr': types_1.FLOAT_SERIES,
    'ta.stoch': types_1.FLOAT_SERIES,
    'ta.cross': types_1.BOOL_SERIES,
    'ta.crossover': types_1.BOOL_SERIES,
    'ta.crossunder': types_1.BOOL_SERIES,
    'ta.highest': types_1.FLOAT_SERIES,
    'ta.lowest': types_1.FLOAT_SERIES,
    'ta.valuewhen': types_1.FLOAT_SERIES,
    'ta.barssince': types_1.INT_SERIES,
    // math.*
    'math.abs': types_1.FLOAT_SERIES,
    'math.ceil': types_1.INT_SERIES,
    'math.floor': types_1.INT_SERIES,
    'math.round': types_1.INT_SERIES,
    'math.sqrt': types_1.FLOAT_SERIES,
    'math.log': types_1.FLOAT_SERIES,
    'math.log10': types_1.FLOAT_SERIES,
    'math.exp': types_1.FLOAT_SERIES,
    'math.pow': types_1.FLOAT_SERIES,
    'math.max': types_1.FLOAT_SERIES,
    'math.min': types_1.FLOAT_SERIES,
    'math.sign': types_1.INT_SERIES,
    'math.pi': (0, types_1.makePineType)('float', 'const', false),
    'math.phi': (0, types_1.makePineType)('float', 'const', false),
    'math.e': (0, types_1.makePineType)('float', 'const', false),
    // str.*
    'str.tostring': types_1.STRING_SERIES,
    'str.tofloat': types_1.FLOAT_SERIES,
    'str.toint': types_1.INT_SERIES,
    'str.contains': types_1.BOOL_SERIES,
    'str.startswith': types_1.BOOL_SERIES,
    'str.endswith': types_1.BOOL_SERIES,
    'str.length': types_1.INT_SERIES,
    'str.lower': types_1.STRING_SERIES,
    'str.upper': types_1.STRING_SERIES,
    'str.trim': types_1.STRING_SERIES,
    'str.replace': types_1.STRING_SERIES,
    'str.split': (0, types_1.makePineType)('array', 'series', true, [types_1.STRING_SERIES]),
    'str.format': types_1.STRING_SERIES,
    'str.formatTime': types_1.STRING_SERIES,
    // input.*
    'input.int': (0, types_1.makePineType)('int', 'input'),
    'input.float': (0, types_1.makePineType)('float', 'input'),
    'input.bool': (0, types_1.makePineType)('bool', 'input'),
    'input.string': (0, types_1.makePineType)('string', 'input'),
    'input.color': (0, types_1.makePineType)('color', 'input'),
    'input': (0, types_1.makePineType)('float', 'input'),
    // array.*
    'array.new_float': (0, types_1.makePineType)('array', 'series', true, [types_1.FLOAT_SERIES]),
    'array.new_int': (0, types_1.makePineType)('array', 'series', true, [types_1.INT_SERIES]),
    'array.new_bool': (0, types_1.makePineType)('array', 'series', true, [types_1.BOOL_SERIES]),
    'array.new_string': (0, types_1.makePineType)('array', 'series', true, [types_1.STRING_SERIES]),
    'array.from': (0, types_1.makePineType)('array', 'series'),
    'array.size': types_1.INT_SERIES,
    'array.get': types_1.FLOAT_SERIES,
    'array.set': types_1.VOID_TYPE,
    'array.push': types_1.VOID_TYPE,
    'array.pop': types_1.FLOAT_SERIES,
    'array.shift': types_1.FLOAT_SERIES,
    'array.unshift': types_1.VOID_TYPE,
    'array.sum': types_1.FLOAT_SERIES,
    'array.avg': types_1.FLOAT_SERIES,
    'array.max': types_1.FLOAT_SERIES,
    'array.min': types_1.FLOAT_SERIES,
    'array.sort': types_1.VOID_TYPE,
    'array.reverse': types_1.VOID_TYPE,
    'array.includes': types_1.BOOL_SERIES,
    'array.indexof': types_1.INT_SERIES,
    'array.slice': (0, types_1.makePineType)('array', 'series'),
    'array.join': types_1.STRING_SERIES,
    'array.copy': (0, types_1.makePineType)('array', 'series'),
    'array.clear': types_1.VOID_TYPE,
    'array.insert': types_1.VOID_TYPE,
    'array.remove': types_1.FLOAT_SERIES,
    'array.fill': types_1.VOID_TYPE,
    'array.concat': makePipeType('array', 'series'),
    // drawing
    'line.new': (0, types_1.makePineType)('line', 'series'),
    'label.new': (0, types_1.makePineType)('label', 'series'),
    'box.new': (0, types_1.makePineType)('box', 'series'),
    'table.new': (0, types_1.makePineType)('table', 'series'),
    // request
    'request.security': types_1.FLOAT_SERIES,
    // strategy
    'strategy.entry': types_1.VOID_TYPE,
    'strategy.close': types_1.VOID_TYPE,
    'strategy.exit': types_1.VOID_TYPE,
    // timeframe
    'timeframe.inSeconds': types_1.INT_SERIES,
    // barstate
    'barstate.islast': (0, types_1.makePineType)('bool', 'series'),
    'barstate.isfirst': (0, types_1.makePineType)('bool', 'series'),
    'barstate.isrealtime': (0, types_1.makePineType)('bool', 'series'),
    'barstate.ishistory': (0, types_1.makePineType)('bool', 'series'),
    // plot fns (void)
    plot: types_1.VOID_TYPE,
    plotshape: types_1.VOID_TYPE,
    plotarrow: types_1.VOID_TYPE,
    plotcandle: types_1.VOID_TYPE,
    plotbar: types_1.VOID_TYPE,
    plotchar: types_1.VOID_TYPE,
    fill: types_1.VOID_TYPE,
    bgcolor: types_1.VOID_TYPE,
    barcolor: types_1.VOID_TYPE,
    hline: types_1.VOID_TYPE,
    indicator: types_1.VOID_TYPE,
    strategy: types_1.VOID_TYPE,
    library: types_1.VOID_TYPE,
};
// Helper to handle typo in the lookup table above
function makePipeType(base, qualifier, nullable = true) {
    return (0, types_1.makePineType)(base, qualifier, nullable);
}
// ── Operator result types ───────────────────────────────────────────────────
function binaryResultType(op, leftType, rightType) {
    const qual = leftType.qualifier === 'series' || rightType.qualifier === 'series'
        ? 'series'
        : leftType.qualifier === 'simple' || rightType.qualifier === 'simple'
            ? 'simple'
            : leftType.qualifier === 'input' || rightType.qualifier === 'input'
                ? 'input'
                : 'const';
    switch (op) {
        case '+':
        case '-':
        case '*':
        case '/':
        case '%':
            if (leftType.base === 'string' || rightType.base === 'string') {
                return (0, types_1.makePineType)('string', qual);
            }
            if (leftType.base === 'float' || rightType.base === 'float') {
                return (0, types_1.makePineType)('float', qual);
            }
            return (0, types_1.makePineType)('int', qual);
        case '==':
        case '!=':
        case '<':
        case '<=':
        case '>':
        case '>=':
            return (0, types_1.makePineType)('bool', qual);
        case 'and':
        case 'or':
            return (0, types_1.makePineType)('bool', qual);
        default:
            return types_1.UNKNOWN_TYPE;
    }
}
// ── Convert TypeAnnotation → PineType ───────────────────────────────────────
function annotationToType(ann) {
    const qualifier = (ann.qualifier ?? 'series');
    const base = mapBaseType(ann.baseType);
    const typeArgs = ann.typeArgs?.map(annotationToType);
    return { qualifier, base, nullable: true, typeArgs, udtName: base === 'udt' ? ann.baseType : undefined };
}
function mapBaseType(name) {
    switch (name) {
        case 'int': return 'int';
        case 'float': return 'float';
        case 'bool': return 'bool';
        case 'string': return 'string';
        case 'color': return 'color';
        case 'void': return 'void';
        case 'na': return 'na';
        case 'line': return 'line';
        case 'label': return 'label';
        case 'box': return 'box';
        case 'table': return 'table';
        case 'array': return 'array';
        case 'map': return 'map';
        case 'matrix': return 'matrix';
        default: return 'udt';
    }
}
// ── Main Analyzer Class ──────────────────────────────────────────────────────
class SemanticAnalyzer {
    reporter;
    scopes;
    /** Stack of expected return types for nested function declarations */
    returnTypeStack = [];
    /** Names of UDTs declared in the script */
    udtNames = new Set();
    constructor(reporter) {
        this.reporter = reporter;
        this.scopes = new scope_1.ScopeManager();
    }
    analyze(program) {
        this.registerBuiltins();
        // First pass: register top-level function and type declarations for
        // forward-reference support
        for (const stmt of program.body) {
            if (stmt.kind === 'FunctionDeclaration') {
                this.scopes.declareBuiltin(stmt.name, (0, types_1.makePineType)('unknown', 'series'));
            }
            else if (stmt.kind === 'TypeDeclaration') {
                this.udtNames.add(stmt.name);
                this.scopes.declareBuiltin(stmt.name, (0, types_1.makePineType)('udt', 'const', false));
            }
            else if (stmt.kind === 'EnumDeclaration') {
                this.scopes.declareBuiltin(stmt.name, (0, types_1.makePineType)('unknown', 'const', false));
            }
        }
        for (const stmt of program.body) {
            this.analyzeStatement(stmt);
        }
        // Warn about unused user variables at top level
        this.checkUnusedVariables();
    }
    // ── Statements ─────────────────────────────────────────────────────────────
    analyzeStatement(stmt) {
        switch (stmt.kind) {
            case 'VariableDeclaration':
                this.analyzeVarDecl(stmt);
                break;
            case 'FunctionDeclaration':
                this.analyzeFuncDecl(stmt);
                break;
            case 'MethodDeclaration':
                this.analyzeMethodDecl(stmt);
                break;
            case 'TypeDeclaration':
                this.analyzeTypeDecl(stmt);
                break;
            case 'EnumDeclaration':
                this.analyzeEnumDecl(stmt);
                break;
            case 'IfStatement':
                this.analyzeIfStmt(stmt);
                break;
            case 'ForStatement':
                this.analyzeForStmt(stmt);
                break;
            case 'ForInStatement':
                this.analyzeForInStmt(stmt);
                break;
            case 'WhileStatement':
                this.analyzeWhileStmt(stmt);
                break;
            case 'SwitchStatement':
                this.analyzeSwitchStmt(stmt);
                break;
            case 'ReturnStatement':
                this.analyzeReturnStmt(stmt);
                break;
            case 'AssignmentStatement':
                this.analyzeAssignStmt(stmt);
                break;
            case 'ExpressionStatement':
                this.analyzeExprStmt(stmt);
                break;
            case 'ImportStatement':
            case 'ExportStatement':
            case 'BreakStatement':
            case 'ContinueStatement':
                break; // nothing to check
        }
    }
    analyzeVarDecl(decl) {
        const valueType = this.inferType(decl.value);
        // Resolve declared type from annotation if present
        let declaredType;
        if (decl.typeAnnotation) {
            declaredType = annotationToType(decl.typeAnnotation);
            if (!(0, types_1.typesCompatible)(valueType, declaredType)) {
                this.reporter.warning(`Type mismatch: cannot assign '${(0, types_1.typeToString)(valueType)}' to '${(0, types_1.typeToString)(declaredType)}'`, decl.loc);
            }
        }
        else {
            declaredType = valueType;
        }
        // const requires compile-time constant value
        if (decl.typeAnnotation?.qualifier === 'const' && valueType.qualifier !== 'const') {
            this.reporter.error(`'const' variable '${decl.name}' must be initialized with a compile-time constant`, decl.loc);
        }
        const mutable = decl.modifier !== null || decl.typeAnnotation?.qualifier !== 'const';
        if (decl.isTupleDestructure && decl.tupleNames) {
            // Declare each element of the tuple
            for (const name of decl.tupleNames) {
                this.declareVar(name, types_1.UNKNOWN_TYPE, decl.loc, { mutable });
            }
        }
        else {
            this.declareVar(decl.name, declaredType, decl.loc, { mutable });
        }
    }
    analyzeFuncDecl(decl) {
        const returnType = decl.returnType ? annotationToType(decl.returnType) : null;
        this.scopes.push();
        this.returnTypeStack.push(returnType);
        for (const param of decl.params) {
            const paramType = param.typeAnnotation
                ? annotationToType(param.typeAnnotation)
                : types_1.UNKNOWN_TYPE;
            this.declareVar(param.name, paramType, decl.loc, { mutable: false });
        }
        if (Array.isArray(decl.body)) {
            for (const stmt of decl.body) {
                this.analyzeStatement(stmt);
            }
        }
        else {
            this.inferType(decl.body);
        }
        // Check unused locals in function scope
        this.checkUnusedVariables();
        this.returnTypeStack.pop();
        this.scopes.pop();
    }
    analyzeMethodDecl(decl) {
        this.scopes.push();
        this.returnTypeStack.push(decl.returnType ? annotationToType(decl.returnType) : null);
        // 'this' parameter
        const thisType = (0, types_1.makePineType)('udt', 'series', true);
        thisType.udtName = decl.thisType;
        this.declareVar('this', thisType, decl.loc, { mutable: false });
        for (const param of decl.params) {
            const paramType = param.typeAnnotation
                ? annotationToType(param.typeAnnotation)
                : types_1.UNKNOWN_TYPE;
            this.declareVar(param.name, paramType, decl.loc, { mutable: false });
        }
        if (Array.isArray(decl.body)) {
            for (const stmt of decl.body) {
                this.analyzeStatement(stmt);
            }
        }
        else {
            this.inferType(decl.body);
        }
        this.checkUnusedVariables();
        this.returnTypeStack.pop();
        this.scopes.pop();
    }
    analyzeTypeDecl(decl) {
        this.udtNames.add(decl.name);
    }
    analyzeEnumDecl(_decl) {
        // Nothing to check semantically — codegen handles enum constant mapping
    }
    analyzeIfStmt(stmt) {
        const condType = this.inferType(stmt.condition);
        if (!(0, types_1.baseTypesCompatible)(condType.base, 'bool') && condType.base !== 'unknown') {
            this.reporter.warning(`Condition should be bool, got '${(0, types_1.typeToString)(condType)}'`, stmt.condition.loc);
        }
        this.scopes.push();
        for (const s of stmt.thenBlock)
            this.analyzeStatement(s);
        this.scopes.pop();
        if (stmt.elseBlock) {
            this.scopes.push();
            if (Array.isArray(stmt.elseBlock)) {
                for (const s of stmt.elseBlock)
                    this.analyzeStatement(s);
            }
            else {
                this.analyzeStatement(stmt.elseBlock);
            }
            this.scopes.pop();
        }
    }
    analyzeForStmt(stmt) {
        this.inferType(stmt.start);
        this.inferType(stmt.end);
        if (stmt.step)
            this.inferType(stmt.step);
        this.scopes.push();
        this.declareVar(stmt.variable, types_1.INT_SERIES, stmt.loc, { mutable: false });
        for (const s of stmt.body)
            this.analyzeStatement(s);
        this.scopes.pop();
    }
    analyzeForInStmt(stmt) {
        const iterType = this.inferType(stmt.iterable);
        this.scopes.push();
        // Declare loop variable — element type if array, else unknown
        const elemType = iterType.base === 'array' && iterType.typeArgs?.[0]
            ? iterType.typeArgs[0]
            : types_1.UNKNOWN_TYPE;
        this.declareVar(stmt.variable, elemType, stmt.loc, { mutable: false });
        if (stmt.indexVariable) {
            this.declareVar(stmt.indexVariable, types_1.INT_SERIES, stmt.loc, { mutable: false });
        }
        for (const s of stmt.body)
            this.analyzeStatement(s);
        this.scopes.pop();
    }
    analyzeWhileStmt(stmt) {
        this.inferType(stmt.condition);
        this.scopes.push();
        for (const s of stmt.body)
            this.analyzeStatement(s);
        this.scopes.pop();
    }
    analyzeSwitchStmt(stmt) {
        if (stmt.discriminant)
            this.inferType(stmt.discriminant);
        for (const c of stmt.cases) {
            for (const v of c.values)
                this.inferType(v);
            this.scopes.push();
            for (const s of c.body)
                this.analyzeStatement(s);
            this.scopes.pop();
        }
        if (stmt.defaultCase) {
            this.scopes.push();
            for (const s of stmt.defaultCase)
                this.analyzeStatement(s);
            this.scopes.pop();
        }
    }
    analyzeReturnStmt(stmt) {
        const expected = this.returnTypeStack[this.returnTypeStack.length - 1];
        if (!stmt.value)
            return;
        const actual = this.inferType(stmt.value);
        if (expected && !(0, types_1.typesCompatible)(actual, expected)) {
            this.reporter.warning(`Return type mismatch: expected '${(0, types_1.typeToString)(expected)}', got '${(0, types_1.typeToString)(actual)}'`, stmt.loc);
        }
    }
    analyzeAssignStmt(stmt) {
        const valueType = this.inferType(stmt.value);
        if (stmt.operator === '=') {
            // Initial assignment — this DECLARES the variable in Pine Script.
            // Declare it, then mark it "used" to avoid false unused warnings
            // if the value expression references it.
            if (stmt.target.kind === 'IdentifierExpression') {
                const name = stmt.target.name;
                // Detect if value is an input call → mark as input
                const isInput = this.isInputCall(stmt.value);
                this.declareVar(name, valueType, stmt.loc, { mutable: true, isInput });
                // Don't re-infer the target (it was just declared, inferType would error)
                return;
            }
            // Non-identifier target (e.g. array index) — just check types
            const targetType = this.inferType(stmt.target);
            if (targetType.base !== 'unknown' &&
                valueType.base !== 'unknown' &&
                !(0, types_1.typesCompatible)(valueType, targetType)) {
                this.reporter.warning(`Assignment type mismatch: target is '${(0, types_1.typeToString)(targetType)}', value is '${(0, types_1.typeToString)(valueType)}'`, stmt.loc);
            }
            return;
        }
        // Compound or reassign operators (:=, +=, -=, etc.)
        if (stmt.target.kind === 'IdentifierExpression') {
            const name = stmt.target.name;
            const sym = this.scopes.lookup(name);
            if (!sym) {
                this.reporter.error(`Undeclared variable '${name}'`, stmt.target.loc);
                return;
            }
            this.scopes.markUsed(name);
            if (stmt.operator === ':=') {
                if (!sym.mutable && !sym.builtin) {
                    this.reporter.error(`Cannot reassign immutable variable '${name}'`, stmt.loc);
                }
                if (sym.isInput) {
                    this.reporter.error(`Cannot reassign input variable '${name}'`, stmt.loc);
                }
            }
            // Type compatibility
            if (sym.type.base !== 'unknown' &&
                valueType.base !== 'unknown' &&
                !(0, types_1.typesCompatible)(valueType, sym.type)) {
                this.reporter.warning(`Assignment type mismatch: target is '${(0, types_1.typeToString)(sym.type)}', value is '${(0, types_1.typeToString)(valueType)}'`, stmt.loc);
            }
        }
        else {
            // Non-identifier target
            const targetType = this.inferType(stmt.target);
            if (targetType.base !== 'unknown' &&
                valueType.base !== 'unknown' &&
                !(0, types_1.typesCompatible)(valueType, targetType)) {
                this.reporter.warning(`Assignment type mismatch: target is '${(0, types_1.typeToString)(targetType)}', value is '${(0, types_1.typeToString)(valueType)}'`, stmt.loc);
            }
        }
    }
    /** Returns true if the expression is a call to an input.* function */
    isInputCall(expr) {
        if (expr.kind !== 'CallExpression')
            return false;
        const name = this.resolveCalleeName(expr.callee);
        if (!name)
            return false;
        return name === 'input' || name.startsWith('input.');
    }
    analyzeExprStmt(stmt) {
        this.inferType(stmt.expression);
    }
    // ── Expression type inference ───────────────────────────────────────────────
    inferType(expr) {
        switch (expr.kind) {
            case 'LiteralExpression':
                return this.inferLiteral(expr);
            case 'IdentifierExpression':
                return this.inferIdentifier(expr);
            case 'BinaryExpression':
                return this.inferBinary(expr);
            case 'UnaryExpression':
                return this.inferUnary(expr);
            case 'CallExpression':
                return this.inferCall(expr);
            case 'MemberExpression':
                return this.inferMember(expr);
            case 'IndexExpression':
                return this.inferIndex(expr);
            case 'ConditionalExpression':
                return this.inferConditional(expr);
            case 'IfExpression':
                return this.inferIfExpr(expr);
            case 'SwitchExpression':
                return this.inferSwitchExpr(expr);
            case 'ArrayLiteralExpression':
                return this.inferArrayLiteral(expr);
            case 'TupleExpression':
                return this.inferTuple(expr);
            case 'LambdaExpression':
                return this.inferLambda(expr);
            case 'GroupExpression':
                return this.inferType(expr.expression);
            default:
                return types_1.UNKNOWN_TYPE;
        }
    }
    inferLiteral(expr) {
        switch (expr.valueType) {
            case 'int': return (0, types_1.makePineType)('int', 'const', false);
            case 'float': return (0, types_1.makePineType)('float', 'const', false);
            case 'string': return (0, types_1.makePineType)('string', 'const', false);
            case 'bool': return (0, types_1.makePineType)('bool', 'const', false);
            case 'color': return (0, types_1.makePineType)('color', 'const', false);
            case 'na': return types_1.NA_TYPE;
            default: return types_1.UNKNOWN_TYPE;
        }
    }
    inferIdentifier(expr) {
        const sym = this.scopes.lookup(expr.name);
        if (!sym) {
            // Only report if it doesn't look like a namespace identifier
            if (!this.isKnownNamespace(expr.name)) {
                this.reporter.error(`Undeclared variable '${expr.name}'`, expr.loc);
            }
            return types_1.UNKNOWN_TYPE;
        }
        this.scopes.markUsed(expr.name);
        return sym.type;
    }
    inferBinary(expr) {
        const left = this.inferType(expr.left);
        const right = this.inferType(expr.right);
        return binaryResultType(expr.operator, left, right);
    }
    inferUnary(expr) {
        const operand = this.inferType(expr.operand);
        if (expr.operator === 'not')
            return (0, types_1.makePineType)('bool', operand.qualifier);
        if (expr.operator === '-' || expr.operator === '+')
            return operand;
        return types_1.UNKNOWN_TYPE;
    }
    inferCall(expr) {
        // Evaluate all args regardless
        for (const arg of expr.args) {
            this.inferType(arg.value);
        }
        // Resolve callee name
        const calleeName = this.resolveCalleeName(expr.callee);
        if (calleeName) {
            // Check if it's a known namespace function
            const rt = NAMESPACE_RETURN_TYPES[calleeName];
            if (rt)
                return rt;
            // Check if it's a user-defined function
            const sym = this.scopes.lookup(calleeName);
            if (sym) {
                this.scopes.markUsed(calleeName);
                return sym.type;
            }
            // input() shorthand
            if (calleeName === 'input')
                return (0, types_1.makePineType)('float', 'input');
        }
        return types_1.UNKNOWN_TYPE;
    }
    inferMember(expr) {
        this.inferType(expr.object);
        // Try to resolve namespace.member
        const objName = expr.object.kind === 'IdentifierExpression' ? expr.object.name : null;
        if (objName) {
            const key = `${objName}.${expr.property}`;
            const rt = NAMESPACE_RETURN_TYPES[key];
            if (rt)
                return rt;
        }
        return types_1.UNKNOWN_TYPE;
    }
    inferIndex(expr) {
        const objType = this.inferType(expr.object);
        this.inferType(expr.index);
        // array[n] -> element type
        if (objType.base === 'array' && objType.typeArgs?.[0]) {
            return objType.typeArgs[0];
        }
        // series history access myVar[n]
        return types_1.FLOAT_SERIES;
    }
    inferConditional(expr) {
        this.inferType(expr.condition);
        const thenType = this.inferType(expr.consequent);
        const elseType = this.inferType(expr.alternate);
        return (0, types_1.widenTypes)(thenType, elseType);
    }
    inferIfExpr(expr) {
        this.inferType(expr.condition);
        const thenType = this.inferType(expr.thenBranch);
        const elseType = expr.elseBranch ? this.inferType(expr.elseBranch) : types_1.NA_TYPE;
        return (0, types_1.widenTypes)(thenType, elseType);
    }
    inferSwitchExpr(expr) {
        if (expr.discriminant)
            this.inferType(expr.discriminant);
        const types = [];
        for (const c of expr.cases) {
            for (const v of c.values)
                this.inferType(v);
            types.push(this.inferType(c.body));
        }
        if (expr.defaultCase)
            types.push(this.inferType(expr.defaultCase));
        return types.reduce(types_1.widenTypes, types_1.NA_TYPE);
    }
    inferArrayLiteral(expr) {
        const elemTypes = expr.elements.map(e => this.inferType(e));
        const elemType = elemTypes.reduce(types_1.widenTypes, types_1.NA_TYPE);
        return (0, types_1.makePineType)('array', 'series', true, [elemType]);
    }
    inferTuple(_expr) {
        return types_1.UNKNOWN_TYPE; // tuples don't have a single type
    }
    inferLambda(expr) {
        this.scopes.push();
        for (const p of expr.params) {
            const pt = p.typeAnnotation ? annotationToType(p.typeAnnotation) : types_1.UNKNOWN_TYPE;
            this.declareVar(p.name, pt, expr.loc, { mutable: false });
        }
        const rt = this.inferType(expr.body);
        this.scopes.pop();
        return rt;
    }
    // ── Helpers ──────────────────────────────────────────────────────────────────
    resolveCalleeName(callee) {
        if (callee.kind === 'IdentifierExpression')
            return callee.name;
        if (callee.kind === 'MemberExpression') {
            const obj = this.resolveCalleeName(callee.object);
            if (obj)
                return `${obj}.${callee.property}`;
        }
        return null;
    }
    isKnownNamespace(name) {
        return [
            'ta', 'math', 'str', 'array', 'matrix', 'map',
            'color', 'syminfo', 'timeframe', 'barstate',
            'strategy', 'request', 'line', 'label', 'box', 'table',
            'input', 'alert', 'runtime',
        ].includes(name);
    }
    declareVar(name, type, loc, options = {}) {
        const sym = (0, scope_1.makeSymbol)(name, type, loc, {
            mutable: options.mutable ?? true,
            isInput: options.isInput ?? false,
        });
        const ok = this.scopes.declare(sym);
        if (!ok) {
            // Redeclaration — not necessarily an error in Pine (e.g. var redeclaration is allowed)
            // Just update the type
            this.scopes.update(name, type);
        }
    }
    checkUnusedVariables() {
        for (const sym of this.scopes.ownSymbols()) {
            if (!sym.used && !sym.builtin && sym.mutable) {
                this.reporter.warning(`Variable '${sym.name}' is declared but never used`, sym.loc);
            }
        }
    }
    registerBuiltins() {
        for (const [name, type] of Object.entries(BUILTIN_VARS)) {
            this.scopes.declareBuiltin(name, type);
        }
        // Register namespace identifiers so they don't trigger "undeclared"
        for (const ns of [
            'ta', 'math', 'str', 'array', 'matrix', 'map',
            'color', 'syminfo', 'timeframe', 'barstate',
            'strategy', 'request', 'line', 'label', 'box', 'table',
            'input', 'alert', 'runtime',
        ]) {
            this.scopes.declareBuiltin(ns, types_1.UNKNOWN_TYPE);
        }
        // Built-in functions that appear as identifiers
        for (const fn of ['plot', 'plotshape', 'plotarrow', 'plotcandle', 'plotbar', 'plotchar',
            'fill', 'bgcolor', 'barcolor', 'hline', 'indicator', 'strategy',
            'library', 'na', 'nz', 'fixnan', 'not', 'and', 'or']) {
            if (!this.scopes.lookup(fn)) {
                this.scopes.declareBuiltin(fn, types_1.VOID_TYPE);
            }
        }
    }
}
exports.SemanticAnalyzer = SemanticAnalyzer;
/**
 * Convenience function: run semantic analysis on a parsed AST.
 * Returns the reporter so callers can inspect diagnostics.
 */
function analyze(program, reporter) {
    const analyzer = new SemanticAnalyzer(reporter);
    analyzer.analyze(program);
}
//# sourceMappingURL=analyzer.js.map