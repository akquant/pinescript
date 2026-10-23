"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parser = void 0;
const token_1 = require("../lexer/token");
const precedence_1 = require("./precedence");
// Assignment operators
const ASSIGN_OPS = new Set([
    token_1.TokenType.ASSIGN,
    token_1.TokenType.REASSIGN,
    token_1.TokenType.PLUS_ASSIGN,
    token_1.TokenType.MINUS_ASSIGN,
    token_1.TokenType.STAR_ASSIGN,
    token_1.TokenType.SLASH_ASSIGN,
    token_1.TokenType.PERCENT_ASSIGN,
]);
// Type qualifier keywords
const TYPE_QUALIFIERS = new Set([
    token_1.TokenType.CONST,
    token_1.TokenType.INPUT,
    token_1.TokenType.SIMPLE,
    token_1.TokenType.SERIES,
]);
// Base type keywords (non-IDENTIFIER)
const BASE_TYPE_KWS = new Set([
    token_1.TokenType.INT,
    token_1.TokenType.FLOAT_TYPE,
    token_1.TokenType.BOOL_TYPE,
    token_1.TokenType.STRING_TYPE,
    token_1.TokenType.COLOR_TYPE,
]);
class Parser {
    tokens;
    pos = 0;
    reporter;
    // Metadata extracted from top-level calls
    version = 6;
    metadata = {};
    constructor(tokens, reporter) {
        // Filter out comments but keep everything else
        this.tokens = tokens.filter(t => t.type !== token_1.TokenType.COMMENT);
        this.reporter = reporter;
    }
    parse() {
        const loc = this.peek().loc;
        const body = this.parseProgram();
        return { kind: 'Program', body, loc };
    }
    // ── Helpers ──────────────────────────────────────────────────────────────
    peek() {
        return this.tokens[this.pos] ?? { type: token_1.TokenType.EOF, value: '', loc: { line: 0, column: 0, offset: 0 } };
    }
    peekAt(offset) {
        return this.tokens[this.pos + offset] ?? { type: token_1.TokenType.EOF, value: '', loc: { line: 0, column: 0, offset: 0 } };
    }
    advance() {
        const tok = this.peek();
        if (tok.type !== token_1.TokenType.EOF)
            this.pos++;
        return tok;
    }
    check(type) {
        return this.peek().type === type;
    }
    checkAny(...types) {
        return types.includes(this.peek().type);
    }
    expect(type, message) {
        if (this.check(type))
            return this.advance();
        const loc = this.peek().loc;
        this.reporter.error(`${message}, got '${this.peek().value}' (${this.peek().type})`, loc);
        // Advance past the unexpected token to prevent infinite loops
        if (!this.isAtEnd())
            this.advance();
        return { type, value: '', loc };
    }
    isAtEnd() {
        return this.peek().type === token_1.TokenType.EOF;
    }
    skipNewlines() {
        while (this.check(token_1.TokenType.NEWLINE))
            this.advance();
    }
    consumeNewline() {
        if (this.check(token_1.TokenType.NEWLINE))
            this.advance();
    }
    // ── Program ──────────────────────────────────────────────────────────────
    parseProgram() {
        const stmts = [];
        this.skipNewlines();
        while (!this.isAtEnd()) {
            if (this.check(token_1.TokenType.ANNOTATION)) {
                this.parseAnnotation();
                this.skipNewlines();
                continue;
            }
            const stmt = this.parseStatementSafe();
            if (stmt)
                stmts.push(stmt);
            this.skipNewlines();
        }
        return stmts;
    }
    parseAnnotation() {
        const tok = this.advance(); // ANNOTATION token
        const raw = tok.value; // "//@version=6"
        const content = raw.slice(3); // strip "//@"
        const eqIdx = content.indexOf('=');
        if (eqIdx !== -1) {
            const key = content.slice(0, eqIdx).trim();
            const val = content.slice(eqIdx + 1).trim();
            if (key === 'version') {
                this.version = parseInt(val, 10) || 6;
            }
            else {
                this.metadata[key] = val;
            }
        }
        if (this.check(token_1.TokenType.NEWLINE))
            this.advance();
    }
    parseStatementSafe() {
        try {
            return this.parseStatement();
        }
        catch {
            this.synchronize();
            return null;
        }
    }
    /**
     * Look ahead to determine if `[IDENT, IDENT, ...] =` pattern (tuple destructure)
     * vs an array literal expression.
     */
    isTupleDestructurePattern() {
        let i = this.pos;
        if (this.tokens[i]?.type !== token_1.TokenType.LBRACKET)
            return false;
        i++;
        // Expect one or more identifiers separated by commas
        while (i < this.tokens.length) {
            if (this.tokens[i]?.type !== token_1.TokenType.IDENTIFIER)
                return false;
            i++;
            if (this.tokens[i]?.type === token_1.TokenType.RBRACKET) {
                i++;
                break;
            }
            if (this.tokens[i]?.type !== token_1.TokenType.COMMA)
                return false;
            i++;
        }
        // After ] must be =
        return this.tokens[i]?.type === token_1.TokenType.ASSIGN;
    }
    synchronize() {
        // Always advance at least one token to guarantee progress
        if (!this.isAtEnd())
            this.advance();
        while (!this.isAtEnd()) {
            const t = this.peek().type;
            if (t === token_1.TokenType.NEWLINE || t === token_1.TokenType.DEDENT) {
                this.advance();
                return;
            }
            if (t === token_1.TokenType.IF || t === token_1.TokenType.FOR || t === token_1.TokenType.WHILE ||
                t === token_1.TokenType.RETURN || t === token_1.TokenType.VAR || t === token_1.TokenType.VARIP ||
                t === token_1.TokenType.TYPE || t === token_1.TokenType.ENUM || t === token_1.TokenType.IMPORT ||
                t === token_1.TokenType.EXPORT)
                return;
            this.advance();
        }
    }
    // ── Statements ───────────────────────────────────────────────────────────
    parseStatement() {
        const cur = this.peek();
        switch (cur.type) {
            case token_1.TokenType.VAR:
            case token_1.TokenType.VARIP:
                return this.parseVarDecl();
            case token_1.TokenType.IF:
                return this.parseIfStmt();
            case token_1.TokenType.FOR:
                return this.parseForStmt();
            case token_1.TokenType.WHILE:
                return this.parseWhileStmt();
            case token_1.TokenType.SWITCH:
                return this.parseSwitchStmt();
            case token_1.TokenType.RETURN:
                return this.parseReturnStmt();
            case token_1.TokenType.BREAK: {
                const loc = this.advance().loc;
                this.consumeNewline();
                return { kind: 'BreakStatement', loc };
            }
            case token_1.TokenType.CONTINUE: {
                const loc = this.advance().loc;
                this.consumeNewline();
                return { kind: 'ContinueStatement', loc };
            }
            case token_1.TokenType.IMPORT:
                return this.parseImportStmt();
            case token_1.TokenType.EXPORT:
                return this.parseExportStmt();
            case token_1.TokenType.TYPE:
                return this.parseTypeDecl();
            case token_1.TokenType.ENUM:
                return this.parseEnumDecl();
            case token_1.TokenType.METHOD:
                return this.parseMethodDecl();
            case token_1.TokenType.LBRACKET:
                // Only treat as tuple destructure if pattern is [IDENT, ...] =
                if (this.isTupleDestructurePattern()) {
                    return this.parseTupleDestructure();
                }
                return this.parseExprOrAssign();
            default:
                return this.parseAmbiguousStmt();
        }
    }
    /**
     * Dispatches ambiguous statements:
     * - type-annotated var declaration: `int x = expr`
     * - function declaration: `name(params) => expr` or `name(params)\n  INDENT body DEDENT`
     * - assignment: `x := expr`, `x += expr`
     * - expression statement
     */
    parseAmbiguousStmt() {
        // Check for type-annotated declaration (no var/varip modifier):
        // e.g. `int x = 1` or `series<float> x = close`
        if (this.isTypeAnnotationStart()) {
            const saved = this.pos;
            try {
                const typeAnn = this.parseTypeAnnotation();
                if (this.check(token_1.TokenType.IDENTIFIER)) {
                    const nameTok = this.advance();
                    if (this.check(token_1.TokenType.ASSIGN)) {
                        this.advance(); // consume =
                        const value = this.parseExpression();
                        this.consumeNewline();
                        return {
                            kind: 'VariableDeclaration',
                            modifier: null,
                            typeAnnotation: typeAnn,
                            name: nameTok.value,
                            value,
                            isTupleDestructure: false,
                            tupleNames: null,
                            loc: nameTok.loc,
                        };
                    }
                    // Not an assignment after type+name — restore
                    this.pos = saved;
                }
                else {
                    this.pos = saved;
                }
            }
            catch {
                this.pos = saved;
            }
        }
        // Check for function declaration: IDENT LPAREN ...
        if (this.check(token_1.TokenType.IDENTIFIER)) {
            const kind = this.sniffFunctionDecl();
            if (kind === 'funcDecl') {
                return this.parseFunctionDecl();
            }
        }
        // Expression or assignment
        return this.parseExprOrAssign();
    }
    /**
     * Look ahead from current IDENTIFIER token to decide if this is a function
     * declaration (name(params) => | name(params)\nINDENT) vs a call expression.
     * Returns 'funcDecl' or 'other'.
     */
    sniffFunctionDecl() {
        if (this.peekAt(0).type !== token_1.TokenType.IDENTIFIER)
            return 'other';
        if (this.peekAt(1).type !== token_1.TokenType.LPAREN)
            return 'other';
        // Scan forward past the parameter list
        let i = this.pos + 1; // pointing at LPAREN
        let depth = 0;
        while (i < this.tokens.length) {
            const t = this.tokens[i].type;
            if (t === token_1.TokenType.LPAREN)
                depth++;
            else if (t === token_1.TokenType.RPAREN) {
                depth--;
                if (depth === 0) {
                    i++;
                    break;
                }
            }
            else if (t === token_1.TokenType.EOF)
                break;
            i++;
        }
        // Skip optional `-> type` return annotation
        if (i < this.tokens.length && this.tokens[i].type === token_1.TokenType.THIN_ARROW) {
            i++;
            while (i < this.tokens.length) {
                const t = this.tokens[i].type;
                if (t === token_1.TokenType.IDENTIFIER || BASE_TYPE_KWS.has(t) ||
                    TYPE_QUALIFIERS.has(t) || t === token_1.TokenType.LT || t === token_1.TokenType.GT || t === token_1.TokenType.COMMA) {
                    i++;
                }
                else
                    break;
            }
        }
        if (i >= this.tokens.length)
            return 'other';
        const next = this.tokens[i].type;
        if (next === token_1.TokenType.ARROW)
            return 'funcDecl';
        // NEWLINE followed by INDENT means a block body
        if (next === token_1.TokenType.NEWLINE) {
            const afterNewline = this.tokens[i + 1]?.type;
            return afterNewline === token_1.TokenType.INDENT ? 'funcDecl' : 'other';
        }
        if (next === token_1.TokenType.INDENT)
            return 'funcDecl';
        return 'other';
    }
    parseExprOrAssign() {
        const expr = this.parseExpression();
        if (ASSIGN_OPS.has(this.peek().type)) {
            const opTok = this.advance();
            const op = opTok.value;
            const value = this.parseExpression();
            this.consumeNewline();
            return {
                kind: 'AssignmentStatement',
                target: expr,
                operator: op,
                value,
                loc: expr.loc,
            };
        }
        this.consumeNewline();
        return {
            kind: 'ExpressionStatement',
            expression: expr,
            loc: expr.loc,
        };
    }
    // ── Variable Declaration ─────────────────────────────────────────────────
    parseVarDecl() {
        const loc = this.peek().loc;
        const modTok = this.advance(); // var / varip
        const modifier = modTok.value;
        // Optional type annotation before name
        let typeAnnotation = null;
        if (this.isTypeAnnotationStart()) {
            const saved = this.pos;
            try {
                const ann = this.parseTypeAnnotation();
                if (this.check(token_1.TokenType.IDENTIFIER)) {
                    typeAnnotation = ann;
                }
                else {
                    this.pos = saved;
                }
            }
            catch {
                this.pos = saved;
            }
        }
        const nameTok = this.expect(token_1.TokenType.IDENTIFIER, 'Expected variable name');
        this.expect(token_1.TokenType.ASSIGN, 'Expected = after variable name');
        const value = this.parseExpression();
        this.consumeNewline();
        return {
            kind: 'VariableDeclaration',
            modifier,
            typeAnnotation,
            name: nameTok.value,
            value,
            isTupleDestructure: false,
            tupleNames: null,
            loc,
        };
    }
    // ── Tuple Destructure ────────────────────────────────────────────────────
    parseTupleDestructure() {
        const loc = this.peek().loc;
        this.expect(token_1.TokenType.LBRACKET, 'Expected [');
        const names = [];
        while (!this.check(token_1.TokenType.RBRACKET) && !this.isAtEnd()) {
            const nameTok = this.expect(token_1.TokenType.IDENTIFIER, 'Expected identifier in tuple');
            names.push(nameTok.value);
            if (!this.check(token_1.TokenType.RBRACKET)) {
                this.expect(token_1.TokenType.COMMA, 'Expected , between tuple names');
            }
        }
        this.expect(token_1.TokenType.RBRACKET, 'Expected ]');
        this.expect(token_1.TokenType.ASSIGN, 'Expected = after tuple');
        const value = this.parseExpression();
        this.consumeNewline();
        return {
            kind: 'VariableDeclaration',
            modifier: null,
            typeAnnotation: null,
            name: names[0] ?? '_',
            value,
            isTupleDestructure: true,
            tupleNames: names,
            loc,
        };
    }
    // ── Function Declaration ─────────────────────────────────────────────────
    parseFunctionDecl() {
        const loc = this.peek().loc;
        const nameTok = this.expect(token_1.TokenType.IDENTIFIER, 'Expected function name');
        this.expect(token_1.TokenType.LPAREN, 'Expected (');
        const params = this.parseFunctionParams();
        this.expect(token_1.TokenType.RPAREN, 'Expected )');
        let returnType = null;
        if (this.check(token_1.TokenType.THIN_ARROW)) {
            this.advance();
            returnType = this.parseTypeAnnotation();
        }
        let body;
        if (this.check(token_1.TokenType.ARROW)) {
            this.advance(); // consume =>
            // Pine allows `=> expr` on same line OR `=>\n  INDENT block DEDENT`
            if (this.check(token_1.TokenType.NEWLINE)) {
                this.consumeNewline();
                body = this.parseBlock();
            }
            else {
                body = this.parseExpression();
                this.consumeNewline();
            }
        }
        else {
            this.consumeNewline();
            body = this.parseBlock();
        }
        return { kind: 'FunctionDeclaration', name: nameTok.value, params, returnType, body, loc };
    }
    parseFunctionParams() {
        const params = [];
        while (!this.check(token_1.TokenType.RPAREN) && !this.isAtEnd()) {
            let typeAnnotation = null;
            if (this.isTypeAnnotationStart()) {
                const saved = this.pos;
                try {
                    const ann = this.parseTypeAnnotation();
                    // Accept IDENTIFIER or contextual keywords that can be param names (e.g. 'by')
                    if (this.check(token_1.TokenType.IDENTIFIER) || this.check(token_1.TokenType.BY)) {
                        typeAnnotation = ann;
                    }
                    else {
                        this.pos = saved;
                    }
                }
                catch {
                    this.pos = saved;
                }
            }
            // Allow keywords to be used as parameter names (e.g. 'by' in method/function params)
            const cur = this.peek();
            const nameTok = (cur.type === token_1.TokenType.IDENTIFIER || cur.type === token_1.TokenType.BY)
                ? this.advance()
                : this.expect(token_1.TokenType.IDENTIFIER, 'Expected parameter name');
            let defaultValue = null;
            if (this.check(token_1.TokenType.ASSIGN)) {
                this.advance();
                defaultValue = this.parseExpression();
            }
            params.push({ name: nameTok.value, typeAnnotation, defaultValue });
            if (!this.check(token_1.TokenType.RPAREN)) {
                this.expect(token_1.TokenType.COMMA, 'Expected , between parameters');
            }
        }
        return params;
    }
    // ── Method Declaration ───────────────────────────────────────────────────
    parseMethodDecl() {
        const loc = this.peek().loc;
        this.advance(); // consume 'method'
        const nameTok = this.expect(token_1.TokenType.IDENTIFIER, 'Expected method name');
        this.expect(token_1.TokenType.LPAREN, 'Expected (');
        const params = this.parseFunctionParams();
        this.expect(token_1.TokenType.RPAREN, 'Expected )');
        let returnType = null;
        if (this.check(token_1.TokenType.THIN_ARROW)) {
            this.advance();
            returnType = this.parseTypeAnnotation();
        }
        const thisType = params.length > 0 ? (params[0].typeAnnotation?.baseType ?? 'unknown') : 'unknown';
        const restParams = params.slice(1);
        let body;
        if (this.check(token_1.TokenType.ARROW)) {
            this.advance();
            // Pine allows `=> expr` on same line OR `=>\n  INDENT block DEDENT`
            if (this.check(token_1.TokenType.NEWLINE)) {
                // Multi-line method: body is an indented block
                this.consumeNewline();
                body = this.parseBlock();
            }
            else {
                body = this.parseExpression();
                this.consumeNewline();
            }
        }
        else {
            this.consumeNewline();
            body = this.parseBlock();
        }
        return { kind: 'MethodDeclaration', name: nameTok.value, thisType, params: restParams, returnType, body, loc };
    }
    // ── Type Declaration ─────────────────────────────────────────────────────
    parseTypeDecl() {
        const loc = this.peek().loc;
        this.advance(); // consume 'type'
        const nameTok = this.expect(token_1.TokenType.IDENTIFIER, 'Expected type name');
        this.consumeNewline();
        this.expect(token_1.TokenType.INDENT, 'Expected indent after type declaration');
        const fields = [];
        while (!this.check(token_1.TokenType.DEDENT) && !this.isAtEnd()) {
            this.skipNewlines();
            if (this.check(token_1.TokenType.DEDENT))
                break;
            const typeAnn = this.parseTypeAnnotation();
            const fieldName = this.expect(token_1.TokenType.IDENTIFIER, 'Expected field name');
            let defaultValue = null;
            if (this.check(token_1.TokenType.ASSIGN)) {
                this.advance();
                defaultValue = this.parseExpression();
            }
            fields.push({ name: fieldName.value, typeAnnotation: typeAnn, defaultValue });
            this.consumeNewline();
        }
        this.expect(token_1.TokenType.DEDENT, 'Expected dedent after type body');
        return { kind: 'TypeDeclaration', name: nameTok.value, fields, loc };
    }
    // ── Enum Declaration ─────────────────────────────────────────────────────
    parseEnumDecl() {
        const loc = this.peek().loc;
        this.advance(); // consume 'enum'
        const nameTok = this.expect(token_1.TokenType.IDENTIFIER, 'Expected enum name');
        this.consumeNewline();
        this.expect(token_1.TokenType.INDENT, 'Expected indent after enum');
        const members = [];
        while (!this.check(token_1.TokenType.DEDENT) && !this.isAtEnd()) {
            this.skipNewlines();
            if (this.check(token_1.TokenType.DEDENT))
                break;
            const memberTok = this.expect(token_1.TokenType.IDENTIFIER, 'Expected enum member');
            let val = undefined;
            if (this.check(token_1.TokenType.ASSIGN)) {
                this.advance(); // consume '='
                if (this.check(token_1.TokenType.STRING)) {
                    val = this.advance().value;
                }
                else if (this.check(token_1.TokenType.INTEGER) || this.check(token_1.TokenType.FLOAT) || this.check(token_1.TokenType.IDENTIFIER)) {
                    val = this.advance().value;
                }
                else {
                    val = this.peek().value;
                    this.advance();
                }
            }
            members.push({ name: memberTok.value, value: val ?? memberTok.value });
            this.consumeNewline();
        }
        this.expect(token_1.TokenType.DEDENT, 'Expected dedent after enum body');
        return { kind: 'EnumDeclaration', name: nameTok.value, members, loc };
    }
    // ── Import / Export ──────────────────────────────────────────────────────
    parseImportStmt() {
        const loc = this.peek().loc;
        this.advance(); // consume 'import'
        const parts = [];
        parts.push(this.expect(token_1.TokenType.IDENTIFIER, 'Expected library path').value);
        let version = null;
        // Accept slash-separated path like username/library/version
        while (this.check(token_1.TokenType.SLASH)) {
            this.advance();
            if (this.check(token_1.TokenType.INTEGER)) {
                version = parseInt(this.advance().value, 10);
                break;
            }
            else {
                parts.push(this.expect(token_1.TokenType.IDENTIFIER, 'Expected path segment').value);
            }
        }
        const source = parts.join('/');
        let alias = '';
        if (this.check(token_1.TokenType.AS)) {
            this.advance();
            alias = this.expect(token_1.TokenType.IDENTIFIER, 'Expected alias').value;
        }
        this.consumeNewline();
        return { kind: 'ImportStatement', source, alias, version, loc };
    }
    parseExportStmt() {
        const loc = this.peek().loc;
        this.advance(); // consume 'export'
        let declaration;
        if (this.check(token_1.TokenType.TYPE)) {
            declaration = this.parseTypeDecl();
        }
        else if (this.check(token_1.TokenType.VAR) || this.check(token_1.TokenType.VARIP)) {
            declaration = this.parseVarDecl();
        }
        else {
            declaration = this.parseFunctionDecl();
        }
        return { kind: 'ExportStatement', declaration, loc };
    }
    // ── If Statement ─────────────────────────────────────────────────────────
    parseIfStmt() {
        const loc = this.peek().loc;
        this.advance(); // consume 'if'
        const condition = this.parseExpression();
        this.consumeNewline();
        const thenBlock = this.parseBlock();
        let elseBlock = null;
        if (this.check(token_1.TokenType.ELSE)) {
            this.advance(); // consume 'else'
            if (this.check(token_1.TokenType.IF)) {
                elseBlock = this.parseIfStmt();
            }
            else {
                this.consumeNewline();
                elseBlock = this.parseBlock();
            }
        }
        return { kind: 'IfStatement', condition, thenBlock, elseBlock, loc };
    }
    // ── For / ForIn Statement ────────────────────────────────────────────────
    parseForStmt() {
        const loc = this.peek().loc;
        this.advance(); // consume 'for'
        // Check for destructuring: for [index, value] in iterable
        if (this.check(token_1.TokenType.LBRACKET)) {
            this.advance(); // consume [
            const indexTok = this.expect(token_1.TokenType.IDENTIFIER, 'Expected index variable');
            this.expect(token_1.TokenType.COMMA, 'Expected , in for destructuring');
            const valueTok = this.expect(token_1.TokenType.IDENTIFIER, 'Expected value variable');
            this.expect(token_1.TokenType.RBRACKET, 'Expected ]');
            this.expect(token_1.TokenType.IN, 'Expected in after for destructuring');
            const iterable = this.parseExpression();
            this.consumeNewline();
            const body = this.parseBlock();
            return {
                kind: 'ForInStatement',
                variable: valueTok.value,
                indexVariable: indexTok.value,
                iterable,
                body,
                loc,
            };
        }
        const varTok = this.expect(token_1.TokenType.IDENTIFIER, 'Expected variable name');
        if (this.check(token_1.TokenType.IN)) {
            this.advance(); // consume 'in'
            const iterable = this.parseExpression();
            this.consumeNewline();
            const body = this.parseBlock();
            return { kind: 'ForInStatement', variable: varTok.value, indexVariable: null, iterable, body, loc };
        }
        // for i = start to end [by step]
        this.expect(token_1.TokenType.ASSIGN, 'Expected = in for loop');
        const start = this.parseExpression();
        this.expect(token_1.TokenType.TO, 'Expected to in for loop');
        const end = this.parseExpression();
        let step = null;
        if (this.check(token_1.TokenType.BY)) {
            this.advance();
            step = this.parseExpression();
        }
        this.consumeNewline();
        const body = this.parseBlock();
        return { kind: 'ForStatement', variable: varTok.value, start, end, step, body, loc };
    }
    // ── While Statement ──────────────────────────────────────────────────────
    parseWhileStmt() {
        const loc = this.peek().loc;
        this.advance(); // consume 'while'
        const condition = this.parseExpression();
        this.consumeNewline();
        const body = this.parseBlock();
        return { kind: 'WhileStatement', condition, body, loc };
    }
    // ── Switch Statement ─────────────────────────────────────────────────────
    parseSwitchStmt() {
        const loc = this.peek().loc;
        this.advance(); // consume 'switch'
        let discriminant = null;
        if (!this.check(token_1.TokenType.NEWLINE) && !this.check(token_1.TokenType.INDENT) && !this.isAtEnd()) {
            discriminant = this.parseExpression();
        }
        this.consumeNewline();
        this.expect(token_1.TokenType.INDENT, 'Expected indent after switch');
        const cases = [];
        let defaultCase = null;
        while (!this.check(token_1.TokenType.DEDENT) && !this.isAtEnd()) {
            this.skipNewlines();
            if (this.check(token_1.TokenType.DEDENT))
                break;
            if (this.check(token_1.TokenType.ARROW)) {
                // Default case: => body
                this.advance();
                if (this.check(token_1.TokenType.NEWLINE)) {
                    this.consumeNewline();
                    defaultCase = this.parseBlock();
                }
                else {
                    const stmt = this.parseStatementSafe();
                    defaultCase = stmt ? [stmt] : [];
                    this.consumeNewline();
                }
            }
            else {
                const values = [this.parseExpression()];
                while (this.check(token_1.TokenType.COMMA)) {
                    this.advance();
                    values.push(this.parseExpression());
                }
                this.expect(token_1.TokenType.ARROW, 'Expected => after case values');
                let body;
                if (this.check(token_1.TokenType.NEWLINE)) {
                    this.consumeNewline();
                    body = this.parseBlock();
                }
                else {
                    const stmt = this.parseStatementSafe();
                    body = stmt ? [stmt] : [];
                    this.consumeNewline();
                }
                cases.push({ values, body });
            }
        }
        this.expect(token_1.TokenType.DEDENT, 'Expected dedent after switch body');
        return { kind: 'SwitchStatement', discriminant, cases, defaultCase, loc };
    }
    // ── Return ───────────────────────────────────────────────────────────────
    parseReturnStmt() {
        const loc = this.peek().loc;
        this.advance(); // consume 'return'
        let value = null;
        if (!this.check(token_1.TokenType.NEWLINE) && !this.check(token_1.TokenType.DEDENT) && !this.isAtEnd()) {
            value = this.parseExpression();
        }
        this.consumeNewline();
        return { kind: 'ReturnStatement', value, loc };
    }
    // ── Block ────────────────────────────────────────────────────────────────
    parseBlock() {
        this.expect(token_1.TokenType.INDENT, 'Expected indent');
        const stmts = [];
        this.skipNewlines();
        while (!this.check(token_1.TokenType.DEDENT) && !this.isAtEnd()) {
            if (this.check(token_1.TokenType.ANNOTATION)) {
                this.parseAnnotation();
                this.skipNewlines();
                continue;
            }
            const stmt = this.parseStatementSafe();
            if (stmt)
                stmts.push(stmt);
            this.skipNewlines();
        }
        this.expect(token_1.TokenType.DEDENT, 'Expected dedent');
        return stmts;
    }
    // ── Expressions (Pratt-style) ────────────────────────────────────────────
    parseExpression(minPrec = 0 /* Precedence.NONE */) {
        let left = this.parseUnary();
        while (true) {
            const cur = this.peek();
            const info = (0, precedence_1.getInfixInfo)(cur.type);
            if (!info || info.precedence <= minPrec)
                break;
            if (cur.type === token_1.TokenType.QUESTION) {
                // Ternary: expr ? consequent : alternate
                this.advance(); // consume ?
                const consequent = this.parseExpression(0 /* Precedence.NONE */);
                this.expect(token_1.TokenType.COLON, 'Expected : in ternary expression');
                const alternate = this.parseExpression(0 /* Precedence.NONE */);
                left = {
                    kind: 'ConditionalExpression',
                    condition: left,
                    consequent,
                    alternate,
                    loc: left.loc,
                };
                continue;
            }
            const opTok = this.advance();
            const nextMinPrec = info.associativity === 'right'
                ? info.precedence - 1
                : info.precedence;
            const right = this.parseExpression(nextMinPrec);
            left = {
                kind: 'BinaryExpression',
                operator: opTok.value,
                left,
                right,
                loc: left.loc,
            };
        }
        return left;
    }
    parseUnary() {
        const cur = this.peek();
        if (cur.type === token_1.TokenType.NOT) {
            const loc = cur.loc;
            this.advance();
            const operand = this.parseUnary();
            return { kind: 'UnaryExpression', operator: 'not', operand, prefix: true, loc };
        }
        if (cur.type === token_1.TokenType.MINUS || cur.type === token_1.TokenType.PLUS) {
            const loc = cur.loc;
            const op = this.advance().value;
            const operand = this.parsePostfix(); // parse postfix, not another unary, to avoid ambiguity with binary
            return { kind: 'UnaryExpression', operator: op, operand, prefix: true, loc };
        }
        return this.parsePostfix();
    }
    isGenericCallArgs() {
        if (!this.check(token_1.TokenType.LT))
            return false;
        let pos = this.pos + 1;
        let depth = 1;
        while (pos < this.tokens.length) {
            const t = this.tokens[pos].type;
            if (t === token_1.TokenType.LT)
                depth++;
            else if (t === token_1.TokenType.GT) {
                depth--;
                if (depth === 0) {
                    return this.tokens[pos + 1]?.type === token_1.TokenType.LPAREN;
                }
            }
            else if (t === token_1.TokenType.NEWLINE || t === token_1.TokenType.DEDENT || t === token_1.TokenType.EOF) {
                return false;
            }
            pos++;
        }
        return false;
    }
    parsePostfix() {
        let expr = this.parsePrimary();
        while (true) {
            if (this.isGenericCallArgs()) {
                this.advance(); // consume <
                const typeArgs = [this.parseTypeAnnotation()];
                while (this.check(token_1.TokenType.COMMA)) {
                    this.advance();
                    typeArgs.push(this.parseTypeAnnotation());
                }
                this.expect(token_1.TokenType.GT, 'Expected > after type arguments');
                this.expect(token_1.TokenType.LPAREN, 'Expected (');
                const args = this.parseCallArgs();
                this.expect(token_1.TokenType.RPAREN, 'Expected )');
                expr = { kind: 'CallExpression', callee: expr, args, typeArgs, loc: expr.loc };
            }
            else if (this.check(token_1.TokenType.LPAREN)) {
                // Function/method call
                this.advance(); // consume (
                const args = this.parseCallArgs();
                this.expect(token_1.TokenType.RPAREN, 'Expected )');
                expr = { kind: 'CallExpression', callee: expr, args, loc: expr.loc };
                // Extract indicator/strategy metadata
                const ce = expr;
                if (ce.callee.kind === 'IdentifierExpression') {
                    const name = ce.callee.name;
                    if (name === 'indicator' || name === 'strategy' || name === 'study') {
                        this.extractMetadata(ce);
                    }
                }
            }
            else if (this.check(token_1.TokenType.DOT)) {
                this.advance(); // consume .
                let propName;
                const cur = this.peek();
                if (cur.type === token_1.TokenType.IDENTIFIER ||
                    cur.type === token_1.TokenType.BOOL_TYPE ||
                    cur.type === token_1.TokenType.FLOAT_TYPE ||
                    cur.type === token_1.TokenType.INT ||
                    cur.type === token_1.TokenType.STRING_TYPE ||
                    cur.type === token_1.TokenType.COLOR_TYPE ||
                    cur.type === token_1.TokenType.TYPE ||
                    cur.type === token_1.TokenType.INPUT ||
                    cur.type === token_1.TokenType.SERIES ||
                    cur.type === token_1.TokenType.SIMPLE ||
                    cur.type === token_1.TokenType.CONST ||
                    cur.type === token_1.TokenType.VAR ||
                    cur.type === token_1.TokenType.VARIP ||
                    cur.type === token_1.TokenType.METHOD ||
                    cur.type === token_1.TokenType.ENUM) {
                    propName = this.advance().value;
                }
                else {
                    const propTok = this.expect(token_1.TokenType.IDENTIFIER, 'Expected property name');
                    propName = propTok.value;
                }
                expr = { kind: 'MemberExpression', object: expr, property: propName, loc: expr.loc };
            }
            else if (this.check(token_1.TokenType.LBRACKET)) {
                this.advance(); // consume [
                const index = this.parseExpression();
                this.expect(token_1.TokenType.RBRACKET, 'Expected ]');
                expr = { kind: 'IndexExpression', object: expr, index, loc: expr.loc };
            }
            else {
                break;
            }
        }
        return expr;
    }
    parseCallArgs() {
        const args = [];
        while (!this.check(token_1.TokenType.RPAREN) && !this.isAtEnd()) {
            // Named arg: IDENTIFIER = expr (but not IDENTIFIER == expr or IDENTIFIER := expr)
            // Also handle type keywords used as param names (e.g. color=color.blue)
            let name = null;
            const isNamedArgStart = (this.check(token_1.TokenType.IDENTIFIER) ||
                this.check(token_1.TokenType.COLOR_TYPE) ||
                this.check(token_1.TokenType.INT) ||
                this.check(token_1.TokenType.FLOAT_TYPE) ||
                this.check(token_1.TokenType.BOOL_TYPE) ||
                this.check(token_1.TokenType.STRING_TYPE) ||
                this.check(token_1.TokenType.INPUT)) && this.peekAt(1).type === token_1.TokenType.ASSIGN;
            if (isNamedArgStart) {
                name = this.advance().value;
                this.advance(); // consume =
            }
            const value = this.parseExpression();
            args.push({ name, value });
            if (!this.check(token_1.TokenType.RPAREN)) {
                this.expect(token_1.TokenType.COMMA, 'Expected , between arguments');
            }
        }
        return args;
    }
    extractMetadata(call) {
        for (const arg of call.args) {
            if (arg.name && arg.value.kind === 'LiteralExpression') {
                this.metadata[arg.name] = String(arg.value.value);
            }
        }
    }
    parsePrimary() {
        const cur = this.peek();
        switch (cur.type) {
            case token_1.TokenType.INTEGER:
                this.advance();
                return { kind: 'LiteralExpression', valueType: 'int', value: parseInt(cur.value, 10), loc: cur.loc };
            case token_1.TokenType.FLOAT:
                this.advance();
                return { kind: 'LiteralExpression', valueType: 'float', value: parseFloat(cur.value), loc: cur.loc };
            case token_1.TokenType.STRING:
                this.advance();
                return { kind: 'LiteralExpression', valueType: 'string', value: cur.value, loc: cur.loc };
            case token_1.TokenType.TRUE:
                this.advance();
                return { kind: 'LiteralExpression', valueType: 'bool', value: true, loc: cur.loc };
            case token_1.TokenType.FALSE:
                this.advance();
                return { kind: 'LiteralExpression', valueType: 'bool', value: false, loc: cur.loc };
            case token_1.TokenType.COLOR:
                this.advance();
                return { kind: 'LiteralExpression', valueType: 'color', value: cur.value, loc: cur.loc };
            case token_1.TokenType.NA:
                this.advance();
                return { kind: 'LiteralExpression', valueType: 'na', value: null, loc: cur.loc };
            case token_1.TokenType.IDENTIFIER:
            // Type keywords used as namespace identifiers (e.g. color.red, int as function param name)
            case token_1.TokenType.COLOR_TYPE:
            case token_1.TokenType.INT:
            case token_1.TokenType.FLOAT_TYPE:
            case token_1.TokenType.BOOL_TYPE:
            case token_1.TokenType.STRING_TYPE:
            case token_1.TokenType.INPUT:
            // Contextual keywords that can be used as variable names
            case token_1.TokenType.BY:
                this.advance();
                return { kind: 'IdentifierExpression', name: cur.value, loc: cur.loc };
            case token_1.TokenType.LPAREN: {
                this.advance(); // consume (
                const expr = this.parseExpression();
                this.expect(token_1.TokenType.RPAREN, 'Expected )');
                return { kind: 'GroupExpression', expression: expr, loc: cur.loc };
            }
            case token_1.TokenType.LBRACKET: {
                // Array literal
                this.advance(); // consume [
                const elements = [];
                while (!this.check(token_1.TokenType.RBRACKET) && !this.isAtEnd()) {
                    elements.push(this.parseExpression());
                    if (!this.check(token_1.TokenType.RBRACKET)) {
                        this.expect(token_1.TokenType.COMMA, 'Expected , in array literal');
                    }
                }
                this.expect(token_1.TokenType.RBRACKET, 'Expected ]');
                return { kind: 'ArrayLiteralExpression', elements, loc: cur.loc };
            }
            case token_1.TokenType.IF:
                return this.parseIfExpr();
            case token_1.TokenType.SWITCH:
                return this.parseSwitchExpr();
            default: {
                this.reporter.error(`Unexpected token '${cur.value}' (${cur.type})`, cur.loc);
                this.advance(); // avoid infinite loop
                return { kind: 'LiteralExpression', valueType: 'na', value: null, loc: cur.loc };
            }
        }
    }
    // ── If Expression ────────────────────────────────────────────────────────
    parseIfExpr() {
        const loc = this.peek().loc;
        this.advance(); // consume 'if'
        const condition = this.parseExpression();
        this.consumeNewline();
        this.expect(token_1.TokenType.INDENT, 'Expected indent in if expression');
        this.skipNewlines();
        const thenBranch = this.parseExpression();
        this.consumeNewline();
        this.skipNewlines();
        this.expect(token_1.TokenType.DEDENT, 'Expected dedent after then branch');
        let elseBranch = null;
        if (this.check(token_1.TokenType.ELSE)) {
            this.advance(); // consume 'else'
            this.consumeNewline();
            this.expect(token_1.TokenType.INDENT, 'Expected indent in else branch');
            this.skipNewlines();
            elseBranch = this.parseExpression();
            this.consumeNewline();
            this.skipNewlines();
            this.expect(token_1.TokenType.DEDENT, 'Expected dedent after else branch');
        }
        return { kind: 'IfExpression', condition, thenBranch, elseBranch, loc };
    }
    // ── Switch Expression ────────────────────────────────────────────────────
    parseSwitchExpr() {
        const loc = this.peek().loc;
        this.advance(); // consume 'switch'
        let discriminant = null;
        if (!this.check(token_1.TokenType.NEWLINE) && !this.check(token_1.TokenType.INDENT) && !this.isAtEnd()) {
            discriminant = this.parseExpression();
        }
        this.consumeNewline();
        this.expect(token_1.TokenType.INDENT, 'Expected indent after switch');
        const cases = [];
        let defaultCase = null;
        while (!this.check(token_1.TokenType.DEDENT) && !this.isAtEnd()) {
            this.skipNewlines();
            if (this.check(token_1.TokenType.DEDENT))
                break;
            if (this.check(token_1.TokenType.ARROW)) {
                this.advance(); // consume =>
                if (this.check(token_1.TokenType.NEWLINE)) {
                    this.consumeNewline();
                    this.expect(token_1.TokenType.INDENT, 'Expected indent in default case');
                    this.skipNewlines();
                    defaultCase = this.parseExpression();
                    this.consumeNewline();
                    this.skipNewlines();
                    this.expect(token_1.TokenType.DEDENT, 'Expected dedent');
                }
                else {
                    defaultCase = this.parseExpression();
                    this.consumeNewline();
                }
            }
            else {
                const values = [this.parseExpression()];
                while (this.check(token_1.TokenType.COMMA)) {
                    this.advance();
                    values.push(this.parseExpression());
                }
                this.expect(token_1.TokenType.ARROW, 'Expected => in switch case');
                let body;
                if (this.check(token_1.TokenType.NEWLINE)) {
                    this.consumeNewline();
                    this.expect(token_1.TokenType.INDENT, 'Expected indent in switch case');
                    this.skipNewlines();
                    body = this.parseExpression();
                    this.consumeNewline();
                    this.skipNewlines();
                    this.expect(token_1.TokenType.DEDENT, 'Expected dedent');
                }
                else {
                    body = this.parseExpression();
                    this.consumeNewline();
                }
                cases.push({ values, body });
            }
        }
        this.expect(token_1.TokenType.DEDENT, 'Expected dedent after switch');
        return { kind: 'SwitchExpression', discriminant, cases, defaultCase, loc };
    }
    // ── Type Annotation ──────────────────────────────────────────────────────
    // Drawing object and other types that can appear as type annotations
    static DRAWING_TYPE_NAMES = new Set(['line', 'label', 'box', 'table', 'linefill', 'polyline', 'chart']);
    /**
     * Returns true if the current token can start a type annotation.
     * We detect non-IDENTIFIER base types (int, float, bool, string, color),
     * qualifiers (const, input, simple, series), and drawing object type names
     * (line, label, box, table) when followed by an identifier.
     * Also handles generic types like array<int>, map<int, int> and user-defined type names (UDTs).
     */
    isTypeAnnotationStart() {
        const t = this.peek().type;
        if (TYPE_QUALIFIERS.has(t) || BASE_TYPE_KWS.has(t))
            return true;
        // Check for drawing object type names or generic types (array<...>, map<...>)
        if (t === token_1.TokenType.IDENTIFIER) {
            if (this.peekAt(1).type === token_1.TokenType.LT)
                return true;
            // Only if followed by another identifier (the variable name)
            // Also handle array types: line[] myVar, MyType[] arr
            const next = this.peekAt(1);
            if (next.type === token_1.TokenType.IDENTIFIER)
                return true;
            if (next.type === token_1.TokenType.LBRACKET && this.peekAt(2).type === token_1.TokenType.RBRACKET)
                return true;
        }
        return false;
    }
    parseTypeAnnotation() {
        let qualifier = null;
        if (TYPE_QUALIFIERS.has(this.peek().type)) {
            const qualTok = this.advance();
            switch (qualTok.type) {
                case token_1.TokenType.CONST:
                    qualifier = 'const';
                    break;
                case token_1.TokenType.INPUT:
                    qualifier = 'input';
                    break;
                case token_1.TokenType.SIMPLE:
                    qualifier = 'simple';
                    break;
                case token_1.TokenType.SERIES:
                    qualifier = 'series';
                    break;
            }
        }
        // Base type
        let baseType;
        const cur = this.peek();
        if (BASE_TYPE_KWS.has(cur.type) || cur.type === token_1.TokenType.IDENTIFIER) {
            baseType = this.advance().value;
        }
        else {
            throw new Error(`Expected type name, got ${cur.type}`);
        }
        // Generic: array<float>, map<string, int>, etc.
        const typeArgs = [];
        if (this.check(token_1.TokenType.LT)) {
            this.advance(); // consume <
            typeArgs.push(this.parseTypeAnnotation());
            while (this.check(token_1.TokenType.COMMA)) {
                this.advance();
                typeArgs.push(this.parseTypeAnnotation());
            }
            this.expect(token_1.TokenType.GT, 'Expected > after type arguments');
        }
        // Array shorthand: float[], int[], line[], etc. → wrap as array<baseType>
        if (this.check(token_1.TokenType.LBRACKET) && this.peekAt(1).type === token_1.TokenType.RBRACKET) {
            this.advance(); // consume [
            this.advance(); // consume ]
            return {
                qualifier,
                baseType: 'array',
                typeArgs: [{ qualifier: null, baseType, typeArgs }],
            };
        }
        return { qualifier, baseType, typeArgs };
    }
}
exports.Parser = Parser;
//# sourceMappingURL=parser.js.map