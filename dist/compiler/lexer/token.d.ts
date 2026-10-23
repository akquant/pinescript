export declare enum TokenType {
    INTEGER = "INTEGER",
    FLOAT = "FLOAT",
    STRING = "STRING",
    BOOL = "BOOL",
    COLOR = "COLOR",
    NA = "NA",
    IDENTIFIER = "IDENTIFIER",
    VAR = "VAR",
    VARIP = "VARIP",
    IF = "IF",
    ELSE = "ELSE",
    FOR = "FOR",
    TO = "TO",
    BY = "BY",
    IN = "IN",
    WHILE = "WHILE",
    SWITCH = "SWITCH",
    BREAK = "BREAK",
    CONTINUE = "CONTINUE",
    RETURN = "RETURN",
    IMPORT = "IMPORT",
    EXPORT = "EXPORT",
    AS = "AS",
    TYPE = "TYPE",
    METHOD = "METHOD",
    ENUM = "ENUM",
    NOT = "NOT",
    AND = "AND",
    OR = "OR",
    TRUE = "TRUE",
    FALSE = "FALSE",
    INT = "INT",
    FLOAT_TYPE = "FLOAT_TYPE",
    BOOL_TYPE = "BOOL_TYPE",
    STRING_TYPE = "STRING_TYPE",
    COLOR_TYPE = "COLOR_TYPE",
    SERIES = "SERIES",
    SIMPLE = "SIMPLE",
    CONST = "CONST",
    INPUT = "INPUT",
    PLUS = "PLUS",// +
    MINUS = "MINUS",// -
    STAR = "STAR",// *
    SLASH = "SLASH",// /
    PERCENT = "PERCENT",// %
    EQ = "EQ",// ==
    NEQ = "NEQ",// !=
    LT = "LT",// <
    LTE = "LTE",// <=
    GT = "GT",// >
    GTE = "GTE",// >=
    ASSIGN = "ASSIGN",// =
    REASSIGN = "REASSIGN",// :=
    PLUS_ASSIGN = "PLUS_ASSIGN",// +=
    MINUS_ASSIGN = "MINUS_ASSIGN",// -=
    STAR_ASSIGN = "STAR_ASSIGN",// *=
    SLASH_ASSIGN = "SLASH_ASSIGN",// /=
    PERCENT_ASSIGN = "PERCENT_ASSIGN",// %=
    QUESTION = "QUESTION",// ?
    COLON = "COLON",// :
    ARROW = "ARROW",// =>
    THIN_ARROW = "THIN_ARROW",// ->
    LBRACKET = "LBRACKET",// [
    RBRACKET = "RBRACKET",// ]
    LPAREN = "LPAREN",// (
    RPAREN = "RPAREN",// )
    COMMA = "COMMA",// ,
    DOT = "DOT",// .
    NEWLINE = "NEWLINE",
    INDENT = "INDENT",
    DEDENT = "DEDENT",
    ANNOTATION = "ANNOTATION",// //@version, //@description, etc.
    COMMENT = "COMMENT",// // single-line comments
    EOF = "EOF"
}
export interface SourceLocation {
    line: number;
    column: number;
    offset: number;
}
export interface Token {
    type: TokenType;
    value: string;
    loc: SourceLocation;
}
export declare const KEYWORDS: Record<string, TokenType>;
