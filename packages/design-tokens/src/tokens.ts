// Rocha's Surf School design system tokens. Source: .docs/designs/design-system.html.
// This file is the single source of truth for web and mobile; tokens.css is generated from it.

export const colors = {
  light: {
    page: '#FDF8F3',
    surface: '#FEFCF9',
    dim: 'rgba(245,230,211,.45)',
    sand: '#F5E6D3',
    ink: '#3D2E1F',
    ink2: '#6B5744',
    ink3: '#B8A99A',
    grape: '#4B2A63',
    sun: '#F0742B',
    sun2: '#D95F1B',
    lagoon: '#21837F',
    sky: '#7BA7BC',
    tan: '#D4A574',
    line: 'rgba(212,165,116,.28)',
    input: '#FFFFFF',
    inputLine: '#E3D3BC',
    ok: '#4CAF7D',
    okTint: 'rgba(76,175,125,.15)',
    bad: '#D4574A',
    badTint: 'rgba(212,87,74,.14)',
    warn: '#E8B44A',
    warnTint: 'rgba(232,180,74,.16)',
    infoTint: 'rgba(33,131,127,.13)',
    onColor: '#FFFFFF',
    shadow: 'rgba(61,46,31,.10)',
    shadowSun: 'rgba(240,116,43,.28)',
  },
  dark: {
    page: '#161B27',
    surface: '#212736',
    dim: 'rgba(46,52,68,.55)',
    sand: '#2E3444',
    ink: '#F0E6D8',
    ink2: '#9B8E7E',
    ink3: '#5A5248',
    grape: '#7A4E9B',
    sun: '#F58A45',
    sun2: '#E07330',
    lagoon: '#3FA6A0',
    sky: '#8BB8CC',
    tan: '#C49A6C',
    line: 'rgba(196,154,108,.14)',
    input: '#1B2130',
    inputLine: '#3E4555',
    ok: '#5BC48A',
    okTint: 'rgba(91,196,138,.16)',
    bad: '#E8706A',
    badTint: 'rgba(232,112,106,.16)',
    warn: '#F0C45A',
    warnTint: 'rgba(240,196,90,.16)',
    infoTint: 'rgba(63,166,160,.16)',
    onColor: '#FFFFFF',
    shadow: 'rgba(0,0,0,.4)',
    shadowSun: 'rgba(245,138,69,.3)',
  },
} as const;

export type ColorScheme = keyof typeof colors;
export type ColorToken = keyof typeof colors.light;

export const fontFamilies = {
  // Titles, times, percentages and grades. Always weight 700 for numbers.
  display: 'Barlow Condensed',
  // Body copy and spaced uppercase labels.
  body: 'Nunito',
} as const;

export type FontRole = keyof typeof fontFamilies;

// Weights the apps load for each family.
export const fontWeights = {
  display: [400, 500, 600, 700],
  body: [400, 600, 700, 800],
} as const;

// letterSpacing is in em, as in the design file; multiply by fontSize for React Native.
export const typography = {
  // The school name stacked over the sign-in photo.
  wordmark: { font: 'display', weight: 700, size: 104, lineHeight: 0.84, letterSpacing: -0.01, uppercase: true },
  kpi: { font: 'display', weight: 700, size: 52, lineHeight: 0.9, letterSpacing: 0, uppercase: false },
  lessonTime: { font: 'display', weight: 700, size: 38, lineHeight: 1, letterSpacing: 0, uppercase: false },
  screenTitle: { font: 'display', weight: 700, size: 34, lineHeight: 1, letterSpacing: 0, uppercase: true },
  screenTitleWithBack: { font: 'display', weight: 700, size: 26, lineHeight: 1, letterSpacing: 0, uppercase: true },
  sheetTitle: { font: 'display', weight: 700, size: 30, lineHeight: 1, letterSpacing: 0, uppercase: true },
  body: { font: 'body', weight: 400, size: 14.5, lineHeight: 1.6, letterSpacing: 0, uppercase: false },
  listTitle: { font: 'body', weight: 700, size: 14, lineHeight: 1.4, letterSpacing: 0, uppercase: false },
  listSubtitle: { font: 'body', weight: 400, size: 11.5, lineHeight: 1.4, letterSpacing: 0, uppercase: false },
  sectionLabel: { font: 'body', weight: 800, size: 11, lineHeight: 1.4, letterSpacing: 0.1, uppercase: true },
  button: { font: 'display', weight: 700, size: 18, lineHeight: 1.2, letterSpacing: 0.03, uppercase: false },
  chip: { font: 'body', weight: 800, size: 10.5, lineHeight: 1.3, letterSpacing: 0.07, uppercase: true },
} as const;

export type TypographyVariant = keyof typeof typography;

export const radii = {
  control: 16, // buttons, inputs
  card: 20,
  sheet: 28, // top corners of bottom sheets
  pill: 9999,
} as const;

export const spacing = {
  screen: 20, // screen side margin
  cardGap: 12,
  groupGap: 22,
} as const;

// Minimum size for icon buttons, list rows and calendar days.
export const touchTarget = 44;

export const elevation = {
  iconButton: { offsetY: 2, blur: 8, color: 'shadow' },
  card: { offsetY: 3, blur: 12, color: 'shadow' },
  primary: { offsetY: 8, blur: 20, color: 'shadowSun' },
} as const satisfies Record<string, { offsetY: number; blur: number; color: ColorToken }>;

// Lucide icons, stroke 2.
export const iconSizes = {
  bar: 22, // tab bar and headers
  list: 19,
  chip: 12,
} as const;
