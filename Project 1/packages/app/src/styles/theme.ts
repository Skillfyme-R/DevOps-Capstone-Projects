/**
 * NexusFinance Design System — Theme
 *
 * All colors, fonts, spacing, shadows, and component overrides live here.
 * Change this file to rebrand the entire application.
 *
 * Color Philosophy:
 *   - Primary:   Deep Navy (#0D2137)  — trustworthy, professional banking
 *   - Secondary: Electric Blue (#1B6EF3) — modern, digital-first
 *   - Accent:    Emerald (#00C48C)    — positive (profit, growth, success)
 *   - Error:     Red (#FF4B4B)        — losses, failures, alerts
 *   - Warning:   Amber (#FFB020)      — caution, pending states
 */

import { createTheme, ThemeOptions } from '@mui/material/styles';

const NEXUS_COLORS = {
  navyDark:     '#0D2137',    // Primary — deep trust navy
  navyMid:      '#1A3A5C',
  navyLight:    '#2E5F8A',
  electricBlue: '#1B6EF3',    // Secondary — action / interactive
  blueHover:    '#1459CC',
  emerald:      '#00C48C',    // Positive — profit / success / gain
  emeraldDark:  '#00A073',
  amber:        '#FFB020',    // Warning — pending / caution
  redAlert:     '#FF4B4B',    // Negative — loss / error / danger
  redDark:      '#D93636',
  // Neutral palette
  white:        '#FFFFFF',
  gray50:       '#F8FAFC',
  gray100:      '#F1F5F9',
  gray200:      '#E2E8F0',
  gray400:      '#94A3B8',
  gray600:      '#475569',
  gray900:      '#0F172A',
  // Chart colors (for data visualization)
  chart: ['#1B6EF3', '#00C48C', '#FFB020', '#FF4B4B', '#8B5CF6', '#F59E0B', '#06B6D4'],
};

const themeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main:        NEXUS_COLORS.navyDark,
      light:       NEXUS_COLORS.navyMid,
      dark:        '#071827',
      contrastText: NEXUS_COLORS.white,
    },
    secondary: {
      main:        NEXUS_COLORS.electricBlue,
      dark:        NEXUS_COLORS.blueHover,
      contrastText: NEXUS_COLORS.white,
    },
    success: {
      main:  NEXUS_COLORS.emerald,
      dark:  NEXUS_COLORS.emeraldDark,
    },
    warning: {
      main: NEXUS_COLORS.amber,
    },
    error: {
      main: NEXUS_COLORS.redAlert,
      dark: NEXUS_COLORS.redDark,
    },
    background: {
      default: NEXUS_COLORS.gray50,    // Page background — off-white
      paper:   NEXUS_COLORS.white,     // Card background — pure white
    },
    text: {
      primary:   NEXUS_COLORS.gray900,
      secondary: NEXUS_COLORS.gray600,
      disabled:  NEXUS_COLORS.gray400,
    },
    divider: NEXUS_COLORS.gray200,
  },

  typography: {
    fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
    h1: { fontSize: '2.5rem',  fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em' },
    h2: { fontSize: '2rem',    fontWeight: 700, lineHeight: 1.25 },
    h3: { fontSize: '1.5rem',  fontWeight: 600, lineHeight: 1.3 },
    h4: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.35 },
    h5: { fontSize: '1.1rem',  fontWeight: 600 },
    h6: { fontSize: '1rem',    fontWeight: 600 },
    body1:    { fontSize: '0.9375rem', lineHeight: 1.6 },
    body2:    { fontSize: '0.875rem',  lineHeight: 1.5, color: NEXUS_COLORS.gray600 },
    caption:  { fontSize: '0.75rem',   color: NEXUS_COLORS.gray400 },
    overline: { fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' },
    button:   { fontWeight: 600, letterSpacing: '0.01em', textTransform: 'none' }, // No ALL CAPS buttons
  },

  shape: {
    borderRadius: 12,  // Rounded corners throughout (modern FinTech look)
  },

  shadows: [
    'none',
    '0 1px 2px rgba(0,0,0,0.05)',
    '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
    '0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)',
    '0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)',
    '0 20px 25px rgba(0,0,0,0.1), 0 10px 10px rgba(0,0,0,0.04)',
    ...Array(19).fill('none'),
  ] as any,

  // Override default MUI component styles globally
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 20px',
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${NEXUS_COLORS.electricBlue} 0%, ${NEXUS_COLORS.navyMid} 100%)`,
          '&:hover': {
            background: `linear-gradient(135deg, ${NEXUS_COLORS.blueHover} 0%, ${NEXUS_COLORS.navyDark} 100%)`,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
          border: `1px solid ${NEXUS_COLORS.gray100}`,
        },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'small' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            backgroundColor: NEXUS_COLORS.white,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 6, fontWeight: 500 },
      },
    },
  },
};

export const nexusTheme = createTheme(themeOptions);

// Export colors for use in charts and custom components
export const CHART_COLORS = NEXUS_COLORS.chart;
export { NEXUS_COLORS };
