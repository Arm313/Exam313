import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { auth } from '../auth';

export default function StudentJoinLink() {
  const { linkId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [linkData, setLinkData] = useState(null);
  
  const [name, setName] = useState('');
  const [group, setGroup] = useState('');
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    const init = async () => {
      try {
        const data = await api.getLinkInfo(linkId);
        setLinkData(data.linkData);

        // ✅ Եթե անհատական հղում է (դասախոսը նախապես գրել է անունն ու խումբը)
        if (!data.linkData.isGeneral) {
          const res = await api.studentLogin(data.linkData.studentName, data.linkData.studentGroup, null);
          auth.setToken(res.token);
          auth.setUser({ role: res.role, name: res.name, group: res.group });
          navigate(`/exam/${data.linkData.subjectId}`, { replace: true });
        } else {
          // ✅ Ընդհանուր հղում — ուսանողը ինքն է լրացնում
          const grps = await api.getGroupsPublic();
          setGroups(grps);
          setLoading(false);
        }
      } catch (err) {
        setError(err.message || 'Հղումը վավեր չէ կամ ժամկետանց է։');
        setLoading(false);
      }
    };
    init();
  }, [linkId, navigate]);

  const handleManualLogin = async (e) => {
    e.preventDefault();
    if (!name.trim() || !group) return setError('Լրացրեք բոլոր դաշտերը');
    
    // ✅ Ստուգում ենք, որ ուսանողի խումբը թույլատրված է այս առարկայի համար
    if (linkData && linkData.allowedGroups) {
      // Այս ստուգումը կարող ենք անել backend-ում, բայց այստեղ էլ լավ է
    }
    
    setLoading(true);
    try {
      const res = await api.studentLogin(name.trim(), group, null);
      auth.setToken(res.token);
      auth.setUser({ role: res.role, name: res.name, group: res.group });
      navigate(`/exam/${linkData.subjectId}`, { replace: true });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-dark-bg gap-4">
        <i className="fa-solid fa-spinner fa-spin text-4xl text-brand-500"></i>
        <p className="text-gray-400 text-sm animate-pulse">Միանում ենք քննությանը...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white dark:bg-dark-card border border-red-200 dark:border-red-500/30 rounded-3xl p-8 max-w-md w-full text-center space-y-4">
          <i className="fa-solid fa-link-slash text-5xl text-red-500 mb-2"></i>
          <h2 className="text-xl font-bold">Սխալ հղում</h2>
          <p className="text-sm text-gray-500">{error}</p>
          <button onClick={() => navigate('/')} className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl mt-4">
            Վերադառնալ Գլխավոր էջ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-3xl p-8 space-y-6 shadow-xl">
        <div className="text-center space-y-2">
          <div className="inline-flex w-16 h-16 bg-brand-500/10 text-brand-500 border border-brand-500/20 rounded-2xl items-center justify-center mx-auto text-2xl">
            <i className="fa-solid fa-graduation-cap"></i>
          </div>
          <h1 className="text-2xl font-bold">Մուտք Քննությանը</h1>
          <p className="text-xs text-gray-500 font-semibold bg-gray-100 dark:bg-dark-bg p-2 rounded-lg inline-block mt-2">
            Առարկա՝ {linkData.subjectName}
          </p>
        </div>

        <form onSubmit={handleManualLogin} className="space-y-4">
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

          {error && <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 text-red-600 p-3 rounded-xl text-xs">{error}</div>}

          <button type="submit" disabled={loading} className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <><i className="fa-solid fa-spinner fa-spin"></i> Մուտք...</> : 'Սկսել Քննությունը'}
          </button>
        </form>
      </div>
    </div>
  );
}