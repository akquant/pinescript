/**
 * PineScript Abstract Syntax Tree (AST) definitions
 * Adapted for QuantTrade Web & Bot Engine
 */

export enum NodeType {
  PROGRAM = 'PROGRAM',
  INDICATOR_DECLARATION = 'INDICATOR_DECLARATION',
  STRATEGY_DECLARATION = 'STRATEGY_DECLARATION',
  VARIABLE_DECLARATION = 'VARIABLE_DECLARATION',
  ASSIGNMENT = 'ASSIGNMENT',
  FUNCTION_CALL = 'FUNCTION_CALL',
  BINARY_EXPRESSION = 'BINARY_EXPRESSION',
  UNARY_EXPRESSION = 'UNARY_EXPRESSION',
  IDENTIFIER = 'IDENTIFIER',
  NUMBER_LITERAL = 'NUMBER_LITERAL',
  STRING_LITERAL = 'STRING_LITERAL',
  BOOLEAN_LITERAL = 'BOOLEAN_LITERAL',
  IF_STATEMENT = 'IF_STATEMENT',
  FOR_STATEMENT = 'FOR_STATEMENT',
  WHILE_STATEMENT = 'WHILE_STATEMENT',
  BLOCK = 'BLOCK',
  CONDITIONAL_EXPRESSION = 'CONDITIONAL_EXPRESSION',
  INDEX_EXPRESSION = 'INDEX_EXPRESSION',
  ARRAY_LITERAL = 'ARRAY_LITERAL',
  TUPLE_ASSIGNMENT = 'TUPLE_ASSIGNMENT',
  FUNCTION_DECLARATION = 'FUNCTION_DECLARATION',
  SWITCH_EXPRESSION = 'SWITCH_EXPRESSION',
  TYPE_DECLARATION = 'TYPE_DECLARATION',
}

export interface BaseNode {
  type: NodeType;
  line: number;
  column: number;
}

export interface Program extends BaseNode {
  type: NodeType.PROGRAM;
  body: ASTNode[];
}

export interface IndicatorDeclaration extends BaseNode {
  type: NodeType.INDICATOR_DECLARATION;
  name: string;
  parameters: Record<string, any>;
}

export interface StrategyDeclaration extends BaseNode {
  type: NodeType.STRATEGY_DECLARATION;
  name: string;
  parameters: Record<string, any>;
}

export interface VariableDeclaration extends BaseNode {
  type: NodeType.VARIABLE_DECLARATION;
  name: string;
  value: ASTNode;
  isVar: boolean;
}

export interface Assignment extends BaseNode {
  type: NodeType.ASSIGNMENT;
  name: string;
  value: ASTNode;
}

export interface FunctionCall extends BaseNode {
  type: NodeType.FUNCTION_CALL;
  name: string;
  arguments: ASTNode[];
  namedArguments?: Record<string, ASTNode>;
}

export interface BinaryExpression extends BaseNode {
  type: NodeType.BINARY_EXPRESSION;
  operator: string;
  left: ASTNode;
  right: ASTNode;
}

export interface UnaryExpression extends BaseNode {
  type: NodeType.UNARY_EXPRESSION;
  operator: string;
  operand: ASTNode;
}

export interface Identifier extends BaseNode {
  type: NodeType.IDENTIFIER;
  name: string;
}

export interface NumberLiteral extends BaseNode {
  type: NodeType.NUMBER_LITERAL;
  value: number;
}

export interface StringLiteral extends BaseNode {
  type: NodeType.STRING_LITERAL;
  value: string;
}

export interface BooleanLiteral extends BaseNode {
  type: NodeType.BOOLEAN_LITERAL;
  value: boolean;
}

export interface IfStatement extends BaseNode {
  type: NodeType.IF_STATEMENT;
  condition: ASTNode;
  thenBranch: ASTNode;
  elseBranch?: ASTNode;
}

export interface ForStatement extends BaseNode {
  type: NodeType.FOR_STATEMENT;
  variable: string;
  start?: ASTNode;
  end?: ASTNode;
  iterable?: ASTNode;
  body: ASTNode;
}

export interface WhileStatement extends BaseNode {
  type: NodeType.WHILE_STATEMENT;
  condition: ASTNode;
  body: ASTNode;
}

export interface Block extends BaseNode {
  type: NodeType.BLOCK;
  statements: ASTNode[];
}

export interface ConditionalExpression extends BaseNode {
  type: NodeType.CONDITIONAL_EXPRESSION;
  condition: ASTNode;
  consequent: ASTNode;
  alternate: ASTNode;
}

export interface IndexExpression extends BaseNode {
  type: NodeType.INDEX_EXPRESSION;
  target: ASTNode;
  index: ASTNode;
}

export interface ArrayLiteral extends BaseNode {
  type: NodeType.ARRAY_LITERAL;
  elements: ASTNode[];
}

export interface TupleAssignment extends BaseNode {
  type: NodeType.TUPLE_ASSIGNMENT;
  names: string[];
  value: ASTNode;
}

export interface FunctionDeclaration extends BaseNode {
  type: NodeType.FUNCTION_DECLARATION;
  name: string;
  parameters: string[];
  body: ASTNode;
}

export interface SwitchCase {
  pattern?: ASTNode;
  body: ASTNode;
}

export interface TypeField {
  name: string;
  defaultValue?: ASTNode;
}

export interface TypeDeclaration extends BaseNode {
  type: NodeType.TYPE_DECLARATION;
  name: string;
  fields: TypeField[];
}

export interface SwitchExpression extends BaseNode {
  type: NodeType.SWITCH_EXPRESSION;
  discriminant?: ASTNode;
  cases: SwitchCase[];
}

export type ASTNode =
  | Program
  | IndicatorDeclaration
  | StrategyDeclaration
  | VariableDeclaration
  | Assignment
  | FunctionCall
  | BinaryExpression
  | UnaryExpression
  | Identifier
  | NumberLiteral
  | StringLiteral
  | BooleanLiteral
  | IfStatement
  | ForStatement
  | WhileStatement
  | Block
  | ConditionalExpression
  | IndexExpression
  | ArrayLiteral
  | TupleAssignment
  | FunctionDeclaration
  | SwitchExpression
  | TypeDeclaration;

