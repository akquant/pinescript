import { Token } from './token';
import { DiagnosticReporter } from '../diagnostics/diagnostic';
export declare class Lexer {
    private source;
    private pos;
    private line;
    private column;
    private tokens;
    private reporter;
    private indentTracker;
    /** Whether we are at the start of a logical line (after a newline) */
    private atLineStart;
    /** Tracks nesting level of (), [] to ignore newlines and indents inside expressions */
    private parenDepth;
    constructor(source: string, reporter: DiagnosticReporter);
    tokenize(): Token[];
    private handleLineStart;
    private scanToken;
    private scanBlockComment;
    private scanCommentOrAnnotation;
    private scanColor;
    private scanString;
    private scanNumber;
    private scanIdentifier;
    private scanOperator;
    private peek;
    private peekNext;
    private advance;
    private match;
    private consumeNewline;
    private isAtEnd;
    private currentLoc;
    private isDigit;
    private isAlpha;
    private isAlphaNumeric;
    /** Tokens after which a newline is suppressed (implicit line continuation). */
    private isContinuationToken;
    private isHexDigit;
}
