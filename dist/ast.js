"use strict";
/**
 * PineScript Abstract Syntax Tree (AST) definitions
 * Adapted for QuantTrade Web & Bot Engine
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeType = void 0;
var NodeType;
(function (NodeType) {
    NodeType["PROGRAM"] = "PROGRAM";
    NodeType["INDICATOR_DECLARATION"] = "INDICATOR_DECLARATION";
    NodeType["STRATEGY_DECLARATION"] = "STRATEGY_DECLARATION";
    NodeType["VARIABLE_DECLARATION"] = "VARIABLE_DECLARATION";
    NodeType["ASSIGNMENT"] = "ASSIGNMENT";
    NodeType["FUNCTION_CALL"] = "FUNCTION_CALL";
    NodeType["BINARY_EXPRESSION"] = "BINARY_EXPRESSION";
    NodeType["UNARY_EXPRESSION"] = "UNARY_EXPRESSION";
    NodeType["IDENTIFIER"] = "IDENTIFIER";
    NodeType["NUMBER_LITERAL"] = "NUMBER_LITERAL";
    NodeType["STRING_LITERAL"] = "STRING_LITERAL";
    NodeType["BOOLEAN_LITERAL"] = "BOOLEAN_LITERAL";
    NodeType["IF_STATEMENT"] = "IF_STATEMENT";
    NodeType["FOR_STATEMENT"] = "FOR_STATEMENT";
    NodeType["WHILE_STATEMENT"] = "WHILE_STATEMENT";
    NodeType["BLOCK"] = "BLOCK";
    NodeType["CONDITIONAL_EXPRESSION"] = "CONDITIONAL_EXPRESSION";
    NodeType["INDEX_EXPRESSION"] = "INDEX_EXPRESSION";
    NodeType["ARRAY_LITERAL"] = "ARRAY_LITERAL";
    NodeType["TUPLE_ASSIGNMENT"] = "TUPLE_ASSIGNMENT";
    NodeType["FUNCTION_DECLARATION"] = "FUNCTION_DECLARATION";
    NodeType["SWITCH_EXPRESSION"] = "SWITCH_EXPRESSION";
    NodeType["TYPE_DECLARATION"] = "TYPE_DECLARATION";
})(NodeType || (exports.NodeType = NodeType = {}));
//# sourceMappingURL=ast.js.map