import { Token, SourceLocation } from './token';
export declare class IndentTracker {
    private stack;
    /**
     * Given the indentation level at the start of a new non-blank line,
     * return any INDENT or DEDENT tokens that should be emitted.
     */
    process(indentLevel: number, loc: SourceLocation): Token[];
    /**
     * At EOF, emit DEDENTs for all remaining open indent levels.
     */
    finalize(loc: SourceLocation): Token[];
    currentLevel(): number;
}
