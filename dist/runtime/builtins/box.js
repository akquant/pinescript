"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BoxImpl = void 0;
exports.createBoxModule = createBoxModule;
class BoxImpl {
    id;
    left;
    top;
    right;
    bottom;
    xloc;
    extend;
    bgcolor;
    border_color;
    border_width;
    border_style;
    text;
    text_color;
    text_size;
    text_halign;
    text_valign;
    _deleted = false;
    constructor(id, left, top, right, bottom, opts) {
        const toNum = (v) => (v !== null && typeof v === 'object' && typeof v.get === 'function') ? Number(v.get(0)) : Number(v);
        this.id = id;
        this.left = toNum(left);
        this.top = toNum(top);
        this.right = toNum(right);
        this.bottom = toNum(bottom);
        this.xloc = opts?.xloc ?? 'bar_index';
        this.extend = opts?.extend ?? 'none';
        this.bgcolor = opts?.bgcolor ?? '#2962FF33';
        this.border_color = opts?.border_color ?? '#2962FF';
        this.border_width = opts?.border_width ?? 1;
        this.border_style = opts?.border_style ?? 'solid';
        this.text = opts?.text ?? '';
        this.text_color = opts?.text_color ?? '#000000';
        this.text_size = opts?.text_size ?? 'auto';
        this.text_halign = opts?.text_halign ?? 'center';
        this.text_valign = opts?.text_valign ?? 'center';
    }
    delete() { this._deleted = true; }
    set_left(val) { this.left = Number(val); }
    set_top(val) { this.top = Number(val); }
    set_right(val) { this.right = Number(val); }
    set_bottom(val) { this.bottom = Number(val); }
    set_lefttop(left, top) { this.left = Number(left); this.top = Number(top); }
    set_rightbottom(right, bottom) { this.right = Number(right); this.bottom = Number(bottom); }
    set_bgcolor(val) { this.bgcolor = String(val); }
    set_border_color(val) { this.border_color = String(val); }
    set_border_width(val) { this.border_width = Number(val); }
    set_border_style(val) { this.border_style = String(val); }
    set_extend(val) { this.extend = String(val); }
    set_text(val) { this.text = String(val); }
    set_text_color(val) { this.text_color = String(val); }
    set_text_size(val) { this.text_size = String(val); }
    set_text_halign(val) { this.text_halign = String(val); }
    set_text_valign(val) { this.text_valign = String(val); }
    get_left() { return this.left; }
    get_top() { return this.top; }
    get_right() { return this.right; }
    get_bottom() { return this.bottom; }
}
exports.BoxImpl = BoxImpl;
function createBoxModule() {
    let nextId = 0;
    const boxes = [];
    return {
        new(left, top, right, bottom, opts) {
            const box = new BoxImpl(nextId++, left, top, right, bottom, opts);
            boxes.push(box);
            return box;
        },
        delete(box) {
            if (!box || typeof box !== 'object')
                return;
            box.delete();
        },
        set_left(box, val) {
            if (!box || typeof box !== 'object')
                return;
            box.set_left(val);
        },
        set_top(box, val) {
            if (!box || typeof box !== 'object')
                return;
            box.set_top(val);
        },
        set_right(box, val) {
            if (!box || typeof box !== 'object')
                return;
            box.set_right(val);
        },
        set_bottom(box, val) {
            if (!box || typeof box !== 'object')
                return;
            box.set_bottom(val);
        },
        set_lefttop(box, left, top) {
            if (!box || typeof box !== 'object')
                return;
            box.set_lefttop(left, top);
        },
        set_rightbottom(box, right, bottom) {
            if (!box || typeof box !== 'object')
                return;
            box.set_rightbottom(right, bottom);
        },
        set_bgcolor(box, val) {
            if (!box || typeof box !== 'object')
                return;
            box.set_bgcolor(val);
        },
        set_border_color(box, val) {
            if (!box || typeof box !== 'object')
                return;
            box.set_border_color(val);
        },
        set_border_width(box, val) {
            if (!box || typeof box !== 'object')
                return;
            box.set_border_width(val);
        },
        set_border_style(box, val) {
            if (!box || typeof box !== 'object')
                return;
            box.set_border_style(val);
        },
        set_extend(box, val) {
            if (!box || typeof box !== 'object')
                return;
            box.set_extend(val);
        },
        set_text(box, val) {
            if (!box || typeof box !== 'object')
                return;
            box.set_text(val);
        },
        set_text_color(box, val) {
            if (!box || typeof box !== 'object')
                return;
            box.set_text_color(val);
        },
        set_text_size(box, val) {
            if (!box || typeof box !== 'object')
                return;
            box.set_text_size(val);
        },
        set_text_halign(box, val) {
            if (!box || typeof box !== 'object')
                return;
            box.set_text_halign(val);
        },
        set_text_valign(box, val) {
            if (!box || typeof box !== 'object')
                return;
            box.set_text_valign(val);
        },
        get_left(box) {
            return box ? box.get_left() : 0;
        },
        get_top(box) {
            return box ? box.get_top() : 0;
        },
        get_right(box) {
            return box ? box.get_right() : 0;
        },
        get_bottom(box) {
            return box ? box.get_bottom() : 0;
        },
        copy(box) {
            const copied = new BoxImpl(nextId++, box.left, box.top, box.right, box.bottom, {
                xloc: box.xloc,
                extend: box.extend,
                bgcolor: box.bgcolor,
                border_color: box.border_color,
                border_width: box.border_width,
                border_style: box.border_style,
                text: box.text,
                text_color: box.text_color,
                text_size: box.text_size,
                text_halign: box.text_halign,
                text_valign: box.text_valign,
            });
            boxes.push(copied);
            return copied;
        },
        get all() {
            return boxes.filter((b) => !b._deleted);
        },
    };
}
//# sourceMappingURL=box.js.map