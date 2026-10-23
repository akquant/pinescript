"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiagnosticReporter = void 0;
class DiagnosticReporter {
    diagnostics = [];
    error(message, loc, endLoc) {
        this.diagnostics.push({ severity: 'error', message, loc, endLoc });
    }
    warning(message, loc, endLoc) {
        this.diagnostics.push({ severity: 'warning', message, loc, endLoc });
    }
    info(message, loc, endLoc) {
        this.diagnostics.push({ severity: 'info', message, loc, endLoc });
    }
    hasErrors() {
        return this.diagnostics.some(d => d.severity === 'error');
    }
    getAll() {
        return [...this.diagnostics];
    }
    getErrors() {
        return this.diagnostics.filter(d => d.severity === 'error');
    }
    clear() {
        this.diagnostics = [];
    }
}
exports.DiagnosticReporter = DiagnosticReporter;
//# sourceMappingURL=diagnostic.js.map