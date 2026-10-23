/**
 * PineScript Lexer - Tokenizes PineScript v5 code
 * Adapted for QuantTrade Web & Bot Engine
 */
export declare enum TokenType {
    NUMBER = "NUMBER",
    STRING = "STRING",
    BOOL = "BOOL",
    IDENTIFIER = "IDENTIFIER",
    INDICATOR = "INDICATOR",
    STRATEGY = "STRATEGY",
    VAR = "VAR",
    IF = "IF",
    ELSE = "ELSE",
    FOR = "FOR",
    WHILE = "WHILE",
    SWITCH = "SWITCH",
    TRUE = "TRUE",
    FALSE = "FALSE",
    NA = "NA",
    PLUS = "PLUS",
    MINUS = "MINUS",
    MULTIPLY = "MULTIPLY",
    DIVIDE = "DIVIDE",
    MODULO = "MODULO",
    ASSIGN = "ASSIGN",
    QUESTION = "QUESTION",
    COLON = "COLON",
    EQUAL = "EQUAL",
    NOT_EQUAL = "NOT_EQUAL",
    LESS_THAN = "LESS_THAN",
    LESS_EQUAL = "LESS_EQUAL",
    GREATER_THAN = "GREATER_THAN",
    GREATER_EQUAL = "GREATER_EQUAL",
    AND = "AND",
    OR = "OR",
    NOT = "NOT",
    LPAREN = "LPAREN",
    RPAREN = "RPAREN",
    LBRACKET = "LBRACKET",
    RBRACKET = "RBRACKET",
    COMMA = "COMMA",
    DOT = "DOT",
    ARROW = "ARROW",
    NEWLINE = "NEWLINE",
    EOF = "EOF",
    COMMENT = "COMMENT"
}
export interface Token {
    type: TokenType;
    value: string;
    line: number;
    column: number;
}
export declare class Lexer {
    private input;
    private position;
    private line;
    private column;
    private keywords;
    constructor(input: string);
    tokenize(): Token[];
    private nextToken;
    private readComment;
    private readNumber;
    private readString;
    private readHexColor;
    private readIdentifier;
    private readOperator;
    private skipWhitespace;
    private advance;
    private peek;
    private isDigit;
    private isAlpha;
    private isAlphaNumeric;
    private makeToken;
}
