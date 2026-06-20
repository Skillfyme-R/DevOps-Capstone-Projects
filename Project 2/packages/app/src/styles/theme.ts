import { createTheme, ThemeOptions, alpha } from '@mui/material/styles';

export const VV_COLORS = {
  violetDeep:   '#2D1B69',
  violetMid:    '#6C3DE0',
  violetLight:  '#9B72F5',
  violetPastel: '#F0EBFF',
  violetGlow:   '#6C3DE033',

  coral:        '#FF5C5C',
  coralDark:    '#D94040',
  coralLight:   '#FF8C8C',

  emerald:      '#10B981',
  emeraldDark:  '#059669',
  emeraldLight: '#34D399',

  amber:        '#F59E0B',
  amberDark:    '#D97706',

  white:        '#FFFFFF',
  slate50:      '#F8FAFC',
  slate100:     '#F1F5F9',
  slate200:     '#E2E8F0',
  slate300:     '#CBD5E1',
  slate400:     '#94A3B8',
  slate600:     '#475569',
  slate700:     '#334155',
  slate800:     '#1E293B',
  slate900:     '#0F172A',

  chart: ['#6C3DE0', '#10B981', '#FF5C5C', '#F59E0B', '#3B82F6', '#EC4899', '#14B8A6', '#8B5CF6'],
};

export const DARK_COLORS = {
  bg:      '#090714',
  surface: '#100D22',
  card:    '#17133A',
  cardHover: '#1E1848',
  border:  '#2A2356',
  text:    '#EEF0F6',
  subtext: '#8B93B0',
};

