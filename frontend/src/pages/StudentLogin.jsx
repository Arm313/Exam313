import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { auth } from '../auth';

export default function StudentLogin({ onLogin }) {
  const [name, setName] = useState(localStorage.getItem('student_name') || '');
  const [group, setGroup] = useState(localStorage.getItem('student_group') || '');
  const [email, setEmail] = useState('');
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.getGroups().then(setGroups).catch(console.error);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!group) return setError('Խնդրում ենք ընտրել խումբը');
    setError(''); setLoading(true);
    try {
      // ✅ Պահպանում ենք անունն ու խումբը հաջորդ մուտքի համար
      localStorage.setItem('student_name', name);
      localStorage.setItem('student_group', group);

      const res = await api.studentLogin(name, group, email);
      auth.setToken(res.token);
      onLogin({ role: res.role, name: res.name, group: res.group, email: res.email });
      navigate('/student/exam');
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
          <Link to="/" className="inline-flex w-16 h-16 bg-brand-500/10 text-brand-500 border border-brand-500/20 rounded-2xl items-center justify-center mx-auto text-2xl">
            <i className="fa-solid fa-user-graduate"></i>
          </Link>
          <h1 className="text-2xl font-bold">Ուսանողի Մուտք</h1>
          <p className="text-xs text-gray-500">Ձեր տվյալները հիշված են</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Անուն Ազգանուն</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Արմեն Պետրոսյան" className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl p-3.5 text-sm focus:outline-none focus:border-brand-500" />
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Խումբ / Դասարան</label>
            <select value={group} onChange={(e) => setGroup(e.target.value)} required className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl p-3.5 text-sm focus:outline-none focus:border-brand-500">
              <option value="">— Ընտրեք խումբը —</option>
              {groups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Email (ոչ պարտադիր)</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="student@example.com" className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl p-3.5 text-sm focus:outline-none focus:border-brand-500" />
          </div>

          {error && <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 text-red-600 p-3 rounded-xl text-xs">{error}</div>}

          <button type="submit" disabled={loading} className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <><i className="fa-solid fa-spinner fa-spin"></i> Մուտք...</> : 'Մուտք գործել'}
          </button>
        </form>
      </div>
    </div>
  );
}