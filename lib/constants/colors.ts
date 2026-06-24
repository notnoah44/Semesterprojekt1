// Static color tokens — these mirror sitterTheme (default at runtime).
// For role-aware colors, use useAppTheme() from @/lib/contexts/ThemeContext.
// (The legacy lavender palette that previously lived here has been removed
// since ThemeContext only ever returned sitterTheme / hostTheme.)

export const colors = {
  // Backgrounds
  background:       '#FBF8F0',   // warm cream
  surface:          '#FFFFFF',
  surfaceVariant:   '#E2F0DA',   // warm pastel sage
  surfaceDim:       '#D2E5C9',

  // Primary — soft sage
  primary:          '#6DB88E',
  primaryLight:     '#A8D6BB',
  primaryContainer: '#C5E8C9',
  onPrimary:        '#FFFFFF',
  onPrimaryContainer: '#0A3D1F',

  // Secondary — teal
  secondary:        '#6BAAB2',
  secondaryContainer: '#C2E4E8',
  onSecondary:      '#FFFFFF',

  // Tertiary — olive
  tertiary:         '#9AAD78',
  tertiaryContainer: '#D8E8C0',

  // Text
  text:             '#1C1B1F',
  textMuted:        '#49454F',
  textSubtle:       '#79747E',

  // Borders
  border:           '#C9E2BF',
  borderMuted:      '#ADCD9F',

  // States
  success:          '#4CAF7D',
  successContainer: '#C5E8C9',
  warning:          '#E8A838',
  warningContainer: '#FFF0C8',
  error:            '#C0627A',
  errorContainer:   '#FFDAD6',
  onError:          '#FFFFFF',
} as const;

export type ColorKey = keyof typeof colors;
