import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { auth } from '../auth';



export default function AdminLogin({ onLogin }) {
    
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

    useEffect(() => {
    const user = auth.getUser();
    if (user && (user.role === 'admin' || user.role === 'super')) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.adminLogin(username, password);
      auth.setToken(res.token);
      onLogin({ role: res.role, username: res.username, name: res.name });
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-3xl p-8 space-y-6 shadow-xl">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-block w-16 h-16 bg-purple-500/10 text-purple-500 border border-purple-500/20 rounded-2xl flex items-center justify-center mx-auto text-2xl">
            <i className="fa-solid fa-user-shield"></i>
          </Link>
          <h1 className="text-2xl font-bold">Ադմինի Մուտք</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Մուտք գործեք կառավարման վահանակ</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase">
              Մուտքանուն
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              placeholder="admin"
              className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl p-3.5 text-sm focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase">
              Գաղտնաբառ
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl p-3.5 text-sm focus:outline-none focus:border-purple-500"
            />
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 p-3 rounded-xl text-xs">
              <i className="fa-solid fa-circle-exclamation mr-1.5"></i>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl text-sm transition-colors"
          >
            {loading ? (
              <i className="fa-solid fa-spinner fa-spin mr-2"></i>
            ) : (
              <i className="fa-solid fa-right-to-bracket mr-2"></i>
            )}
            Մուտք
          </button>
        </form>

        <div className="text-center">
          <Link to="/student/login" className="text-xs text-gray-500 dark:text-gray-400 hover:text-brand-500">
            Ուսանող եք? → Ուսանողի մուտք
          </Link>
        </div>
      </div>
    </div>
  );
}