const getThemeOptions = (mode: 'light' | 'dark'): ThemeOptions => ({
  palette: {
    mode,
    primary: {
      main:         VV_COLORS.violetMid,
      light:        VV_COLORS.violetLight,
      dark:         VV_COLORS.violetDeep,
      contrastText: '#FFFFFF',
    },
    secondary: {
      main:         VV_COLORS.coral,
      dark:         VV_COLORS.coralDark,
      light:        VV_COLORS.coralLight,
      contrastText: '#FFFFFF',
    },
    success: { main: VV_COLORS.emerald,  dark: VV_COLORS.emeraldDark, light: VV_COLORS.emeraldLight },
    warning: { main: VV_COLORS.amber,    dark: VV_COLORS.amberDark },
    error:   { main: VV_COLORS.coral,    dark: VV_COLORS.coralDark },
    background: {
      default: mode === 'dark' ? DARK_COLORS.bg      : '#F6F7FB',
      paper:   mode === 'dark' ? DARK_COLORS.card    : '#FFFFFF',
    },
    text: {
      primary:   mode === 'dark' ? DARK_COLORS.text    : VV_COLORS.slate800,
      secondary: mode === 'dark' ? DARK_COLORS.subtext : VV_COLORS.slate600,
    },
    divider: mode === 'dark' ? DARK_COLORS.border : VV_COLORS.slate200,
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: { fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1 },
    h2: { fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.15 },
    h3: { fontWeight: 700, letterSpacing: '-0.02em' },
    h4: { fontWeight: 700, letterSpacing: '-0.01em' },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    body1: { lineHeight: 1.65 },
    body2: { lineHeight: 1.6 },
    button: { fontWeight: 600, textTransform: 'none', letterSpacing: '0.01em' },
    caption: { letterSpacing: '0.02em' },
  },
  shape: { borderRadius: 14 },
  shadows: [
    'none',
    '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
    '0 4px 12px rgba(0,0,0,0.07)',
    '0 8px 24px rgba(0,0,0,0.08)',
    '0 12px 32px rgba(0,0,0,0.10)',
    '0 16px 40px rgba(0,0,0,0.12)',
    '0 20px 48px rgba(0,0,0,0.14)',
    '0 24px 56px rgba(0,0,0,0.16)',
    '0 28px 64px rgba(0,0,0,0.18)',
    '0 32px 72px rgba(0,0,0,0.20)',
    '0 36px 80px rgba(0,0,0,0.22)',
    '0 40px 88px rgba(0,0,0,0.24)',
    '0 44px 96px rgba(0,0,0,0.26)',
    '0 48px 104px rgba(0,0,0,0.28)',
    '0 52px 112px rgba(0,0,0,0.30)',
    '0 56px 120px rgba(0,0,0,0.32)',
    '0 60px 128px rgba(0,0,0,0.34)',
    '0 64px 136px rgba(0,0,0,0.36)',
    '0 68px 144px rgba(0,0,0,0.38)',
    '0 72px 152px rgba(0,0,0,0.40)',
    '0 76px 160px rgba(0,0,0,0.42)',
    '0 80px 168px rgba(0,0,0,0.44)',
    '0 84px 176px rgba(0,0,0,0.46)',
    '0 88px 184px rgba(0,0,0,0.48)',
    '0 92px 192px rgba(0,0,0,0.50)',
  ] as any,
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': {
            background: mode === 'dark' ? DARK_COLORS.border : VV_COLORS.slate300,
            borderRadius: 3,
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '9px 22px',
          fontWeight: 600,
          transition: 'all 0.2s ease',
          '&:hover': { transform: 'translateY(-1px)' },
          '&:active': { transform: 'translateY(0)' },
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${VV_COLORS.violetLight} 0%, ${VV_COLORS.violetMid} 40%, ${VV_COLORS.violetDeep} 100%)`,
          boxShadow: `0 4px 14px ${alpha(VV_COLORS.violetMid, 0.35)}`,
          '&:hover': {
            background: `linear-gradient(135deg, ${VV_COLORS.violetMid} 0%, ${VV_COLORS.violetDeep} 100%)`,
            boxShadow: `0 6px 20px ${alpha(VV_COLORS.violetMid, 0.45)}`,
          },
        },
        containedSecondary: {
          background: `linear-gradient(135deg, ${VV_COLORS.coralLight} 0%, ${VV_COLORS.coral} 100%)`,
          boxShadow: `0 4px 14px ${alpha(VV_COLORS.coral, 0.35)}`,
          '&:hover': {
            background: `linear-gradient(135deg, ${VV_COLORS.coral} 0%, ${VV_COLORS.coralDark} 100%)`,
            boxShadow: `0 6px 20px ${alpha(VV_COLORS.coral, 0.45)}`,
          },
        },
        outlinedPrimary: {
          borderWidth: '1.5px',
          '&:hover': { borderWidth: '1.5px', background: alpha(VV_COLORS.violetMid, 0.06) },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          boxShadow: mode === 'dark'
            ? '0 4px 24px rgba(0,0,0,0.35), 0 1px 4px rgba(0,0,0,0.2)'
            : '0 2px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
          border: `1px solid ${mode === 'dark' ? DARK_COLORS.border : VV_COLORS.slate200}`,
          transition: 'box-shadow 0.2s ease, transform 0.2s ease',
          '&:hover': {
            boxShadow: mode === 'dark'
              ? '0 8px 32px rgba(0,0,0,0.45)'
              : '0 8px 28px rgba(0,0,0,0.10)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 600, fontSize: '0.75rem' },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            transition: 'box-shadow 0.2s',
            '&.Mui-focused': {
              boxShadow: `0 0 0 3px ${alpha(VV_COLORS.violetMid, 0.15)}`,
            },
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 6, height: 6 },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: { fontWeight: 700 },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: mode === 'dark'
            ? `linear-gradient(180deg, ${DARK_COLORS.surface} 0%, ${DARK_COLORS.bg} 100%)`
            : '#FFFFFF',
        },
      },
    },
  },
});

const buildTheme = (mode: 'light' | 'dark') => createTheme(getThemeOptions(mode));

export const vvTheme     = buildTheme('light');
export const vvThemeDark = buildTheme('dark');
