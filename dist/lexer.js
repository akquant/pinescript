"use strict";
/**
 * PineScript Lexer - Tokenizes PineScript v5 code
 * Adapted for QuantTrade Web & Bot Engine
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Lexer = exports.TokenType = void 0;
var TokenType;
(function (TokenType) {
    // Literals
    TokenType["NUMBER"] = "NUMBER";
    TokenType["STRING"] = "STRING";
    TokenType["BOOL"] = "BOOL";
    // Identifiers and Keywords
    TokenType["IDENTIFIER"] = "IDENTIFIER";
    TokenType["INDICATOR"] = "INDICATOR";
    TokenType["STRATEGY"] = "STRATEGY";
    TokenType["VAR"] = "VAR";
    TokenType["IF"] = "IF";
    TokenType["ELSE"] = "ELSE";
    TokenType["FOR"] = "FOR";
    TokenType["WHILE"] = "WHILE";
    TokenType["SWITCH"] = "SWITCH";
    TokenType["TRUE"] = "TRUE";
    TokenType["FALSE"] = "FALSE";
    TokenType["NA"] = "NA";
    // Operators
    TokenType["PLUS"] = "PLUS";
    TokenType["MINUS"] = "MINUS";
    TokenType["MULTIPLY"] = "MULTIPLY";
    TokenType["DIVIDE"] = "DIVIDE";
    TokenType["MODULO"] = "MODULO";
    TokenType["ASSIGN"] = "ASSIGN";
    TokenType["QUESTION"] = "QUESTION";
    TokenType["COLON"] = "COLON";
    TokenType["EQUAL"] = "EQUAL";
    TokenType["NOT_EQUAL"] = "NOT_EQUAL";
    TokenType["LESS_THAN"] = "LESS_THAN";
    TokenType["LESS_EQUAL"] = "LESS_EQUAL";
    TokenType["GREATER_THAN"] = "GREATER_THAN";
    TokenType["GREATER_EQUAL"] = "GREATER_EQUAL";
    TokenType["AND"] = "AND";
    TokenType["OR"] = "OR";
    TokenType["NOT"] = "NOT";
    // Delimiters
    TokenType["LPAREN"] = "LPAREN";
    TokenType["RPAREN"] = "RPAREN";
    TokenType["LBRACKET"] = "LBRACKET";
    TokenType["RBRACKET"] = "RBRACKET";
    TokenType["COMMA"] = "COMMA";
    TokenType["DOT"] = "DOT";
    TokenType["ARROW"] = "ARROW";
    TokenType["NEWLINE"] = "NEWLINE";
    // Special
    TokenType["EOF"] = "EOF";
    TokenType["COMMENT"] = "COMMENT";
})(TokenType || (exports.TokenType = TokenType = {}));
class Lexer {
    input;
    position = 0;
    line = 1;
    column = 1;
    keywords = new Map([
        ['indicator', TokenType.INDICATOR],
        ['study', TokenType.INDICATOR],
        ['strategy', TokenType.STRATEGY],
        ['var', TokenType.VAR],
        ['varip', TokenType.VAR],
        ['switch', TokenType.SWITCH],
        ['if', TokenType.IF],
        ['else', TokenType.ELSE],
        ['for', TokenType.FOR],
        ['while', TokenType.WHILE],
        ['true', TokenType.TRUE],
        ['false', TokenType.FALSE],
        ['na', TokenType.NA],
        ['and', TokenType.AND],
        ['or', TokenType.OR],
        ['not', TokenType.NOT],
    ]);
    constructor(input) {
        this.input = input;
    }
    tokenize() {
        const tokens = [];
        while (this.position < this.input.length) {
            const token = this.nextToken();
            if (token.type !== TokenType.COMMENT) {
                tokens.push(token);
            }
        }
        tokens.push({
            type: TokenType.EOF,
            value: '',
            line: this.line,
            column: this.column,
        });
        return tokens;
    }
    nextToken() {
        this.skipWhitespace();
        if (this.position >= this.input.length) {
            return this.makeToken(TokenType.EOF, '');
        }
        const char = this.input[this.position];
        // Comments (// or //@)
        if (char === '/' && this.input[this.position + 1] === '/') {
            return this.readComment();
        }
        // Numbers
        if (this.isDigit(char)) {
            return this.readNumber();
        }
        // Strings
        if (char === '"' || char === "'") {
            return this.readString(char);
        }
        // Hex colors (#RRGGBB or #RGB)
        if (char === '#') {
            return this.readHexColor();
        }
        // Identifiers and keywords (supports dots in identifier like ta.sma, color.blue)
        if (this.isAlpha(char) || char === '_') {
            return this.readIdentifier();
        }
        // Operators and delimiters
        return this.readOperator();
    }
    readComment() {
        const start = this.position;
        const startColumn = this.column;
        while (this.position < this.input.length && this.input[this.position] !== '\n') {
            this.advance();
        }
        return {
            type: TokenType.COMMENT,
            value: this.input.slice(start, this.position),
            line: this.line,
            column: startColumn,
        };
    }
    readNumber() {
        const start = this.position;
        const startColumn = this.column;
        while (this.isDigit(this.input[this.position])) {
            this.advance();
        }
        if (this.input[this.position] === '.' && this.isDigit(this.input[this.position + 1])) {
            this.advance(); // consume '.'
            while (this.isDigit(this.input[this.position])) {
                this.advance();
            }
        }
        return {
            type: TokenType.NUMBER,
            value: this.input.slice(start, this.position),
            line: this.line,
            column: startColumn,
        };
    }
    readString(quote) {
        const start = this.position;
        const startColumn = this.column;
        this.advance(); // consume opening quote
        while (this.position < this.input.length && this.input[this.position] !== quote) {
            if (this.input[this.position] === '\\') {
                this.advance(); // skip escape character
            }
            this.advance();
        }
        if (this.position >= this.input.length) {
            throw new Error(`Unterminated string at line ${this.line}, column ${startColumn}`);
        }
        this.advance(); // consume closing quote
        return {
            type: TokenType.STRING,
            value: this.input.slice(start + 1, this.position - 1),
            line: this.line,
            column: startColumn,
        };
    }
    readHexColor() {
        const start = this.position;
        const startColumn = this.column;
        this.advance(); // consume '#'
        while (this.position < this.input.length && /[0-9a-fA-F]/.test(this.input[this.position])) {
            this.advance();
        }
        return {
            type: TokenType.STRING,
            value: this.input.slice(start, this.position),
            line: this.line,
            column: startColumn,
        };
    }
    readIdentifier() {
        const start = this.position;
        const startColumn = this.column;
        while (this.isAlphaNumeric(this.input[this.position]) || this.input[this.position] === '_' || (this.input[this.position] === '.' && this.isAlpha(this.peek()))) {
            this.advance();
        }
        let value = this.input.slice(start, this.position);
        // Support Pine v5/v6 generic types like array<int>, map<int, int>, map.new<int, int>
        if (this.input[this.position] === '<' && (value === 'array' || value === 'map' || value.endsWith('.new') || value === 'new')) {
            const isConstructor = value.includes('.new') || value === 'new';
            while (this.position < this.input.length && this.input[this.position] !== '>' && this.input[this.position] !== '\n') {
                this.advance();
            }
            if (this.input[this.position] === '>') {
                this.advance();
            }
            if (!isConstructor) {
                value = this.input.slice(start, this.position);
            }
        }
        const type = this.keywords.get(value) || TokenType.IDENTIFIER;
        return {
            type,
            value,
            line: this.line,
            column: startColumn,
        };
    }
    readOperator() {
        const char = this.input[this.position];
        const startColumn = this.column;
        this.advance();
        switch (char) {
            case '+':
                if (this.input[this.position] === '=') {
                    this.advance();
                    return this.makeToken(TokenType.ASSIGN, '+=', startColumn);
                }
                return this.makeToken(TokenType.PLUS, '+', startColumn);
            case '-':
                if (this.input[this.position] === '=') {
                    this.advance();
                    return this.makeToken(TokenType.ASSIGN, '-=', startColumn);
                }
                return this.makeToken(TokenType.MINUS, '-', startColumn);
            case '*':
                if (this.input[this.position] === '=') {
                    this.advance();
                    return this.makeToken(TokenType.ASSIGN, '*=', startColumn);
                }
                return this.makeToken(TokenType.MULTIPLY, '*', startColumn);
            case '/':
                if (this.input[this.position] === '=') {
                    this.advance();
                    return this.makeToken(TokenType.ASSIGN, '/=', startColumn);
                }
                return this.makeToken(TokenType.DIVIDE, '/', startColumn);
            case '%':
                if (this.input[this.position] === '=') {
                    this.advance();
                    return this.makeToken(TokenType.ASSIGN, '%=', startColumn);
                }
                return this.makeToken(TokenType.MODULO, '%', startColumn);
            case '(': return this.makeToken(TokenType.LPAREN, '(', startColumn);
            case ')': return this.makeToken(TokenType.RPAREN, ')', startColumn);
            case '[': return this.makeToken(TokenType.LBRACKET, '[', startColumn);
            case ']': return this.makeToken(TokenType.RBRACKET, ']', startColumn);
            case ',': return this.makeToken(TokenType.COMMA, ',', startColumn);
            case '.': return this.makeToken(TokenType.DOT, '.', startColumn);
            case '?': return this.makeToken(TokenType.QUESTION, '?', startColumn);
            case ':':
                if (this.input[this.position] === '=') {
                    this.advance();
                    return this.makeToken(TokenType.ASSIGN, ':=', startColumn);
                }
                return this.makeToken(TokenType.COLON, ':', startColumn);
            case '\n':
                this.line++;
                this.column = 1;
                return this.makeToken(TokenType.NEWLINE, '\n', startColumn);
            case '=':
                if (this.input[this.position] === '=') {
                    this.advance();
                    return this.makeToken(TokenType.EQUAL, '==', startColumn);
                }
                if (this.input[this.position] === '>') {
                    this.advance();
                    return this.makeToken(TokenType.ARROW, '=>', startColumn);
                }
                return this.makeToken(TokenType.ASSIGN, '=', startColumn);
            case '!':
                if (this.input[this.position] === '=') {
                    this.advance();
                    return this.makeToken(TokenType.NOT_EQUAL, '!=', startColumn);
                }
                return this.makeToken(TokenType.NOT, '!', startColumn);
            case '<':
                if (this.input[this.position] === '=') {
                    this.advance();
                    return this.makeToken(TokenType.LESS_EQUAL, '<=', startColumn);
                }
                return this.makeToken(TokenType.LESS_THAN, '<', startColumn);
            case '>':
                if (this.input[this.position] === '=') {
                    this.advance();
                    return this.makeToken(TokenType.GREATER_EQUAL, '>=', startColumn);
                }
                return this.makeToken(TokenType.GREATER_THAN, '>', startColumn);
            default:
                throw new Error(`Unexpected character '${char}' at line ${this.line}, column ${startColumn}`);
        }
    }
    skipWhitespace() {
        while (this.position < this.input.length) {
            const char = this.input[this.position];
            if (char === ' ' || char === '\t' || char === '\r') {
                this.advance();
            }
            else {
                break;
            }
        }
    }
    advance() {
        this.position++;
        this.column++;
    }
    peek() {
        return this.input[this.position] || '';
    }
    isDigit(char) {
        return char >= '0' && char <= '9';
    }
    isAlpha(char) {
        return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z');
    }
    isAlphaNumeric(char) {
        return this.isAlpha(char) || this.isDigit(char);
    }
    makeToken(type, value, column) {
        return {
            type,
            value,
            line: this.line,
            column: column || this.column,
        };
    }
}
exports.Lexer = Lexer;
//# sourceMappingURL=lexer.js.map