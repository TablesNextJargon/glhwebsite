import { useEffect } from 'react';

export default function ThemeProvider({ children }) {
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const updateTheme = () => {
      let theme;
      try { theme = window.localStorage.getItem('theme'); } catch {}
      document.documentElement.classList.toggle('dark',
        theme === 'dark' || (theme !== 'light' && mediaQuery.matches));
    };

    // Set initial theme
    updateTheme();

    // Listen for changes
    mediaQuery.addEventListener('change', updateTheme);
    window.addEventListener('storage', updateTheme);

    // Cleanup
    return () => {
      mediaQuery.removeEventListener('change', updateTheme);
      window.removeEventListener('storage', updateTheme);
    };
  }, []);

  return children;
}
