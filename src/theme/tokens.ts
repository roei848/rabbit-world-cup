export type ThemeKey = 'dark' | 'light';

export interface Theme {
  name: ThemeKey;
  bg: string;
  surface: string;
  surface2: string;
  elevated: string;
  border: string;
  borderHi: string;
  ink: string;
  inkMuted: string;
  inkDim: string;
  yellow: string;
  yellowDim: string;
  yellowTint: string;
  podiumGold: string;
  podiumSilver: string;
  podiumBronze: string;
  up: string;
  down: string;
  flat: string;
  live: string;
  rowYou: string;
  rowYouBd: string;
}

export const BR_THEMES: Record<ThemeKey, Theme> = {
  dark: {
    name: 'dark',
    bg:           '#13110F',
    surface:      '#1C1916',
    surface2:     '#221E1A',
    elevated:     '#2A2520',
    border:       '#2E2823',
    borderHi:     '#3A332C',
    ink:          '#F5F1EA',
    inkMuted:     '#A39B8E',
    inkDim:       '#6E6760',
    yellow:       '#FFD60A',
    yellowDim:    '#C9A300',
    yellowTint:   'rgba(255,214,10,0.10)',
    podiumGold:   '#FFD60A',
    podiumSilver: '#C9C5BC',
    podiumBronze: '#D78A4A',
    up:           '#3DD68C',
    down:         '#F4554A',
    flat:         '#6E6760',
    live:         '#F4554A',
    rowYou:       'rgba(255,214,10,0.08)',
    rowYouBd:     'rgba(255,214,10,0.22)',
  },
  light: {
    name: 'light',
    bg:           '#FAF7F2',
    surface:      '#FFFFFF',
    surface2:     '#F4F0E8',
    elevated:     '#FFFFFF',
    border:       '#E7E1D5',
    borderHi:     '#D4CDBE',
    ink:          '#13110F',
    inkMuted:     '#5C544A',
    inkDim:       '#8A8175',
    yellow:       '#F5C518',
    yellowDim:    '#B88E00',
    yellowTint:   'rgba(245,197,24,0.14)',
    podiumGold:   '#F5C518',
    podiumSilver: '#B6B0A4',
    podiumBronze: '#C97D3F',
    up:           '#1FA56A',
    down:         '#D63A2F',
    flat:         '#8A8175',
    live:         '#D63A2F',
    rowYou:       'rgba(245,197,24,0.16)',
    rowYouBd:     'rgba(245,197,24,0.45)',
  },
};

export interface UserColor {
  bg: string;
  ink: string;
}

export const USER_COLORS: Record<string, UserColor> = {
  pink:   { bg: '#F472B6', ink: '#1A0712' },
  teal:   { bg: '#2DD4BF', ink: '#03201D' },
  orange: { bg: '#FB923C', ink: '#1F0D02' },
  blue:   { bg: '#60A5FA', ink: '#031227' },
  purple: { bg: '#A78BFA', ink: '#100627' },
  red:    { bg: '#F87171', ink: '#220606' },
  green:  { bg: '#4ADE80', ink: '#031F0E' },
};

const USER_COLOR_KEYS = Object.keys(USER_COLORS);

export function colorForName(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return USER_COLOR_KEYS[Math.abs(h) % USER_COLOR_KEYS.length];
}

export const FONTS = {
  display: '"Sora", ui-sans-serif, system-ui, -apple-system, sans-serif',
  body:    '"Inter", ui-sans-serif, system-ui, -apple-system, sans-serif',
  mono:    '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
} as const;
