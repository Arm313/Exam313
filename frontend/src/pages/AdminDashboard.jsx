import { useEffect, useState } from 'react';
import { api } from '../api';
import * as XLSX from 'xlsx';

const emptyForm = { type: 'multiple_choice', text: '', options: ['', '', '', ''], correct: 0, points: 1 };
const optLetters = ['A', 'B', 'C', 'D'];

export default function AdminDashboard({ user }) {
  const [subjects, setSubjects] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [questions, setQuestions] = useState([]);
  const [stats, setStats] = useState({ subjects: 0, questions: 0, students: 0 });
  
  // ✅ Loading վիճակներ
  const [loading, setLoading] = useState(true);
  const [qLoading, setQLoading] = useState(false);
  const [savingSubject, setSavingSubject] = useState(false);
  const [savingGroups, setSavingGroups] = useState(false);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [addingSubject, setAddingSubject] = useState(false);
  
  const [newSubjectName, setNewSubjectName] = useState('');
  const [subjectForm, setSubjectForm] = useState(null);
  const [editingSubject, setEditingSubject] = useState(false);
  const [qForm, setQForm] = useState(emptyForm);
  const [editingQId, setEditingQId] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [subs, grps, qs, rs] = await Promise.all([
        api.getSubjects(), 
        api.getGroups(), 
        api.getQuestions(), 
        api.getResults()
      ]);
      setSubjects(subs);
      setGroups(grps);
      if (subs.length > 0) setSelectedId(subs[0].id);
      
      const uniqueStudents = new Set(rs.map(r => r.studentName)).size;
      setStats({ subjects: subs.length, questions: qs.length, students: uniqueStudents });
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);
  
  useEffect(() => {
    if (!selectedId) return;
    setQLoading(true);
    api.getQuestions(selectedId).then(qs => {
      setQuestions(qs);
      setQLoading(false);
    });
    const s = subjects.find((x) => x.id === selectedId);
    if (s) {
      let parsedGroups = [];
      try { parsedGroups = typeof s.allowedGroups === 'string' ? JSON.parse(s.allowedGroups) : (s.allowedGroups || []); } catch (e) {}
      setSubjectForm({ ...s, allowedGroups: parsedGroups });
    }
  }, [selectedId, subjects]);

  const addSubject = async () => {
    if (!newSubjectName.trim()) return;
    setAddingSubject(true);
    try {
      const sub = await api.addSubject({ name: newSubjectName });
      setNewSubjectName('');
      await loadData();
      setSelectedId(sub.id);
    } catch (e) { alert(e.message); } finally { setAddingSubject(false); }
  };

  const saveSubject = async () => {
    setSavingSubject(true);
    try {
      await api.updateSubject(selectedId, subjectForm);
      await loadData();
      setEditingSubject(false);
      alert('✅ Պահպանվեց');
    } catch (e) { alert('❌ ' + e.message); } finally { setSavingSubject(false); }
  };

  const saveGroupsOnly = async () => {
    setSavingGroups(true);
    try {
      await api.updateSubject(selectedId, subjectForm);
      await loadData();
      alert('✅ Խմբերը պահպանվեցին');
    } catch (e) { alert('❌ ' + e.message); } finally { setSavingGroups(false); }
  };

  const toggleGroup = (groupName) => {
    setSubjectForm(prev => {
      let currentGroups = prev.allowedGroups;
      if (!Array.isArray(currentGroups)) currentGroups = [];
      const newGroups = currentGroups.includes(groupName) ? currentGroups.filter(g => g !== groupName) : [...currentGroups, groupName];
      return { ...prev, allowedGroups: newGroups };
    });
  };

  const deleteSubject = async () => {
    if (!confirm('Ջնջե՞լ այս առարկան իր բոլոր հարցերով:')) return;
    try {
      await api.deleteSubject(selectedId);
      setSelectedId('');
      setQuestions([]);
      await loadData();
    } catch (e) { alert(e.message); }
  };

  const submitQuestion = async (e) => {
    e.preventDefault();
    if (!qForm.text.trim()) return alert('Լրացրեք հարցի տեքստը');
    if (qForm.type === 'multiple_choice' && !qForm.options.every((o) => o.trim())) return alert('Լրացրեք բոլոր 4 տարբերակները');

    setSavingQuestion(true);
    try {
      if (editingQId) {
        await api.updateQuestion(editingQId, qForm);
        setEditingQId(null);
      } else {
        await api.addQuestion({ ...qForm, subjectId: selectedId });
      }
      setQForm(emptyForm);
      const qs = await api.getQuestions(selectedId);
      setQuestions(qs);
    } catch (e) { alert(e.message); } finally { setSavingQuestion(false); }
  };

  const startEditQuestion = (q) => {
    setEditingQId(q.id);
    setQForm({ type: q.type || 'multiple_choice', text: q.text, options: q.options && q.options.length ? [...q.options] : ['', '', '', ''], correct: q.correct !== null ? q.correct : 0, points: q.points });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteQuestion = async (id) => {
    if (!confirm('Ջնջե՞լ այս հարցը:')) return;
    await api.deleteQuestion(id);
    const qs = await api.getQuestions(selectedId);
    setQuestions(qs);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-dark-bg"><i className="fa-solid fa-spinner fa-spin text-4xl text-brand-500"></i></div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: 'Առարկաներ', val: stats.subjects, icon: 'fa-book', color: 'blue' },
          { label: 'Հարցեր', val: stats.questions, icon: 'fa-clipboard-question', color: 'emerald' },
          { label: 'Ուսանողներ', val: stats.students, icon: 'fa-users', color: 'purple' },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border p-4 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">{s.label}</p>
              <h3 className="text-xl sm:text-2xl font-bold mt-1">{s.val}</h3>
            </div>
            <div className={`p-2 sm:p-3 bg-${s.color}-500/10 text-${s.color}-500 rounded-xl`}>
              <i className={`fa-solid ${s.icon} text-lg sm:text-2xl`}></i>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold"><i className="fa-solid fa-folder-plus text-brand-500 mr-2"></i>Առարկաներ</h3>
          </div>
          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}
            className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500">
            <option value="">— Ընտրեք —</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          {selectedId && subjectForm && (
            <div className="p-4 bg-gray-50 dark:bg-dark-bg/60 border border-gray-200 dark:border-dark-border rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase text-gray-500">Կարգավորումներ</h4>
                <button onClick={() => setEditingSubject((v) => !v)} className="text-brand-500 text-xs"><i className={`fa-solid ${editingSubject ? 'fa-xmark' : 'fa-pen'}`}></i></button>
              </div>
              {editingSubject ? (
                <>
                  <input value={subjectForm.name} onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })} className="w-full bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg p-2.5 text-sm" />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" value={subjectForm.timerMinutes} onChange={(e) => setSubjectForm({ ...subjectForm, timerMinutes: +e.target.value })} className="w-full bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg p-2.5 text-sm" placeholder="Րոպե" />
                    <input type="number" value={subjectForm.passMarkPercent} onChange={(e) => setSubjectForm({ ...subjectForm, passMarkPercent: +e.target.value })} className="w-full bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg p-2.5 text-sm" placeholder="Շեմ" />
                  </div>
                  <button onClick={saveSubject} disabled={savingSubject} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2">
                    {savingSubject ? <><i className="fa-solid fa-spinner fa-spin"></i> Պահպանվում...</> : <><i className="fa-solid fa-floppy-disk"></i> Պահպանել</>}
                  </button>
                </>
              ) : (
                <>
                  <div className="text-xs space-y-1.5">
                    <div className="flex justify-between"><span className="text-gray-500">Անուն:</span><span className="font-bold">{subjectForm.name}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Տևողություն:</span><span className="font-bold">{subjectForm.timerMinutes} ր</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Շեմ:</span><span className="font-bold">{subjectForm.passMarkPercent}%</span></div>
                  </div>
                  <button onClick={deleteSubject} className="w-full bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-semibold py-2 rounded-lg">
                    <i className="fa-solid fa-trash-can mr-1"></i>Ջնջել
                  </button>
                </>
              )}

              <div className="pt-3 border-t border-gray-200 dark:border-dark-border">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-gray-500">Հասանելի է խմբերին</label>
                  <button onClick={() => {
                    const current = subjectForm.allowedGroups || [];
                    const allSelected = current.length === groups.length;
                    setSubjectForm({ ...subjectForm, allowedGroups: allSelected ? [] : groups.map(g => g.name) });
                  }} className="text-[10px] text-brand-500 hover:text-brand-600 font-bold">
                    {subjectForm.allowedGroups?.length === groups.length ? 'Չընտրել ոչ մեկին' : 'Ընտրել Բոլորին'}
                  </button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {groups.map(g => (
                    <label key={g.id} className="flex items-center gap-2 cursor-pointer text-sm bg-white dark:bg-dark-card p-2 rounded border border-gray-100 dark:border-dark-border hover:border-brand-500 transition-colors">
                      <input type="checkbox" checked={(subjectForm.allowedGroups || []).includes(g.name)} onChange={() => toggleGroup(g.name)} className="accent-brand-500" />
                      {g.name}
                    </label>
                  ))}
                </div>
                <button onClick={saveGroupsOnly} disabled={savingGroups} className="w-full mt-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-semibold py-2 rounded-lg flex items-center justify-center gap-2">
                  {savingGroups ? <><i className="fa-solid fa-spinner fa-spin"></i> Պահպանվում...</> : 'Պահպանել խմբերը'}
                </button>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-gray-200 dark:border-dark-border space-y-2">
            <input value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} placeholder="Նոր առարկա..." className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl px-4 py-2.5 text-sm" />
            <button onClick={addSubject} disabled={addingSubject} className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
              {addingSubject ? <><i className="fa-solid fa-spinner fa-spin"></i> Ստեղծվում...</> : <><i className="fa-solid fa-plus"></i> Ավելացնել</>}
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-dark-border pb-3">
            <h3 className="text-base font-bold">
              <i className={`fa-solid ${editingQId ? 'fa-pen-to-square' : 'fa-square-plus'} text-brand-500 mr-2`}></i>
              {editingQId ? 'Խմբագրել Հարցը' : 'Ավելացնել Նոր Հարց'}
            </h3>
            {editingQId && (
              <button type="button" onClick={() => { setEditingQId(null); setQForm(emptyForm); }} className="text-xs text-amber-500">
                <i className="fa-solid fa-xmark mr-1"></i>Չեղարկել
              </button>
            )}
          </div>

          <form onSubmit={submitQuestion} className="space-y-4">
            <div className="flex bg-gray-100 dark:bg-dark-bg p-1 rounded-xl w-full sm:w-64">
              <button type="button" onClick={() => setQForm({ ...qForm, type: 'multiple_choice' })} className={`flex-1 py-1.5 text-xs font-bold rounded-lg ${qForm.type !== 'text' ? 'bg-white dark:bg-dark-card text-brand-500 shadow-sm' : 'text-gray-500'}`}>📝 Ընտրովի</button>
              <button type="button" onClick={() => setQForm({ ...qForm, type: 'text' })} className={`flex-1 py-1.5 text-xs font-bold rounded-lg ${qForm.type === 'text' ? 'bg-white dark:bg-dark-card text-brand-500 shadow-sm' : 'text-gray-500'}`}>✍️ Բաց (Տեքստ)</button>
            </div>
            <textarea value={qForm.text} onChange={(e) => setQForm({ ...qForm, text: e.target.value })} rows={3} placeholder="Հարցի տեքստը..." required className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl p-3.5 text-sm focus:outline-none focus:border-brand-500" />
            {qForm.type !== 'text' && (
              <div className="grid md:grid-cols-2 gap-3">
                {qForm.options.map((opt, i) => (
                  <input key={i} value={opt} onChange={(e) => { const newOpts = [...qForm.options]; newOpts[i] = e.target.value; setQForm({ ...qForm, options: newOpts }); }} required placeholder={`Տարբերակ ${optLetters[i]}`} className="bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl p-3 text-sm focus:outline-none focus:border-brand-500" />
                ))}
              </div>
            )}
            <div className="grid md:grid-cols-2 gap-3">
              {qForm.type !== 'text' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Ճիշտ Պատասխան</label>
                  <div className="grid grid-cols-4 gap-2">
                    {optLetters.map((l, i) => (
                      <label key={i} className={`flex items-center justify-center gap-1.5 p-2.5 border rounded-xl cursor-pointer ${qForm.correct === i ? 'border-brand-500 bg-brand-500/10' : 'border-gray-200 dark:border-dark-border'}`}>
                        <input type="radio" name="correct" checked={qForm.correct === i} onChange={() => setQForm({ ...qForm, correct: i })} className="accent-brand-500" />
                        <span className="text-sm font-bold">{l}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className={qForm.type === 'text' ? 'md:col-span-2' : ''}>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Միավոր</label>
                <input type="number" min="1" max="100" value={qForm.points} onChange={(e) => setQForm({ ...qForm, points: +e.target.value })} className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl p-3 text-sm focus:outline-none focus:border-brand-500" />
              </div>
            </div>
            <button type="submit" disabled={!selectedId || savingQuestion} className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors mt-2 flex items-center justify-center gap-2">
              {savingQuestion ? <><i className="fa-solid fa-spinner fa-spin"></i> Պահպանվում...</> : <><i className={`fa-solid ${editingQId ? 'fa-floppy-disk' : 'fa-plus-circle'}`}></i> {editingQId ? 'Թարմացնել' : 'Պահպանել'}</>}
            </button>
          </form>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-5">
        <h3 className="text-base font-bold mb-4"><i className="fa-solid fa-list-check text-brand-500 mr-2"></i>Հարցեր</h3>
        {qLoading ? (
          <div className="text-center py-6"><i className="fa-solid fa-spinner fa-spin text-2xl text-brand-500"></i></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 dark:border-dark-border text-xs uppercase font-semibold text-gray-500">
                  <th className="py-2 px-3">#</th>
                  <th className="py-2 px-3">Տեսակ</th>
                  <th className="py-2 px-3">Տեքստ</th>
                  <th className="py-2 px-3">Միավոր</th>
                  <th className="py-2 px-3 text-right">Գործողություն</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-dark-border text-sm">
                {questions.length === 0 && <tr><td colSpan={5} className="text-center py-6 text-gray-400 text-xs">Հարցեր չկան</td></tr>}
                {questions.map((q, idx) => (
                  <tr key={q.id} className={editingQId === q.id ? 'bg-amber-500/5' : ''}>
                    <td className="py-2 px-3 font-bold text-gray-400">{idx + 1}</td>
                    <td className="py-2 px-3 text-xs">
                      {q.type === 'text' ? <span className="bg-purple-500/10 text-purple-500 px-2 py-0.5 rounded font-bold">✍️ Տեքստ</span> : <span className="bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded font-bold">📝 Ընտրովի</span>}
                    </td>
                    <td className="py-2 px-3 max-w-xs truncate">{q.text}</td>
                    <td className="py-2 px-3">{q.points}</td>
                    <td className="py-2 px-3 text-right">
                      <button type="button" onClick={() => startEditQuestion(q)} className="text-blue-500 p-2 hover:bg-blue-500/10 rounded-lg"><i className="fa-solid fa-pen"></i></button>
                      <button type="button" onClick={() => deleteQuestion(q.id)} className="text-red-500 p-2 hover:bg-red-500/10 rounded-lg"><i className="fa-solid fa-trash-can"></i></button>
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