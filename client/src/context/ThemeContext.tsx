import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type AppTheme = 'dark' | 'light' | 'navy';
export type AppFont = 'sans' | 'display' | 'serif' | 'mono';

interface ThemeContextType {
  theme: AppTheme;
  font: AppFont;
  setTheme: (theme: AppTheme) => void;
  setFont: (font: AppFont) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    const saved = localStorage.getItem('app_theme');
    if (saved === 'dark' || saved === 'light' || saved === 'navy') return saved as AppTheme;
    return 'dark';
  });

  const [font, setFontState] = useState<AppFont>(() => {
    const saved = localStorage.getItem('app_font');
    if (saved === 'sans' || saved === 'display' || saved === 'serif' || saved === 'mono') return saved as AppFont;
    return 'sans';
  });

  useEffect(() => {
    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('theme-dark', 'theme-light', 'theme-navy', 'dark', 'light');
    root.classList.add(`theme-${theme}`);
    root.setAttribute('data-theme', theme);
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.add('dark');
    }
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('font-sans-modern', 'font-display-outfit', 'font-serif-academic', 'font-tech-mono');
    root.setAttribute('data-font', font);
    document.body.setAttribute('data-font', font);
    
    switch (font) {
      case 'display': root.classList.add('font-display-outfit'); break;
      case 'serif': root.classList.add('font-serif-academic'); break;
      case 'mono': root.classList.add('font-tech-mono'); break;
      case 'sans':
      default: root.classList.add('font-sans-modern'); break;
    }
    localStorage.setItem('app_font', font);
  }, [font]);

  const toggleTheme = () => {
    const themes: AppTheme[] = ['dark', 'navy', 'light'];
    const nextIdx = (themes.indexOf(theme) + 1) % themes.length;
    setThemeState(themes[nextIdx]);
  };

  const setTheme = (newTheme: AppTheme) => setThemeState(newTheme);
  const setFont = (newFont: AppFont) => setFontState(newFont);

  return (
    <ThemeContext.Provider value={{ theme, font, setTheme, setFont, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
