import { useState, useEffect } from 'react';
import { api } from './api.js';
import { auth } from './auth.js';
import LoginPage from './components/LoginPage.jsx';
import StudentView from './components/StudentView.jsx';
import AdminView from './components/AdminView.jsx';
import ResultsView from './components/ResultsView.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('exam'); // for admin: exam | results

  useEffect(() => {
    if (!auth.isLoggedIn()) { setLoading(false); return; }
    api.me().then(u => setUser(u)).catch(() => auth.clear()).finally(() => setLoading(false));
  }, []);

  const logout = () => { auth.clear(); setUser(null); };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <i className="fa-solid fa-spinner fa-spin text-3xl text-brand-500"></i>
    </div>;
  }

  if (!user) return <LoginPage onLogin={setUser} />;

  const isAdmin = user.role === 'admin';

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-dark-card border-b border-dark-border sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-brand-600 text-white p-2.5 rounded-xl">
              <i className="fa-solid fa-graduation-cap text-xl"></i>
            </div>
            <div>
              <h1 className="text-lg font-bold">
                EduExam <span className="text-xs bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded-full">Pro</span>
              </h1>
              <p className="text-[11px] text-gray-400">
                {isAdmin ? 'Ադմին' : `${user.name} (${user.group})`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <nav className="flex items-center gap-1 bg-dark-bg p-1.5 rounded-xl border border-dark-border">
                <button onClick={() => setTab('exam')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    tab === 'exam' ? 'bg-brand-600 text-white' : 'text-gray-400'
                  }`}>
                  <i className="fa-solid fa-pen-to-square mr-1"></i>Խմբագրում
                </button>
                <button onClick={() => setTab('results')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    tab === 'results' ? 'bg-brand-600 text-white' : 'text-gray-400'
                  }`}>
                  <i className="fa-solid fa-chart-line mr-1"></i>Արդյունքներ
                </button>
              </nav>
            )}
            <button onClick={logout}
              className="px-3 py-2 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20">
              <i className="fa-solid fa-right-from-bracket mr-1"></i>Ելք
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {isAdmin && tab === 'exam' && <AdminView />}
        {isAdmin && tab === 'results' && <ResultsView />}
        {!isAdmin && <StudentView user={user} />}
      </main>
    </div>
  );
}