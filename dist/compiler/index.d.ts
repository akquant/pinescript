import { Diagnostic } from './diagnostics/diagnostic';
import { Program } from './ast/nodes';
export interface CompileResult {
    success: boolean;
    code: string | null;
    ast: Program | null;
    diagnostics: Diagnostic[];
    metadata: ScriptMetadata | null;
}
export interface ScriptMetadata {
    type: 'indicator' | 'strategy' | 'library';
    title: string;
    shorttitle: string;
    overlay: boolean;
    inputs: InputDef[];
    plots: PlotDef[];
}
export interface InputDef {
    id: string;
    title: string;
    type: string;
    defaultValue: unknown;
}
export interface PlotDef {
    index: number;
    title: string;
    color: string;
    linewidth: number;
    style: string;
    display?: string;
}
export declare function compile(source: string): CompileResult;
