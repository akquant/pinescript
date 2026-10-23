"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KEYWORDS = exports.TokenType = void 0;
var TokenType;
(function (TokenType) {
    // Literals
    TokenType["INTEGER"] = "INTEGER";
    TokenType["FLOAT"] = "FLOAT";
    TokenType["STRING"] = "STRING";
    TokenType["BOOL"] = "BOOL";
    TokenType["COLOR"] = "COLOR";
    TokenType["NA"] = "NA";
    // Identifiers
    TokenType["IDENTIFIER"] = "IDENTIFIER";
    // Keywords
    TokenType["VAR"] = "VAR";
    TokenType["VARIP"] = "VARIP";
    TokenType["IF"] = "IF";
    TokenType["ELSE"] = "ELSE";
    TokenType["FOR"] = "FOR";
    TokenType["TO"] = "TO";
    TokenType["BY"] = "BY";
    TokenType["IN"] = "IN";
    TokenType["WHILE"] = "WHILE";
    TokenType["SWITCH"] = "SWITCH";
    TokenType["BREAK"] = "BREAK";
    TokenType["CONTINUE"] = "CONTINUE";
    TokenType["RETURN"] = "RETURN";
    TokenType["IMPORT"] = "IMPORT";
    TokenType["EXPORT"] = "EXPORT";
    TokenType["AS"] = "AS";
    TokenType["TYPE"] = "TYPE";
    TokenType["METHOD"] = "METHOD";
    TokenType["ENUM"] = "ENUM";
    TokenType["NOT"] = "NOT";
    TokenType["AND"] = "AND";
    TokenType["OR"] = "OR";
    TokenType["TRUE"] = "TRUE";
    TokenType["FALSE"] = "FALSE";
    // Type keywords
    TokenType["INT"] = "INT";
    TokenType["FLOAT_TYPE"] = "FLOAT_TYPE";
    TokenType["BOOL_TYPE"] = "BOOL_TYPE";
    TokenType["STRING_TYPE"] = "STRING_TYPE";
    TokenType["COLOR_TYPE"] = "COLOR_TYPE";
    TokenType["SERIES"] = "SERIES";
    TokenType["SIMPLE"] = "SIMPLE";
    TokenType["CONST"] = "CONST";
    TokenType["INPUT"] = "INPUT";
    // Operators
    TokenType["PLUS"] = "PLUS";
    TokenType["MINUS"] = "MINUS";
    TokenType["STAR"] = "STAR";
    TokenType["SLASH"] = "SLASH";
    TokenType["PERCENT"] = "PERCENT";
    TokenType["EQ"] = "EQ";
    TokenType["NEQ"] = "NEQ";
    TokenType["LT"] = "LT";
    TokenType["LTE"] = "LTE";
    TokenType["GT"] = "GT";
    TokenType["GTE"] = "GTE";
    // Assignment
    TokenType["ASSIGN"] = "ASSIGN";
    TokenType["REASSIGN"] = "REASSIGN";
    TokenType["PLUS_ASSIGN"] = "PLUS_ASSIGN";
    TokenType["MINUS_ASSIGN"] = "MINUS_ASSIGN";
    TokenType["STAR_ASSIGN"] = "STAR_ASSIGN";
    TokenType["SLASH_ASSIGN"] = "SLASH_ASSIGN";
    TokenType["PERCENT_ASSIGN"] = "PERCENT_ASSIGN";
    // Delimiters
    TokenType["QUESTION"] = "QUESTION";
    TokenType["COLON"] = "COLON";
    TokenType["ARROW"] = "ARROW";
    TokenType["THIN_ARROW"] = "THIN_ARROW";
    TokenType["LBRACKET"] = "LBRACKET";
    TokenType["RBRACKET"] = "RBRACKET";
    TokenType["LPAREN"] = "LPAREN";
    TokenType["RPAREN"] = "RPAREN";
    TokenType["COMMA"] = "COMMA";
    TokenType["DOT"] = "DOT";
    // Structural
    TokenType["NEWLINE"] = "NEWLINE";
    TokenType["INDENT"] = "INDENT";
    TokenType["DEDENT"] = "DEDENT";
    TokenType["ANNOTATION"] = "ANNOTATION";
    TokenType["COMMENT"] = "COMMENT";
    TokenType["EOF"] = "EOF";
})(TokenType || (exports.TokenType = TokenType = {}));
exports.KEYWORDS = {
    'var': TokenType.VAR,
    'varip': TokenType.VARIP,
    'if': TokenType.IF,
    'else': TokenType.ELSE,
    'for': TokenType.FOR,
    'to': TokenType.TO,
    'by': TokenType.BY,
    'in': TokenType.IN,
    'while': TokenType.WHILE,
    'switch': TokenType.SWITCH,
    'break': TokenType.BREAK,
    'continue': TokenType.CONTINUE,
    'return': TokenType.RETURN,
    'import': TokenType.IMPORT,
    'export': TokenType.EXPORT,
    'as': TokenType.AS,
    'type': TokenType.TYPE,
    'method': TokenType.METHOD,
    'enum': TokenType.ENUM,
    'not': TokenType.NOT,
    'and': TokenType.AND,
    'or': TokenType.OR,
    'true': TokenType.TRUE,
    'false': TokenType.FALSE,
    'na': TokenType.NA,
    'int': TokenType.INT,
    'float': TokenType.FLOAT_TYPE,
    'bool': TokenType.BOOL_TYPE,
    'string': TokenType.STRING_TYPE,
    'color': TokenType.COLOR_TYPE,
    'series': TokenType.SERIES,
    'simple': TokenType.SIMPLE,
    'const': TokenType.CONST,
    'input': TokenType.INPUT,
};
//# sourceMappingURL=token.js.map