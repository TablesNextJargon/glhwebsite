// Runs in _document's head before first paint, outside the React hydration root.
export const themeInitializationScript = [
  "(function(){var theme;try{theme=localStorage.getItem('theme')}catch(_){}",
  "var dark=theme==='dark'||(theme!=='light'&&typeof matchMedia==='function'&&",
  "matchMedia('(prefers-color-scheme: dark)').matches);",
  "document.documentElement.classList.toggle('dark',dark)})();",
].join('');
