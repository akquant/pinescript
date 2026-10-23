"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Lexer = void 0;
const token_1 = require("./token");
const indent_tracker_1 = require("./indent-tracker");
class Lexer {
    source;
    pos = 0;
    line = 1;
    column = 1;
    tokens = [];
    reporter;
    indentTracker;
    /** Whether we are at the start of a logical line (after a newline) */
    atLineStart = true;
    /** Tracks nesting level of (), [] to ignore newlines and indents inside expressions */
    parenDepth = 0;
    constructor(source, reporter) {
        this.source = source;
        this.reporter = reporter;
        this.indentTracker = new indent_tracker_1.IndentTracker();
    }
    tokenize() {
        while (!this.isAtEnd()) {
            if (this.atLineStart) {
                this.handleLineStart();
            }
            else {
                this.scanToken();
            }
        }
        // Emit trailing DEDENTs before EOF
        const eofLoc = this.currentLoc();
        const dedents = this.indentTracker.finalize(eofLoc);
        for (const d of dedents) {
            this.tokens.push(d);
        }
        this.tokens.push({ type: token_1.TokenType.EOF, value: '', loc: eofLoc });
        return this.tokens;
    }
    // ── Line-start: measure indentation ──────────────────────────────────────
    handleLineStart() {
        let indent = 0;
        const startPos = this.pos;
        const startLine = this.line;
        const startCol = this.column;
        // Measure indentation (spaces/tabs), normalising tabs to 4 spaces
        while (!this.isAtEnd()) {
            const ch = this.peek();
            if (ch === ' ') {
                indent++;
                this.advance();
            }
            else if (ch === '\t') {
                indent += 4;
                this.advance();
            }
            else {
                break;
            }
        }
        // If this is a blank line or comment-only line, skip it without emitting NEWLINE
        if (this.isAtEnd() || this.peek() === '\n' || this.peek() === '\r') {
            this.consumeNewline();
            return;
        }
        // Comment-only lines: skip without indent processing
        if (this.peek() === '/' && this.peekNext() === '/') {
            // Handle annotation vs comment
            // We still want to emit the annotation token. Indent processing is skipped.
            const loc = { line: startLine, column: 1, offset: startPos };
            this.atLineStart = false;
            this.scanToken();
            return;
        }
        // Line continuation: if inside parentheses/brackets, or previous token is continuation token,
        // skip indent/dedent processing completely
        const last = this.tokens[this.tokens.length - 1];
        if (this.parenDepth > 0 || (last && this.isContinuationToken(last.type))) {
            this.atLineStart = false;
            return;
        }
        // Emit indent/dedent tokens if needed
        const loc = { line: startLine, column: 1, offset: startPos };
        const indentTokens = this.indentTracker.process(indent, loc);
        for (const t of indentTokens) {
            this.tokens.push(t);
        }
        this.atLineStart = false;
    }
    // ── Main token scanner ────────────────────────────────────────────────────
    scanToken() {
        // Skip non-newline whitespace
        while (!this.isAtEnd() && (this.peek() === ' ' || this.peek() === '\t')) {
            this.advance();
        }
        if (this.isAtEnd())
            return;
        const ch = this.peek();
        // Newline
        if (ch === '\n' || ch === '\r') {
            const loc = this.currentLoc();
            this.consumeNewline();
            // If inside parens/brackets, newlines are completely ignored (implicit line continuation)
            if (this.parenDepth > 0) {
                this.atLineStart = true;
                return;
            }
            // Emit NEWLINE only if previous token is not a NEWLINE/INDENT/DEDENT
            // and not a continuation token (implicit line continuation)
            const last = this.tokens[this.tokens.length - 1];
            if (last &&
                last.type !== token_1.TokenType.NEWLINE &&
                last.type !== token_1.TokenType.INDENT &&
                last.type !== token_1.TokenType.DEDENT &&
                !this.isContinuationToken(last.type)) {
                this.tokens.push({ type: token_1.TokenType.NEWLINE, value: '\n', loc });
            }
            this.atLineStart = true;
            return;
        }
        // Block comments /* */
        if (ch === '/' && this.peekNext() === '*') {
            this.scanBlockComment();
            return;
        }
        // Comments and annotations
        if (ch === '/' && this.peekNext() === '/') {
            this.scanCommentOrAnnotation();
            return;
        }
        // Color literal  #RRGGBB[AA]
        if (ch === '#') {
            this.scanColor();
            return;
        }
        // Strings
        if (ch === '"' || ch === "'") {
            this.scanString(ch);
            return;
        }
        // Numbers
        if (this.isDigit(ch) || (ch === '.' && this.isDigit(this.peekNext()))) {
            this.scanNumber();
            return;
        }
        // Identifiers / keywords
        if (this.isAlpha(ch)) {
            this.scanIdentifier();
            return;
        }
        // Operators & delimiters
        this.scanOperator();
    }
    // ── Block Comments ───────────────────────────────────────────────────────
    scanBlockComment() {
        // consume '/*'
        this.advance();
        this.advance();
        while (!this.isAtEnd()) {
            if (this.peek() === '*' && this.peekNext() === '/') {
                this.advance(); // consume '*'
                this.advance(); // consume '/'
                return;
            }
            this.advance(); // advance() already tracks line/column for newlines
        }
        // Unterminated block comment - just end
        this.reporter.error('Unterminated block comment', this.currentLoc());
    }
    // ── Comments / Annotations ────────────────────────────────────────────────
    scanCommentOrAnnotation() {
        const loc = this.currentLoc();
        // consume '//'
        this.advance();
        this.advance();
        if (this.peek() === '@') {
            // Annotation: consume until end of line
            let value = '//@';
            this.advance(); // consume '@'
            while (!this.isAtEnd() && this.peek() !== '\n' && this.peek() !== '\r') {
                value += this.advance();
            }
            this.tokens.push({ type: token_1.TokenType.ANNOTATION, value, loc });
        }
        else {
            // Regular comment: skip to end of line (do not emit)
            while (!this.isAtEnd() && this.peek() !== '\n' && this.peek() !== '\r') {
                this.advance();
            }
        }
    }
    // ── Color literals ────────────────────────────────────────────────────────
    scanColor() {
        const loc = this.currentLoc();
        let value = '#';
        this.advance(); // consume '#'
        while (!this.isAtEnd() && this.isHexDigit(this.peek())) {
            value += this.advance();
        }
        const hexLen = value.length - 1; // exclude '#'
        if (hexLen !== 6 && hexLen !== 8) {
            this.reporter.error(`Invalid color literal '${value}': expected #RRGGBB or #RRGGBBAA`, loc);
        }
        this.tokens.push({ type: token_1.TokenType.COLOR, value, loc });
    }
    // ── String literals ───────────────────────────────────────────────────────
    scanString(quote) {
        const loc = this.currentLoc();
        this.advance(); // consume opening quote
        let value = '';
        while (!this.isAtEnd() && this.peek() !== quote) {
            if (this.peek() === '\n' || this.peek() === '\r') {
                value += this.advance();
                continue;
            }
            if (this.peek() === '\\') {
                this.advance(); // consume backslash
                const esc = this.advance();
                switch (esc) {
                    case 'n':
                        value += '\n';
                        break;
                    case 't':
                        value += '\t';
                        break;
                    case 'r':
                        value += '\r';
                        break;
                    case '\\':
                        value += '\\';
                        break;
                    case '"':
                        value += '"';
                        break;
                    case "'":
                        value += "'";
                        break;
                    default: value += '\\' + esc;
                }
            }
            else {
                value += this.advance();
            }
        }
        if (this.isAtEnd()) {
            this.reporter.error('Unterminated string literal', loc);
        }
        else {
            this.advance(); // consume closing quote
        }
        this.tokens.push({ type: token_1.TokenType.STRING, value, loc });
    }
    // ── Number literals ───────────────────────────────────────────────────────
    scanNumber() {
        const loc = this.currentLoc();
        let value = '';
        let isFloat = false;
        // Integer part
        while (!this.isAtEnd() && this.isDigit(this.peek())) {
            value += this.advance();
        }
        // Decimal part
        if (!this.isAtEnd() && this.peek() === '.' && this.isDigit(this.peekNext())) {
            isFloat = true;
            value += this.advance(); // '.'
            while (!this.isAtEnd() && this.isDigit(this.peek())) {
                value += this.advance();
            }
        }
        // Leading dot (e.g. .5)
        if (value === '' && this.peek() === '.') {
            isFloat = true;
            value += this.advance();
            while (!this.isAtEnd() && this.isDigit(this.peek())) {
                value += this.advance();
            }
        }
        // Scientific notation: e.g. 1e5, 1.5e-3, 2E+10
        if (!this.isAtEnd() && (this.peek() === 'e' || this.peek() === 'E')) {
            isFloat = true;
            value += this.advance(); // consume 'e'/'E'
            if (!this.isAtEnd() && (this.peek() === '+' || this.peek() === '-')) {
                value += this.advance(); // consume sign
            }
            while (!this.isAtEnd() && this.isDigit(this.peek())) {
                value += this.advance();
            }
        }
        this.tokens.push({
            type: isFloat ? token_1.TokenType.FLOAT : token_1.TokenType.INTEGER,
            value,
            loc,
        });
    }
    // ── Identifiers / Keywords ────────────────────────────────────────────────
    scanIdentifier() {
        const loc = this.currentLoc();
        let value = '';
        while (!this.isAtEnd() && this.isAlphaNumeric(this.peek())) {
            value += this.advance();
        }
        // Check for keywords
        const kwType = token_1.KEYWORDS[value];
        if (kwType !== undefined) {
            this.tokens.push({ type: kwType, value, loc });
        }
        else {
            this.tokens.push({ type: token_1.TokenType.IDENTIFIER, value, loc });
        }
    }
    // ── Operators ─────────────────────────────────────────────────────────────
    scanOperator() {
        const loc = this.currentLoc();
        const ch = this.advance();
        switch (ch) {
            case '+':
                if (this.match('=')) {
                    this.tokens.push({ type: token_1.TokenType.PLUS_ASSIGN, value: '+=', loc });
                }
                else {
                    this.tokens.push({ type: token_1.TokenType.PLUS, value: '+', loc });
                }
                break;
            case '-':
                if (this.match('=')) {
                    this.tokens.push({ type: token_1.TokenType.MINUS_ASSIGN, value: '-=', loc });
                }
                else if (this.match('>')) {
                    this.tokens.push({ type: token_1.TokenType.THIN_ARROW, value: '->', loc });
                }
                else {
                    this.tokens.push({ type: token_1.TokenType.MINUS, value: '-', loc });
                }
                break;
            case '*':
                if (this.match('=')) {
                    this.tokens.push({ type: token_1.TokenType.STAR_ASSIGN, value: '*=', loc });
                }
                else {
                    this.tokens.push({ type: token_1.TokenType.STAR, value: '*', loc });
                }
                break;
            case '/':
                if (this.match('=')) {
                    this.tokens.push({ type: token_1.TokenType.SLASH_ASSIGN, value: '/=', loc });
                }
                else {
                    this.tokens.push({ type: token_1.TokenType.SLASH, value: '/', loc });
                }
                break;
            case '%':
                if (this.match('=')) {
                    this.tokens.push({ type: token_1.TokenType.PERCENT_ASSIGN, value: '%=', loc });
                }
                else {
                    this.tokens.push({ type: token_1.TokenType.PERCENT, value: '%', loc });
                }
                break;
            case '=':
                if (this.match('=')) {
                    this.tokens.push({ type: token_1.TokenType.EQ, value: '==', loc });
                }
                else if (this.match('>')) {
                    this.tokens.push({ type: token_1.TokenType.ARROW, value: '=>', loc });
                }
                else {
                    this.tokens.push({ type: token_1.TokenType.ASSIGN, value: '=', loc });
                }
                break;
            case '!':
                if (this.match('=')) {
                    this.tokens.push({ type: token_1.TokenType.NEQ, value: '!=', loc });
                }
                else {
                    this.reporter.error(`Unexpected character '!'`, loc);
                }
                break;
            case '<':
                if (this.match('=')) {
                    this.tokens.push({ type: token_1.TokenType.LTE, value: '<=', loc });
                }
                else {
                    this.tokens.push({ type: token_1.TokenType.LT, value: '<', loc });
                }
                break;
            case '>':
                if (this.match('=')) {
                    this.tokens.push({ type: token_1.TokenType.GTE, value: '>=', loc });
                }
                else {
                    this.tokens.push({ type: token_1.TokenType.GT, value: '>', loc });
                }
                break;
            case ':':
                if (this.match('=')) {
                    this.tokens.push({ type: token_1.TokenType.REASSIGN, value: ':=', loc });
                }
                else {
                    this.tokens.push({ type: token_1.TokenType.COLON, value: ':', loc });
                }
                break;
            case '?':
                this.tokens.push({ type: token_1.TokenType.QUESTION, value: '?', loc });
                break;
            case '[':
                this.parenDepth++;
                this.tokens.push({ type: token_1.TokenType.LBRACKET, value: '[', loc });
                break;
            case ']':
                if (this.parenDepth > 0)
                    this.parenDepth--;
                this.tokens.push({ type: token_1.TokenType.RBRACKET, value: ']', loc });
                break;
            case '(':
                this.parenDepth++;
                this.tokens.push({ type: token_1.TokenType.LPAREN, value: '(', loc });
                break;
            case ')':
                if (this.parenDepth > 0)
                    this.parenDepth--;
                this.tokens.push({ type: token_1.TokenType.RPAREN, value: ')', loc });
                break;
            case ',':
                this.tokens.push({ type: token_1.TokenType.COMMA, value: ',', loc });
                break;
            case '.':
                this.tokens.push({ type: token_1.TokenType.DOT, value: '.', loc });
                break;
            default:
                this.reporter.error(`Unexpected character '${ch}'`, loc);
                break;
        }
    }
    // ── Helpers ───────────────────────────────────────────────────────────────
    peek() {
        return this.source[this.pos] ?? '';
    }
    peekNext() {
        return this.source[this.pos + 1] ?? '';
    }
    advance() {
        const ch = this.source[this.pos++];
        if (ch === '\n') {
            this.line++;
            this.column = 1;
        }
        else {
            this.column++;
        }
        return ch;
    }
    match(expected) {
        if (this.isAtEnd() || this.source[this.pos] !== expected)
            return false;
        this.advance();
        return true;
    }
    consumeNewline() {
        if (this.peek() === '\r') {
            this.advance();
            if (this.peek() === '\n')
                this.advance();
        }
        else {
            this.advance(); // '\n'
        }
    }
    isAtEnd() {
        return this.pos >= this.source.length;
    }
    currentLoc() {
        return { line: this.line, column: this.column, offset: this.pos };
    }
    isDigit(ch) {
        return ch >= '0' && ch <= '9';
    }
    isAlpha(ch) {
        return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
    }
    isAlphaNumeric(ch) {
        return this.isAlpha(ch) || this.isDigit(ch);
    }
    /** Tokens after which a newline is suppressed (implicit line continuation). */
    isContinuationToken(type) {
        switch (type) {
            case token_1.TokenType.COMMA:
            case token_1.TokenType.LPAREN:
            case token_1.TokenType.LBRACKET:
            case token_1.TokenType.PLUS:
            case token_1.TokenType.MINUS:
            case token_1.TokenType.STAR:
            case token_1.TokenType.SLASH:
            case token_1.TokenType.PERCENT:
            case token_1.TokenType.EQ:
            case token_1.TokenType.NEQ:
            case token_1.TokenType.LT:
            case token_1.TokenType.GT:
            case token_1.TokenType.LTE:
            case token_1.TokenType.GTE:
            case token_1.TokenType.AND:
            case token_1.TokenType.OR:
            case token_1.TokenType.NOT:
            case token_1.TokenType.QUESTION:
            case token_1.TokenType.COLON:
            case token_1.TokenType.ASSIGN:
            case token_1.TokenType.REASSIGN:
            case token_1.TokenType.PLUS_ASSIGN:
            case token_1.TokenType.MINUS_ASSIGN:
            case token_1.TokenType.STAR_ASSIGN:
            case token_1.TokenType.SLASH_ASSIGN:
            case token_1.TokenType.PERCENT_ASSIGN:
                return true;
            default:
                return false;
        }
    }
    isHexDigit(ch) {
        return ((ch >= '0' && ch <= '9') ||
            (ch >= 'a' && ch <= 'f') ||
            (ch >= 'A' && ch <= 'F'));
    }
}
exports.Lexer = Lexer;
//# sourceMappingURL=lexer.js.map