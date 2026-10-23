"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compile = compile;
const lexer_1 = require("./lexer/lexer");
const parser_1 = require("./parser/parser");
const generator_1 = require("./codegen/generator");
const diagnostic_1 = require("./diagnostics/diagnostic");
function compile(source) {
    const reporter = new diagnostic_1.DiagnosticReporter();
    try {
        const lexer = new lexer_1.Lexer(source, reporter);
        const tokens = lexer.tokenize();
        if (reporter.hasErrors()) {
            return { success: false, code: null, ast: null, diagnostics: reporter.getAll(), metadata: null };
        }
        const parser = new parser_1.Parser(tokens, reporter);
        const ast = parser.parse();
        if (reporter.hasErrors()) {
            return { success: false, code: null, ast, diagnostics: reporter.getAll(), metadata: null };
        }
        const generator = new generator_1.CodeGenerator(reporter);
        const { code, metadata } = generator.generate(ast);
        return {
            success: !reporter.hasErrors(),
            code,
            ast,
            diagnostics: reporter.getAll(),
            metadata,
        };
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        reporter.error(`Internal compiler error: ${msg}`, { line: 0, column: 0, offset: 0 });
        return { success: false, code: null, ast: null, diagnostics: reporter.getAll(), metadata: null };
    }
}
//# sourceMappingURL=index.js.map