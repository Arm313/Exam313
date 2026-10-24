import { useEffect, useState } from 'react';
import { api } from '../api';

const emptyForm = { text: '', options: ['', '', '', ''], correct: 0, points: 1 };
const optLetters = ['A', 'B', 'C', 'D'];

export default function AdminView() {
  const [subjects, setSubjects] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [questions, setQuestions] = useState([]);
  const [stats, setStats] = useState({ subjects: 0, questions: 0, exams: 0, violations: 0 });
  const [newSubjectName, setNewSubjectName] = useState('');
  const [subjectForm, setSubjectForm] = useState({ name: '', timerMinutes: 15, passMarkPercent: 60 });
  const [editingSubject, setEditingSubject] = useState(false);

  // Question form: if editingQId set → edit mode
  const [qForm, setQForm] = useState(emptyForm);
  const [editingQId, setEditingQId] = useState(null);

  // ---------- Loaders ----------
  const loadSubjects = async () => {
    const subs = await api.getSubjects();
    setSubjects(subs);
    if (!selectedId && subs.length) setSelectedId(subs[0].id);
    return subs;
  };

  const loadQuestions = async (sid) => {
    if (!sid) {
      setQuestions([]);
      return;
    }
    const qs = await api.getQuestions(sid);
    setQuestions(qs);
  };

  const loadStats = async () => {
    try {
      const [subs, qs, rs] = await Promise.all([
        api.getSubjects(),
        api.getQuestions(),
        api.getResults(),
      ]);
      setStats({
        subjects: subs.length,
        questions: qs.length,
        exams: rs.length,
        violations: rs.reduce((s, r) => s + (r.violations || 0), 0),
      });
    } catch (e) {
      console.error('Stats load error:', e);
    }
  };

  // ---------- Effects ----------
  useEffect(() => {
    loadSubjects().then(() => loadStats());
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    loadQuestions(selectedId);
    const s = subjects.find((x) => x.id === selectedId);
    if (s) {
      setSubjectForm({
        name: s.name,
        timerMinutes: s.timerMinutes,
        passMarkPercent: s.passMarkPercent,
      });
    }
    setEditingQId(null);
    setQForm(emptyForm);
    // eslint-disable-next-line
  }, [selectedId, subjects]);

  // ---------- Subject actions ----------
  const addSubject = async () => {
    if (!newSubjectName.trim()) return;
    try {
      const sub = await api.addSubject({ name: newSubjectName });
      setNewSubjectName('');
      await loadSubjects();
      setSelectedId(sub.id);
      loadStats();
    } catch (e) {
      alert(e.message);
    }
  };

  const saveSubjectSettings = async () => {
    try {
      await api.updateSubject(selectedId, subjectForm);
      await loadSubjects();
      setEditingSubject(false);
      alert('Պահպանվեց');
    } catch (e) {
      alert(e.message);
    }
  };

  const deleteSubject = async () => {
    if (!confirm('Ջնջե՞լ այս առարկան իր բոլոր հարցերով:')) return;
    try {
      await api.deleteSubject(selectedId);
      setSelectedId('');
      setQuestions([]);
      await loadSubjects();
      loadStats();
    } catch (e) {
      alert(e.message);
    }
  };

  // ---------- Question actions ----------
  const submitQuestion = async (e) => {
    e.preventDefault();
    if (!qForm.options.every((o) => o.trim())) {
      return alert('Լրացրեք բոլոր տարբերակները');
    }
    if (!qForm.text.trim()) {
      return alert('Լրացրեք հարցի տեքստը');
    }
    if (!selectedId) {
      return alert('Ընտրեք առարկա');
    }

    try {
      if (editingQId) {
        await api.updateQuestion(editingQId, {
          text: qForm.text,
          options: qForm.options,
          correct: qForm.correct,
          points: qForm.points,
        });
        setEditingQId(null);
      } else {
        await api.addQuestion({
          subjectId: selectedId,
          text: qForm.text,
          options: qForm.options,
          correct: qForm.correct,
          points: qForm.points,
        });
      }
      setQForm(emptyForm);
      loadQuestions(selectedId);
      loadStats();
    } catch (e) {
      alert(e.message);
    }
  };

  const startEditQuestion = (q) => {
    setEditingQId(q.id);
    setQForm({
      text: q.text,
      options: [...q.options],
      correct: q.correct,
      points: q.points,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingQId(null);
    setQForm(emptyForm);
  };

  const deleteQuestion = async (id) => {
    if (!confirm('Ջնջե՞լ այս հարցը:')) return;
    try {
      await api.deleteQuestion(id);
      loadQuestions(selectedId);
      loadStats();
    } catch (e) {
      alert(e.message);
    }
  };

  // ---------- Render ----------
  return (
    <div className="space-y-8">
      {/* ========== STATS CARDS ========== */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Առարկաներ"
          value={stats.subjects}
          icon="fa-book"
          color="blue"
        />
        <StatCard
          label="Հարցեր"
          value={stats.questions}
          icon="fa-clipboard-question"
          color="emerald"
        />
        <StatCard
          label="Քննություններ"
          value={stats.exams}
          icon="fa-square-check"
          color="purple"
        />
        <StatCard
          label="Խախտումներ"
          value={stats.violations}
          icon="fa-shield-cat"
          color="amber"
        />
      </div>

      {/* ========== SUBJECTS + QUESTION FORM ========== */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* --- Subjects Panel --- */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-6 space-y-5">
          <h3 className="text-base font-bold flex items-center gap-2">
            <i className="fa-solid fa-folder-plus text-brand-500"></i>
            Առարկաներ
          </h3>

          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500"
          >
            <option value="">— Ընտրեք —</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {selectedId && (
            <div className="p-4 bg-dark-bg/60 border border-dark-border rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-gray-300 uppercase flex items-center justify-between">
                Կարգավորումներ
                <button
                  onClick={() => setEditingSubject((v) => !v)}
                  className="text-brand-400 text-xs hover:text-brand-300"
                  title={editingSubject ? 'Չեղարկել' : 'Խմբագրել'}
                >
                  <i className={`fa-solid ${editingSubject ? 'fa-xmark' : 'fa-pen'}`}></i>
                </button>
              </h4>

              {editingSubject ? (
                <>
                  <input
                    value={subjectForm.name}
                    onChange={(e) =>
                      setSubjectForm({ ...subjectForm, name: e.target.value })
                    }
                    placeholder="Անվանում"
                    className="w-full bg-dark-card border border-dark-border rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1 uppercase">
                        Տևողություն (ր)
                      </label>
                      <input
                        type="number"
                        value={subjectForm.timerMinutes}
                        onChange={(e) =>
                          setSubjectForm({
                            ...subjectForm,
                            timerMinutes: +e.target.value,
                          })
                        }
                        className="w-full bg-dark-card border border-dark-border rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1 uppercase">
                        Շեմ (%)
                      </label>
                      <input
                        type="number"
                        value={subjectForm.passMarkPercent}
                        onChange={(e) =>
                          setSubjectForm({
                            ...subjectForm,
                            passMarkPercent: +e.target.value,
                          })
                        }
                        className="w-full bg-dark-card border border-dark-border rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>
                  <button
                    onClick={saveSubjectSettings}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 rounded-lg transition-colors"
                  >
                    <i className="fa-solid fa-floppy-disk mr-1"></i>Պահպանել
                  </button>
                </>
              ) : (
                <>
                  <div className="text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Անվանում:</span>
                      <span className="font-bold text-white">
                        {subjectForm.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Տևողություն:</span>
                      <span className="font-bold text-white">
                        {subjectForm.timerMinutes} ր
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Շեմ:</span>
                      <span className="font-bold text-white">
                        {subjectForm.passMarkPercent}%
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={deleteSubject}
                    className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold py-2 rounded-lg transition-colors"
                  >
                    <i className="fa-solid fa-trash-can mr-1"></i>Ջնջել
                    Առարկան
                  </button>
                </>
              )}
            </div>
          )}

          <div className="pt-4 border-t border-dark-border space-y-2">
            <label className="block text-xs font-bold text-gray-400 uppercase">
              Նոր Առարկա
            </label>
            <input
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSubject()}
              placeholder="Անվանում..."
              className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
            />
            <button
              onClick={addSubject}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            >
              <i className="fa-solid fa-plus mr-1"></i>Ավելացնել
            </button>
          </div>
        </div>

        {/* --- Question Form --- */}
        <div className="lg:col-span-2 bg-dark-card border border-dark-border rounded-2xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dark-border pb-4">
            <h3 className="text-base font-bold flex items-center gap-2">
              <i
                className={`fa-solid ${
                  editingQId ? 'fa-pen-to-square' : 'fa-square-plus'
                } text-brand-500`}
              ></i>
              {editingQId ? 'Խմբագրել Հարցը' : 'Ավելացնել Նոր Հարց'}
            </h3>
            {editingQId && (
              <button
                onClick={cancelEdit}
                className="text-xs text-amber-400 hover:underline"
              >
                <i className="fa-solid fa-xmark mr-1"></i>Չեղարկել
              </button>
            )}
          </div>

          <form onSubmit={submitQuestion} className="space-y-4">
            <textarea
              value={qForm.text}
              onChange={(e) => setQForm({ ...qForm, text: e.target.value })}
              rows={3}
              placeholder="Հարցի տեքստը..."
              required
              className="w-full bg-dark-bg border border-dark-border rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-brand-500"
            />

            <div className="grid md:grid-cols-2 gap-4">
              {qForm.options.map((opt, i) => (
                <div key={i}>
                  <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase">
                    Տարբերակ {optLetters[i]}
                  </label>
                  <input
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...qForm.options];
                      newOpts[i] = e.target.value;
                      setQForm({ ...qForm, options: newOpts });
                    }}
                    required
                    placeholder={`Տարբերակ ${optLetters[i]}`}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">
                  Ճիշտ Պատասխան
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {optLetters.map((l, i) => (
                    <label
                      key={i}
                      className={`flex items-center justify-center gap-1.5 p-3 bg-dark-bg border rounded-xl cursor-pointer transition-colors ${
                        qForm.correct === i
                          ? 'border-brand-500 bg-brand-500/10'
                          : 'border-dark-border hover:border-gray-500'
                      }`}
                    >
                      <input
                        type="radio"
                        name="correct-opt"
                        checked={qForm.correct === i}
                        onChange={() => setQForm({ ...qForm, correct: i })}
                        className="accent-brand-500"
                      />
                      <span className="text-sm font-bold text-white">{l}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">
                  Միավոր
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={qForm.points}
                  onChange={(e) =>
                    setQForm({ ...qForm, points: +e.target.value })
                  }
                  className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
              >
                <i
                  className={`fa-solid ${
                    editingQId ? 'fa-floppy-disk' : 'fa-plus-circle'
                  } mr-2`}
                ></i>
                {editingQId ? 'Թարմացնել' : 'Պահպանել'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ========== QUESTIONS TABLE ========== */}
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold flex items-center gap-2">
            <i className="fa-solid fa-list-check text-brand-500"></i>
            Հարցաշար
          </h3>
          <span className="text-xs text-gray-400">
            {questions.length} հարց
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-dark-border text-xs uppercase font-semibold text-gray-400 bg-dark-bg/50">
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Տեքստ</th>
                <th className="py-3 px-4">Տարբերակներ</th>
                <th className="py-3 px-4">Ճիշտ</th>
                <th className="py-3 px-4">Միավոր</th>
                <th className="py-3 px-4 text-right">Գործողություն</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border text-sm">
              {questions.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-6 text-gray-500 text-xs"
                  >
                    Հարցեր չկան: Ավելացրեք վերևի ձևով։
                  </td>
                </tr>
              )}
              {questions.map((q, idx) => (
                <tr
                  key={q.id}
                  className={`hover:bg-dark-bg/40 transition-colors ${
                    editingQId === q.id ? 'bg-amber-500/5' : ''
                  }`}
                >
                  <td className="py-3 px-4 font-bold text-gray-400">
                    {idx + 1}
                  </td>
                  <td className="py-3 px-4 font-medium text-white max-w-xs truncate">
                    {q.text}
                  </td>
                  <td className="py-3 px-4 text-xs text-gray-300">
                    {q.options.map((o, i) => (
                      <span
                        key={i}
                        className={
                          i === q.correct
                            ? 'text-brand-400 font-bold'
                            : ''
                        }
                      >
                        {optLetters[i]}: {o}
                        {i < 3 ? ' | ' : ''}
                      </span>
                    ))}
                  </td>
                  <td className="py-3 px-4">
                    <span className="bg-brand-500/20 text-brand-400 px-2 py-1 rounded text-xs font-bold">
                      {optLetters[q.correct]}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-300">{q.points}</td>
                  <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                    <button
                      onClick={() => startEditQuestion(q)}
                      className="text-blue-400 hover:text-blue-300 p-2 rounded-lg hover:bg-blue-500/10 transition-colors"
                      title="Խմբագրել"
                    >
                      <i className="fa-solid fa-pen"></i>
                    </button>
                    <button
                      onClick={() => deleteQuestion(q.id)}
                      className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                      title="Ջնջել"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Small helper component for stat cards
function StatCard({ label, value, icon, color }) {
  const colorMap = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };
  return (
    <div className="bg-dark-card border border-dark-border p-5 rounded-2xl flex items-center justify-between">
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {label}
        </p>
        <h3 className="text-2xl font-bold text-white mt-1">{value}</h3>
      </div>
      <div
        className={`p-3 rounded-xl border ${colorMap[color] || colorMap.blue}`}
      >
        <i className={`fa-solid ${icon} text-2xl`}></i>
      </div>
    </div>
  );
}