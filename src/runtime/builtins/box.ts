export interface BoxObject {
  id: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
  xloc: string;
  extend: string;
  bgcolor: string;
  border_color: string;
  border_width: number;
  border_style: string;
  text: string;
  text_color: string;
  text_size: string;
  text_halign: string;
  text_valign: string;
  _deleted: boolean;

  delete(): void;
  set_left(val: number): void;
  set_top(val: number): void;
  set_right(val: number): void;
  set_bottom(val: number): void;
  set_lefttop(left: number, top: number): void;
  set_rightbottom(right: number, bottom: number): void;
  set_bgcolor(val: string): void;
  set_border_color(val: string): void;
  set_border_width(val: number): void;
  set_border_style(val: string): void;
  set_extend(val: string): void;
  set_text(val: string): void;
  set_text_color(val: string): void;
  set_text_size(val: string): void;
  set_text_halign(val: string): void;
  set_text_valign(val: string): void;
  get_left(): number;
  get_top(): number;
  get_right(): number;
  get_bottom(): number;
}

export class BoxImpl implements BoxObject {
  id: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
  xloc: string;
  extend: string;
  bgcolor: string;
  border_color: string;
  border_width: number;
  border_style: string;
  text: string;
  text_color: string;
  text_size: string;
  text_halign: string;
  text_valign: string;
  _deleted: boolean = false;

  constructor(
    id: number,
    left: number,
    top: number,
    right: number,
    bottom: number,
    opts?: {
      xloc?: string;
      extend?: string;
      bgcolor?: string;
      border_color?: string;
      border_width?: number;
      border_style?: string;
      text?: string;
      text_color?: string;
      text_size?: string;
      text_halign?: string;
      text_valign?: string;
    }
  ) {
    const toNum = (v: any) => (v !== null && typeof v === 'object' && typeof (v as any).get === 'function') ? Number((v as any).get(0)) : Number(v);
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

  delete(): void { this._deleted = true; }
  set_left(val: number): void { this.left = Number(val); }
  set_top(val: number): void { this.top = Number(val); }
  set_right(val: number): void { this.right = Number(val); }
  set_bottom(val: number): void { this.bottom = Number(val); }
  set_lefttop(left: number, top: number): void { this.left = Number(left); this.top = Number(top); }
  set_rightbottom(right: number, bottom: number): void { this.right = Number(right); this.bottom = Number(bottom); }
  set_bgcolor(val: string): void { this.bgcolor = String(val); }
  set_border_color(val: string): void { this.border_color = String(val); }
  set_border_width(val: number): void { this.border_width = Number(val); }
  set_border_style(val: string): void { this.border_style = String(val); }
  set_extend(val: string): void { this.extend = String(val); }
  set_text(val: string): void { this.text = String(val); }
  set_text_color(val: string): void { this.text_color = String(val); }
  set_text_size(val: string): void { this.text_size = String(val); }
  set_text_halign(val: string): void { this.text_halign = String(val); }
  set_text_valign(val: string): void { this.text_valign = String(val); }
  get_left(): number { return this.left; }
  get_top(): number { return this.top; }
  get_right(): number { return this.right; }
  get_bottom(): number { return this.bottom; }
}

export function createBoxModule() {
  let nextId = 0;
  const boxes: BoxObject[] = [];

  return {
    new(
      left: number,
      top: number,
      right: number,
      bottom: number,
      opts?: {
        xloc?: string;
        extend?: string;
        bgcolor?: string;
        border_color?: string;
        border_width?: number;
        border_style?: string;
        text?: string;
        text_color?: string;
        text_size?: string;
        text_halign?: string;
        text_valign?: string;
      }
    ): BoxObject {
      const box = new BoxImpl(nextId++, left, top, right, bottom, opts);
      boxes.push(box);
      return box;
    },

    delete(box: BoxObject): void {
      if (!box || typeof box !== 'object') return;
      box.delete();
    },

    set_left(box: BoxObject, val: number): void {
      if (!box || typeof box !== 'object') return;
      box.set_left(val);
    },

    set_top(box: BoxObject, val: number): void {
      if (!box || typeof box !== 'object') return;
      box.set_top(val);
    },

    set_right(box: BoxObject, val: number): void {
      if (!box || typeof box !== 'object') return;
      box.set_right(val);
    },

    set_bottom(box: BoxObject, val: number): void {
      if (!box || typeof box !== 'object') return;
      box.set_bottom(val);
    },

    set_lefttop(box: BoxObject, left: number, top: number): void {
      if (!box || typeof box !== 'object') return;
      box.set_lefttop(left, top);
    },

    set_rightbottom(box: BoxObject, right: number, bottom: number): void {
      if (!box || typeof box !== 'object') return;
      box.set_rightbottom(right, bottom);
    },

    set_bgcolor(box: BoxObject, val: string): void {
      if (!box || typeof box !== 'object') return;
      box.set_bgcolor(val);
    },

    set_border_color(box: BoxObject, val: string): void {
      if (!box || typeof box !== 'object') return;
      box.set_border_color(val);
    },

    set_border_width(box: BoxObject, val: number): void {
      if (!box || typeof box !== 'object') return;
      box.set_border_width(val);
    },

    set_border_style(box: BoxObject, val: string): void {
      if (!box || typeof box !== 'object') return;
      box.set_border_style(val);
    },

    set_extend(box: BoxObject, val: string): void {
      if (!box || typeof box !== 'object') return;
      box.set_extend(val);
    },

    set_text(box: BoxObject, val: string): void {
      if (!box || typeof box !== 'object') return;
      box.set_text(val);
    },

    set_text_color(box: BoxObject, val: string): void {
      if (!box || typeof box !== 'object') return;
      box.set_text_color(val);
    },

    set_text_size(box: BoxObject, val: string): void {
      if (!box || typeof box !== 'object') return;
      box.set_text_size(val);
    },

    set_text_halign(box: BoxObject, val: string): void {
      if (!box || typeof box !== 'object') return;
      box.set_text_halign(val);
    },

    set_text_valign(box: BoxObject, val: string): void {
      if (!box || typeof box !== 'object') return;
      box.set_text_valign(val);
    },

    get_left(box: BoxObject): number {
      return box ? box.get_left() : 0;
    },

    get_top(box: BoxObject): number {
      return box ? box.get_top() : 0;
    },

    get_right(box: BoxObject): number {
      return box ? box.get_right() : 0;
    },

    get_bottom(box: BoxObject): number {
      return box ? box.get_bottom() : 0;
    },

    copy(box: BoxObject): BoxObject {
      const copied = new BoxImpl(
        nextId++,
        box.left,
        box.top,
        box.right,
        box.bottom,
        {
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
        }
      );
      boxes.push(copied);
      return copied;
    },

    get all(): BoxObject[] {
      return boxes.filter((b) => !b._deleted);
    },
  };
}
