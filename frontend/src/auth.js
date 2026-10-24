const KEY = 'eduexam_token';
const USER_KEY = 'eduexam_user';

export const auth = {
  getToken: () => localStorage.getItem(KEY),
  setToken: (t) => localStorage.setItem(KEY, t),
  getUser: () => {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; }
  },
  setUser: (u) => localStorage.setItem(USER_KEY, JSON.stringify(u)),
  clear: () => {
    localStorage.removeItem(KEY);
    localStorage.removeItem(USER_KEY);
  },
  isLoggedIn: () => !!localStorage.getItem(KEY),
};