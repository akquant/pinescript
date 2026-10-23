/**
 * Pine Script v6 Semantic Analyzer
 *
 * Walks the AST produced by the parser and:
 *  - Checks type compatibility in assignments and expressions
 *  - Validates scope (undeclared variables, shadowing)
 *  - Enforces qualifier rules (const / input / simple / series)
 *  - Warns about unused variables
 *  - Validates return types within user-defined functions
 *
 * The analyzer is NON-BLOCKING: it only appends to DiagnosticReporter and
 * never throws.  Compilation continues even when errors are found.
 */
import { Program } from '../ast/nodes';
import { DiagnosticReporter } from '../diagnostics/diagnostic';
export declare class SemanticAnalyzer {
    private reporter;
    private scopes;
    /** Stack of expected return types for nested function declarations */
    private returnTypeStack;
    /** Names of UDTs declared in the script */
    private udtNames;
    constructor(reporter: DiagnosticReporter);
    analyze(program: Program): void;
    private analyzeStatement;
    private analyzeVarDecl;
    private analyzeFuncDecl;
    private analyzeMethodDecl;
    private analyzeTypeDecl;
    private analyzeEnumDecl;
    private analyzeIfStmt;
    private analyzeForStmt;
    private analyzeForInStmt;
    private analyzeWhileStmt;
    private analyzeSwitchStmt;
    private analyzeReturnStmt;
    private analyzeAssignStmt;
    /** Returns true if the expression is a call to an input.* function */
    private isInputCall;
    private analyzeExprStmt;
    private inferType;
    private inferLiteral;
    private inferIdentifier;
    private inferBinary;
    private inferUnary;
    private inferCall;
    private inferMember;
    private inferIndex;
    private inferConditional;
    private inferIfExpr;
    private inferSwitchExpr;
    private inferArrayLiteral;
    private inferTuple;
    private inferLambda;
    private resolveCalleeName;
    private isKnownNamespace;
    private declareVar;
    private checkUnusedVariables;
    private registerBuiltins;
}
/**
 * Convenience function: run semantic analysis on a parsed AST.
 * Returns the reporter so callers can inspect diagnostics.
 */
export declare function analyze(program: Program, reporter: DiagnosticReporter): void;
