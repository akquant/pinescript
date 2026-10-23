/**
 * PineScript Parser - Generates AST from tokens
 * Adapted for QuantTrade Web & Bot Engine
 */
import { Token } from './lexer';
import * as AST from './ast';
export declare class Parser {
    private tokens;
    private current;
    constructor(tokens: Token[]);
    parse(): AST.Program;
    private isTypeKeyword;
    private isTupleAssignment;
    private isFunctionDeclaration;
    private statement;
    private indicatorDeclaration;
    private strategyDeclaration;
    private parseDeclarationParam;
    private variableDeclaration;
    private assignment;
    private tupleAssignment;
    private typeDeclaration;
    private functionDeclaration;
    private isSwitchCase;
    private switchExpression;
    private block;
    private ifStatement;
    private forStatement;
    private whileStatement;
    private expressionStatement;
    private expression;
    private ternary;
    private logicalOr;
    private logicalAnd;
    private equality;
    private comparison;
    private term;
    private factor;
    private unary;
    private call;
    private finishCall;
    private arguments;
    private primary;
    private match;
    private check;
    private advance;
    private isAtEnd;
    private peek;
    private peekNext;
    private previous;
    private consume;
}
