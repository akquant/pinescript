export interface LineObject {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  xloc: string;
  extend: string;
  color: string;
  style: string;
  width: number;
  _deleted: boolean;

  delete(): void;
  set_x1(val: number): void;
  set_y1(val: number): void;
  set_x2(val: number): void;
  set_y2(val: number): void;
  set_xy1(x: number, y: number): void;
  set_xy2(x: number, y: number): void;
  set_xloc(val: string): void;
  set_extend(val: string): void;
  set_color(val: string): void;
  set_style(val: string): void;
  set_width(val: number): void;
  get_x1(): number;
  get_y1(): number;
  get_x2(): number;
  get_y2(): number;
  get_price(x: number): number;
}

const toNum = (v: any) => (v !== null && typeof v === 'object' && typeof (v as any).get === 'function') ? Number((v as any).get(0)) : Number(v);

export class LineImpl implements LineObject {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  xloc: string;
  extend: string;
  color: string;
  style: string;
  width: number;
  _deleted: boolean = false;

  constructor(
    id: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    opts?: {
      xloc?: string;
      extend?: string;
      color?: string;
      style?: string;
      width?: number;
    }
  ) {
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

  delete(): void { this._deleted = true; }
  set_x1(val: number): void { this.x1 = toNum(val); }
  set_y1(val: number): void { this.y1 = toNum(val); }
  set_x2(val: number): void { this.x2 = toNum(val); }
  set_y2(val: number): void { this.y2 = toNum(val); }
  set_xy1(x: number, y: number): void { this.x1 = toNum(x); this.y1 = toNum(y); }
  set_xy2(x: number, y: number): void { this.x2 = toNum(x); this.y2 = toNum(y); }
  set_xloc(val: string): void { this.xloc = String(val); }
  set_extend(val: string): void { this.extend = String(val); }
  set_color(val: string): void { this.color = String(val); }
  set_style(val: string): void { this.style = String(val); }
  set_width(val: number): void { this.width = Number(val); }
  get_x1(): number { return this.x1; }
  get_y1(): number { return this.y1; }
  get_x2(): number { return this.x2; }
  get_y2(): number { return this.y2; }
  get_price(x: number): number {
    const dx = this.x2 - this.x1;
    if (dx === 0) return this.y1;
    const t = (x - this.x1) / dx;
    return this.y1 + t * (this.y2 - this.y1);
  }
}

export function createLineModule() {
  let nextId = 0;
  const lines: LineObject[] = [];

  return {
    new(
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      opts?: {
        xloc?: string;
        extend?: string;
        color?: string;
        style?: string;
        width?: number;
      }
    ): LineObject {
      const line = new LineImpl(nextId++, x1, y1, x2, y2, opts);
      lines.push(line);
      return line;
    },

    delete(line: LineObject): void {
      if (!line || typeof line !== 'object') return;
      line.delete();
    },

    set_x1(line: LineObject, val: number): void {
      if (!line || typeof line !== 'object') return;
      line.set_x1(val);
    },

    set_y1(line: LineObject, val: number): void {
      if (!line || typeof line !== 'object') return;
      line.set_y1(val);
    },

    set_x2(line: LineObject, val: number): void {
      if (!line || typeof line !== 'object') return;
      line.set_x2(val);
    },

    set_y2(line: LineObject, val: number): void {
      if (!line || typeof line !== 'object') return;
      line.set_y2(val);
    },

    set_xy1(line: LineObject, x: number, y: number): void {
      if (!line || typeof line !== 'object') return;
      line.set_xy1(x, y);
    },

    set_xy2(line: LineObject, x: number, y: number): void {
      if (!line || typeof line !== 'object') return;
      line.set_xy2(x, y);
    },

    set_xloc(line: LineObject, val: string): void {
      if (!line || typeof line !== 'object') return;
      line.set_xloc(val);
    },

    set_extend(line: LineObject, val: string): void {
      if (!line || typeof line !== 'object') return;
      line.set_extend(val);
    },

    set_color(line: LineObject, val: string): void {
      if (!line || typeof line !== 'object') return;
      line.set_color(val);
    },

    set_style(line: LineObject, val: string): void {
      if (!line || typeof line !== 'object') return;
      line.set_style(val);
    },

    set_width(line: LineObject, val: number): void {
      if (!line || typeof line !== 'object') return;
      line.set_width(val);
    },

    get_x1(line: LineObject): number {
      return line ? line.get_x1() : 0;
    },

    get_y1(line: LineObject): number {
      return line ? line.get_y1() : 0;
    },

    get_x2(line: LineObject): number {
      return line ? line.get_x2() : 0;
    },

    get_y2(line: LineObject): number {
      return line ? line.get_y2() : 0;
    },

    get_price(line: LineObject, x: number): number {
      return line ? line.get_price(x) : 0;
    },

    copy(line: LineObject): LineObject {
      const copied = new LineImpl(
        nextId++,
        line.x1,
        line.y1,
        line.x2,
        line.y2,
        {
          xloc: line.xloc,
          extend: line.extend,
          color: line.color,
          style: line.style,
          width: line.width,
        }
      );
      lines.push(copied);
      return copied;
    },

    get all(): LineObject[] {
      return lines.filter((l) => !l._deleted);
    },
  };
}
