export const BASE = {
  cream:       '#F8F3E9',
  creamDark:   '#EDE8DB',
  creamDarker: '#E0D9C8',
  ink:         '#1A1A1A',
  inkSoft:     '#3D3D3D',
  inkMuted:    '#6B6B6B',
  inkFaint:    '#6E6E6E',
  white:       '#FFFFFF',
}

export type Accent = {
  name: string
  hex: string
  month: number
}

export const ACCENTS: Accent[] = [
  { name: 'Oxblood',    hex: '#8B1A1A', month: 1  },
  { name: 'Blush',      hex: '#C07070', month: 2  },
  { name: 'Sage',       hex: '#5C8C6B', month: 3  },
  { name: 'Amber',      hex: '#B8902A', month: 4  },
  { name: 'Celadon',    hex: '#5C9E9A', month: 5  },
  { name: 'Indigo',     hex: '#3D5A8C', month: 6  },
  { name: 'Ochre',      hex: '#C47B20', month: 7  },
  { name: 'Terracotta', hex: '#B85C38', month: 8  },
  { name: 'Mauve',      hex: '#7D5C8C', month: 9  },
  { name: 'Rust',       hex: '#A83C20', month: 10 },
  { name: 'Slate',      hex: '#4A6E7E', month: 11 },
  { name: 'Forest',     hex: '#2E6B45', month: 12 },
]

export const FONTS = {
  serif: 'Fraunces, Georgia, "Times New Roman", serif',
  ui:    '"Hanken Grotesk", "Neue Haas Grotesk", Helvetica, sans-serif',
  mono:  '"IBM Plex Mono", "Commit Mono", "Courier New", monospace',
}

export const MOTION = {
  hover:   '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  flip:    '420ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  enter:   '300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  shuffle: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
}

export const CARD = {
  radius:         '12px',
  padding:        '24px',
  stripeHeight:   '5px',
  width:          '300px',
  minHeight:      '380px',
  shadow:         '0 2px 8px rgba(26,26,46,0.10), 0 1px 3px rgba(26,26,46,0.06)',
  shadowHover:    '0 12px 32px rgba(26,26,46,0.18), 0 4px 8px rgba(26,26,46,0.10)',
  hoverTransform: 'rotate(2deg) translateY(-6px)',
}

export function accentForMonth(month: number): Accent {
  return ACCENTS.find(a => a.month === month) ?? ACCENTS[0]
}
