import React, { createContext, useContext, useState, ReactNode } from 'react'

type ThemeMode = 'dark' | 'amoled'

interface ThemeContextValue {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(
    (localStorage.getItem('fluxstream_theme') as ThemeMode) || 'dark'
  )

  const handleSetMode = (newMode: ThemeMode) => {
    localStorage.setItem('fluxstream_theme', newMode)
    setMode(newMode)
  }

  return (
    <ThemeContext.Provider value={{ mode, setMode: handleSetMode }}>
      <div data-theme={mode} style={{ minHeight: '100vh' }}>
        {children}
      </div>
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
