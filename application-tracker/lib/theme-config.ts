// Kept out of theme.tsx because that file is a client module: the server
// layout needs THEME_INIT_SCRIPT as a real string, not a client reference.

export const THEME_MODES = ['system', 'light', 'dark'] as const
export type ThemeMode = (typeof THEME_MODES)[number]

export const ACCENTS = ['indigo', 'emerald', 'sky', 'rose', 'amber'] as const
export type Accent = (typeof ACCENTS)[number]

// The light-mode fill of each accent, used for the swatches on the settings page.
export const ACCENT_SWATCHES: Record<Accent, string> = {
  indigo: '#4338ca',
  emerald: '#047857',
  sky: '#0369a1',
  rose: '#be123c',
  amber: '#b45309',
}

export const THEME_MODE_KEY = 'app-theme'
export const ACCENT_KEY = 'app-accent'
export const DARK_QUERY = '(prefers-color-scheme: dark)'

export function isThemeMode(value: unknown): value is ThemeMode {
  return THEME_MODES.includes(value as ThemeMode)
}

export function isAccent(value: unknown): value is Accent {
  return ACCENTS.includes(value as Accent)
}

// Runs in <head> before first paint so a saved theme never flashes the wrong
// palette. Must stay dependency-free and tolerate blocked storage.
export const THEME_INIT_SCRIPT = `(function(){
  var root = document.documentElement, mode = null, accent = null;
  try {
    mode = localStorage.getItem(${JSON.stringify(THEME_MODE_KEY)});
    accent = localStorage.getItem(${JSON.stringify(ACCENT_KEY)});
  } catch (e) {}
  var dark = mode === 'dark' || (mode !== 'light' && window.matchMedia(${JSON.stringify(DARK_QUERY)}).matches);
  root.setAttribute('data-theme', dark ? 'dark' : 'light');
  if (accent) root.setAttribute('data-accent', accent);
})();`
