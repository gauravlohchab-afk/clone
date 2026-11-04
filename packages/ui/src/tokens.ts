/**
 * Design tokens: the single source for web (via theme.css) and mobile
 * (imported directly into the NativeWind/RN theme).
 */
export const palette = {
  lime: { 300: '#D3FF94', 400: '#C4FF6E', 500: '#B6FF4A', 600: '#8FD41F', 700: '#5E8F0A' },
  violet: { 300: '#B3A3FF', 400: '#9480FF', 500: '#7558FF', 600: '#5B3FE0', 700: '#4129B0' },
  coral: { 300: '#FFA597', 400: '#FF7F6C', 500: '#FF5C45', 600: '#E03E28', 700: '#B02A17' },
  ink: { 950: '#0B0C12', 900: '#11131C', 800: '#1A1D29', 700: '#262A3A', 600: '#3A3F54', 500: '#5A6078', 400: '#8A90A8' },
  paper: { 50: '#FBFAF7', 100: '#F4F3EF', 200: '#E9E7E0', 300: '#D9D6CC', 400: '#B8B4A7' },
} as const;

/** Semantic roles per theme. Text/background pairs are checked for WCAG AA in tests. */
export const themes = {
  dark: {
    bg: palette.ink[900],
    surface: palette.ink[800],
    surfaceRaised: palette.ink[700],
    border: palette.ink[600],
    text: palette.paper[100],
    textMuted: palette.ink[400],
    primary: palette.lime[500],
    onPrimary: palette.ink[900],
    link: palette.lime[500],
    secondary: palette.violet[400],
    danger: palette.coral[400],
    focus: palette.violet[400],
  },
  light: {
    bg: palette.paper[100],
    surface: palette.paper[50],
    surfaceRaised: '#FFFFFF',
    border: palette.paper[300],
    text: palette.ink[900],
    textMuted: palette.ink[500],
    primary: palette.lime[500],
    onPrimary: palette.ink[900],
    link: palette.violet[600],
    secondary: palette.violet[600],
    danger: palette.coral[700],
    focus: palette.violet[600],
  },
} as const;
export type ThemeName = keyof typeof themes;

export const typography = {
  display: "'Space Grotesk Variable', 'Space Grotesk', system-ui, sans-serif",
  body: "'Inter Variable', 'Inter', system-ui, sans-serif",
  scale: { xs: 12, sm: 14, base: 16, lg: 18, xl: 22, '2xl': 28, '3xl': 36, '4xl': 48, '5xl': 64 },
} as const;

export const radii = { sm: 6, md: 10, lg: 16, pill: 999 } as const;
export const spacing = { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 } as const;
/** Minimum touch target in px (WCAG 2.5.8 recommends 24, platforms recommend 44-48). */
export const minTouchTarget = 44;
export const motion = { fast: 120, base: 200, slow: 320, easing: [0.2, 0.8, 0.2, 1] } as const;
