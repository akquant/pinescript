export interface TableCell {
    text: string;
    bgcolor: string;
    text_color: string;
    text_size: string;
    text_halign: string;
    text_valign: string;
    tooltip: string;
    colspan: number;
    rowspan: number;
}
export interface TableObject {
    id: number;
    position: string;
    columns: number;
    rows: number;
    bgcolor: string;
    border_color: string;
    border_width: number;
    frame_color: string;
    frame_width: number;
    cells: (TableCell | null)[][];
    _deleted: boolean;
}
export declare function createTableModule(): {
    "new"(position: string, columns: number, rows: number, opts?: {
        bgcolor?: string;
        border_color?: string;
        border_width?: number;
        frame_color?: string;
        frame_width?: number;
    }): TableObject;
    cell(table: TableObject, column: number, row: number, text?: string, opts?: {
        bgcolor?: string;
        text_color?: string;
        text_size?: string;
        text_halign?: string;
        text_valign?: string;
        tooltip?: string;
        colspan?: number;
        rowspan?: number;
    }): void;
    merge_cells(table: TableObject, startCol: number, startRow: number, endCol: number, endRow: number): void;
    delete(table: TableObject): void;
    clear(table: TableObject, startCol: number, startRow: number, endCol: number, endRow: number): void;
    set_bgcolor(table: TableObject, val: string): void;
    set_border_color(table: TableObject, val: string): void;
    set_border_width(table: TableObject, val: number): void;
    set_frame_color(table: TableObject, val: string): void;
    set_frame_width(table: TableObject, val: number): void;
    set_position(table: TableObject, val: string): void;
    cell_set_text(table: TableObject, col: number, row: number, val: string): void;
    cell_set_bgcolor(table: TableObject, col: number, row: number, val: string): void;
    cell_set_text_color(table: TableObject, col: number, row: number, val: string): void;
    cell_set_text_size(table: TableObject, col: number, row: number, val: string): void;
    cell_set_text_halign(table: TableObject, col: number, row: number, val: string): void;
    cell_set_text_valign(table: TableObject, col: number, row: number, val: string): void;
    cell_set_tooltip(table: TableObject, col: number, row: number, val: string): void;
    readonly all: TableObject[];
};
