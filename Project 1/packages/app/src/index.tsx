import React, { createContext, useContext, useState, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { App }                            from './App';
import { nexusTheme, nexusThemeDark }     from './styles/theme';

// Dark mode context — lets any component read/toggle dark mode
interface ThemeModeCtx { isDark: boolean; toggle: () => void }
export const ThemeModeContext = createContext<ThemeModeCtx>({ isDark: false, toggle: () => {} });
export const useThemeMode = () => useContext(ThemeModeContext);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            0,
      cacheTime:            60_000,
      retry:                2,
      refetchOnWindowFocus: true,
      refetchOnMount:       true,
    },
    mutations: { retry: 0 },
  },
});

function Root() {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('nexus-theme') === 'dark');
  const toggle = () => setIsDark(prev => {
    const next = !prev;
    localStorage.setItem('nexus-theme', next ? 'dark' : 'light');
    return next;
  });
  const ctx = useMemo(() => ({ isDark, toggle }), [isDark]);

  return (
    <ThemeModeContext.Provider value={ctx}>
      <ThemeProvider theme={isDark ? nexusThemeDark : nexusTheme}>
        <CssBaseline />
        <BrowserRouter>
          <App />
          <ToastContainer
            position="top-right"
            autoClose={4000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            pauseOnHover
            theme={isDark ? 'dark' : 'light'}
          />
        </BrowserRouter>
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<React.StrictMode><QueryClientProvider client={queryClient}><Root /></QueryClientProvider></React.StrictMode>);
