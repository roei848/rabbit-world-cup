import { createContext, useContext, useState, type ReactNode } from 'react';
import { BR_THEMES, type Theme, type ThemeKey } from './tokens';

interface ThemeContextValue {
  theme: Theme;
  themeKey: ThemeKey;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeKey, setThemeKey] = useState<ThemeKey>('dark');

  const toggleTheme = () =>
    setThemeKey((k) => (k === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme: BR_THEMES[themeKey], themeKey, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
