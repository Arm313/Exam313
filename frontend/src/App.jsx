import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './auth';
import { theme } from './theme';
import { api } from './api'; // ✅ Ավելացրինք

import Landing from './pages/Landing.jsx';
import StudentLogin from './pages/StudentLogin.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import StudentExam from './pages/StudentExam.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminResults from './pages/AdminResults.jsx';
import AdminSettings from './pages/AdminSettings.jsx';
import AdminAdmins from './pages/AdminAdmins.jsx';
import Header from './components/Header.jsx';
import AdminGroups from './pages/AdminGroups.jsx';

function Protected({ role, children }) {
  const user = auth.getUser();
  if (!user) return <Navigate to="/" replace />;
  if (role === 'admin' && user.role !== 'admin' && user.role !== 'super') return <Navigate to="/student/exam" replace />;
  if (role === 'student' && user.role !== 'student') return <Navigate to="/admin/dashboard" replace />;
  return children;
}

export default function App() {
  const [user, setUser] = useState(auth.getUser());
  const [currentTheme, setCurrentTheme] = useState(theme.get());
  
  // ✅ ՆՈՐ. Կարդում ենք համակարգի անունը
  const [siteName, setSiteName] = useState('EduExam Pro');

  useEffect(() => {
    // Բեռնում ենք կարգավորումները, որպեսզի իմանանք համակարգի անունը
    api.getSettings()
      .then(st => {
        if (st.siteName) setSiteName(st.siteName);
      })
      .catch(() => {});
  }, []);

  const handleLogin = (u) => { auth.setUser(u); setUser(u); };
  const handleLogout = () => { auth.clear(); setUser(null); };
  const toggleTheme = () => { setCurrentTheme(theme.toggle()); };

  return (
    <div className="min-h-screen flex flex-col">
      {/* ✅ ՓՈԽԱՆՑՈՒՄ ԵՆՔ siteName-ը */}
      <Header 
        user={user} 
        onLogout={handleLogout} 
        theme={currentTheme} 
        onToggleTheme={toggleTheme} 
        siteName={siteName} 
      />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Landing user={user} />} />
          <Route path="/student/login" element={<StudentLogin onLogin={handleLogin} />} />
          <Route path="/student/exam" element={<Protected role="student"><StudentExam user={user} /></Protected>} />
          <Route path="/exam/:subjectId" element={<Protected role="student"><StudentExam user={user} /></Protected>} />
          
          <Route path="/admin/login" element={<AdminLogin onLogin={handleLogin} />} />
          <Route path="/admin/dashboard" element={<Protected role="admin"><AdminDashboard user={user} /></Protected>} />
          <Route path="/admin/results" element={<Protected role="admin"><AdminResults user={user} /></Protected>} />
          <Route path="/admin/settings" element={<Protected role="admin"><AdminSettings user={user} /></Protected>} />
          <Route path="/admin/admins" element={<Protected role="admin"><AdminAdmins user={user} /></Protected>} />
          <Route path="/admin/groups" element={<Protected role="admin"><AdminGroups /></Protected>} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}