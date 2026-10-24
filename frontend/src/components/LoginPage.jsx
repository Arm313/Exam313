import { useState } from 'react';
import { api } from '../api';
import { auth } from '../auth';

export default function LoginPage({ onLogin }) {
  const [mode, setMode] = useState('student'); // 'student' | 'admin'
  const [name, setName] = useState('');
  const [group, setGroup] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = mode === 'admin'
        ? await api.adminLogin(password)
        : await api.studentLogin(name, group);
      auth.setToken(res.token);
      onLogin({ role: res.role, name: res.name, group: res.group });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-dark-card border border-dark-border rounded-3xl p-8 space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded-2xl flex items-center justify-center mx-auto text-2xl">
            <i className="fa-solid fa-graduation-cap"></i>
          </div>
          <h1 className="text-2xl font-bold">EduExam <span className="text-brand-400">Pro</span></h1>
          <p className="text-xs text-gray-400">Մուտք գործեք համակարգ</p>
        </div>

        {/* Role switcher */}
        <div className="grid grid-cols-2 gap-2 bg-dark-bg p-1.5 rounded-xl border border-dark-border">
          <button type="button" onClick={() => { setMode('student'); setError(''); }}
            className={`py-2 rounded-lg text-sm font-semibold transition-all ${
              mode === 'student' ? 'bg-brand-600 text-white' : 'text-gray-400'
            }`}>
            <i className="fa-solid fa-user-graduate mr-1.5"></i>Ուսանող
          </button>
          <button type="button" onClick={() => { setMode('admin'); setError(''); }}
            className={`py-2 rounded-lg text-sm font-semibold transition-all ${
              mode === 'admin' ? 'bg-brand-600 text-white' : 'text-gray-400'
            }`}>
            <i className="fa-solid fa-user-shield mr-1.5"></i>Ադմին
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === 'student' ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Անուն Ազգանուն</label>
                <input value={name} onChange={e => setName(e.target.value)} required
                  placeholder="Արմեն Պետրոսյան"
                  className="w-full bg-dark-bg border border-dark-border text-white rounded-xl p-3.5 text-sm focus:outline-none focus:border-brand-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Խումբ / Դասարան</label>
                <input value={group} onChange={e => setGroup(e.target.value)} required
                  placeholder="Ինֆորմատիկա-31"
                  className="w-full bg-dark-bg border border-dark-border text-white rounded-xl p-3.5 text-sm focus:outline-none focus:border-brand-500" />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Ադմին Գաղտնաբառ</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="••••••••"
                className="w-full bg-dark-bg border border-dark-border text-white rounded-xl p-3.5 text-sm focus:outline-none focus:border-brand-500" />
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-xs">
              <i className="fa-solid fa-circle-exclamation mr-1.5"></i>{error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl text-sm transition-colors">
            {loading ? <i className="fa-solid fa-spinner fa-spin mr-2"></i> : <i className="fa-solid fa-right-to-bracket mr-2"></i>}
            Մուտք
          </button>
        </form>

        <p className="text-[10px] text-center text-gray-500">
          Ուսանողները մուտք են գործում անուն+խմբով: Ադմինը՝ գաղտնաբառով:
        </p>
      </div>
    </div>
  );
}