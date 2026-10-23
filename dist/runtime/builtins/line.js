"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LineImpl = void 0;
exports.createLineModule = createLineModule;
const toNum = (v) => (v !== null && typeof v === 'object' && typeof v.get === 'function') ? Number(v.get(0)) : Number(v);
class LineImpl {
    id;
    x1;
    y1;
    x2;
    y2;
    xloc;
    extend;
    color;
    style;
    width;
    _deleted = false;
    constructor(id, x1, y1, x2, y2, opts) {
        this.id = id;
        this.x1 = toNum(x1);
        this.y1 = toNum(y1);
        this.x2 = toNum(x2);
        this.y2 = toNum(y2);
        this.xloc = opts?.xloc ?? 'bar_index';
        this.extend = opts?.extend ?? 'none';
        this.color = opts?.color ?? '#2962FF';
        this.style = opts?.style ?? 'solid';
        this.width = opts?.width ?? 1;
    }
    delete() { this._deleted = true; }
    set_x1(val) { this.x1 = toNum(val); }
    set_y1(val) { this.y1 = toNum(val); }
    set_x2(val) { this.x2 = toNum(val); }
    set_y2(val) { this.y2 = toNum(val); }
    set_xy1(x, y) { this.x1 = toNum(x); this.y1 = toNum(y); }
    set_xy2(x, y) { this.x2 = toNum(x); this.y2 = toNum(y); }
    set_xloc(val) { this.xloc = String(val); }
    set_extend(val) { this.extend = String(val); }
    set_color(val) { this.color = String(val); }
    set_style(val) { this.style = String(val); }
    set_width(val) { this.width = Number(val); }
    get_x1() { return this.x1; }
    get_y1() { return this.y1; }
    get_x2() { return this.x2; }
    get_y2() { return this.y2; }
    get_price(x) {
        const dx = this.x2 - this.x1;
        if (dx === 0)
            return this.y1;
        const t = (x - this.x1) / dx;
        return this.y1 + t * (this.y2 - this.y1);
    }
}
exports.LineImpl = LineImpl;
function createLineModule() {
    let nextId = 0;
    const lines = [];
    return {
        new(x1, y1, x2, y2, opts) {
            const line = new LineImpl(nextId++, x1, y1, x2, y2, opts);
            lines.push(line);
            return line;
        },
        delete(line) {
            if (!line || typeof line !== 'object')
                return;
            line.delete();
        },
        set_x1(line, val) {
            if (!line || typeof line !== 'object')
                return;
            line.set_x1(val);
        },
        set_y1(line, val) {
            if (!line || typeof line !== 'object')
                return;
            line.set_y1(val);
        },
        set_x2(line, val) {
            if (!line || typeof line !== 'object')
                return;
            line.set_x2(val);
        },
        set_y2(line, val) {
            if (!line || typeof line !== 'object')
                return;
            line.set_y2(val);
        },
        set_xy1(line, x, y) {
            if (!line || typeof line !== 'object')
                return;
            line.set_xy1(x, y);
        },
        set_xy2(line, x, y) {
            if (!line || typeof line !== 'object')
                return;
            line.set_xy2(x, y);
        },
        set_xloc(line, val) {
            if (!line || typeof line !== 'object')
                return;
            line.set_xloc(val);
        },
        set_extend(line, val) {
            if (!line || typeof line !== 'object')
                return;
            line.set_extend(val);
        },
        set_color(line, val) {
            if (!line || typeof line !== 'object')
                return;
            line.set_color(val);
        },
        set_style(line, val) {
            if (!line || typeof line !== 'object')
                return;
            line.set_style(val);
        },
        set_width(line, val) {
            if (!line || typeof line !== 'object')
                return;
            line.set_width(val);
        },
        get_x1(line) {
            return line ? line.get_x1() : 0;
        },
        get_y1(line) {
            return line ? line.get_y1() : 0;
        },
        get_x2(line) {
            return line ? line.get_x2() : 0;
        },
        get_y2(line) {
            return line ? line.get_y2() : 0;
        },
        get_price(line, x) {
            return line ? line.get_price(x) : 0;
        },
        copy(line) {
            const copied = new LineImpl(nextId++, line.x1, line.y1, line.x2, line.y2, {
                xloc: line.xloc,
                extend: line.extend,
                color: line.color,
                style: line.style,
                width: line.width,
            });
            lines.push(copied);
            return copied;
        },
        get all() {
            return lines.filter((l) => !l._deleted);
        },
    };
}
//# sourceMappingURL=line.js.map