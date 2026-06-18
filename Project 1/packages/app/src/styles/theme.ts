import { createTheme, ThemeOptions } from '@mui/material/styles';

export const NEXUS_COLORS = {
  navyDark:     '#0D2137',
  navyMid:      '#1A3A5C',
  navyLight:    '#2E5F8A',
  electricBlue: '#1B6EF3',
  blueHover:    '#1459CC',
  emerald:      '#00C48C',
  emeraldDark:  '#00A073',
  amber:        '#FFB020',
  redAlert:     '#FF4B4B',
  redDark:      '#D93636',
  white:        '#FFFFFF',
  gray50:       '#F8FAFC',
  gray100:      '#F1F5F9',
  gray200:      '#E2E8F0',
  gray400:      '#94A3B8',
  gray600:      '#475569',
  gray900:      '#0F172A',
  chart: ['#1B6EF3', '#00C48C', '#FFB020', '#FF4B4B', '#8B5CF6', '#F59E0B', '#06B6D4'],
};

export const DARK_COLORS = {
  bg:       '#0A0F1E',
  surface:  '#111827',
  card:     '#1A2235',
  border:   '#1F2D40',
  text:     '#E2E8F0',
  subtext:  '#94A3B8',
};

const getThemeOptions = (mode: 'light' | 'dark'): ThemeOptions => ({
  palette: {
    mode,
    primary: {
      main:         NEXUS_COLORS.electricBlue,
      dark:         NEXUS_COLORS.blueHover,
      contrastText: NEXUS_COLORS.white,
    },
    secondary: {
      main:         NEXUS_COLORS.emerald,
      contrastText: NEXUS_COLORS.white,
    },
    success: { main: NEXUS_COLORS.emerald,   dark: NEXUS_COLORS.emeraldDark },
    warning: { main: NEXUS_COLORS.amber },
    error:   { main: NEXUS_COLORS.redAlert,  dark: NEXUS_COLORS.redDark },
    background: {
      default: mode === 'dark' ? DARK_COLORS.bg      : NEXUS_COLORS.gray50,
      paper:   mode === 'dark' ? DARK_COLORS.card    : NEXUS_COLORS.white,
    },
    text: {
      primary:   mode === 'dark' ? DARK_COLORS.text    : NEXUS_COLORS.gray900,
      secondary: mode === 'dark' ? DARK_COLORS.subtext : NEXUS_COLORS.gray600,
    },
    divider: mode === 'dark' ? DARK_COLORS.border : NEXUS_COLORS.gray200,
  },
  typography: {
    fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
    h1: { fontSize: '2.5rem',  fontWeight: 700, lineHeight: 1.2 },
    h2: { fontSize: '2rem',    fontWeight: 700 },
    h3: { fontSize: '1.5rem',  fontWeight: 600 },
    h4: { fontSize: '1.25rem', fontWeight: 600 },
    h5: { fontSize: '1.1rem',  fontWeight: 600 },
    h6: { fontSize: '1rem',    fontWeight: 600 },
    body1:  { fontSize: '0.9375rem', lineHeight: 1.6 },
    body2:  { fontSize: '0.875rem',  lineHeight: 1.5 },
    button: { fontWeight: 600, textTransform: 'none' },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8, padding: '10px 20px', fontWeight: 600, boxShadow: 'none', '&:hover': { boxShadow: 'none' } },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: mode === 'dark' ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
          border: `1px solid ${mode === 'dark' ? DARK_COLORS.border : NEXUS_COLORS.gray100}`,
          background: mode === 'dark' ? DARK_COLORS.card : NEXUS_COLORS.white,
        },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'small' },
      styleOverrides: {
        root: { '& .MuiOutlinedInput-root': { borderRadius: 8 } },
      },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 6, fontWeight: 500 } },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: mode === 'dark' ? DARK_COLORS.surface : '#fff',
          borderBottom: `1px solid ${mode === 'dark' ? DARK_COLORS.border : NEXUS_COLORS.gray100}`,
          boxShadow: 'none',
        },
      },
    },
  },
});

export const nexusTheme      = createTheme(getThemeOptions('light'));
export const nexusThemeDark  = createTheme(getThemeOptions('dark'));
export const CHART_COLORS    = NEXUS_COLORS.chart;
