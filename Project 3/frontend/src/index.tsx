import React, { createContext, useContext, useState, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from 'react-query';
import { lightTheme, darkTheme } from './styles/theme';
import App from './App';

interface ThemeContextValue { isDark: boolean; toggle: () => void; }
export const ThemeModeContext = createContext<ThemeContextValue>({ isDark: false, toggle: () => {} });
export const useThemeMode = () => useContext(ThemeModeContext);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30000, cacheTime: 60000, retry: 1, refetchOnWindowFocus: false },
  },
});

function Root() {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('mc-theme') === 'dark');
  const ctx = useMemo(() => ({
    isDark,
    toggle: () => setIsDark((d: boolean) => { const next = !d; localStorage.setItem('mc-theme', next ? 'dark' : 'light'); return next; }),
  }), [isDark]);

  return (
    <ThemeModeContext.Provider value={ctx}>
      <ThemeProvider theme={isDark ? darkTheme : lightTheme}>
        <CssBaseline />
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><Root /></React.StrictMode>);
