import { SourceLocation } from '../lexer/token';
export type DiagnosticSeverity = 'error' | 'warning' | 'info';
export interface Diagnostic {
    severity: DiagnosticSeverity;
    message: string;
    loc: SourceLocation;
    endLoc?: SourceLocation;
}
export declare class DiagnosticReporter {
    private diagnostics;
    error(message: string, loc: SourceLocation, endLoc?: SourceLocation): void;
    warning(message: string, loc: SourceLocation, endLoc?: SourceLocation): void;
    info(message: string, loc: SourceLocation, endLoc?: SourceLocation): void;
    hasErrors(): boolean;
    getAll(): Diagnostic[];
    getErrors(): Diagnostic[];
    clear(): void;
}
