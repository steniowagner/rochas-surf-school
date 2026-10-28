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
    grapeTint: 'rgba(75,42,99,.14)',
    // The 50-89% cell of the weekly occupancy map.
    sunTint: 'rgba(240,116,43,.28)',
    onColor: '#FFFFFF',
    shadow: 'rgba(61,46,31,.10)',
    shadowSun: 'rgba(240,116,43,.28)',
    // The sport filter (AGENDA-01B): the backdrop that dims the screen while its options are open, and the button's
    // grape shadow.
    scrim: 'rgba(24,16,10,.28)',
    shadowGrape: 'rgba(75,42,99,.34)',
    // The student's Agenda band (AGENDA-01 / 01A): behind the user header and the calendar, with a line under it.
    band: '#F3E7D6',
    bandLine: 'rgba(212,165,116,.35)',
    // The grape card of a class under way ("Minhas aulas", PAINEL-03): white and black veils over grape for its chips and
    // borders, the location pill, the occupancy track and the students footer, and the "full" text.
    onGrapeTint: 'rgba(255,255,255,.18)',
    onGrapeFill: 'rgba(255,255,255,.12)',
    onGrapeTrack: 'rgba(255,255,255,.22)',
    onGrapeShade: 'rgba(0,0,0,.14)',
    onGrapeBad: '#FFD2CC',
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
    grapeTint: 'rgba(122,78,155,.24)',
    sunTint: 'rgba(245,138,69,.3)',
    onColor: '#FFFFFF',
    shadow: 'rgba(0,0,0,.4)',
    shadowSun: 'rgba(245,138,69,.3)',
    scrim: 'rgba(0,0,0,.45)',
    shadowGrape: 'rgba(0,0,0,.4)',
    band: '#101520',
    bandLine: 'rgba(196,154,108,.16)',
    onGrapeTint: 'rgba(255,255,255,.18)',
    onGrapeFill: 'rgba(255,255,255,.12)',
    onGrapeTrack: 'rgba(255,255,255,.22)',
    onGrapeShade: 'rgba(0,0,0,.14)',
    onGrapeBad: '#FFD2CC',
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
  dayNumber: { font: 'display', weight: 700, size: 26, lineHeight: 1, letterSpacing: 0, uppercase: false },
  lessonTime: { font: 'display', weight: 700, size: 38, lineHeight: 1, letterSpacing: 0, uppercase: false },
  screenTitle: { font: 'display', weight: 700, size: 34, lineHeight: 1, letterSpacing: 0, uppercase: true },
  screenTitleWithBack: { font: 'display', weight: 700, size: 22, lineHeight: 1, letterSpacing: 0, uppercase: true },
  sheetTitle: { font: 'display', weight: 700, size: 30, lineHeight: 1, letterSpacing: 0, uppercase: true },
  body: { font: 'body', weight: 400, size: 14.5, lineHeight: 1.6, letterSpacing: 0, uppercase: false },
  listTitle: { font: 'body', weight: 700, size: 14, lineHeight: 1.4, letterSpacing: 0, uppercase: false },
  listSubtitle: { font: 'body', weight: 400, size: 11.5, lineHeight: 1.4, letterSpacing: 0, uppercase: false },
  sectionLabel: { font: 'body', weight: 800, size: 11, lineHeight: 1.4, letterSpacing: 0.1, uppercase: true },
  button: { font: 'display', weight: 700, size: 18, lineHeight: 1.2, letterSpacing: 0.03, uppercase: true },
  // The location pill and the occupancy line of a class card (AGENDA-01).
  cardMeta: { font: 'body', weight: 400, size: 12.5, lineHeight: 1.3, letterSpacing: 0, uppercase: false },
  // The "N/M spots" line under the time of a class card.
  occupancy: { font: 'body', weight: 800, size: 11, lineHeight: 1.4, letterSpacing: 0, uppercase: false },
  // The percentages, "canc." and times of the weekly occupancy map.
  occupancyCell: { font: 'display', weight: 700, size: 15, lineHeight: 1.2, letterSpacing: 0, uppercase: false },
  chip: { font: 'body', weight: 800, size: 10.5, lineHeight: 1.3, letterSpacing: 0.07, uppercase: true },
  // The pill that switches the week and month calendar (AGENDA-01 / 01A).
  pill: { font: 'body', weight: 800, size: 12.5, lineHeight: 1.3, letterSpacing: 0.06, uppercase: true },
  // The day numbers of the week row (a little larger than AGENDA-01's 22, as the user asked) and of the month grid.
  calendarDay: { font: 'display', weight: 700, size: 24, lineHeight: 1, letterSpacing: 0, uppercase: false },
  calendarMonthDay: { font: 'display', weight: 700, size: 19, lineHeight: 1, letterSpacing: 0, uppercase: false },
  // The user header of the home tabs (PAINEL-01): the time-of-day greeting over the person's name.
  greeting: { font: 'body', weight: 400, size: 12, lineHeight: 1.4, letterSpacing: 0, uppercase: false },
  greetingName: { font: 'display', weight: 700, size: 24, lineHeight: 1, letterSpacing: 0, uppercase: true },
  // The confirm sheet of a notice (PAINEL-07A): the line under the sheet title, and the notice's title and message in
  // the preview card.
  sheetDescription: { font: 'body', weight: 400, size: 13.5, lineHeight: 1.55, letterSpacing: 0, uppercase: false },
  previewTitle: { font: 'body', weight: 800, size: 14.5, lineHeight: 1.55, letterSpacing: 0, uppercase: false },
  previewBody: { font: 'body', weight: 400, size: 14, lineHeight: 1.55, letterSpacing: 0, uppercase: false },
  // The count over a header button's icon; its 16px line is the pill's height, so the digits sit centered.
  // The labels of the tab bar.
  tabBarLabel: { font: 'display', weight: 700, size: 12, lineHeight: 1.2, letterSpacing: 0.08, uppercase: true },
  badge: { font: 'body', weight: 800, size: 9, lineHeight: 1.78, letterSpacing: 0, uppercase: false },
} as const;

export type TypographyVariant = keyof typeof typography;

export const radii = {
  checkbox: 8, // checkbox box
  iconButton: 12, // small bordered icon buttons, such as a rule's move up / down
  control: 16, // buttons, inputs
  occupancyCell: 10, // the weekly occupancy map's cells
  swatch: 3, // the legend's color swatches
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
  // The floating sport filter button and its options (AGENDA-01B).
  fab: { offsetY: 12, blur: 26, color: 'shadowGrape' },
  menuOption: { offsetY: 8, blur: 22, color: 'shadow' },
} as const satisfies Record<string, { offsetY: number; blur: number; color: ColorToken }>;

// Lucide icons, stroke 2.
export const iconSizes = {
  bar: 22, // tab bar and headers
  list: 19,
  chip: 12,
  button: 18, // glyph before a button label
  errorState: 38, // inside the error state's badge
  emptyState: 42, // inside the empty state's tile
} as const;
