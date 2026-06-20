import { createTheme, alpha } from '@mui/material/styles';

export const MC_COLORS = {
  teal: {
    50: '#e0f7f7',
    100: '#b2ebeb',
    200: '#80dcdc',
    300: '#4dcecd',
    400: '#26c2c0',
    500: '#0d7377',
    600: '#0a6368',
    700: '#075358',
    800: '#044448',
    900: '#022e30',
  },
  emerald: {
    50: '#e8f5e9',
    100: '#c8e6c9',
    200: '#a5d6a7',
    300: '#81c784',
    400: '#66bb6a',
    500: '#14a44d',
    600: '#109640',
    700: '#0c7833',
    800: '#085a26',
    900: '#043c1a',
  },
  clinical: {
    white: '#f8fafc',
    lightGray: '#f1f5f9',
    borderGray: '#e2e8f0',
    textGray: '#64748b',
    darkGray: '#1e293b',
  },
  status: {
    critical: '#dc2626',
    warning: '#d97706',
    stable: '#16a34a',
    info: '#2563eb',
    pending: '#7c3aed',
  },
};

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: MC_COLORS.teal[500], light: MC_COLORS.teal[300], dark: MC_COLORS.teal[700], contrastText: '#ffffff' },
    secondary: { main: MC_COLORS.emerald[500], light: MC_COLORS.emerald[300], dark: MC_COLORS.emerald[700], contrastText: '#ffffff' },
    error: { main: MC_COLORS.status.critical },
    warning: { main: MC_COLORS.status.warning },
    success: { main: MC_COLORS.status.stable },
    info: { main: MC_COLORS.status.info },
    background: { default: MC_COLORS.clinical.lightGray, paper: '#ffffff' },
    text: { primary: MC_COLORS.clinical.darkGray, secondary: MC_COLORS.clinical.textGray },
    divider: MC_COLORS.clinical.borderGray,
  },
  typography: {
    fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
    h1: { fontWeight: 700, letterSpacing: '-0.025em' },
    h2: { fontWeight: 700, letterSpacing: '-0.02em' },
    h3: { fontWeight: 600, letterSpacing: '-0.015em' },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
    body1: { lineHeight: 1.6 },
    body2: { lineHeight: 1.5 },
    caption: { color: MC_COLORS.clinical.textGray },
    button: { fontWeight: 600, textTransform: 'none', letterSpacing: '0.01em' },
  },
  shape: { borderRadius: 10 },
  shadows: [
    'none',
    '0 1px 2px 0 rgba(0,0,0,0.05)',
    '0 1px 3px 0 rgba(0,0,0,0.1),0 1px 2px -1px rgba(0,0,0,0.1)',
    '0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -2px rgba(0,0,0,0.1)',
    '0 10px 15px -3px rgba(0,0,0,0.1),0 4px 6px -4px rgba(0,0,0,0.1)',
    '0 20px 25px -5px rgba(0,0,0,0.1),0 8px 10px -6px rgba(0,0,0,0.1)',
    ...Array(19).fill('none'),
  ] as never,
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8, padding: '8px 20px', fontWeight: 600 },
        containedPrimary: {
          background: `linear-gradient(135deg, ${MC_COLORS.teal[500]} 0%, ${MC_COLORS.teal[700]} 100%)`,
          '&:hover': { background: `linear-gradient(135deg, ${MC_COLORS.teal[400]} 0%, ${MC_COLORS.teal[600]} 100%)` },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: `1px solid ${MC_COLORS.clinical.borderGray}`,
          boxShadow: '0 1px 3px 0 rgba(0,0,0,0.05)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500, fontSize: '0.75rem' },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'small' },
    },
    MuiTableHead: {
      styleOverrides: {
        root: { backgroundColor: MC_COLORS.clinical.lightGray },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 600, color: MC_COLORS.clinical.textGray, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { boxShadow: `0 1px 0 ${MC_COLORS.clinical.borderGray}`, backgroundColor: '#ffffff', color: MC_COLORS.clinical.darkGray },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { borderRight: `1px solid ${MC_COLORS.clinical.borderGray}` },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 4, height: 6 },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 10 },
      },
    },
  },
});

export const darkTheme = createTheme({
  ...lightTheme,
  palette: {
    mode: 'dark',
    primary: { main: MC_COLORS.teal[400], light: MC_COLORS.teal[200], dark: MC_COLORS.teal[600], contrastText: '#ffffff' },
    secondary: { main: MC_COLORS.emerald[400], light: MC_COLORS.emerald[200], dark: MC_COLORS.emerald[600], contrastText: '#ffffff' },
    error: { main: '#f87171' },
    warning: { main: '#fbbf24' },
    success: { main: '#4ade80' },
    background: { default: '#0f172a', paper: '#1e293b' },
    text: { primary: '#f1f5f9', secondary: '#94a3b8' },
    divider: alpha('#ffffff', 0.1),
  },
});
