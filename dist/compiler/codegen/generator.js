"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeGenerator = void 0;
const function_mapper_1 = require("./function-mapper");
// Known namespaces that should NOT be treated as method-call objects
const KNOWN_NAMESPACES = new Set([
    'ta', 'math', 'str', 'array', 'color', 'line', 'label', 'box', 'table',
    'request', 'syminfo', 'timeframe', 'barstate', 'strategy', 'log', 'ticker',
    'map', 'matrix', 'input', 'chart', 'runtime',
]);
// Stateful TA functions that require an isolated call-site ID to avoid state collision
const STATEFUL_TA_FUNCS = new Set([
    'ta.sma', 'sma',
    'ta.ema', 'ema',
    'ta.rsi', 'rsi',
    'ta.macd', 'macd',
    'ta.bb', 'bb',
    'ta.rma', 'rma',
    'ta.cum', 'cum',
    'ta.valuewhen', 'valuewhen',
    'ta.barssince', 'barssince',
    'ta.hma', 'hma',
    'ta.crossover', 'crossover',
    'ta.crossunder', 'crossunder',
    'ta.cross', 'cross',
]);
class CodeGenerator {
    reporter;
    mapper;
    // State for tracking var/varip declarations
    varDecls = new Map(); // name -> 'var' | 'varip'
    initLines = [];
    // Phase 3: Track variables that are used with history (myVar[1])
    historyVars = new Set();
    // Phase 3: Track variable types for method dispatch (name -> inferred namespace)
    varTypes = new Map();
    // UDT support: track declared type names and their field order
    udtTypes = new Set();
    udtFieldOrder = new Map();
    // UDT methods: track user-defined method names (methodName -> thisType)
    udtMethods = new Map();
    // Track user-defined color variables (e.g. cBull = #089981)
    userColors = new Map();
    // Counters for plot/hline indices
    plotIndex = 0;
    hlineIndex = 0;
    plotshapeIndex = 0;
    plotcharIndex = 0;
    plotarrowIndex = 0;
    plotcandleIndex = 0;
    plotbarIndex = 0;
    callSiteCounter = 0;
    // Metadata extracted from indicator()/strategy() calls
    metadata = {
        type: 'indicator',
        title: 'Pine Script',
        shorttitle: '',
        overlay: false,
        inputs: [],
        plots: [],
    };
    // Indentation
    indentLevel = 0;
    INDENT = '    ';
    constructor(reporter) {
        this.reporter = reporter;
        this.mapper = new function_mapper_1.FunctionMapper();
    }
    generate(program) {
        // Reset state
        this.varDecls = new Map();
        this.initLines = [];
        this.plotIndex = 0;
        this.hlineIndex = 0;
        this.plotshapeIndex = 0;
        this.plotcharIndex = 0;
        this.plotarrowIndex = 0;
        this.plotcandleIndex = 0;
        this.plotbarIndex = 0;
        this.callSiteCounter = 0;
        this.metadata = {
            type: 'indicator',
            title: 'Pine Script',
            shorttitle: '',
            overlay: false,
            inputs: [],
            plots: [],
        };
        // Reset Phase 3 state
        this.historyVars = new Set();
        this.varTypes = new Map();
        // Reset UDT state
        this.udtTypes = new Set();
        this.udtFieldOrder = new Map();
        this.udtMethods = new Map();
        // First pass: extract metadata and collect var/varip declarations
        this.firstPass(program);
        // Pre-scan AST for user variables accessed with history (myVar[1])
        this.scanForHistoryVars(program);
        // Second pass: generate execute body
        const executeLines = [];
        this.generateBody(program.body, executeLines, true);
        // Build the output
        const metaJson = JSON.stringify(this.metadata);
        const lines = [];
        lines.push('(function(__rt) {');
        lines.push(`    __rt.setMetadata(${metaJson});`);
        // Init function (only if there are var/varip)
        if (this.initLines.length > 0) {
            lines.push('    __rt.setInit(function() {');
            for (const l of this.initLines) {
                lines.push('        ' + l);
            }
            lines.push('    });');
        }
        lines.push('    __rt.setExecute(function() {');
        for (const l of executeLines) {
            lines.push('    ' + l);
        }
        lines.push('    });');
        lines.push('})');
        return {
            code: lines.join('\n'),
            metadata: this.metadata,
        };
    }
    // ───────── First pass: extract metadata (indicator/strategy calls) ─────────
    firstPass(program) {
        for (const stmt of program.body) {
            // Pre-register UDT type names so they're available for constructor detection
            if (stmt.kind === 'TypeDeclaration') {
                const td = stmt;
                this.udtTypes.add(td.name);
                this.udtFieldOrder.set(td.name, td.fields.map(f => f.name));
            }
            // Pre-register method names
            if (stmt.kind === 'MethodDeclaration') {
                const md = stmt;
                this.udtMethods.set(md.name, md.thisType);
            }
            if (stmt.kind === 'ExpressionStatement') {
                const expr = stmt.expression;
                if (expr.kind === 'CallExpression') {
                    const call = expr;
                    const calleeName = this.calleeToString(call.callee);
                    if (calleeName === 'indicator' || calleeName === 'study') {
                        this.extractIndicatorMeta(call);
                    }
                    else if (calleeName === 'strategy') {
                        this.extractStrategyMeta(call);
                    }
                }
            }
        }
    }
    extractIndicatorMeta(call) {
        this.metadata.type = 'indicator';
        const args = call.args;
        // indicator("Title", "short", overlay=true, ...)
        if (args[0]) {
            const v = this.getLiteralValue(args[0].value);
            if (typeof v === 'string')
                this.metadata.title = v;
        }
        if (args[1] && args[1].name === null) {
            const v = this.getLiteralValue(args[1].value);
            if (typeof v === 'string')
                this.metadata.shorttitle = v;
        }
        for (const arg of args) {
            if (arg.name === 'title') {
                const v = this.getLiteralValue(arg.value);
                if (typeof v === 'string')
                    this.metadata.title = v;
            }
            else if (arg.name === 'shorttitle') {
                const v = this.getLiteralValue(arg.value);
                if (typeof v === 'string')
                    this.metadata.shorttitle = v;
            }
            else if (arg.name === 'overlay') {
                const v = this.getLiteralValue(arg.value);
                if (typeof v === 'boolean')
                    this.metadata.overlay = v;
            }
        }
    }
    extractStrategyMeta(call) {
        this.metadata.type = 'strategy';
        const args = call.args;
        if (args[0]) {
            const v = this.getLiteralValue(args[0].value);
            if (typeof v === 'string')
                this.metadata.title = v;
        }
        for (const arg of args) {
            if (arg.name === 'title') {
                const v = this.getLiteralValue(arg.value);
                if (typeof v === 'string')
                    this.metadata.title = v;
            }
            else if (arg.name === 'shorttitle') {
                const v = this.getLiteralValue(arg.value);
                if (typeof v === 'string')
                    this.metadata.shorttitle = v;
            }
            else if (arg.name === 'overlay') {
                const v = this.getLiteralValue(arg.value);
                if (typeof v === 'boolean')
                    this.metadata.overlay = v;
            }
        }
    }
    /** Pre-scan the AST for IndexExpression where object is a non-builtin identifier. */
    scanForHistoryVars(program) {
        const visit = (node) => {
            if (!node || typeof node !== 'object')
                return;
            if (node.kind === 'IndexExpression') {
                const idx = node;
                if (idx.object && idx.object.kind === 'IdentifierExpression') {
                    const name = idx.object.name;
                    if (!this.mapper.isBuiltinVar(name) && name !== 'na') {
                        this.historyVars.add(name);
                    }
                }
            }
            // Recurse into all properties
            for (const key of Object.keys(node)) {
                const val = node[key];
                if (Array.isArray(val)) {
                    for (const item of val) {
                        if (item && typeof item === 'object') {
                            if (item.value && typeof item.value === 'object') {
                                visit(item.value);
                            }
                            else {
                                visit(item);
                            }
                        }
                    }
                }
                else if (val && typeof val === 'object') {
                    visit(val);
                }
            }
        };
        for (const stmt of program.body)
            visit(stmt);
    }
    /** Infer the namespace type from an RHS call expression. */
    inferTypeFromCall(calleeName) {
        if (calleeName.startsWith('array.new') || calleeName.startsWith('array.from') ||
            calleeName.startsWith('array.copy') || calleeName.startsWith('array.slice'))
            return 'array';
        if (calleeName === 'line.new' || calleeName === 'line.copy')
            return 'line';
        if (calleeName === 'label.new' || calleeName === 'label.copy')
            return 'label';
        if (calleeName === 'box.new' || calleeName === 'box.copy')
            return 'box';
        if (calleeName === 'table.new')
            return 'table';
        if (calleeName === 'map.new')
            return 'map';
        if (calleeName === 'matrix.new')
            return 'matrix';
        // UDT constructor: TypeName.new(...)
        if (calleeName.endsWith('.new')) {
            const typeName = calleeName.slice(0, -4);
            if (this.udtTypes.has(typeName))
                return typeName;
        }
        return null;
    }
    /** Infer the namespace type from a type annotation. */
    inferTypeFromAnnotation(baseType) {
        const typeMap = {
            'array': 'array', 'line': 'line', 'label': 'label',
            'box': 'box', 'table': 'table', 'map': 'map', 'matrix': 'matrix',
        };
        return typeMap[baseType] ?? null;
    }
    getLiteralValue(expr) {
        if (expr.kind === 'LiteralExpression') {
            return expr.value;
        }
        return undefined;
    }
    // ───────── Statement generation ─────────
    generateBody(stmts, out, isTopLevel = false) {
        for (const stmt of stmts) {
            this.generateStatement(stmt, out, isTopLevel);
        }
    }
    generateStatement(stmt, out, isTopLevel = false) {
        switch (stmt.kind) {
            case 'VariableDeclaration':
                this.genVarDecl(stmt, out, isTopLevel);
                break;
            case 'FunctionDeclaration':
                this.genFunctionDecl(stmt, out);
                break;
            case 'ExpressionStatement': {
                const es = stmt;
                // Skip top-level indicator/strategy calls — already handled in first pass
                if (isTopLevel && es.expression.kind === 'CallExpression') {
                    const calleeName = this.calleeToString(es.expression.callee);
                    if (calleeName === 'indicator' || calleeName === 'strategy' || calleeName === 'study') {
                        break;
                    }
                }
                const exprStr = this.genExpr(es.expression);
                out.push(this.indent() + exprStr + ';');
                break;
            }
            case 'AssignmentStatement':
                this.genAssignment(stmt, out);
                break;
            case 'IfStatement':
                this.genIfStatement(stmt, out);
                break;
            case 'ForStatement':
                this.genForStatement(stmt, out);
                break;
            case 'ForInStatement':
                this.genForInStatement(stmt, out);
                break;
            case 'WhileStatement':
                this.genWhileStatement(stmt, out);
                break;
            case 'SwitchStatement':
                this.genSwitchStatement(stmt, out);
                break;
            case 'ReturnStatement': {
                const rs = stmt;
                if (rs.value) {
                    out.push(this.indent() + `return ${this.genExpr(rs.value)};`);
                }
                else {
                    out.push(this.indent() + 'return;');
                }
                break;
            }
            case 'BreakStatement':
                out.push(this.indent() + 'break;');
                break;
            case 'ContinueStatement':
                out.push(this.indent() + 'continue;');
                break;
            case 'TypeDeclaration':
                this.genTypeDecl(stmt, out);
                break;
            case 'MethodDeclaration':
                this.genMethodDecl(stmt, out);
                break;
            case 'EnumDeclaration':
                this.genEnumDecl(stmt, out);
                break;
            // Skip ImportStatement, ExportStatement
            default:
                break;
        }
    }
    genVarDecl(decl, out, isTopLevel = false) {
        if (decl.isTupleDestructure && decl.tupleNames) {
            // [a, b, c] = ta.macd(...)
            const names = decl.tupleNames.join(', ');
            const valStr = this.genExpr(decl.value);
            out.push(this.indent() + `var [${names}] = ${valStr};`);
            // Track history and types for each tuple name
            for (const tname of decl.tupleNames) {
                if (this.historyVars.has(tname)) {
                    out.push(this.indent() + `__rt.userSeriesSet(${JSON.stringify(tname)}, ${tname});`);
                }
            }
            return;
        }
        const name = decl.name;
        // Infer type from annotation or RHS call
        if (decl.typeAnnotation) {
            const inferred = this.inferTypeFromAnnotation(decl.typeAnnotation.baseType);
            if (inferred)
                this.varTypes.set(name, inferred);
        }
        if (decl.value.kind === 'CallExpression') {
            const calleeName = this.calleeToString(decl.value.callee);
            const inferred = this.inferTypeFromCall(calleeName);
            if (inferred)
                this.varTypes.set(name, inferred);
        }
        const resolvedClr = this.resolveColor(decl.value);
        if (resolvedClr) {
            this.userColors.set(name, resolvedClr);
        }
        if (decl.modifier === 'var') {
            // var declarations: init in __rt.state on first bar, reference as __rt.state.x
            this.varDecls.set(name, 'var');
            const valStr = this.genExpr(decl.value);
            out.push(this.indent() + `if (!('${name}' in __rt.state)) { __rt.state.${name} = ${valStr}; }`);
            // In execute, just use __rt.state.x
            // Emit userSeriesSet for history-tracked var/varip
            if (this.historyVars.has(name)) {
                const store = `__rt.state.${name}`;
                out.push(this.indent() + `__rt.userSeriesSet(${JSON.stringify(name)}, ${store});`);
            }
        }
        else if (decl.modifier === 'varip') {
            // varip declarations: init in __rt.persistentState on first bar
            this.varDecls.set(name, 'varip');
            const valStr = this.genExpr(decl.value);
            out.push(this.indent() + `if (!('${name}' in __rt.persistentState)) { __rt.persistentState.${name} = ${valStr}; }`);
            if (this.historyVars.has(name)) {
                const store = `__rt.persistentState.${name}`;
                out.push(this.indent() + `__rt.userSeriesSet(${JSON.stringify(name)}, ${store});`);
            }
        }
        else {
            // Plain declaration
            const valStr = this.genExpr(decl.value);
            out.push(this.indent() + `var ${name} = ${valStr};`);
            // Emit userSeriesSet for history-tracked variables
            if (this.historyVars.has(name)) {
                out.push(this.indent() + `__rt.userSeriesSet(${JSON.stringify(name)}, ${name});`);
            }
        }
    }
    genFunctionDecl(decl, out) {
        const params = decl.params.map(p => p.name).join(', ');
        out.push(this.indent() + `function ${decl.name}(${params}) {`);
        this.indentLevel++;
        if (Array.isArray(decl.body)) {
            for (let i = 0; i < decl.body.length; i++) {
                const stmt = decl.body[i];
                const isLast = i === decl.body.length - 1;
                if (isLast && stmt.kind === 'ExpressionStatement') {
                    const exprStr = this.genExpr(stmt.expression);
                    out.push(this.indent() + `return ${exprStr};`);
                }
                else {
                    this.generateStatement(stmt, out, false);
                }
            }
        }
        else {
            // Expression body
            out.push(this.indent() + `return ${this.genExpr(decl.body)};`);
        }
        this.indentLevel--;
        out.push(this.indent() + '}');
    }
    genTypeDecl(decl, out) {
        const name = decl.name;
        // Register in case firstPass missed it (shouldn't happen, but be safe)
        this.udtTypes.add(name);
        this.udtFieldOrder.set(name, decl.fields.map(f => f.name));
        // Constructor function
        out.push(this.indent() + `function ${name}(fields) {`);
        this.indentLevel++;
        out.push(this.indent() + 'fields = fields || {};');
        for (const field of decl.fields) {
            const defVal = field.defaultValue
                ? this.genExpr(field.defaultValue)
                : this.defaultForType(field.typeAnnotation.baseType);
            out.push(this.indent() +
                `this.${field.name} = (fields.${field.name} !== undefined) ? fields.${field.name} : ${defVal};`);
        }
        this.indentLevel--;
        out.push(this.indent() + '}');
        // Static .new() factory
        out.push(this.indent() + `${name}.new = function(fields) { return new ${name}(fields || {}); };`);
    }
    genEnumDecl(decl, out) {
        const props = decl.members.map(m => `${m.name}: ${JSON.stringify(m.value ?? m.name)}`).join(', ');
        out.push(this.indent() + `var ${decl.name} = { ${props} };`);
    }
    defaultForType(baseType) {
        switch (baseType) {
            case 'float': return '__rt.na';
            case 'int': return '__rt.na';
            case 'bool': return 'false';
            case 'string': return '__rt.na';
            case 'color': return '__rt.na';
            default: return 'null'; // nested UDT or unknown
        }
    }
    genMethodDecl(decl, out) {
        const typeName = decl.thisType;
        // params already excludes the self/this param (parser slices params[1:])
        const params = decl.params.map(p => p.name).join(', ');
        out.push(this.indent() + `${typeName}.prototype.${decl.name} = function(${params}) {`);
        this.indentLevel++;
        out.push(this.indent() + 'var self = this;');
        if (Array.isArray(decl.body)) {
            for (let i = 0; i < decl.body.length; i++) {
                const stmt = decl.body[i];
                const isLast = i === decl.body.length - 1;
                if (isLast && stmt.kind === 'ExpressionStatement') {
                    const exprStr = this.genExpr(stmt.expression);
                    out.push(this.indent() + `return ${exprStr};`);
                }
                else {
                    this.generateStatement(stmt, out, false);
                }
            }
        }
        else {
            out.push(this.indent() + `return ${this.genExpr(decl.body)};`);
        }
        this.indentLevel--;
        out.push(this.indent() + '};');
    }
    genUdtConstructor(typeName, call) {
        const fieldNames = this.udtFieldOrder.get(typeName) ?? [];
        const parts = [];
        for (let i = 0; i < call.args.length; i++) {
            const arg = call.args[i];
            const key = arg.name ?? fieldNames[i];
            if (key !== undefined) {
                parts.push(`${key}: ${this.genExpr(arg.value)}`);
            }
            else {
                // Positional arg without field name mapping — emit as positional-ish
                parts.push(this.genExpr(arg.value));
            }
        }
        return `${typeName}.new({${parts.join(', ')}})`;
    }
    genAssignment(stmt, out) {
        const target = stmt.target;
        const op = stmt.operator;
        const rhs = this.genExpr(stmt.value);
        // Determine if target is a var/varip
        const targetName = this.getIdentName(target);
        if (targetName && this.varDecls.has(targetName)) {
            const storeType = this.varDecls.get(targetName);
            const store = storeType === 'varip' ? `__rt.persistentState.${targetName}` : `__rt.state.${targetName}`;
            if (op === ':=' || op === '=') {
                out.push(this.indent() + `${store} = __rt.toScalar(${rhs});`);
            }
            else {
                // Compound assignment: +=, -=, etc.
                const jsOp = op; // same operators in JS
                out.push(this.indent() + `${store} ${jsOp} __rt.toScalar(${rhs});`);
            }
            // Update user series for history tracking
            if (targetName && this.historyVars.has(targetName)) {
                out.push(this.indent() + `__rt.userSeriesSet(${JSON.stringify(targetName)}, ${store});`);
            }
        }
        else {
            const lhsStr = this.genExpr(target);
            if (op === ':=') {
                out.push(this.indent() + `${lhsStr} = ${rhs};`);
            }
            else {
                out.push(this.indent() + `${lhsStr} ${op} ${rhs};`);
            }
            // Update user series for history tracking
            if (targetName && this.historyVars.has(targetName)) {
                out.push(this.indent() + `__rt.userSeriesSet(${JSON.stringify(targetName)}, ${lhsStr});`);
            }
        }
    }
    getIdentName(expr) {
        if (expr.kind === 'IdentifierExpression') {
            return expr.name;
        }
        return null;
    }
    genIfStatement(stmt, out) {
        const cond = this.genExpr(stmt.condition);
        out.push(this.indent() + `if (${cond}) {`);
        this.indentLevel++;
        this.generateBody(stmt.thenBlock, out);
        this.indentLevel--;
        out.push(this.indent() + '}');
        if (stmt.elseBlock) {
            if (Array.isArray(stmt.elseBlock)) {
                out.push(this.indent() + 'else {');
                this.indentLevel++;
                this.generateBody(stmt.elseBlock, out);
                this.indentLevel--;
                out.push(this.indent() + '}');
            }
            else {
                // else if
                out.push(this.indent() + 'else {');
                this.indentLevel++;
                this.genIfStatement(stmt.elseBlock, out);
                this.indentLevel--;
                out.push(this.indent() + '}');
            }
        }
    }
    genForStatement(stmt, out) {
        const start = this.genExpr(stmt.start);
        const end = this.genExpr(stmt.end);
        const step = stmt.step ? this.genExpr(stmt.step) : '1';
        const v = stmt.variable;
        out.push(this.indent() + `for (var ${v} = ${start}; ${v} <= ${end}; ${v} += ${step}) {`);
        this.indentLevel++;
        this.generateBody(stmt.body, out);
        this.indentLevel--;
        out.push(this.indent() + '}');
    }
    genForInStatement(stmt, out) {
        const iter = this.genExpr(stmt.iterable);
        const v = stmt.variable;
        if (stmt.indexVariable) {
            // for [index, value] in arr → for (var __idx = 0; __idx < arr.length; __idx++) { var index = __idx; var value = arr[__idx]; ... }
            const idx = stmt.indexVariable;
            out.push(this.indent() + `for (var ${idx} = 0; ${idx} < ${iter}.length; ${idx}++) {`);
            this.indentLevel++;
            out.push(this.indent() + `var ${v} = ${iter}[${idx}];`);
            this.generateBody(stmt.body, out);
            this.indentLevel--;
            out.push(this.indent() + '}');
        }
        else {
            out.push(this.indent() + `for (var ${v} of ${iter}) {`);
            this.indentLevel++;
            this.generateBody(stmt.body, out);
            this.indentLevel--;
            out.push(this.indent() + '}');
        }
    }
    genWhileStatement(stmt, out) {
        const cond = this.genExpr(stmt.condition);
        out.push(this.indent() + `while (${cond}) {`);
        this.indentLevel++;
        this.generateBody(stmt.body, out);
        this.indentLevel--;
        out.push(this.indent() + '}');
    }
    genSwitchStatement(stmt, out) {
        if (stmt.discriminant) {
            const disc = this.genExpr(stmt.discriminant);
            out.push(this.indent() + `switch (${disc}) {`);
            this.indentLevel++;
            for (const c of stmt.cases) {
                for (const val of c.values) {
                    out.push(this.indent() + `case ${this.genExpr(val)}:`);
                }
                this.indentLevel++;
                this.generateBody(c.body, out);
                out.push(this.indent() + 'break;');
                this.indentLevel--;
            }
            if (stmt.defaultCase) {
                out.push(this.indent() + 'default:');
                this.indentLevel++;
                this.generateBody(stmt.defaultCase, out);
                this.indentLevel--;
            }
            this.indentLevel--;
            out.push(this.indent() + '}');
        }
        else {
            // Truthy switch without discriminant: emit as if-else chain
            let first = true;
            for (const c of stmt.cases) {
                const cond = c.values.map(v => this.genExpr(v)).join(' || ');
                if (first) {
                    out.push(this.indent() + `if (${cond}) {`);
                    first = false;
                }
                else {
                    out.push(this.indent() + `else if (${cond}) {`);
                }
                this.indentLevel++;
                this.generateBody(c.body, out);
                this.indentLevel--;
                out.push(this.indent() + '}');
            }
            if (stmt.defaultCase) {
                out.push(this.indent() + 'else {');
                this.indentLevel++;
                this.generateBody(stmt.defaultCase, out);
                this.indentLevel--;
                out.push(this.indent() + '}');
            }
        }
    }
    // ───────── Expression generation ─────────
    genExpr(expr) {
        switch (expr.kind) {
            case 'LiteralExpression':
                return this.genLiteral(expr);
            case 'IdentifierExpression':
                return this.genIdentifier(expr);
            case 'BinaryExpression':
                return this.genBinary(expr);
            case 'UnaryExpression':
                return this.genUnary(expr);
            case 'ConditionalExpression':
                return this.genConditional(expr);
            case 'CallExpression':
                return this.genCall(expr);
            case 'MemberExpression':
                return this.genMember(expr);
            case 'IndexExpression':
                return this.genIndex(expr);
            case 'ArrayLiteralExpression':
                return this.genArrayLiteral(expr);
            case 'GroupExpression':
                return `(${this.genExpr(expr.expression)})`;
            case 'TupleExpression': {
                const elems = expr.elements.map(e => this.genExpr(e));
                return `[${elems.join(', ')}]`;
            }
            case 'LambdaExpression':
                return this.genLambda(expr);
            case 'IfExpression':
                return this.genIfExpr(expr);
            case 'SwitchExpression':
                return this.genSwitchExpr(expr);
            default:
                return '/* unknown expr */';
        }
    }
    genLiteral(lit) {
        if (lit.valueType === 'na')
            return '__rt.na';
        if (lit.valueType === 'string')
            return JSON.stringify(lit.value);
        if (lit.valueType === 'bool')
            return lit.value ? 'true' : 'false';
        if (lit.valueType === 'color')
            return JSON.stringify(lit.value);
        // int or float
        return String(lit.value);
    }
    genIdentifier(id) {
        const name = id.name;
        // na keyword
        if (name === 'na')
            return '__rt.na';
        // Built-in variables
        if (this.mapper.isBuiltinVar(name)) {
            return this.mapper.mapBuiltinVar(name);
        }
        // Check color constant (e.g. bare "color" identifier - unlikely but handle)
        const colorHex = function_mapper_1.COLOR_CONSTANTS[name];
        if (colorHex)
            return JSON.stringify(colorHex);
        // var/varip references
        if (this.varDecls.has(name)) {
            const storeType = this.varDecls.get(name);
            return storeType === 'varip' ? `__rt.persistentState.${name}` : `__rt.state.${name}`;
        }
        // barstate properties accessed as top-level identifier
        if (name === 'barstate')
            return '__rt.barstate';
        // Time functions used as variables (e.g. hour, minute — they're both functions and vars in Pine)
        const timeFnVars = new Set(['hour', 'minute', 'second', 'dayofweek', 'dayofmonth', 'month', 'year']);
        if (timeFnVars.has(name))
            return `__rt.${name}()`;
        return name;
    }
    genBinary(expr) {
        const left = this.genExpr(expr.left);
        const right = this.genExpr(expr.right);
        let op = expr.operator;
        // Pine uses 'and', 'or', 'not'
        if (op === 'and')
            op = '&&';
        else if (op === 'or')
            op = '||';
        else if (op === '!=')
            op = '!==';
        else if (op === '==')
            op = '===';
        return `${left} ${op} ${right}`;
    }
    genUnary(expr) {
        let op = expr.operator;
        if (op === 'not')
            op = '!';
        const operand = this.genExpr(expr.operand);
        if (expr.prefix) {
            return `${op}${operand}`;
        }
        return `${operand}${op}`;
    }
    genConditional(expr) {
        const cond = this.genExpr(expr.condition);
        const cons = this.genExpr(expr.consequent);
        const alt = this.genExpr(expr.alternate);
        return `(${cond} ? ${cons} : ${alt})`;
    }
    genCall(call) {
        const calleeName = this.calleeToString(call.callee);
        // Metadata calls — already extracted, return empty (will be skipped at statement level)
        if (calleeName === 'indicator' || calleeName === 'strategy' || calleeName === 'study') {
            return '/* metadata */';
        }
        // input() handling
        if (calleeName === 'input' || calleeName.startsWith('input.')) {
            return this.genInputCall(call);
        }
        // plot() handling
        if (calleeName === 'plot') {
            return this.genPlotCall(call);
        }
        // hline() handling
        if (calleeName === 'hline') {
            return this.genHlineCall(call);
        }
        // fill() handling
        if (calleeName === 'fill') {
            return this.genFillCall(call);
        }
        // bgcolor()
        if (calleeName === 'bgcolor') {
            return this.genBgcolorCall(call);
        }
        // plotshape() handling
        if (calleeName === 'plotshape') {
            return this.genPlotshapeCall(call);
        }
        // plotchar() handling
        if (calleeName === 'plotchar') {
            return this.genPlotcharCall(call);
        }
        // plotarrow() handling
        if (calleeName === 'plotarrow') {
            return this.genPlotarrowCall(call);
        }
        // plotcandle() handling
        if (calleeName === 'plotcandle') {
            return this.genPlotcandleCall(call);
        }
        // plotbar() handling
        if (calleeName === 'plotbar') {
            return this.genPlotbarCall(call);
        }
        // barcolor()
        if (calleeName === 'barcolor') {
            const args = this.genArgs(call.args);
            return `__rt.barcolor(${args})`;
        }
        // color.new()
        if (calleeName === 'color.new') {
            const args = this.genArgs(call.args);
            return `__rt.color.colorNew(${args})`;
        }
        // na() check
        if (calleeName === 'na') {
            const args = this.genArgs(call.args);
            return args ? `__rt.isNa(${args})` : '__rt.na';
        }
        // UDT constructor call: TypeName.new(...)
        if (call.callee.kind === 'MemberExpression') {
            const mem = call.callee;
            if (mem.property === 'new' && mem.object.kind === 'IdentifierExpression') {
                const typeName = mem.object.name;
                if (this.udtTypes.has(typeName)) {
                    return this.genUdtConstructor(typeName, call);
                }
            }
        }
        // Check color constant function-like (rarely used)
        // Try to map to runtime
        const mapped = this.mapper.mapFunction(calleeName);
        if (mapped !== undefined) {
            const args = this.genArgs(call.args);
            const callId = JSON.stringify(`cs_${this.callSiteCounter++}`);
            // Inject implicit series arguments for TA functions that need them.
            // In Pine Script, these functions implicitly use the chart's high/low/close/volume,
            // but the runtime requires them as explicit parameters.
            if (calleeName === 'ta.atr' || calleeName === 'atr') {
                // Pine: ta.atr(length) -> Runtime: atr(length, high, low, close, id)
                return `${mapped}(${args}, __rt.high, __rt.low, __rt.close, ${callId})`;
            }
            if (calleeName === 'ta.pivothigh' || calleeName === 'pivothigh') {
                if (call.args.length === 2) {
                    return `${mapped}(__rt.high, ${args})`;
                }
                return `${mapped}(${args})`;
            }
            if (calleeName === 'ta.pivotlow' || calleeName === 'pivotlow') {
                if (call.args.length === 2) {
                    return `${mapped}(__rt.low, ${args})`;
                }
                return `${mapped}(${args})`;
            }
            if (calleeName === 'ta.dmi') {
                // Pine: ta.dmi(diLength, adxSmoothing) -> Runtime: dmi(diLength, adxSmoothing, high, low, close, id)
                return `${mapped}(${args}, __rt.high, __rt.low, __rt.close, ${callId})`;
            }
            if (calleeName === 'ta.supertrend' || calleeName === 'supertrend') {
                if (call.args.length === 2) {
                    return `${mapped}(${args}, __rt.high, __rt.low, __rt.close, ${callId})`;
                }
                return `${mapped}(${args}, ${callId})`;
            }
            if (calleeName === 'ta.kc' || calleeName === 'kc') {
                if (call.args.length === 3) {
                    return `${mapped}(${args}, true, ${callId})`;
                }
                return `${mapped}(${args}, ${callId})`;
            }
            if (calleeName === 'ta.obv' || calleeName === 'obv') {
                if (call.args.length === 0) {
                    return `${mapped}(__rt.close, __rt.volume, ${callId})`;
                }
                return `${mapped}(${args}, ${callId})`;
            }
            if (calleeName === 'ta.stoch') {
                // Pine: ta.stoch(source, high, low, length) — args already explicit in Pine
                return `${mapped}(${args})`;
            }
            if (calleeName === 'ta.vwma') {
                // Pine: ta.vwma(source, length) -> Runtime: vwma(source, volume, length)
                // Need to inject volume between source and length
                if (call.args.length === 2) {
                    const source = this.genExpr(call.args[0].value);
                    const length = this.genExpr(call.args[1].value);
                    return `${mapped}(${source}, __rt.volume, ${length})`;
                }
                return `${mapped}(${args})`;
            }
            // Stateful TA functions that accept a unique call-site ID as the last argument
            if (STATEFUL_TA_FUNCS.has(calleeName)) {
                return args ? `${mapped}(${args}, ${callId})` : `${mapped}(${callId})`;
            }
            return `${mapped}(${args})`;
        }
        // Method syntax dispatch: obj.method(args) → __rt.{namespace}.{method}(obj, args)
        if (call.callee.kind === 'MemberExpression') {
            const mem = call.callee;
            // Only if object is NOT a known namespace
            if (mem.object.kind === 'IdentifierExpression') {
                const objName = mem.object.name;
                if (!KNOWN_NAMESPACES.has(objName)) {
                    const method = mem.property;
                    // Check if this is a UDT method call — emit as direct prototype method call
                    const objVarType = this.varTypes.get(objName);
                    if ((objVarType && this.udtTypes.has(objVarType)) || this.udtMethods.has(method)) {
                        const objExpr = this.genExpr(mem.object);
                        const argsStr = call.args.length > 0 ? this.genArgs(call.args) : '';
                        return `${objExpr}.${method}(${argsStr})`;
                    }
                    // Determine the namespace from tracked type or method name
                    let ns = this.varTypes.get(objName) ?? null;
                    if (!ns) {
                        // Fall back to method name lookup
                        const arrayMethods = new Set([
                            'push', 'pop', 'size', 'get', 'set', 'shift', 'unshift', 'sort',
                            'reverse', 'clear', 'copy', 'insert', 'remove', 'includes', 'indexof',
                            'lastindexof', 'join', 'slice', 'sum', 'avg', 'max', 'min', 'first',
                            'last', 'range', 'median', 'stdev', 'variance', 'concat', 'from', 'abs',
                            'binary_search', 'binary_search_leftmost', 'binary_search_rightmost',
                            'every', 'some', 'fill', 'covariance', 'mode', 'percentile_linear_interpolation',
                            'percentile_nearest_rank', 'percentrank', 'standardize',
                        ]);
                        const mapMethods = new Set([
                            'put', 'contains', 'keys', 'values',
                        ]);
                        const matrixMethods = new Set([
                            'rows', 'columns', 'add_row', 'add_col', 'remove_row', 'remove_col',
                            'transpose', 'reshape', 'row', 'col', 'submatrix',
                        ]);
                        const drawingMethods = new Set([
                            'delete', 'set_x1', 'set_y1', 'set_x2', 'set_y2',
                            'set_xy1', 'set_xy2', 'set_xloc', 'set_yloc', 'set_extend',
                            'set_color', 'set_style', 'set_width', 'set_text', 'set_tooltip',
                            'set_textcolor', 'set_size', 'set_textalign',
                            'set_x', 'set_y', 'set_xy',
                            'set_left', 'set_top', 'set_right', 'set_bottom',
                            'set_lefttop', 'set_rightbottom', 'set_bgcolor',
                            'set_border_color', 'set_border_width', 'set_border_style',
                            'set_text_color', 'set_text_size', 'set_text_halign', 'set_text_valign',
                            'get_x1', 'get_y1', 'get_x2', 'get_y2', 'get_price',
                            'get_x', 'get_y', 'get_text',
                            'get_left', 'get_top', 'get_right', 'get_bottom',
                        ]);
                        const tableMethods = new Set([
                            'cell', 'merge_cells', 'set_position',
                            'set_frame_color', 'set_frame_width',
                            'cell_set_text', 'cell_set_bgcolor', 'cell_set_text_color',
                            'cell_set_text_size', 'cell_set_text_halign', 'cell_set_text_valign',
                            'cell_set_tooltip',
                        ]);
                        if (arrayMethods.has(method))
                            ns = 'array';
                        else if (tableMethods.has(method))
                            ns = 'table';
                        else if (mapMethods.has(method)) {
                            // Map methods - use tracked type if available
                            ns = this.varTypes.get(objName) === 'map' ? 'map' : null;
                        }
                        else if (matrixMethods.has(method)) {
                            ns = this.varTypes.get(objName) === 'matrix' ? 'matrix' : null;
                        }
                        else if (drawingMethods.has(method))
                            ns = null; // can't disambiguate without type
                    }
                    if (ns) {
                        const objExpr = this.genExpr(mem.object);
                        const argsStr = call.args.length > 0 ? ', ' + this.genArgs(call.args) : '';
                        return `__rt.${ns}.${method}(${objExpr}${argsStr})`;
                    }
                }
            }
        }
        // Unknown - emit as-is but try to resolve callee expression
        const calleeStr = this.genExpr(call.callee);
        const args = this.genArgs(call.args);
        return `${calleeStr}(${args})`;
    }
    genInputCall(call) {
        // Extract input metadata and return __rt.getInput(id)
        let id = `input_${this.metadata.inputs.length}`;
        let title = id;
        let defaultValue = undefined;
        let defaultExpr = 'null';
        let type = 'float';
        const calleeName = this.calleeToString(call.callee);
        if (calleeName === 'input.int')
            type = 'int';
        else if (calleeName === 'input.bool')
            type = 'bool';
        else if (calleeName === 'input.string')
            type = 'string';
        else if (calleeName === 'input.color')
            type = 'color';
        else if (calleeName === 'input.source')
            type = 'source';
        else if (calleeName === 'input.timeframe')
            type = 'timeframe';
        else if (calleeName === 'input.session')
            type = 'session';
        else if (calleeName === 'input.symbol')
            type = 'symbol';
        else if (calleeName === 'input.price')
            type = 'price';
        else if (calleeName === 'input.time')
            type = 'time';
        else if (calleeName === 'input.text_area')
            type = 'text_area';
        else if (calleeName === 'input.enum')
            type = 'enum';
        for (const arg of call.args) {
            if (arg.name === null && defaultValue === undefined && defaultExpr === 'null') {
                defaultValue = this.getLiteralValue(arg.value);
                defaultExpr = this.genExpr(arg.value);
            }
            else if (arg.name === 'defval') {
                defaultValue = this.getLiteralValue(arg.value);
                defaultExpr = this.genExpr(arg.value);
            }
            else if (arg.name === 'title' || (arg.name === null && defaultExpr !== 'null' && typeof this.getLiteralValue(arg.value) === 'string')) {
                const v = this.getLiteralValue(arg.value);
                if (typeof v === 'string') {
                    title = v;
                    id = v;
                }
            }
            else if (arg.name === 'id') {
                const v = this.getLiteralValue(arg.value);
                if (typeof v === 'string')
                    id = v;
            }
        }
        if (defaultValue === undefined) {
            if (type === 'bool')
                defaultValue = false;
            else if (type === 'string')
                defaultValue = '';
            else
                defaultValue = 0;
        }
        this.metadata.inputs.push({ id, title, type, defaultValue });
        return `(__rt.getInput(${JSON.stringify(id)}) !== undefined ? __rt.getInput(${JSON.stringify(id)}) : ${defaultExpr})`;
    }
    genPlotCall(call) {
        const idx = this.plotIndex++;
        const args = call.args;
        let val = 'null';
        let title = `plot_${idx}`;
        let colorExpr = JSON.stringify('#2962FF');
        let staticColor = '#2962FF';
        let linewidth = 1;
        let style = 'line';
        let display = 'all';
        if (args[0])
            val = this.genExpr(args[0].value);
        for (const arg of args) {
            if (arg.name === 'title' || (arg.name === null && args.indexOf(arg) === 1)) {
                const v = this.getLiteralValue(arg.value);
                if (typeof v === 'string')
                    title = v;
            }
            else if (arg.name === 'color' || (arg.name === null && args.indexOf(arg) === 2)) {
                const resolved = this.resolveColor(arg.value);
                if (resolved !== undefined) {
                    staticColor = resolved;
                    colorExpr = JSON.stringify(resolved);
                }
                else {
                    colorExpr = this.genExpr(arg.value);
                }
            }
            else if (arg.name === 'linewidth' || (arg.name === null && args.indexOf(arg) === 3)) {
                const v = this.getLiteralValue(arg.value);
                if (typeof v === 'number')
                    linewidth = v;
            }
            else if (arg.name === 'style' || (arg.name === null && args.indexOf(arg) === 4)) {
                const v = this.getLiteralValue(arg.value);
                if (typeof v === 'string')
                    style = v;
            }
            else if (arg.name === 'display') {
                const dStr = this.genExpr(arg.value);
                if (dStr.includes('none'))
                    display = 'none';
                else if (dStr.includes('data_window'))
                    display = 'data_window';
                else if (dStr.includes('status_line'))
                    display = 'status_line';
                else
                    display = dStr;
            }
        }
        // Register plot in metadata
        this.metadata.plots.push({ index: idx, title, color: staticColor, linewidth, style, display });
        const opts = `{title:${JSON.stringify(title)},color:${colorExpr},linewidth:${linewidth},style:${JSON.stringify(style)},display:${JSON.stringify(display)}}`;
        return `__rt.plot(${idx}, ${val}, ${opts})`;
    }
    genHlineCall(call) {
        const idx = this.hlineIndex++;
        const args = call.args;
        let price = '0';
        let title = `hline_${idx}`;
        let colorStr = '#787B86';
        let linewidth = 1;
        let linestyle = 'solid';
        if (args[0])
            price = this.genExpr(args[0].value);
        for (const arg of args) {
            if (arg.name === 'title') {
                const v = this.getLiteralValue(arg.value);
                if (typeof v === 'string')
                    title = v;
            }
            else if (arg.name === 'color') {
                colorStr = this.resolveColor(arg.value) ?? colorStr;
            }
            else if (arg.name === 'linewidth') {
                const v = this.getLiteralValue(arg.value);
                if (typeof v === 'number')
                    linewidth = v;
            }
            else if (arg.name === 'linestyle') {
                const v = this.getLiteralValue(arg.value);
                if (typeof v === 'string')
                    linestyle = v;
            }
        }
        const opts = `{title:${JSON.stringify(title)},color:${JSON.stringify(colorStr)},linewidth:${linewidth}}`;
        return `__rt.hline(${idx}, ${price}, ${opts})`;
    }
    genFillCall(call) {
        const args = call.args;
        const p1 = args[0] ? this.genExpr(args[0].value) : '0';
        const p2 = args[1] ? this.genExpr(args[1].value) : '1';
        let colorExpr = JSON.stringify('rgba(0,0,0,0.1)');
        let title = '';
        for (const arg of args) {
            if (arg.name === 'color' || (arg.name === null && args.indexOf(arg) === 2)) {
                const resolved = this.resolveColor(arg.value);
                colorExpr = resolved !== undefined ? JSON.stringify(resolved) : this.genExpr(arg.value);
            }
            else if (arg.name === 'title' || (arg.name === null && args.indexOf(arg) === 3)) {
                const v = this.getLiteralValue(arg.value);
                if (typeof v === 'string')
                    title = v;
            }
        }
        return `__rt.fill(${p1}, ${p2}, {color:${colorExpr},title:${JSON.stringify(title)}})`;
    }
    genBgcolorCall(call) {
        if (call.args[0]) {
            const colorVal = this.resolveColor(call.args[0].value);
            if (colorVal !== undefined) {
                return `__rt.bgcolor(${JSON.stringify(colorVal)})`;
            }
            return `__rt.bgcolor(${this.genExpr(call.args[0].value)})`;
        }
        return '__rt.bgcolor(null)';
    }
    genPlotshapeCall(call) {
        const idx = this.plotshapeIndex++;
        const args = call.args;
        // plotshape(series, title, style, location, color, offset, text, textcolor, size)
        let series = 'null';
        const optParts = [];
        if (args[0])
            series = this.genExpr(args[0].value);
        for (const arg of args) {
            if (arg.name === 'title' || (arg.name === null && args.indexOf(arg) === 1)) {
                optParts.push(`title:${this.genExpr(arg.value)}`);
            }
            else if (arg.name === 'style' || (arg.name === null && args.indexOf(arg) === 2)) {
                optParts.push(`style:${this.genExpr(arg.value)}`);
            }
            else if (arg.name === 'location' || (arg.name === null && args.indexOf(arg) === 3)) {
                optParts.push(`location:${this.genExpr(arg.value)}`);
            }
            else if (arg.name === 'color' || (arg.name === null && args.indexOf(arg) === 4)) {
                const resolved = this.resolveColor(arg.value);
                optParts.push(`color:${resolved !== undefined ? JSON.stringify(resolved) : this.genExpr(arg.value)}`);
            }
            else if (arg.name === 'offset' || (arg.name === null && args.indexOf(arg) === 5)) {
                optParts.push(`offset:${this.genExpr(arg.value)}`);
            }
            else if (arg.name === 'text' || (arg.name === null && args.indexOf(arg) === 6)) {
                optParts.push(`text:${this.genExpr(arg.value)}`);
            }
            else if (arg.name === 'textcolor' || (arg.name === null && args.indexOf(arg) === 7)) {
                const resolved = this.resolveColor(arg.value);
                optParts.push(`textcolor:${resolved !== undefined ? JSON.stringify(resolved) : this.genExpr(arg.value)}`);
            }
            else if (arg.name === 'size' || (arg.name === null && args.indexOf(arg) === 8)) {
                optParts.push(`size:${this.genExpr(arg.value)}`);
            }
        }
        const opts = optParts.length > 0 ? `, {${optParts.join(',')}}` : '';
        return `__rt.plotshape(${idx}, ${series}${opts})`;
    }
    genPlotcharCall(call) {
        const idx = this.plotcharIndex++;
        const args = call.args;
        // plotchar(series, title, char, location, color, offset, text, textcolor, size)
        let series = 'null';
        const optParts = [];
        if (args[0])
            series = this.genExpr(args[0].value);
        for (const arg of args) {
            if (arg.name === 'title' || (arg.name === null && args.indexOf(arg) === 1)) {
                optParts.push(`title:${this.genExpr(arg.value)}`);
            }
            else if (arg.name === 'char' || (arg.name === null && args.indexOf(arg) === 2)) {
                optParts.push(`char:${this.genExpr(arg.value)}`);
            }
            else if (arg.name === 'location' || (arg.name === null && args.indexOf(arg) === 3)) {
                optParts.push(`location:${this.genExpr(arg.value)}`);
            }
            else if (arg.name === 'color' || (arg.name === null && args.indexOf(arg) === 4)) {
                const resolved = this.resolveColor(arg.value);
                optParts.push(`color:${resolved !== undefined ? JSON.stringify(resolved) : this.genExpr(arg.value)}`);
            }
            else if (arg.name === 'offset' || (arg.name === null && args.indexOf(arg) === 5)) {
                optParts.push(`offset:${this.genExpr(arg.value)}`);
            }
            else if (arg.name === 'text' || (arg.name === null && args.indexOf(arg) === 6)) {
                optParts.push(`text:${this.genExpr(arg.value)}`);
            }
            else if (arg.name === 'textcolor' || (arg.name === null && args.indexOf(arg) === 7)) {
                const resolved = this.resolveColor(arg.value);
                optParts.push(`textcolor:${resolved !== undefined ? JSON.stringify(resolved) : this.genExpr(arg.value)}`);
            }
            else if (arg.name === 'size' || (arg.name === null && args.indexOf(arg) === 8)) {
                optParts.push(`size:${this.genExpr(arg.value)}`);
            }
        }
        const opts = optParts.length > 0 ? `, {${optParts.join(',')}}` : '';
        return `__rt.plotchar(${idx}, ${series}${opts})`;
    }
    genPlotarrowCall(call) {
        const idx = this.plotarrowIndex++;
        const args = call.args;
        // plotarrow(series, title, colorup, colordown, offset, minheight, maxheight)
        let series = 'null';
        const optParts = [];
        if (args[0])
            series = this.genExpr(args[0].value);
        for (const arg of args) {
            if (arg.name === 'title' || (arg.name === null && args.indexOf(arg) === 1)) {
                optParts.push(`title:${this.genExpr(arg.value)}`);
            }
            else if (arg.name === 'colorup' || (arg.name === null && args.indexOf(arg) === 2)) {
                const resolved = this.resolveColor(arg.value);
                optParts.push(`colorup:${resolved !== undefined ? JSON.stringify(resolved) : this.genExpr(arg.value)}`);
            }
            else if (arg.name === 'colordown' || (arg.name === null && args.indexOf(arg) === 3)) {
                const resolved = this.resolveColor(arg.value);
                optParts.push(`colordown:${resolved !== undefined ? JSON.stringify(resolved) : this.genExpr(arg.value)}`);
            }
            else if (arg.name === 'offset' || (arg.name === null && args.indexOf(arg) === 4)) {
                optParts.push(`offset:${this.genExpr(arg.value)}`);
            }
            else if (arg.name === 'minheight' || (arg.name === null && args.indexOf(arg) === 5)) {
                optParts.push(`minheight:${this.genExpr(arg.value)}`);
            }
            else if (arg.name === 'maxheight' || (arg.name === null && args.indexOf(arg) === 6)) {
                optParts.push(`maxheight:${this.genExpr(arg.value)}`);
            }
        }
        const opts = optParts.length > 0 ? `, {${optParts.join(',')}}` : '';
        return `__rt.plotarrow(${idx}, ${series}${opts})`;
    }
    genPlotcandleCall(call) {
        const idx = this.plotcandleIndex++;
        const args = call.args;
        // plotcandle(open, high, low, close, title, color, wickcolor, bordercolor)
        let openExpr = 'null';
        let highExpr = 'null';
        let lowExpr = 'null';
        let closeExpr = 'null';
        const optParts = [];
        if (args[0])
            openExpr = this.genExpr(args[0].value);
        if (args[1] && args[1].name === null)
            highExpr = this.genExpr(args[1].value);
        if (args[2] && args[2].name === null)
            lowExpr = this.genExpr(args[2].value);
        if (args[3] && args[3].name === null)
            closeExpr = this.genExpr(args[3].value);
        for (const arg of args) {
            if (arg.name === 'open')
                openExpr = this.genExpr(arg.value);
            else if (arg.name === 'high')
                highExpr = this.genExpr(arg.value);
            else if (arg.name === 'low')
                lowExpr = this.genExpr(arg.value);
            else if (arg.name === 'close')
                closeExpr = this.genExpr(arg.value);
            else if (arg.name === 'title' || (arg.name === null && args.indexOf(arg) === 4)) {
                optParts.push(`title:${this.genExpr(arg.value)}`);
            }
            else if (arg.name === 'color' || (arg.name === null && args.indexOf(arg) === 5)) {
                const resolved = this.resolveColor(arg.value);
                optParts.push(`color:${resolved !== undefined ? JSON.stringify(resolved) : this.genExpr(arg.value)}`);
            }
            else if (arg.name === 'wickcolor' || (arg.name === null && args.indexOf(arg) === 6)) {
                const resolved = this.resolveColor(arg.value);
                optParts.push(`wickcolor:${resolved !== undefined ? JSON.stringify(resolved) : this.genExpr(arg.value)}`);
            }
            else if (arg.name === 'bordercolor' || (arg.name === null && args.indexOf(arg) === 7)) {
                const resolved = this.resolveColor(arg.value);
                optParts.push(`bordercolor:${resolved !== undefined ? JSON.stringify(resolved) : this.genExpr(arg.value)}`);
            }
        }
        const opts = optParts.length > 0 ? `, {${optParts.join(',')}}` : '';
        return `__rt.plotcandle(${idx}, ${openExpr}, ${highExpr}, ${lowExpr}, ${closeExpr}${opts})`;
    }
    genPlotbarCall(call) {
        const idx = this.plotbarIndex++;
        const args = call.args;
        // plotbar(open, high, low, close, title, color)
        let openExpr = 'null';
        let highExpr = 'null';
        let lowExpr = 'null';
        let closeExpr = 'null';
        const optParts = [];
        if (args[0])
            openExpr = this.genExpr(args[0].value);
        if (args[1] && args[1].name === null)
            highExpr = this.genExpr(args[1].value);
        if (args[2] && args[2].name === null)
            lowExpr = this.genExpr(args[2].value);
        if (args[3] && args[3].name === null)
            closeExpr = this.genExpr(args[3].value);
        for (const arg of args) {
            if (arg.name === 'open')
                openExpr = this.genExpr(arg.value);
            else if (arg.name === 'high')
                highExpr = this.genExpr(arg.value);
            else if (arg.name === 'low')
                lowExpr = this.genExpr(arg.value);
            else if (arg.name === 'close')
                closeExpr = this.genExpr(arg.value);
            else if (arg.name === 'title' || (arg.name === null && args.indexOf(arg) === 4)) {
                optParts.push(`title:${this.genExpr(arg.value)}`);
            }
            else if (arg.name === 'color' || (arg.name === null && args.indexOf(arg) === 5)) {
                const resolved = this.resolveColor(arg.value);
                optParts.push(`color:${resolved !== undefined ? JSON.stringify(resolved) : this.genExpr(arg.value)}`);
            }
        }
        const opts = optParts.length > 0 ? `, {${optParts.join(',')}}` : '';
        return `__rt.plotbar(${idx}, ${openExpr}, ${highExpr}, ${lowExpr}, ${closeExpr}${opts})`;
    }
    resolveColor(expr) {
        // Check if it's a color constant member expression or identifier
        if (expr.kind === 'MemberExpression') {
            const mem = expr;
            const fullName = `${this.genExpr(mem.object)}.${mem.property}`;
            // Resolve color constants
            const hex = function_mapper_1.COLOR_CONSTANTS[fullName];
            if (hex)
                return hex;
        }
        if (expr.kind === 'IdentifierExpression') {
            const name = expr.name;
            const hex = function_mapper_1.COLOR_CONSTANTS[name] ?? this.userColors.get(name);
            if (hex)
                return hex;
        }
        if (expr.kind === 'LiteralExpression') {
            const lit = expr;
            if (lit.valueType === 'color' || lit.valueType === 'string') {
                return lit.value;
            }
        }
        if (expr.kind === 'CallExpression') {
            const call = expr;
            const calleeStr = this.genExpr(call.callee);
            if (calleeStr === '__rt.color.new' || calleeStr === '__rt.color.colorNew') {
                const base = call.args[0] ? this.resolveColor(call.args[0].value) : undefined;
                if (base) {
                    const trans = call.args[1] ? this.getLiteralValue(call.args[1].value) : 0;
                    if (typeof trans === 'number') {
                        const alpha = Math.max(0, Math.min(100, trans));
                        const alphaHex = Math.round((1 - alpha / 100) * 255).toString(16).padStart(2, '0');
                        if (base.startsWith('#') && base.length === 7) {
                            return base + alphaHex;
                        }
                        return base;
                    }
                }
            }
        }
        // For dynamic color expressions, generate the expression
        return undefined;
    }
    genMember(expr) {
        const objStr = this.genExpr(expr.object);
        const prop = expr.property;
        const fullName = `${objStr}.${prop}`;
        // Check color constant
        const colorHex = function_mapper_1.COLOR_CONSTANTS[fullName];
        if (colorHex)
            return JSON.stringify(colorHex);
        // Shape constants: shape.triangleup -> "triangleup"
        if (objStr === 'shape')
            return JSON.stringify(prop);
        // Location constants: location.belowbar -> "belowbar"
        if (objStr === 'location')
            return JSON.stringify(prop);
        // Size constants: size.normal -> "normal"
        if (objStr === 'size')
            return JSON.stringify(prop);
        // Plot style constants: plot.style_line -> "style_line"
        if (objStr === 'plot')
            return JSON.stringify(prop);
        // Enum constants — xloc, yloc, extend, text, position, display, barmerge, adjustment, currency, format
        if (objStr === 'xloc')
            return JSON.stringify(prop); // xloc.bar_time → "bar_time"
        if (objStr === 'yloc')
            return JSON.stringify(prop); // yloc.price → "price"
        if (objStr === 'extend')
            return JSON.stringify(prop); // extend.none → "none"
        if (objStr === 'text')
            return JSON.stringify(prop); // text.align_left → "align_left"
        if (objStr === 'position')
            return JSON.stringify(prop); // position.top_right → "top_right"
        if (objStr === 'display')
            return JSON.stringify(prop); // display.all → "all"
        if (objStr === 'barmerge')
            return JSON.stringify(prop); // barmerge.lookahead_on → "lookahead_on"
        if (objStr === 'format')
            return JSON.stringify(prop); // format.price → "price"
        if (objStr === 'scale')
            return JSON.stringify(prop); // scale.right → "right"
        if (objStr === 'adjustment')
            return JSON.stringify(prop); // adjustment.none → "none"
        if (objStr === 'currency')
            return JSON.stringify(prop); // currency.USD → "USD"
        if (objStr === 'order')
            return JSON.stringify(prop); // order.ascending → "ascending"
        if (objStr === 'alert')
            return JSON.stringify(prop); // alert.freq_once_per_bar → "freq_once_per_bar"
        if (objStr === 'font')
            return JSON.stringify(prop); // font.family_default → "family_default"
        if (objStr === 'earnings')
            return JSON.stringify(prop);
        if (objStr === 'dividends')
            return JSON.stringify(prop);
        if (objStr === 'splits')
            return JSON.stringify(prop);
        if (objStr === 'session')
            return JSON.stringify(prop);
        if (objStr === 'position')
            return JSON.stringify(prop); // position.top_right → "top_right"
        if (objStr === 'shape')
            return JSON.stringify(prop); // shape.triangledown → "triangledown"
        if (objStr === 'size')
            return JSON.stringify(prop); // size.small → "small"
        if (objStr === 'location')
            return JSON.stringify(prop); // location.abovebar → "abovebar"
        if (objStr === 'format')
            return JSON.stringify(prop); // format.mintick → "mintick"
        if (objStr === 'display')
            return JSON.stringify(prop); // display.all → "all"
        // dayofweek constants: dayofweek.monday → 2 (1=Sunday, 7=Saturday)
        if (objStr === 'dayofweek') {
            const dayMap = {
                sunday: 1, monday: 2, tuesday: 3, wednesday: 4,
                thursday: 5, friday: 6, saturday: 7,
            };
            if (dayMap[prop] !== undefined)
                return String(dayMap[prop]);
            return JSON.stringify(prop);
        }
        // hline style constants: hline.style_solid → "solid" (strip "style_" prefix)
        if (objStr === 'hline') {
            const stripped = prop.startsWith('style_') ? prop.slice(6) : prop;
            return JSON.stringify(stripped);
        }
        // line style constants: line.style_solid → "solid"  +  line.new → __rt.line.new
        if (objStr === 'line') {
            if (prop.startsWith('style_'))
                return JSON.stringify(prop.slice(6));
            // Drawing methods: line.new, line.delete, line.set_*, line.get_*, line.copy
            return `__rt.line.${prop}`;
        }
        // label style constants: label.style_label_left → "label_left"  +  label.new → __rt.label.new
        if (objStr === 'label') {
            if (prop.startsWith('style_'))
                return JSON.stringify(prop.slice(6));
            return `__rt.label.${prop}`;
        }
        // box style: box.new, box.delete, box.set_*, box.get_*
        if (objStr === 'box')
            return `__rt.box.${prop}`;
        // table: table.new, table.cell, table.merge_cells, table.delete, table.clear
        if (objStr === 'table')
            return `__rt.table.${prop}`;
        // barstate properties
        if (objStr === '__rt.barstate' || objStr === 'barstate') {
            return `__rt.barstate.${prop}`;
        }
        // strategy namespace — constants (strategy.long, strategy.short) return string literals
        if (objStr === 'strategy') {
            if (prop === 'long' || prop === 'short')
                return JSON.stringify(prop);
            return `__rt.strategy.${prop}`;
        }
        // ta namespace
        if (objStr === 'ta')
            return `__rt.ta.${prop}`;
        // math namespace
        if (objStr === 'math')
            return `__rt.math.${prop}`;
        // color namespace
        if (objStr === 'color')
            return `__rt.color.${prop}`;
        // syminfo, timeframe etc
        if (objStr === 'syminfo')
            return `__rt.syminfo.${prop}`;
        if (objStr === 'timeframe')
            return `__rt.timeframe.${prop}`;
        if (objStr === 'str')
            return `__rt.str.${prop}`;
        if (objStr === 'array')
            return `__rt.array.${prop}`;
        if (objStr === 'request')
            return `__rt.request.${prop}`;
        if (objStr === 'map')
            return `__rt.map.${prop}`;
        if (objStr === 'matrix')
            return `__rt.matrix.${prop}`;
        if (objStr === 'ticker')
            return `__rt.ticker.${prop}`;
        // log namespace
        if (objStr === 'log')
            return `__rt.log.${prop}`;
        // chart namespace
        if (objStr === 'chart')
            return `__rt.chart.${prop}`;
        return `${objStr}.${prop}`;
    }
    genIndex(expr) {
        const objExpr = expr.object;
        const idxStr = this.genExpr(expr.index);
        // close[1], open[2], etc. — series access
        if (objExpr.kind === 'IdentifierExpression') {
            const name = objExpr.name;
            if (this.mapper.isBuiltinVar(name)) {
                return this.mapper.mapSeriesGet(name, idxStr);
            }
            // User variable history: myVar[1] → __rt.userSeriesGet("myVar", 1)
            if (this.historyVars.has(name)) {
                return `__rt.userSeriesGet(${JSON.stringify(name)}, ${idxStr})`;
            }
        }
        // Member expression series: e.g. custom series
        const objStr = this.genExpr(objExpr);
        return `${objStr}[${idxStr}]`;
    }
    genArrayLiteral(expr) {
        const elems = expr.elements.map(e => this.genExpr(e));
        return `[${elems.join(', ')}]`;
    }
    genLambda(expr) {
        const params = expr.params.map(p => p.name).join(', ');
        const body = this.genExpr(expr.body);
        return `(${params}) => ${body}`;
    }
    genIfExpr(expr) {
        const cond = this.genExpr(expr.condition);
        const then = this.genExpr(expr.thenBranch);
        const alt = expr.elseBranch ? this.genExpr(expr.elseBranch) : '__rt.na';
        return `(${cond} ? ${then} : ${alt})`;
    }
    genSwitchExpr(expr) {
        // Generate as immediately-invoked function with if/else chain
        const parts = [];
        parts.push('(function() {');
        if (expr.discriminant) {
            parts.push(`var __sw = ${this.genExpr(expr.discriminant)};`);
            for (const c of expr.cases) {
                const cond = c.values.map(v => `__sw === ${this.genExpr(v)}`).join(' || ');
                parts.push(`if (${cond}) return ${this.genExpr(c.body)};`);
            }
        }
        else {
            for (const c of expr.cases) {
                const cond = c.values.map(v => this.genExpr(v)).join(' || ');
                parts.push(`if (${cond}) return ${this.genExpr(c.body)};`);
            }
        }
        if (expr.defaultCase) {
            parts.push(`return ${this.genExpr(expr.defaultCase)};`);
        }
        else {
            parts.push('return __rt.na;');
        }
        parts.push('})()');
        return parts.join(' ');
    }
    genArgs(args) {
        const hasNamed = args.some(a => a.name !== null);
        if (!hasNamed) {
            return args.map(arg => this.genExpr(arg.value)).join(', ');
        }
        const posArgs = [];
        const namedEntries = [];
        for (const arg of args) {
            if (arg.name === null) {
                posArgs.push(this.genExpr(arg.value));
            }
            else {
                namedEntries.push(`${JSON.stringify(arg.name)}: ${this.genExpr(arg.value)}`);
            }
        }
        if (namedEntries.length > 0) {
            posArgs.push(`{ ${namedEntries.join(', ')} }`);
        }
        return posArgs.join(', ');
    }
    // ───────── Helpers ─────────
    indent() {
        return this.INDENT.repeat(this.indentLevel);
    }
    calleeToString(callee) {
        if (callee.kind === 'IdentifierExpression') {
            return callee.name;
        }
        if (callee.kind === 'LiteralExpression') {
            const lit = callee;
            if (lit.valueType === 'na' || lit.value === 'na' || lit.raw === 'na' || lit.type === 'na')
                return 'na';
        }
        if (callee.kind === 'MemberExpression') {
            const mem = callee;
            const obj = this.calleeToString(mem.object);
            return `${obj}.${mem.property}`;
        }
        return '';
    }
}
exports.CodeGenerator = CodeGenerator;
//# sourceMappingURL=generator.js.map