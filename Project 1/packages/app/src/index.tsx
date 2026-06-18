/**
 * NexusFinance Frontend — Application Bootstrap
 *
 * This is the entry point React calls first.
 * It wraps the whole app in:
 *   - QueryClientProvider  → enables data fetching with react-query
 *   - ThemeProvider        → applies NexusFinance brand colors and typography
 *   - BrowserRouter        → enables client-side URL navigation
 *   - ToastContainer       → renders notifications anywhere in the app
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { App }           from './App';
import { nexusTheme }    from './styles/theme';

// Configure react-query defaults
// These settings apply to ALL data fetching in the app
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            0,       // Always refetch — balances must be live
      cacheTime:            60_000,  // Keep in memory for 1 minute
      retry:                2,
      refetchOnWindowFocus: true,
      refetchOnMount:       true,
    },
    mutations: {
      retry: 0, // Never auto-retry mutations (payments, transfers — user must re-confirm)
    },
  },
});

const rootElement = document.getElementById('root')!;
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    {/* StrictMode runs every component twice in development to catch side effects */}
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={nexusTheme}>
        <CssBaseline /> {/* Normalize CSS across browsers */}
        <BrowserRouter>
          <App />
          <ToastContainer
            position="top-right"
            autoClose={4000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            pauseOnHover
            theme="light"
          />
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
