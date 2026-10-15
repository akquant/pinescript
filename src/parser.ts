/**
 * PineScript Parser - Generates AST from tokens
 * Adapted for QuantTrade Web & Bot Engine
 */

import { Token, TokenType } from './lexer';
import * as AST from './ast';

export class Parser {
  private tokens: Token[];
  private current: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens.filter(t => t.type !== TokenType.NEWLINE);
  }

  parse(): AST.Program {
    const body: AST.ASTNode[] = [];
    
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

  private isTypeKeyword(val: string): boolean {
    if (!val) return false;
    return (
      val.startsWith('array<') ||
      val.startsWith('map<') ||
      [
        'string', 'float', 'int', 'bool', 'color', 'line', 'label', 'box', 'table',
        'series', 'simple', 'const', 'input'
      ].includes(val)
    );
  }

  private isTupleAssignment(): boolean {
    if (!this.check(TokenType.LBRACKET)) return false;
    let i = this.current + 1;
    let depth = 1;
    while (i < this.tokens.length) {
      if (this.tokens[i].type === TokenType.LBRACKET) depth++;
      else if (this.tokens[i].type === TokenType.RBRACKET) {
        depth--;
        if (depth === 0) {
          const after = this.tokens[i + 1];
          return after && after.type === TokenType.ASSIGN;
        }
      }
      i++;
    }
    return false;
  }

  private isFunctionDeclaration(): boolean {
    let startIdx = this.current;
    if (this.tokens[startIdx]?.value === 'method') {
      startIdx++;
    }
    if (this.tokens[startIdx]?.type !== TokenType.IDENTIFIER || this.tokens[startIdx + 1]?.type !== TokenType.LPAREN) return false;
    let depth = 0;
    let i = startIdx + 1;
    while (i < this.tokens.length) {
      if (this.tokens[i].type === TokenType.LPAREN) depth++;
      else if (this.tokens[i].type === TokenType.RPAREN) {
        depth--;
        if (depth === 0) {
          const after = this.tokens[i + 1];
          return after && after.type === TokenType.ARROW;
        }
      }
      i++;
    }
    return false;
  }

  private statement(): AST.ASTNode {
    if (this.check(TokenType.INDICATOR) && this.peekNext()?.type === TokenType.LPAREN) {
      this.advance();
      return this.indicatorDeclaration();
    }
    
    if (this.check(TokenType.STRATEGY) && this.peekNext()?.type === TokenType.LPAREN) {
      this.advance();
      return this.strategyDeclaration();
    }

    // Check for user-defined type declaration: type HGTrade
    if (this.check(TokenType.IDENTIFIER) && this.peek().value === 'type') {
      return this.typeDeclaration();
    }

    // Check for method: method closeAt(...) =>
    if (this.check(TokenType.IDENTIFIER) && this.peek().value === 'method') {
      this.advance(); // consume 'method'
      return this.functionDeclaration();
    }
    
    if (this.match(TokenType.VAR)) {
      // Skip any type annotation after var, e.g. "var float ut_stop = 0.0" or "var HGTrade trade = na"
      while (
        this.check(TokenType.IDENTIFIER) &&
        (this.isTypeKeyword(this.peek().value) || this.peekNext()?.type === TokenType.IDENTIFIER)
      ) {
        this.advance();
      }
      return this.variableDeclaration(true);
    }
    
    if (this.match(TokenType.IF)) {
      return this.ifStatement();
    }
    
    if (this.match(TokenType.FOR)) {
      return this.forStatement();
    }
    
    if (this.match(TokenType.WHILE)) {
      return this.whileStatement();
    }

    if (this.check(TokenType.SWITCH)) {
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
    if (
      this.check(TokenType.IDENTIFIER) &&
      this.peekNext()?.type === TokenType.IDENTIFIER &&
      this.tokens[this.current + 2]?.type === TokenType.ASSIGN
    ) {
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
    if (
      (this.check(TokenType.IDENTIFIER) && this.peekNext()?.type === TokenType.ASSIGN) ||
      (this.check(TokenType.IDENTIFIER) && this.peekNext()?.type === TokenType.DOT && this.tokens[this.current + 2]?.type === TokenType.IDENTIFIER && this.tokens[this.current + 3]?.type === TokenType.ASSIGN)
    ) {
      return this.assignment();
    }
    
    return this.expressionStatement();
  }

  private indicatorDeclaration(): AST.IndicatorDeclaration {
    const token = this.previous();
    this.consume(TokenType.LPAREN, "Expected '(' after indicator / study");
    
    let name = 'Custom Indicator';
    const parameters: Record<string, any> = {};
    
    if (!this.check(TokenType.RPAREN)) {
      this.parseDeclarationParam(parameters, (val) => { name = val; });
      while (this.match(TokenType.COMMA)) {
        this.parseDeclarationParam(parameters, (val) => { name = val; });
      }
    }
    
    this.consume(TokenType.RPAREN, "Expected ')' after parameters");
    
    return {
      type: AST.NodeType.INDICATOR_DECLARATION,
      name,
      parameters,
      line: token.line,
      column: token.column,
    };
  }

  private strategyDeclaration(): AST.StrategyDeclaration {
    const token = this.previous();
    this.consume(TokenType.LPAREN, "Expected '(' after strategy");
    
    let name = 'Custom Strategy';
    const parameters: Record<string, any> = {};
    
    if (!this.check(TokenType.RPAREN)) {
      this.parseDeclarationParam(parameters, (val) => { name = val; });
      while (this.match(TokenType.COMMA)) {
        this.parseDeclarationParam(parameters, (val) => { name = val; });
      }
    }
    
    this.consume(TokenType.RPAREN, "Expected ')' after parameters");
    
    return {
      type: AST.NodeType.STRATEGY_DECLARATION,
      name,
      parameters,
      line: token.line,
      column: token.column,
    };
  }

  private parseDeclarationParam(params: Record<string, any>, onTitleFound: (title: string) => void): void {
    if (this.check(TokenType.STRING)) {
      const val = this.advance().value;
      onTitleFound(val);
      return;
    }
    if (this.check(TokenType.IDENTIFIER) && this.peekNext()?.type === TokenType.ASSIGN) {
      const key = this.advance().value;
      this.advance(); // consume '='
      const valNode = this.primary();
      params[key] = valNode;
      if (key === 'title' && (valNode as any).value !== undefined) {
        onTitleFound(String((valNode as any).value));
      }
      return;
    }
    // Skip other parameters gracefully
    this.primary();
  }

  private variableDeclaration(isVar: boolean): AST.VariableDeclaration {
    const name = this.consume(TokenType.IDENTIFIER, 'Expected variable name').value;
    this.consume(TokenType.ASSIGN, "Expected '=' after variable name");
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

  private assignment(): AST.Assignment {
    let name = this.consume(TokenType.IDENTIFIER, 'Expected variable name').value;
    while (this.match(TokenType.DOT)) {
      name += '.' + this.consume(TokenType.IDENTIFIER, 'Expected property name').value;
    }
    const assignToken = this.consume(TokenType.ASSIGN, "Expected '='");
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

  private tupleAssignment(): AST.TupleAssignment {
    const startToken = this.consume(TokenType.LBRACKET, "Expected '[' at start of tuple");
    const names: string[] = [];
    do {
      if (this.check(TokenType.IDENTIFIER) && this.isTypeKeyword(this.peek().value) && this.peekNext()?.type === TokenType.IDENTIFIER) {
        this.advance(); // skip type keyword in tuple
      }
      names.push(this.consume(TokenType.IDENTIFIER, 'Expected identifier in tuple').value);
    } while (this.match(TokenType.COMMA));
    this.consume(TokenType.RBRACKET, "Expected ']' at end of tuple");
    this.consume(TokenType.ASSIGN, "Expected '=' after tuple");
    const value = this.expression();
    return {
      type: AST.NodeType.TUPLE_ASSIGNMENT,
      names,
      value,
      line: startToken.line,
      column: startToken.column,
    };
  }

  private typeDeclaration(): AST.TypeDeclaration {
    const typeToken = this.advance(); // consume 'type'
    const name = this.consume(TokenType.IDENTIFIER, 'Expected type name').value;
    const fields: AST.TypeField[] = [];

    const minCol = typeToken.column;
    while (!this.isAtEnd() && this.peek().column > minCol) {
      // Consume any type annotations (e.g. int, float, array<line>, label, etc.)
      while (
        this.check(TokenType.IDENTIFIER) &&
        (this.isTypeKeyword(this.peek().value) || this.peekNext()?.type === TokenType.IDENTIFIER)
      ) {
        this.advance();
      }

      if (this.check(TokenType.IDENTIFIER)) {
        const fieldName = this.advance().value;
        let defaultValue: AST.ASTNode | undefined;
        if (this.match(TokenType.ASSIGN)) {
          defaultValue = this.expression();
        }
        fields.push({ name: fieldName, defaultValue });
      } else {
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

  private functionDeclaration(): AST.FunctionDeclaration {
    if (this.check(TokenType.IDENTIFIER) && this.peek().value === 'method') {
      this.advance(); // consume 'method'
    }
    const fnToken = this.consume(TokenType.IDENTIFIER, 'Expected function name');
    this.consume(TokenType.LPAREN, "Expected '(' in function declaration");
    const params: string[] = [];
    if (!this.check(TokenType.RPAREN)) {
      do {
        // Skip type annotations: built-in keywords, user-defined type names, or array<...>
        while (
          this.check(TokenType.IDENTIFIER) &&
          (this.isTypeKeyword(this.peek().value) || this.peekNext()?.type === TokenType.IDENTIFIER)
        ) {
          this.advance();
        }
        const paramName = this.consume(TokenType.IDENTIFIER, 'Expected parameter name').value;
        params.push(paramName);
        if (this.match(TokenType.ASSIGN)) {
          this.expression(); // consume default value
        }
      } while (this.match(TokenType.COMMA));
    }
    this.consume(TokenType.RPAREN, "Expected ')' after function parameters");
    const arrowToken = this.consume(TokenType.ARROW, "Expected '=>' in function declaration");

    let body: AST.ASTNode;
    if (this.peek().line > arrowToken.line) {
      body = this.block(1);
    } else {
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

  private isSwitchCase(): boolean {
    if (this.check(TokenType.ARROW)) return true;
    let i = this.current;
    const startLine = this.tokens[i]?.line;
    while (i < this.tokens.length && this.tokens[i].line === startLine) {
      if (this.tokens[i].type === TokenType.ARROW) {
        return true;
      }
      i++;
    }
    return false;
  }

  private switchExpression(): AST.SwitchExpression {
    const switchToken = this.consume(TokenType.SWITCH, "Expected 'switch'");
    let discriminant: AST.ASTNode | undefined;

    // If next token is on the same line and not a switch case, it's the discriminant expression (e.g. switch signalModel)
    if (this.peek().line === switchToken.line && !this.isSwitchCase()) {
      discriminant = this.expression();
    }

    const cases: AST.SwitchCase[] = [];
    while (!this.isAtEnd() && this.isSwitchCase()) {
      if (this.match(TokenType.ARROW)) {
        // Default case: => expr
        const body = this.expression();
        cases.push({ body });
        break;
      }

      const pattern = this.expression();
      if (this.match(TokenType.ARROW)) {
        const body = this.expression();
        cases.push({ pattern, body });
      } else {
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

  private block(minColumn: number): AST.Block | AST.ASTNode {
    const statements: AST.ASTNode[] = [];
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

  private ifStatement(indentColumn?: number): AST.IfStatement {
    const token = this.previous();
    const effectiveCol = indentColumn !== undefined ? indentColumn : token.column;
    const condition = this.expression();
    const thenBranch = this.peek().column > effectiveCol ? this.block(effectiveCol) : this.statement();
    let elseBranch: AST.ASTNode | undefined;

    if (this.check(TokenType.ELSE) && this.peek().column >= effectiveCol) {
      const elseToken = this.advance(); // consume 'else'
      if (this.match(TokenType.IF)) {
        elseBranch = this.ifStatement(elseToken.column);
      } else {
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

  private forStatement(): AST.ForStatement {
    const token = this.previous();
    const variable = this.consume(TokenType.IDENTIFIER, 'Expected loop variable').value;

    // Check for-in loop: for elem in collection
    if (this.check(TokenType.IDENTIFIER) && this.peek().value === 'in') {
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

    this.consume(TokenType.ASSIGN, "Expected '='");
    const start = this.expression();
    this.consume(TokenType.IDENTIFIER, "Expected 'to'");
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

  private whileStatement(): AST.WhileStatement {
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

  private expressionStatement(): AST.ASTNode {
    return this.expression();
  }

  private expression(): AST.ASTNode {
    return this.ternary();
  }

  private ternary(): AST.ASTNode {
    let expr = this.logicalOr();
    
    if (this.match(TokenType.QUESTION)) {
      const question = this.previous();
      const consequent = this.expression();
      this.consume(TokenType.COLON, "Expected ':' in ternary expression");
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

  private logicalOr(): AST.ASTNode {
    let expr = this.logicalAnd();
    
    while (this.match(TokenType.OR)) {
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

  private logicalAnd(): AST.ASTNode {
    let expr = this.equality();
    
    while (this.match(TokenType.AND)) {
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

  private equality(): AST.ASTNode {
    let expr = this.comparison();
    
    while (this.match(TokenType.EQUAL, TokenType.NOT_EQUAL)) {
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

  private comparison(): AST.ASTNode {
    let expr = this.term();
    
    while (this.match(TokenType.GREATER_THAN, TokenType.GREATER_EQUAL, TokenType.LESS_THAN, TokenType.LESS_EQUAL)) {
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

  private term(): AST.ASTNode {
    let expr = this.factor();
    
    while (this.match(TokenType.PLUS, TokenType.MINUS)) {
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

  private factor(): AST.ASTNode {
    let expr = this.unary();
    
    while (this.match(TokenType.MULTIPLY, TokenType.DIVIDE, TokenType.MODULO)) {
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

  private unary(): AST.ASTNode {
    if (this.match(TokenType.NOT, TokenType.MINUS)) {
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

  private call(): AST.ASTNode {
    let expr = this.primary();
    
    while (true) {
      if (this.match(TokenType.LPAREN)) {
        expr = this.finishCall(expr);
      } else if (this.check(TokenType.LBRACKET)) {
        // Subscript series[1] must be on the same line as the preceding token
        if (this.peek().line !== this.previous().line) {
          break;
        }
        this.advance(); // consume '['
        const indexExpr = this.expression();
        this.consume(TokenType.RBRACKET, "Expected ']' after index");
        expr = {
          type: AST.NodeType.INDEX_EXPRESSION,
          target: expr,
          index: indexExpr,
          line: (expr as any).line,
          column: (expr as any).column,
        };
      } else if (this.match(TokenType.DOT)) {
        if (!this.check(TokenType.IDENTIFIER) && !this.check(TokenType.STRATEGY) && !this.check(TokenType.INDICATOR)) {
          throw new Error('Expected property name after "."');
        }
        const name = this.advance();
        if (this.match(TokenType.LPAREN)) {
          const args = this.arguments();
          expr = {
            type: AST.NodeType.FUNCTION_CALL,
            name: `${(expr as AST.Identifier).name}.${name.value}`,
            arguments: args,
            line: name.line,
            column: name.column,
          };
        } else {
          expr = {
            type: AST.NodeType.IDENTIFIER,
            name: `${(expr as AST.Identifier).name}.${name.value}`,
            line: name.line,
            column: name.column,
          };
        }
      } else {
        break;
      }
    }
    
    return expr;
  }

  private finishCall(callee: AST.ASTNode): AST.FunctionCall {
    const args = this.arguments();
    
    return {
      type: AST.NodeType.FUNCTION_CALL,
      name: (callee as AST.Identifier).name,
      arguments: args,
      line: (callee as AST.Identifier).line,
      column: (callee as AST.Identifier).column,
    };
  }

  private arguments(): AST.ASTNode[] {
    const args: AST.ASTNode[] = [];
    
    if (!this.check(TokenType.RPAREN)) {
      do {
        // Support named argument: color=color.blue or title="Fast MA"
        if (this.check(TokenType.IDENTIFIER) && this.peekNext()?.type === TokenType.ASSIGN) {
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
        } else {
          args.push(this.expression());
        }
      } while (this.match(TokenType.COMMA));
    }
    
    this.consume(TokenType.RPAREN, "Expected ')' after arguments");
    return args;
  }

  private primary(): AST.ASTNode {
    const token = this.advance();
    
    if (token.type === TokenType.TRUE || token.type === TokenType.FALSE) {
      return {
        type: AST.NodeType.BOOLEAN_LITERAL,
        value: token.type === TokenType.TRUE,
        line: token.line,
        column: token.column,
      };
    }
    
    if (token.type === TokenType.NUMBER) {
      return {
        type: AST.NodeType.NUMBER_LITERAL,
        value: parseFloat(token.value),
        line: token.line,
        column: token.column,
      };
    }
    
    if (token.type === TokenType.STRING) {
      return {
        type: AST.NodeType.STRING_LITERAL,
        value: token.value,
        line: token.line,
        column: token.column,
      };
    }
    
    if (
      token.type === TokenType.IDENTIFIER ||
      token.type === TokenType.STRATEGY ||
      token.type === TokenType.INDICATOR ||
      token.type === TokenType.NA
    ) {
      return {
        type: AST.NodeType.IDENTIFIER,
        name: token.value,
        line: token.line,
        column: token.column,
      };
    }
    
    if (token.type === TokenType.LPAREN) {
      const expr = this.expression();
      this.consume(TokenType.RPAREN, "Expected ')' after expression");
      return expr;
    }

    if (token.type === TokenType.LBRACKET) {
      const elements: AST.ASTNode[] = [];
      if (!this.check(TokenType.RBRACKET)) {
        do {
          elements.push(this.expression());
        } while (this.match(TokenType.COMMA));
      }
      this.consume(TokenType.RBRACKET, "Expected ']' after array elements");
      return {
        type: AST.NodeType.ARRAY_LITERAL,
        elements,
        line: token.line,
        column: token.column,
      };
    }

    if (token.type === TokenType.SWITCH) {
      this.current--; // step back to parse with switchExpression()
      return this.switchExpression();
    }
    
    throw new Error(`Unexpected token '${token.value}' at line ${token.line}, column ${token.column}`);
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private peekNext(): Token | undefined {
    if (this.current + 1 >= this.tokens.length) return undefined;
    return this.tokens[this.current + 1];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    
    const token = this.peek();
    throw new Error(`${message} at line ${token?.line ?? 1}, column ${token?.column ?? 1}`);
  }
}
