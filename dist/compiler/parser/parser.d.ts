import { Token } from '../lexer/token';
import { DiagnosticReporter } from '../diagnostics/diagnostic';
import { Program, Expression } from '../ast/nodes';
export declare class Parser {
    private tokens;
    private pos;
    private reporter;
    version: number;
    metadata: Record<string, string>;
    constructor(tokens: Token[], reporter: DiagnosticReporter);
    parse(): Program;
    private peek;
    private peekAt;
    private advance;
    private check;
    private checkAny;
    private expect;
    private isAtEnd;
    private skipNewlines;
    private consumeNewline;
    private parseProgram;
    private parseAnnotation;
    private parseStatementSafe;
    /**
     * Look ahead to determine if `[IDENT, IDENT, ...] =` pattern (tuple destructure)
     * vs an array literal expression.
     */
    private isTupleDestructurePattern;
    private synchronize;
    private parseStatement;
    /**
     * Dispatches ambiguous statements:
     * - type-annotated var declaration: `int x = expr`
     * - function declaration: `name(params) => expr` or `name(params)\n  INDENT body DEDENT`
     * - assignment: `x := expr`, `x += expr`
     * - expression statement
     */
    private parseAmbiguousStmt;
    /**
     * Look ahead from current IDENTIFIER token to decide if this is a function
     * declaration (name(params) => | name(params)\nINDENT) vs a call expression.
     * Returns 'funcDecl' or 'other'.
     */
    private sniffFunctionDecl;
    private parseExprOrAssign;
    private parseVarDecl;
    private parseTupleDestructure;
    private parseFunctionDecl;
    private parseFunctionParams;
    private parseMethodDecl;
    private parseTypeDecl;
    private parseEnumDecl;
    private parseImportStmt;
    private parseExportStmt;
    private parseIfStmt;
    private parseForStmt;
    private parseWhileStmt;
    private parseSwitchStmt;
    private parseReturnStmt;
    private parseBlock;
    parseExpression(minPrec?: number): Expression;
    private parseUnary;
    private isGenericCallArgs;
    private parsePostfix;
    private parseCallArgs;
    private extractMetadata;
    private parsePrimary;
    private parseIfExpr;
    private parseSwitchExpr;
    private static readonly DRAWING_TYPE_NAMES;
    /**
     * Returns true if the current token can start a type annotation.
     * We detect non-IDENTIFIER base types (int, float, bool, string, color),
     * qualifiers (const, input, simple, series), and drawing object type names
     * (line, label, box, table) when followed by an identifier.
     * Also handles generic types like array<int>, map<int, int> and user-defined type names (UDTs).
     */
    private isTypeAnnotationStart;
    private parseTypeAnnotation;
}
