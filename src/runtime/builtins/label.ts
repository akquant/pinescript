export interface LabelObject {
  id: number;
  x: number;
  y: number;
  xloc: string;
  yloc: string;
  text: string;
  tooltip: string;
  color: string;
  textcolor: string;
  style: string;
  size: string;
  textalign: string;
  _deleted: boolean;

  delete(): void;
  set_x(val: number): void;
  set_y(val: number): void;
  set_xy(x: number, y: number): void;
  set_xloc(val: string): void;
  set_yloc(val: string): void;
  set_text(val: string): void;
  set_tooltip(val: string): void;
  set_color(val: string): void;
  set_textcolor(val: string): void;
  set_size(val: string): void;
  set_style(val: string): void;
  set_textalign(val: string): void;
  get_x(): number;
  get_y(): number;
  get_text(): string;
}

const toNum = (v: any) => (v !== null && typeof v === 'object' && typeof (v as any).get === 'function') ? Number((v as any).get(0)) : Number(v);

export class LabelImpl implements LabelObject {
  id: number;
  x: number;
  y: number;
  xloc: string;
  yloc: string;
  text: string;
  tooltip: string;
  color: string;
  textcolor: string;
  style: string;
  size: string;
  textalign: string;
  _deleted: boolean = false;

  constructor(
    id: number,
    x: number,
    y: number,
    text: string,
    opts?: {
      xloc?: string;
      yloc?: string;
      color?: string;
      textcolor?: string;
      style?: string;
      size?: string;
      textalign?: string;
      tooltip?: string;
    }
  ) {
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

  delete(): void { this._deleted = true; }
  set_x(val: number): void { this.x = toNum(val); }
  set_y(val: number): void { this.y = toNum(val); }
  set_xy(x: number, y: number): void { this.x = toNum(x); this.y = toNum(y); }
  set_xloc(val: string): void { this.xloc = String(val); }
  set_yloc(val: string): void { this.yloc = String(val); }
  set_text(val: string): void { this.text = String(val); }
  set_tooltip(val: string): void { this.tooltip = String(val); }
  set_color(val: string): void { this.color = String(val); }
  set_textcolor(val: string): void { this.textcolor = String(val); }
  set_size(val: string): void { this.size = String(val); }
  set_style(val: string): void { this.style = String(val); }
  set_textalign(val: string): void { this.textalign = String(val); }
  get_x(): number { return this.x; }
  get_y(): number { return this.y; }
  get_text(): string { return this.text; }
}

export function createLabelModule() {
  let nextId = 0;
  const labels: LabelObject[] = [];

  return {
    new(
      x: number,
      y: number,
      text: string,
      opts?: {
        xloc?: string;
        yloc?: string;
        color?: string;
        textcolor?: string;
        style?: string;
        size?: string;
        textalign?: string;
        tooltip?: string;
      }
    ): LabelObject {
      const label = new LabelImpl(nextId++, x, y, text, opts);
      labels.push(label);
      return label;
    },

    delete(label: LabelObject): void {
      if (!label || typeof label !== 'object') return;
      label.delete();
    },

    set_x(label: LabelObject, val: number): void {
      if (!label || typeof label !== 'object') return;
      label.set_x(val);
    },

    set_y(label: LabelObject, val: number): void {
      if (!label || typeof label !== 'object') return;
      label.set_y(val);
    },

    set_xy(label: LabelObject, x: number, y: number): void {
      if (!label || typeof label !== 'object') return;
      label.set_xy(x, y);
    },

    set_xloc(label: LabelObject, val: string): void {
      if (!label || typeof label !== 'object') return;
      label.set_xloc(val);
    },

    set_yloc(label: LabelObject, val: string): void {
      if (!label || typeof label !== 'object') return;
      label.set_yloc(val);
    },

    set_text(label: LabelObject, val: string): void {
      if (!label || typeof label !== 'object') return;
      label.set_text(val);
    },

    set_tooltip(label: LabelObject, val: string): void {
      if (!label || typeof label !== 'object') return;
      label.set_tooltip(val);
    },

    set_color(label: LabelObject, val: string): void {
      if (!label || typeof label !== 'object') return;
      label.set_color(val);
    },

    set_textcolor(label: LabelObject, val: string): void {
      if (!label || typeof label !== 'object') return;
      label.set_textcolor(val);
    },

    set_style(label: LabelObject, val: string): void {
      if (!label || typeof label !== 'object') return;
      label.set_style(val);
    },

    set_size(label: LabelObject, val: string): void {
      if (!label || typeof label !== 'object') return;
      label.set_size(val);
    },

    set_textalign(label: LabelObject, val: string): void {
      if (!label || typeof label !== 'object') return;
      label.set_textalign(val);
    },

    get_x(label: LabelObject): number {
      return label ? label.get_x() : 0;
    },

    get_y(label: LabelObject): number {
      return label ? label.get_y() : 0;
    },

    get_text(label: LabelObject): string {
      return label ? label.get_text() : '';
    },

    copy(label: LabelObject): LabelObject {
      const copied = new LabelImpl(
        nextId++,
        label.x,
        label.y,
        label.text,
        {
          xloc: label.xloc,
          yloc: label.yloc,
          color: label.color,
          textcolor: label.textcolor,
          style: label.style,
          size: label.size,
          textalign: label.textalign,
          tooltip: label.tooltip,
        }
      );
      labels.push(copied);
      return copied;
    },

    get all(): LabelObject[] {
      return labels.filter((l) => !l._deleted);
    },
  };
}
