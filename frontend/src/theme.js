const KEY = 'eduexam_theme';

export const theme = {
  get: () => localStorage.getItem(KEY) || 'dark',
  set: (t) => {
    localStorage.setItem(KEY, t);
    applyTheme(t);
  },
  toggle: () => {
    const next = theme.get() === 'dark' ? 'light' : 'dark';
    theme.set(next);
    return next;
  },
};

export function applyTheme(t) {
  const html = document.documentElement;
  html.classList.remove('dark', 'light');
  html.classList.add(t);
  document.body.className = t === 'dark'
    ? 'bg-dark-bg text-gray-100'
    : 'bg-gray-50 text-gray-900';
}

// Apply on load
if (typeof window !== 'undefined') {
  applyTheme(theme.get());
}