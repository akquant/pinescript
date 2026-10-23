"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LabelImpl = void 0;
exports.createLabelModule = createLabelModule;
const toNum = (v) => (v !== null && typeof v === 'object' && typeof v.get === 'function') ? Number(v.get(0)) : Number(v);
class LabelImpl {
    id;
    x;
    y;
    xloc;
    yloc;
    text;
    tooltip;
    color;
    textcolor;
    style;
    size;
    textalign;
    _deleted = false;
    constructor(id, x, y, text, opts) {
        this.id = id;
        this.x = toNum(x);
        this.y = toNum(y);
        this.text = String(text ?? '');
        this.xloc = opts?.xloc ?? 'bar_index';
        this.yloc = opts?.yloc ?? 'price';
        this.color = opts?.color ?? '#2962FF';
        this.textcolor = opts?.textcolor ?? '#FFFFFF';
        this.style = opts?.style ?? 'label_down';
        this.size = opts?.size ?? 'normal';
        this.textalign = opts?.textalign ?? 'center';
        this.tooltip = opts?.tooltip ?? '';
    }
    delete() { this._deleted = true; }
    set_x(val) { this.x = toNum(val); }
    set_y(val) { this.y = toNum(val); }
    set_xy(x, y) { this.x = toNum(x); this.y = toNum(y); }
    set_xloc(val) { this.xloc = String(val); }
    set_yloc(val) { this.yloc = String(val); }
    set_text(val) { this.text = String(val); }
    set_tooltip(val) { this.tooltip = String(val); }
    set_color(val) { this.color = String(val); }
    set_textcolor(val) { this.textcolor = String(val); }
    set_size(val) { this.size = String(val); }
    set_style(val) { this.style = String(val); }
    set_textalign(val) { this.textalign = String(val); }
    get_x() { return this.x; }
    get_y() { return this.y; }
    get_text() { return this.text; }
}
exports.LabelImpl = LabelImpl;
function createLabelModule() {
    let nextId = 0;
    const labels = [];
    return {
        new(x, y, text, opts) {
            const label = new LabelImpl(nextId++, x, y, text, opts);
            labels.push(label);
            return label;
        },
        delete(label) {
            if (!label || typeof label !== 'object')
                return;
            label.delete();
        },
        set_x(label, val) {
            if (!label || typeof label !== 'object')
                return;
            label.set_x(val);
        },
        set_y(label, val) {
            if (!label || typeof label !== 'object')
                return;
            label.set_y(val);
        },
        set_xy(label, x, y) {
            if (!label || typeof label !== 'object')
                return;
            label.set_xy(x, y);
        },
        set_xloc(label, val) {
            if (!label || typeof label !== 'object')
                return;
            label.set_xloc(val);
        },
        set_yloc(label, val) {
            if (!label || typeof label !== 'object')
                return;
            label.set_yloc(val);
        },
        set_text(label, val) {
            if (!label || typeof label !== 'object')
                return;
            label.set_text(val);
        },
        set_tooltip(label, val) {
            if (!label || typeof label !== 'object')
                return;
            label.set_tooltip(val);
        },
        set_color(label, val) {
            if (!label || typeof label !== 'object')
                return;
            label.set_color(val);
        },
        set_textcolor(label, val) {
            if (!label || typeof label !== 'object')
                return;
            label.set_textcolor(val);
        },
        set_style(label, val) {
            if (!label || typeof label !== 'object')
                return;
            label.set_style(val);
        },
        set_size(label, val) {
            if (!label || typeof label !== 'object')
                return;
            label.set_size(val);
        },
        set_textalign(label, val) {
            if (!label || typeof label !== 'object')
                return;
            label.set_textalign(val);
        },
        get_x(label) {
            return label ? label.get_x() : 0;
        },
        get_y(label) {
            return label ? label.get_y() : 0;
        },
        get_text(label) {
            return label ? label.get_text() : '';
        },
        copy(label) {
            const copied = new LabelImpl(nextId++, label.x, label.y, label.text, {
                xloc: label.xloc,
                yloc: label.yloc,
                color: label.color,
                textcolor: label.textcolor,
                style: label.style,
                size: label.size,
                textalign: label.textalign,
                tooltip: label.tooltip,
            });
            labels.push(copied);
            return copied;
        },
        get all() {
            return labels.filter((l) => !l._deleted);
        },
    };
}
//# sourceMappingURL=label.js.map