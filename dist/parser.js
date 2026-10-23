"use strict";
/**
 * PineScript Parser - Generates AST from tokens
 * Adapted for QuantTrade Web & Bot Engine
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parser = void 0;
const lexer_1 = require("./lexer");
const AST = __importStar(require("./ast"));
class Parser {
    tokens;
    current = 0;
    constructor(tokens) {
        this.tokens = tokens.filter(t => t.type !== lexer_1.TokenType.NEWLINE);
    }
    parse() {
        const body = [];
        while (!this.isAtEnd()) {
            body.push(this.statement());
        }
        return {
            type: AST.NodeType.PROGRAM,
            body,
            line: 1,
            column: 1,
        };
    }
    isTypeKeyword(val) {
        if (!val)
            return false;
        return (val.startsWith('array<') ||
            val.startsWith('map<') ||
            [
                'string', 'float', 'int', 'bool', 'color', 'line', 'label', 'box', 'table',
                'series', 'simple', 'const', 'input'
            ].includes(val));
    }
    isTupleAssignment() {
        if (!this.check(lexer_1.TokenType.LBRACKET))
            return false;
        let i = this.current + 1;
        let depth = 1;
        while (i < this.tokens.length) {
            if (this.tokens[i].type === lexer_1.TokenType.LBRACKET)
                depth++;
            else if (this.tokens[i].type === lexer_1.TokenType.RBRACKET) {
                depth--;
                if (depth === 0) {
                    const after = this.tokens[i + 1];
                    return after && after.type === lexer_1.TokenType.ASSIGN;
                }
            }
            i++;
        }
        return false;
    }
    isFunctionDeclaration() {
        let startIdx = this.current;
        if (this.tokens[startIdx]?.value === 'method') {
            startIdx++;
        }
        if (this.tokens[startIdx]?.type !== lexer_1.TokenType.IDENTIFIER || this.tokens[startIdx + 1]?.type !== lexer_1.TokenType.LPAREN)
            return false;
        let depth = 0;
        let i = startIdx + 1;
        while (i < this.tokens.length) {
            if (this.tokens[i].type === lexer_1.TokenType.LPAREN)
                depth++;
            else if (this.tokens[i].type === lexer_1.TokenType.RPAREN) {
                depth--;
                if (depth === 0) {
                    const after = this.tokens[i + 1];
                    return after && after.type === lexer_1.TokenType.ARROW;
                }
            }
            i++;
        }
        return false;
    }
    statement() {
        if (this.check(lexer_1.TokenType.INDICATOR) && this.peekNext()?.type === lexer_1.TokenType.LPAREN) {
            this.advance();
            return this.indicatorDeclaration();
        }
        if (this.check(lexer_1.TokenType.STRATEGY) && this.peekNext()?.type === lexer_1.TokenType.LPAREN) {
            this.advance();
            return this.strategyDeclaration();
        }
        // Check for user-defined type declaration: type HGTrade
        if (this.check(lexer_1.TokenType.IDENTIFIER) && this.peek().value === 'type') {
            return this.typeDeclaration();
        }
        // Check for method: method closeAt(...) =>
        if (this.check(lexer_1.TokenType.IDENTIFIER) && this.peek().value === 'method') {
            this.advance(); // consume 'method'
            return this.functionDeclaration();
        }
        if (this.match(lexer_1.TokenType.VAR)) {
            // Skip any type annotation after var, e.g. "var float ut_stop = 0.0" or "var HGTrade trade = na"
            while (this.check(lexer_1.TokenType.IDENTIFIER) &&
                (this.isTypeKeyword(this.peek().value) || this.peekNext()?.type === lexer_1.TokenType.IDENTIFIER)) {
                this.advance();
            }
            return this.variableDeclaration(true);
        }
        if (this.match(lexer_1.TokenType.IF)) {
            return this.ifStatement();
        }
        if (this.match(lexer_1.TokenType.FOR)) {
            return this.forStatement();
        }
        if (this.match(lexer_1.TokenType.WHILE)) {
            return this.whileStatement();
        }
        if (this.check(lexer_1.TokenType.SWITCH)) {
            return this.switchExpression();
        }
        // Check for tuple assignment: [a, b] = ...
        if (this.isTupleAssignment()) {
            return this.tupleAssignment();
        }
        // Check for user-defined function: f_price(float value) => ...
        if (this.isFunctionDeclaration()) {
            return this.functionDeclaration();
        }
        // Skip type annotation preceding variable, e.g. "float usdPerPrice = ..." or "HGTrade trade = ..."
        if (this.check(lexer_1.TokenType.IDENTIFIER) &&
            this.peekNext()?.type === lexer_1.TokenType.IDENTIFIER &&
            this.tokens[this.current + 2]?.type === lexer_1.TokenType.ASSIGN) {
            this.advance(); // consume type annotation
        }
        // Re-check after skipping type annotation
        if (this.isFunctionDeclaration()) {
            return this.functionDeclaration();
        }
        if (this.isTupleAssignment()) {
            return this.tupleAssignment();
        }
        // Check for assignment (foo = expr or foo.bar = expr)
        if ((this.check(lexer_1.TokenType.IDENTIFIER) && this.peekNext()?.type === lexer_1.TokenType.ASSIGN) ||
            (this.check(lexer_1.TokenType.IDENTIFIER) && this.peekNext()?.type === lexer_1.TokenType.DOT && this.tokens[this.current + 2]?.type === lexer_1.TokenType.IDENTIFIER && this.tokens[this.current + 3]?.type === lexer_1.TokenType.ASSIGN)) {
            return this.assignment();
        }
        return this.expressionStatement();
    }
    indicatorDeclaration() {
        const token = this.previous();
        this.consume(lexer_1.TokenType.LPAREN, "Expected '(' after indicator / study");
        let name = 'Custom Indicator';
        const parameters = {};
        if (!this.check(lexer_1.TokenType.RPAREN)) {
            this.parseDeclarationParam(parameters, (val) => { name = val; });
            while (this.match(lexer_1.TokenType.COMMA)) {
                this.parseDeclarationParam(parameters, (val) => { name = val; });
            }
        }
        this.consume(lexer_1.TokenType.RPAREN, "Expected ')' after parameters");
        return {
            type: AST.NodeType.INDICATOR_DECLARATION,
            name,
            parameters,
            line: token.line,
            column: token.column,
        };
    }
    strategyDeclaration() {
        const token = this.previous();
        this.consume(lexer_1.TokenType.LPAREN, "Expected '(' after strategy");
        let name = 'Custom Strategy';
        const parameters = {};
        if (!this.check(lexer_1.TokenType.RPAREN)) {
            this.parseDeclarationParam(parameters, (val) => { name = val; });
            while (this.match(lexer_1.TokenType.COMMA)) {
                this.parseDeclarationParam(parameters, (val) => { name = val; });
            }
        }
        this.consume(lexer_1.TokenType.RPAREN, "Expected ')' after parameters");
        return {
            type: AST.NodeType.STRATEGY_DECLARATION,
            name,
            parameters,
            line: token.line,
            column: token.column,
        };
    }
    parseDeclarationParam(params, onTitleFound) {
        if (this.check(lexer_1.TokenType.STRING)) {
            const val = this.advance().value;
            onTitleFound(val);
            return;
        }
        if (this.check(lexer_1.TokenType.IDENTIFIER) && this.peekNext()?.type === lexer_1.TokenType.ASSIGN) {
            const key = this.advance().value;
            this.advance(); // consume '='
            const valNode = this.primary();
            params[key] = valNode;
            if (key === 'title' && valNode.value !== undefined) {
                onTitleFound(String(valNode.value));
            }
            return;
        }
        // Skip other parameters gracefully
        this.primary();
    }
    variableDeclaration(isVar) {
        const name = this.consume(lexer_1.TokenType.IDENTIFIER, 'Expected variable name').value;
        this.consume(lexer_1.TokenType.ASSIGN, "Expected '=' after variable name");
        const value = this.expression();
        return {
            type: AST.NodeType.VARIABLE_DECLARATION,
            name,
            value,
            isVar,
            line: this.previous().line,
            column: this.previous().column,
        };
    }
    assignment() {
        let name = this.consume(lexer_1.TokenType.IDENTIFIER, 'Expected variable name').value;
        while (this.match(lexer_1.TokenType.DOT)) {
            name += '.' + this.consume(lexer_1.TokenType.IDENTIFIER, 'Expected property name').value;
        }
        const assignToken = this.consume(lexer_1.TokenType.ASSIGN, "Expected '='");
        let value = this.expression();
        if (assignToken.value && assignToken.value !== '=' && assignToken.value !== ':=') {
            const op = assignToken.value.slice(0, -1);
            value = {
                type: AST.NodeType.BINARY_EXPRESSION,
                left: {
                    type: AST.NodeType.IDENTIFIER,
                    name,
                    line: assignToken.line,
                    column: assignToken.column,
                },
                operator: op,
                right: value,
                line: assignToken.line,
                column: assignToken.column,
            };
        }
        return {
            type: AST.NodeType.ASSIGNMENT,
            name,
            value,
            line: this.previous().line,
            column: this.previous().column,
        };
    }
    tupleAssignment() {
        const startToken = this.consume(lexer_1.TokenType.LBRACKET, "Expected '[' at start of tuple");
        const names = [];
        do {
            if (this.check(lexer_1.TokenType.IDENTIFIER) && this.isTypeKeyword(this.peek().value) && this.peekNext()?.type === lexer_1.TokenType.IDENTIFIER) {
                this.advance(); // skip type keyword in tuple
            }
            names.push(this.consume(lexer_1.TokenType.IDENTIFIER, 'Expected identifier in tuple').value);
        } while (this.match(lexer_1.TokenType.COMMA));
        this.consume(lexer_1.TokenType.RBRACKET, "Expected ']' at end of tuple");
        this.consume(lexer_1.TokenType.ASSIGN, "Expected '=' after tuple");
        const value = this.expression();
        return {
            type: AST.NodeType.TUPLE_ASSIGNMENT,
            names,
            value,
            line: startToken.line,
            column: startToken.column,
        };
    }
    typeDeclaration() {
        const typeToken = this.advance(); // consume 'type'
        const name = this.consume(lexer_1.TokenType.IDENTIFIER, 'Expected type name').value;
        const fields = [];
        const minCol = typeToken.column;
        while (!this.isAtEnd() && this.peek().column > minCol) {
            // Consume any type annotations (e.g. int, float, array<line>, label, etc.)
            while (this.check(lexer_1.TokenType.IDENTIFIER) &&
                (this.isTypeKeyword(this.peek().value) || this.peekNext()?.type === lexer_1.TokenType.IDENTIFIER)) {
                this.advance();
            }
            if (this.check(lexer_1.TokenType.IDENTIFIER)) {
                const fieldName = this.advance().value;
                let defaultValue;
                if (this.match(lexer_1.TokenType.ASSIGN)) {
                    defaultValue = this.expression();
                }
                fields.push({ name: fieldName, defaultValue });
            }
            else {
                this.advance();
            }
        }
        return {
            type: AST.NodeType.TYPE_DECLARATION,
            name,
            fields,
            line: typeToken.line,
            column: typeToken.column,
        };
    }
    functionDeclaration() {
        if (this.check(lexer_1.TokenType.IDENTIFIER) && this.peek().value === 'method') {
            this.advance(); // consume 'method'
        }
        const fnToken = this.consume(lexer_1.TokenType.IDENTIFIER, 'Expected function name');
        this.consume(lexer_1.TokenType.LPAREN, "Expected '(' in function declaration");
        const params = [];
        if (!this.check(lexer_1.TokenType.RPAREN)) {
            do {
                // Skip type annotations: built-in keywords, user-defined type names, or array<...>
                while (this.check(lexer_1.TokenType.IDENTIFIER) &&
                    (this.isTypeKeyword(this.peek().value) || this.peekNext()?.type === lexer_1.TokenType.IDENTIFIER)) {
                    this.advance();
                }
                const paramName = this.consume(lexer_1.TokenType.IDENTIFIER, 'Expected parameter name').value;
                params.push(paramName);
                if (this.match(lexer_1.TokenType.ASSIGN)) {
                    this.expression(); // consume default value
                }
            } while (this.match(lexer_1.TokenType.COMMA));
        }
        this.consume(lexer_1.TokenType.RPAREN, "Expected ')' after function parameters");
        const arrowToken = this.consume(lexer_1.TokenType.ARROW, "Expected '=>' in function declaration");
        let body;
        if (this.peek().line > arrowToken.line) {
            body = this.block(1);
        }
        else {
            body = this.expression();
        }
        return {
            type: AST.NodeType.FUNCTION_DECLARATION,
            name: fnToken.value,
            parameters: params,
            body,
            line: fnToken.line,
            column: fnToken.column,
        };
    }
    isSwitchCase() {
        if (this.check(lexer_1.TokenType.ARROW))
            return true;
        let i = this.current;
        const startLine = this.tokens[i]?.line;
        while (i < this.tokens.length && this.tokens[i].line === startLine) {
            if (this.tokens[i].type === lexer_1.TokenType.ARROW) {
                return true;
            }
            i++;
        }
        return false;
    }
    switchExpression() {
        const switchToken = this.consume(lexer_1.TokenType.SWITCH, "Expected 'switch'");
        let discriminant;
        // If next token is on the same line and not a switch case, it's the discriminant expression (e.g. switch signalModel)
        if (this.peek().line === switchToken.line && !this.isSwitchCase()) {
            discriminant = this.expression();
        }
        const cases = [];
        while (!this.isAtEnd() && this.isSwitchCase()) {
            if (this.match(lexer_1.TokenType.ARROW)) {
                // Default case: => expr
                const body = this.expression();
                cases.push({ body });
                break;
            }
            const pattern = this.expression();
            if (this.match(lexer_1.TokenType.ARROW)) {
                const body = this.expression();
                cases.push({ pattern, body });
            }
            else {
                break;
            }
        }
        return {
            type: AST.NodeType.SWITCH_EXPRESSION,
            discriminant,
            cases,
            line: switchToken.line,
            column: switchToken.column,
        };
    }
    block(minColumn) {
        const statements = [];
        const startToken = this.peek();
        while (!this.isAtEnd()) {
            const nextToken = this.peek();
            // If the next token's column is not strictly greater than parent's minColumn, block ends
            if (nextToken.column <= minColumn) {
                break;
            }
            statements.push(this.statement());
        }
        if (statements.length === 1) {
            return statements[0];
        }
        return {
            type: AST.NodeType.BLOCK,
            statements,
            line: startToken.line,
            column: startToken.column,
        };
    }
    ifStatement(indentColumn) {
        const token = this.previous();
        const effectiveCol = indentColumn !== undefined ? indentColumn : token.column;
        const condition = this.expression();
        const thenBranch = this.peek().column > effectiveCol ? this.block(effectiveCol) : this.statement();
        let elseBranch;
        if (this.check(lexer_1.TokenType.ELSE) && this.peek().column >= effectiveCol) {
            const elseToken = this.advance(); // consume 'else'
            if (this.match(lexer_1.TokenType.IF)) {
                elseBranch = this.ifStatement(elseToken.column);
            }
            else {
                elseBranch = this.peek().column > elseToken.column ? this.block(elseToken.column) : this.statement();
            }
        }
        return {
            type: AST.NodeType.IF_STATEMENT,
            condition,
            thenBranch,
            elseBranch,
            line: token.line,
            column: effectiveCol,
        };
    }
    forStatement() {
        const token = this.previous();
        const variable = this.consume(lexer_1.TokenType.IDENTIFIER, 'Expected loop variable').value;
        // Check for-in loop: for elem in collection
        if (this.check(lexer_1.TokenType.IDENTIFIER) && this.peek().value === 'in') {
            this.advance(); // consume 'in'
            const iterable = this.expression();
            const body = this.peek().column > token.column ? this.block(token.column) : this.statement();
            return {
                type: AST.NodeType.FOR_STATEMENT,
                variable,
                iterable,
                body,
                line: token.line,
                column: token.column,
            };
        }
        this.consume(lexer_1.TokenType.ASSIGN, "Expected '='");
        const start = this.expression();
        this.consume(lexer_1.TokenType.IDENTIFIER, "Expected 'to'");
        const end = this.expression();
        const body = this.peek().column > token.column ? this.block(token.column) : this.statement();
        return {
            type: AST.NodeType.FOR_STATEMENT,
            variable,
            start,
            end,
            body,
            line: token.line,
            column: token.column,
        };
    }
    whileStatement() {
        const token = this.previous();
        const condition = this.expression();
        const body = this.peek().column > token.column ? this.block(token.column) : this.statement();
        return {
            type: AST.NodeType.WHILE_STATEMENT,
            condition,
            body,
            line: token.line,
            column: token.column,
        };
    }
    expressionStatement() {
        return this.expression();
    }
    expression() {
        return this.ternary();
    }
    ternary() {
        let expr = this.logicalOr();
        if (this.match(lexer_1.TokenType.QUESTION)) {
            const question = this.previous();
            const consequent = this.expression();
            this.consume(lexer_1.TokenType.COLON, "Expected ':' in ternary expression");
            const alternate = this.expression();
            return {
                type: AST.NodeType.CONDITIONAL_EXPRESSION,
                condition: expr,
                consequent,
                alternate,
                line: question.line,
                column: question.column,
            };
        }
        return expr;
    }
    logicalOr() {
        let expr = this.logicalAnd();
        while (this.match(lexer_1.TokenType.OR)) {
            const operator = this.previous();
            const right = this.logicalAnd();
            expr = {
                type: AST.NodeType.BINARY_EXPRESSION,
                operator: operator.value,
                left: expr,
                right,
                line: operator.line,
                column: operator.column,
            };
        }
        return expr;
    }
    logicalAnd() {
        let expr = this.equality();
        while (this.match(lexer_1.TokenType.AND)) {
            const operator = this.previous();
            const right = this.equality();
            expr = {
                type: AST.NodeType.BINARY_EXPRESSION,
                operator: operator.value,
                left: expr,
                right,
                line: operator.line,
                column: operator.column,
            };
        }
        return expr;
    }
    equality() {
        let expr = this.comparison();
        while (this.match(lexer_1.TokenType.EQUAL, lexer_1.TokenType.NOT_EQUAL)) {
            const operator = this.previous();
            const right = this.comparison();
            expr = {
                type: AST.NodeType.BINARY_EXPRESSION,
                operator: operator.value,
                left: expr,
                right,
                line: operator.line,
                column: operator.column,
            };
        }
        return expr;
    }
    comparison() {
        let expr = this.term();
        while (this.match(lexer_1.TokenType.GREATER_THAN, lexer_1.TokenType.GREATER_EQUAL, lexer_1.TokenType.LESS_THAN, lexer_1.TokenType.LESS_EQUAL)) {
            const operator = this.previous();
            const right = this.term();
            expr = {
                type: AST.NodeType.BINARY_EXPRESSION,
                operator: operator.value,
                left: expr,
                right,
                line: operator.line,
                column: operator.column,
            };
        }
        return expr;
    }
    term() {
        let expr = this.factor();
        while (this.match(lexer_1.TokenType.PLUS, lexer_1.TokenType.MINUS)) {
            const operator = this.previous();
            const right = this.factor();
            expr = {
                type: AST.NodeType.BINARY_EXPRESSION,
                operator: operator.value,
                left: expr,
                right,
                line: operator.line,
                column: operator.column,
            };
        }
        return expr;
    }
    factor() {
        let expr = this.unary();
        while (this.match(lexer_1.TokenType.MULTIPLY, lexer_1.TokenType.DIVIDE, lexer_1.TokenType.MODULO)) {
            const operator = this.previous();
            const right = this.unary();
            expr = {
                type: AST.NodeType.BINARY_EXPRESSION,
                operator: operator.value,
                left: expr,
                right,
                line: operator.line,
                column: operator.column,
            };
        }
        return expr;
    }
    unary() {
        if (this.match(lexer_1.TokenType.NOT, lexer_1.TokenType.MINUS)) {
            const operator = this.previous();
            const operand = this.unary();
            return {
                type: AST.NodeType.UNARY_EXPRESSION,
                operator: operator.value,
                operand,
                line: operator.line,
                column: operator.column,
            };
        }
        return this.call();
    }
    call() {
        let expr = this.primary();
        while (true) {
            if (this.match(lexer_1.TokenType.LPAREN)) {
                expr = this.finishCall(expr);
            }
            else if (this.check(lexer_1.TokenType.LBRACKET)) {
                // Subscript series[1] must be on the same line as the preceding token
                if (this.peek().line !== this.previous().line) {
                    break;
                }
                this.advance(); // consume '['
                const indexExpr = this.expression();
                this.consume(lexer_1.TokenType.RBRACKET, "Expected ']' after index");
                expr = {
                    type: AST.NodeType.INDEX_EXPRESSION,
                    target: expr,
                    index: indexExpr,
                    line: expr.line,
                    column: expr.column,
                };
            }
            else if (this.match(lexer_1.TokenType.DOT)) {
                if (!this.check(lexer_1.TokenType.IDENTIFIER) && !this.check(lexer_1.TokenType.STRATEGY) && !this.check(lexer_1.TokenType.INDICATOR)) {
                    throw new Error('Expected property name after "."');
                }
                const name = this.advance();
                if (this.match(lexer_1.TokenType.LPAREN)) {
                    const args = this.arguments();
                    expr = {
                        type: AST.NodeType.FUNCTION_CALL,
                        name: `${expr.name}.${name.value}`,
                        arguments: args,
                        line: name.line,
                        column: name.column,
                    };
                }
                else {
                    expr = {
                        type: AST.NodeType.IDENTIFIER,
                        name: `${expr.name}.${name.value}`,
                        line: name.line,
                        column: name.column,
                    };
                }
            }
            else {
                break;
            }
        }
        return expr;
    }
    finishCall(callee) {
        const args = this.arguments();
        return {
            type: AST.NodeType.FUNCTION_CALL,
            name: callee.name,
            arguments: args,
            line: callee.line,
            column: callee.column,
        };
    }
    arguments() {
        const args = [];
        if (!this.check(lexer_1.TokenType.RPAREN)) {
            do {
                // Support named argument: color=color.blue or title="Fast MA"
                if (this.check(lexer_1.TokenType.IDENTIFIER) && this.peekNext()?.type === lexer_1.TokenType.ASSIGN) {
                    const paramName = this.advance().value;
                    this.advance(); // consume '='
                    const valExpr = this.expression();
                    args.push({
                        type: AST.NodeType.ASSIGNMENT,
                        name: paramName,
                        value: valExpr,
                        line: valExpr.line,
                        column: valExpr.column,
                    });
                }
                else {
                    args.push(this.expression());
                }
            } while (this.match(lexer_1.TokenType.COMMA));
        }
        this.consume(lexer_1.TokenType.RPAREN, "Expected ')' after arguments");
        return args;
    }
    primary() {
        const token = this.advance();
        if (token.type === lexer_1.TokenType.TRUE || token.type === lexer_1.TokenType.FALSE) {
            return {
                type: AST.NodeType.BOOLEAN_LITERAL,
                value: token.type === lexer_1.TokenType.TRUE,
                line: token.line,
                column: token.column,
            };
        }
        if (token.type === lexer_1.TokenType.NUMBER) {
            return {
                type: AST.NodeType.NUMBER_LITERAL,
                value: parseFloat(token.value),
                line: token.line,
                column: token.column,
            };
        }
        if (token.type === lexer_1.TokenType.STRING) {
            return {
                type: AST.NodeType.STRING_LITERAL,
                value: token.value,
                line: token.line,
                column: token.column,
            };
        }
        if (token.type === lexer_1.TokenType.IDENTIFIER ||
            token.type === lexer_1.TokenType.STRATEGY ||
            token.type === lexer_1.TokenType.INDICATOR ||
            token.type === lexer_1.TokenType.NA) {
            return {
                type: AST.NodeType.IDENTIFIER,
                name: token.value,
                line: token.line,
                column: token.column,
            };
        }
        if (token.type === lexer_1.TokenType.LPAREN) {
            const expr = this.expression();
            this.consume(lexer_1.TokenType.RPAREN, "Expected ')' after expression");
            return expr;
        }
        if (token.type === lexer_1.TokenType.LBRACKET) {
            const elements = [];
            if (!this.check(lexer_1.TokenType.RBRACKET)) {
                do {
                    elements.push(this.expression());
                } while (this.match(lexer_1.TokenType.COMMA));
            }
            this.consume(lexer_1.TokenType.RBRACKET, "Expected ']' after array elements");
            return {
                type: AST.NodeType.ARRAY_LITERAL,
                elements,
                line: token.line,
                column: token.column,
            };
        }
        if (token.type === lexer_1.TokenType.SWITCH) {
            this.current--; // step back to parse with switchExpression()
            return this.switchExpression();
        }
        throw new Error(`Unexpected token '${token.value}' at line ${token.line}, column ${token.column}`);
    }
    match(...types) {
        for (const type of types) {
            if (this.check(type)) {
                this.advance();
                return true;
            }
        }
        return false;
    }
    check(type) {
        if (this.isAtEnd())
            return false;
        return this.peek().type === type;
    }
    advance() {
        if (!this.isAtEnd())
            this.current++;
        return this.previous();
    }
    isAtEnd() {
        return this.peek().type === lexer_1.TokenType.EOF;
    }
    peek() {
        return this.tokens[this.current];
    }
    peekNext() {
        if (this.current + 1 >= this.tokens.length)
            return undefined;
        return this.tokens[this.current + 1];
    }
    previous() {
        return this.tokens[this.current - 1];
    }
    consume(type, message) {
        if (this.check(type))
            return this.advance();
        const token = this.peek();
        throw new Error(`${message} at line ${token?.line ?? 1}, column ${token?.column ?? 1}`);
    }
}
exports.Parser = Parser;
//# sourceMappingURL=parser.js.map