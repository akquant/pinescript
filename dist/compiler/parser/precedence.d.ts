import { TokenType } from '../lexer/token';
export declare const enum Precedence {
    NONE = 0,
    TERNARY = 1,// ?:  right-assoc
    OR = 2,// or
    AND = 3,// and
    EQUALITY = 5,// == !=
    COMPARISON = 6,// < <= > >=
    TERM = 7,// + -
    FACTOR = 8
}
export type Associativity = 'left' | 'right';
export interface OperatorInfo {
    precedence: Precedence;
    associativity: Associativity;
}
export declare const INFIX_OPERATORS: Partial<Record<TokenType, OperatorInfo>>;
export declare function getInfixInfo(type: TokenType): OperatorInfo | null;
