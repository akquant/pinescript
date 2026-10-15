import { isNa } from './na';

export const colorConstants: Record<string, string> = {
  red: '#ef4444',
  green: '#4CAF50',
  blue: '#3b82f6',
  orange: '#FF9800',
  purple: '#a855f7',
  yellow: '#FFEB3B',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#787B86',
  silver: '#B2B5BE',
  maroon: '#880E4F',
  olive: '#808000',
  lime: '#00E676',
  teal: '#00897B',
  navy: '#311B92',
  fuchsia: '#E040FB',
  aqua: '#00BCD4',
};

export function parseColorToRgba(c: string): [number, number, number, number] {
  if (!c || typeof c !== 'string') return [0, 0, 0, 1];
  const known = colorConstants[c.toLowerCase()];
  if (known) c = known;

  if (c.startsWith('#')) {
    let hex = c.slice(1);
    if (hex.length === 3) hex = hex.split('').map((x) => x + x).join('');
    if (hex.length === 6) {
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
        1,
      ];
    }
    if (hex.length === 8) {
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
        parseInt(hex.slice(6, 8), 16) / 255,
      ];
    }
  }

  const rgbaMatch = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbaMatch) {
    return [
      parseInt(rgbaMatch[1], 10),
      parseInt(rgbaMatch[2], 10),
      parseInt(rgbaMatch[3], 10),
      rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1,
    ];
  }

  return [0, 0, 0, 1];
}

export function colorNew(baseColor: string, transparency: number = 0): string {
  if (baseColor === undefined || baseColor === null || isNa(baseColor as any)) {
    return 'transparent';
  }
  const alpha = Math.max(0, Math.min(100, transparency));
  const alphaHex = Math.round((1 - alpha / 100) * 255).toString(16).padStart(2, '0');
  const strColor = typeof baseColor === 'string' ? baseColor : String(baseColor);
  const hex = colorConstants[strColor.toLowerCase()] ?? strColor;
  if (typeof hex === 'string' && hex.startsWith('#') && hex.length === 7) {
    return hex + alphaHex;
  }
  const [r, g, b] = parseColorToRgba(hex);
  return `rgba(${r},${g},${b},${(1 - alpha / 100).toFixed(2)})`;
}

export function rgb(r: number, g: number, b: number, transparency: number = 0): string {
  const alpha = Math.max(0, Math.min(1, 1 - transparency / 100));
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${alpha.toFixed(2)})`;
}

export function r(c: string): number {
  return parseColorToRgba(c)[0];
}

export function g(c: string): number {
  return parseColorToRgba(c)[1];
}

export function b(c: string): number {
  return parseColorToRgba(c)[2];
}

export function t(c: string): number {
  const a = parseColorToRgba(c)[3];
  return Math.round((1 - a) * 100);
}

export function fromGradient(
  value: number,
  bottom_value: number,
  top_value: number,
  bottom_color: string,
  top_color: string
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return bottom_color ?? '#000000';
  }
  const range = top_value - bottom_value;
  let factor = range === 0 ? 0.5 : (value - bottom_value) / range;
  factor = Math.max(0, Math.min(1, factor));

  const [r1, g1, b1, a1] = parseColorToRgba(bottom_color);
  const [r2, g2, b2, a2] = parseColorToRgba(top_color);

  const resR = Math.round(r1 + factor * (r2 - r1));
  const resG = Math.round(g1 + factor * (g2 - g1));
  const resB = Math.round(b1 + factor * (b2 - b1));
  const resA = a1 + factor * (a2 - a1);

  return `rgba(${resR},${resG},${resB},${resA.toFixed(2)})`;
}

export const color = new Proxy(
  {
    ...colorConstants,
    new: colorNew,
    colorNew,
    rgb,
    r,
    g,
    b,
    t,
    fromGradient,
    from_gradient: fromGradient,
  } as Record<string, unknown>,
  {
    get(target, prop: string) {
      return target[prop];
    },
  }
);
