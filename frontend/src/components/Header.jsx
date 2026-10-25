import { Link, useNavigate, useLocation } from 'react-router-dom';

export default function Header({ user, onLogout, theme, onToggleTheme, siteName }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const isAdmin = user?.role === 'admin' || user?.role === 'super';
  const isSuper = user?.role === 'super';

  const logout = () => {
    if (!confirm('Ելք գործե՞լ համակարգից:')) return;
    onLogout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="bg-white dark:bg-dark-card border-b border-gray-200 dark:border-dark-border sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
        <Link to={isAdmin ? "/admin/dashboard" : user ? "/student/exam" : "/"} className="flex items-center gap-3 shrink-0">
          <div className="bg-brand-600 text-white p-2.5 rounded-xl">
            <i className="fa-solid fa-graduation-cap text-xl"></i>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold flex items-center gap-2">
              {siteName || 'EduExam Pro'}
            </h1>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              {isAdmin
                ? isSuper ? '👑 Գլխավոր ադմին' : '🛡️ Ադմին'
                : user
                ? `${user.name} (${user.group})`
                : 'Օնլայն Քննությունների Համակարգ'}
            </p>
          </div>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          
          {/* ✅ ԱԴՄԻՆԻ ՄԵՆՅՈՒ */}
          {isAdmin && (
            <>
              <Link to="/admin/dashboard" className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${isActive('/admin/dashboard') ? 'bg-brand-500/10 text-brand-500' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-bg'}`}>
                <i className="fa-solid fa-pen-to-square sm:mr-1"></i>
                <span className="hidden sm:inline">Խմբագրում</span>
              </Link>
              <Link to="/admin/results" className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${isActive('/admin/results') ? 'bg-brand-500/10 text-brand-500' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-bg'}`}>
                <i className="fa-solid fa-chart-line sm:mr-1"></i>
                <span className="hidden sm:inline">Արդյունքներ</span>
              </Link>
              <Link to="/admin/groups" className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${isActive('/admin/groups') ? 'bg-brand-500/10 text-brand-500' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-bg'}`}>
                <i className="fa-solid fa-users sm:mr-1"></i>
                <span className="hidden sm:inline">Խմբեր</span>
              </Link>
              <Link to="/admin/settings" className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${isActive('/admin/settings') ? 'bg-brand-500/10 text-brand-500' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-bg'}`}>
                <i className="fa-solid fa-gear sm:mr-1"></i>
                <span className="hidden sm:inline">Կարգավորում</span>
              </Link>
              {isSuper && (
                <Link to="/admin/admins" className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${isActive('/admin/admins') ? 'bg-purple-500/10 text-purple-500' : 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10'}`}>
                  <i className="fa-solid fa-user-shield sm:mr-1"></i>
                  <span className="hidden sm:inline">Ադմիններ</span>
                </Link>
              )}
            </>
          )}

          <button onClick={onToggleTheme} className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-bg" title="Փոխել թեման">
            <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`}></i>
          </button>

          {user && (
            <button onClick={logout} className="px-3 py-2 rounded-lg text-xs font-semibold bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 hover:bg-red-100 dark:hover:bg-red-500/20">
              <i className="fa-solid fa-right-from-bracket sm:mr-1"></i>
              <span className="hidden sm:inline">Ելք</span>
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}