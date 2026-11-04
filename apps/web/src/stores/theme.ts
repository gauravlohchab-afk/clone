export type Theme = 'system' | 'light' | 'dark';

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;
  try {
    if (theme === 'system') localStorage.removeItem('vyro-theme');
    else localStorage.setItem('vyro-theme', theme);
  } catch {
    /* storage unavailable: theme still applies for this visit */
  }
}
