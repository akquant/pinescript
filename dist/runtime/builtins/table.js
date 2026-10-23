"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTableModule = createTableModule;
function createTableModule() {
    let nextId = 0;
    const tables = [];
    function getCell(table, col, row) {
        if (row >= 0 && row < table.rows && col >= 0 && col < table.columns) {
            return table.cells[row][col];
        }
        return null;
    }
    function ensureCell(table, col, row) {
        if (!table || typeof table !== 'object' || !table.cells) {
            return {
                text: '',
                bgcolor: '',
                text_color: '#000000',
                text_size: 'auto',
                text_halign: 'center',
                text_valign: 'center',
                tooltip: '',
                colspan: 1,
                rowspan: 1,
            };
        }
        if (row < 0 || row >= table.rows || col < 0 || col >= table.columns) {
            return {
                text: '',
                bgcolor: '',
                text_color: '#000000',
                text_size: 'auto',
                text_halign: 'center',
                text_valign: 'center',
                tooltip: '',
                colspan: 1,
                rowspan: 1,
            };
        }
        let cell = table.cells[row][col];
        if (!cell) {
            cell = {
                text: '',
                bgcolor: '',
                text_color: '#000000',
                text_size: 'auto',
                text_halign: 'center',
                text_valign: 'center',
                tooltip: '',
                colspan: 1,
                rowspan: 1,
            };
            table.cells[row][col] = cell;
        }
        return cell;
    }
    function createEmptyCells(columns, rows) {
        const cells = [];
        for (let r = 0; r < rows; r++) {
            const row = [];
            for (let c = 0; c < columns; c++) {
                row.push(null);
            }
            cells.push(row);
        }
        return cells;
    }
    return {
        new(position, columns, rows, opts) {
            const table = {
                id: nextId++,
                position,
                columns,
                rows,
                bgcolor: opts?.bgcolor ?? '',
                border_color: opts?.border_color ?? '#000000',
                border_width: opts?.border_width ?? 0,
                frame_color: opts?.frame_color ?? '#000000',
                frame_width: opts?.frame_width ?? 0,
                cells: createEmptyCells(columns, rows),
                _deleted: false,
            };
            tables.push(table);
            return table;
        },
        cell(table, column, row, text, opts) {
            const cell = ensureCell(table, column, row);
            if (text !== undefined) {
                cell.text = text;
            }
            if (opts?.bgcolor !== undefined)
                cell.bgcolor = opts.bgcolor;
            if (opts?.text_color !== undefined)
                cell.text_color = opts.text_color;
            if (opts?.text_size !== undefined)
                cell.text_size = opts.text_size;
            if (opts?.text_halign !== undefined)
                cell.text_halign = opts.text_halign;
            if (opts?.text_valign !== undefined)
                cell.text_valign = opts.text_valign;
            if (opts?.tooltip !== undefined)
                cell.tooltip = opts.tooltip;
            if (opts?.colspan !== undefined)
                cell.colspan = opts.colspan;
            if (opts?.rowspan !== undefined)
                cell.rowspan = opts.rowspan;
        },
        merge_cells(table, startCol, startRow, endCol, endRow) {
            const cell = ensureCell(table, startCol, startRow);
            cell.colspan = endCol - startCol + 1;
            cell.rowspan = endRow - startRow + 1;
            for (let r = startRow; r <= endRow; r++) {
                for (let c = startCol; c <= endCol; c++) {
                    if (r === startRow && c === startCol)
                        continue;
                    table.cells[r][c] = null;
                }
            }
        },
        delete(table) {
            if (!table || typeof table !== 'object')
                return;
            table._deleted = true;
        },
        clear(table, startCol, startRow, endCol, endRow) {
            if (!table || typeof table !== 'object' || !table.cells)
                return;
            for (let r = startRow; r <= endRow && r < table.rows; r++) {
                for (let c = startCol; c <= endCol && c < table.columns; c++) {
                    table.cells[r][c] = null;
                }
            }
        },
        set_bgcolor(table, val) {
            table.bgcolor = val;
        },
        set_border_color(table, val) {
            table.border_color = val;
        },
        set_border_width(table, val) {
            table.border_width = val;
        },
        set_frame_color(table, val) {
            table.frame_color = val;
        },
        set_frame_width(table, val) {
            table.frame_width = val;
        },
        set_position(table, val) {
            table.position = val;
        },
        cell_set_text(table, col, row, val) {
            const cell = ensureCell(table, col, row);
            cell.text = val;
        },
        cell_set_bgcolor(table, col, row, val) {
            const cell = ensureCell(table, col, row);
            cell.bgcolor = val;
        },
        cell_set_text_color(table, col, row, val) {
            const cell = ensureCell(table, col, row);
            cell.text_color = val;
        },
        cell_set_text_size(table, col, row, val) {
            const cell = ensureCell(table, col, row);
            cell.text_size = val;
        },
        cell_set_text_halign(table, col, row, val) {
            const cell = ensureCell(table, col, row);
            cell.text_halign = val;
        },
        cell_set_text_valign(table, col, row, val) {
            const cell = ensureCell(table, col, row);
            cell.text_valign = val;
        },
        cell_set_tooltip(table, col, row, val) {
            const cell = ensureCell(table, col, row);
            cell.tooltip = val;
        },
        get all() {
            return tables.filter((t) => !t._deleted);
        },
    };
}
//# sourceMappingURL=table.js.map