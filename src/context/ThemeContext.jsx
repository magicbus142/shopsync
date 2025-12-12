import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    // Remove all possible themes first
    root.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    // Also toggle class for tailwind's 'dark' mode if the theme is dark/midnight/nature/sunset
    // You might want to customize which metrics count as 'dark'
    if (['dark', 'midnight', 'nature', 'sunset'].includes(theme)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

  }, [theme]);

  const toggleTheme = (newTheme) => {
    setTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const themes = [
  { name: 'Light', value: 'light' },
  { name: 'Dark', value: 'dark' },
  { name: 'Midnight', value: 'midnight' },
  { name: 'Nature', value: 'nature' },
  { name: 'Sunset', value: 'sunset' },
];
