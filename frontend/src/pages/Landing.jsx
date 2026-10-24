import { Link } from 'react-router-dom';

export default function Landing({ user }) {
  const isStudent = user?.role === 'student';
  const isAdmin = user?.role === 'admin' || user?.role === 'super';

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="max-w-3xl w-full space-y-8">
        <div className="text-center space-y-3">
          <div className="w-20 h-20 bg-brand-500/10 text-brand-500 border border-brand-500/20 rounded-3xl flex items-center justify-center mx-auto text-4xl">
            <i className="fa-solid fa-graduation-cap"></i>
          </div>
          <h1 className="text-4xl font-bold">
            EduExam <span className="text-brand-500">Pro</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Օնլայն Քննությունների և Թեստավորման Համակարգ
          </p>
        </div>

        {/* Show current session banner */}
        {user && (
          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <i className="fa-solid fa-circle-info text-amber-500 text-xl"></i>
              <div>
                <div className="text-sm font-bold text-amber-700 dark:text-amber-300">
                  Դուք արդեն մուտք գործած եք
                </div>
                <div className="text-xs text-amber-600 dark:text-amber-400">
                  {isStudent
                    ? `Ուսանող: ${user.name} (${user.group})`
                    : isAdmin
                    ? `Ադմին: ${user.username || user.name}`
                    : 'Անհայտ'}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                if (isStudent) window.location.href = '/student/exam';
                else if (isAdmin) window.location.href = '/admin/dashboard';
              }}
              className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-4 py-2 rounded-lg"
            >
              Շարունակել
            </button>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Student card */}
          <div className={`group bg-white dark:bg-dark-card border-2 rounded-3xl p-8 transition-all ${
            isStudent
              ? 'border-brand-500 ring-2 ring-brand-500/30'
              : 'border-gray-200 dark:border-dark-border hover:border-brand-500'
          }`}>
            <div className="w-14 h-14 bg-brand-500/10 text-brand-500 rounded-2xl flex items-center justify-center text-2xl mb-4">
              <i className="fa-solid fa-user-graduate"></i>
            </div>
            <h2 className="text-2xl font-bold mb-2">Ուսանող</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Մուտք գործեք ձեր քննությունները հանձնելու համար
            </p>

            {isStudent ? (
              <a
                href="/student/exam"
                className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm"
              >
                <i className="fa-solid fa-arrow-right"></i> Շարունակել որպես ուսանող
              </a>
            ) : isAdmin ? (
              <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                Այլընտրանք՝ ելք գործեք ադմինից, որպեսզի մտնեք որպես ուսանող
              </div>
            ) : (
              <a
                href="/student/login"
                className="inline-flex items-center gap-2 text-brand-600 dark:text-brand-400 font-semibold text-sm"
              >
                Մուտք <i className="fa-solid fa-arrow-right"></i>
              </a>
            )}
          </div>

          {/* Admin card */}
          <div className={`group bg-white dark:bg-dark-card border-2 rounded-3xl p-8 transition-all ${
            isAdmin
              ? 'border-purple-500 ring-2 ring-purple-500/30'
              : 'border-gray-200 dark:border-dark-border hover:border-purple-500'
          }`}>
            <div className="w-14 h-14 bg-purple-500/10 text-purple-500 rounded-2xl flex items-center justify-center text-2xl mb-4">
              <i className="fa-solid fa-user-shield"></i>
            </div>
            <h2 className="text-2xl font-bold mb-2">Ադմին</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Կառավարեք առարկաները, հարցերը և արդյունքները
            </p>

            {isAdmin ? (
              <a
                href="/admin/dashboard"
                className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm"
              >
                <i className="fa-solid fa-arrow-right"></i> Շարունակել որպես ադմին
              </a>
            ) : isStudent ? (
              <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                Այլընտրանք՝ ելք գործեք ուսանողից, որպեսզի մտնեք որպես ադմին
              </div>
            ) : (
              <a
                href="/admin/login"
                className="inline-flex items-center gap-2 text-purple-600 dark:text-purple-400 font-semibold text-sm"
              >
                Մուտք <i className="fa-solid fa-arrow-right"></i>
              </a>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400">
          © {new Date().getFullYear()} EduExam Pro
        </p>
      </div>
    </div>
  );
}