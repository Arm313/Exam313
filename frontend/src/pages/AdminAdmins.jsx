import { useEffect, useState } from 'react';
import { api } from '../api';

export default function AdminAdmins({ user }) {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('admin');
  const [error, setError] = useState('');
  const [changePwdId, setChangePwdId] = useState(null);
  const [changePwdValue, setChangePwdValue] = useState('');

  const isSuper = user?.role === 'super';

  const load = async () => {
    setLoading(true);
    try { setAdmins(await api.getAdmins()); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (isSuper) load(); }, [isSuper]);

  if (!isSuper) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
          <i className="fa-solid fa-lock text-red-500 text-3xl mb-3"></i>
          <p className="text-red-500 font-semibold">Միայն գլխավոր ադմինի համար</p>
        </div>
      </div>
    );
  }

  const add = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.addAdmin({ username: newUsername, password: newPassword, role: newRole });
      setNewUsername(''); setNewPassword(''); setNewRole('admin');
      load();
    } catch (err) { setError(err.message); }
  };

  const del = async (id, username) => {
    if (!confirm(`Ջնջե՞լ "${username}"-ին:`)) return;
    try { await api.deleteAdmin(id); load(); }
    catch (err) { alert(err.message); }
  };

  const savePassword = async (id) => {
    if (changePwdValue.length < 4) return alert('Գաղտնաբառը min 4 նիշ');
    try {
      await api.updateAdminPassword(id, changePwdValue);
      setChangePwdId(null); setChangePwdValue('');
      alert('Գաղտնաբառը փոխվեց');
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-5 space-y-4">
        <h3 className="text-base font-bold"><i className="fa-solid fa-user-plus text-purple-500 mr-2"></i>Նոր Ադմին</h3>
        <form onSubmit={add} className="grid md:grid-cols-4 gap-3">
          <input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="Մուտքանուն" required
            className="bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl px-4 py-2.5 text-sm" />
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Գաղտնաբառ" required
            className="bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl px-4 py-2.5 text-sm" />
          <select value={newRole} onChange={(e) => setNewRole(e.target.value)}
            className="bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl px-4 py-2.5 text-sm">
            <option value="admin">Ադմին</option>
            <option value="super">Գլխավոր</option>
          </select>
          <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl">
            <i className="fa-solid fa-plus mr-1"></i>Ավելացնել
          </button>
        </form>
        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-3 rounded-xl text-xs">{error}</div>}
      </div>

      <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-5">
        <h3 className="text-base font-bold mb-4"><i className="fa-solid fa-users text-brand-500 mr-2"></i>Ադմիններ ({admins.length})</h3>
        {loading ? <div className="text-center py-6"><i className="fa-solid fa-spinner fa-spin text-2xl text-brand-500"></i></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 dark:border-dark-border text-xs uppercase text-gray-500">
                  <th className="py-3 px-3">Մուտքանուն</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Ստեղծված</th>
                  <th className="py-3 px-3 text-right">Գործողություն</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-dark-border text-sm">
                {admins.map((a) => (
                  <tr key={a.id}>
                    <td className="py-3 px-3 font-bold">{a.username}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${a.role === 'super' ? 'bg-purple-500/20 text-purple-500' : 'bg-blue-500/20 text-blue-500'}`}>
                        {a.role === 'super' ? '👑 Գլխավոր' : 'Ադմին'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs text-gray-500">{new Date(a.createdAt).toLocaleDateString('hy-AM')}</td>
                    <td className="py-3 px-3 text-right space-x-1">
                      {changePwdId === a.id ? (
                        <div className="flex items-center gap-1 justify-end">
                          <input type="password" value={changePwdValue} onChange={(e) => setChangePwdValue(e.target.value)}
                            placeholder="Նոր" className="bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg px-2 py-1 text-xs w-24" />
                          <button onClick={() => savePassword(a.id)} className="text-emerald-500 p-1"><i className="fa-solid fa-check"></i></button>
                          <button onClick={() => { setChangePwdId(null); setChangePwdValue(''); }} className="text-gray-500 p-1"><i className="fa-solid fa-xmark"></i></button>
                        </div>
                      ) : (
                        <>
                          <button onClick={() => { setChangePwdId(a.id); setChangePwdValue(''); }} className="text-amber-500 p-2"><i className="fa-solid fa-key"></i></button>
                          <button onClick={() => del(a.id, a.username)} className="text-red-500 p-2"><i className="fa-solid fa-trash-can"></i></button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}