import { useEffect, useState, useRef } from 'react';
import { api } from '../api';

export default function StudentView({ user }) {
  const [step, setStep] = useState('entry');
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [session, setSession] = useState(null);
  const [violations, setViolations] = useState(0);
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [violationMsg, setViolationMsg] = useState('');
  const [summary, setSummary] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    api.getSubjects().then(s => {
      setSubjects(s);
      if (s.length) setSubjectId(s[0].id);
    }).catch(() => {});
  }, []);

  // Anti-cheat
  useEffect(() => {
    if (!session || session.status !== 'in_progress') return;
    const register = (msg) => {
      setViolations(v => {
        const n = v + 1;
        if (n >= 3) finishExam('Դադարեցվել է խախտումների պատճառով (3/3)');
        else { setViolationMsg(msg); setShowViolationModal(true); }
        return n;
      });
    };
    const onCtx = (e) => { e.preventDefault(); register('Աջ կտտոցն արգելված է:'); };
    const onCopy = (e) => { e.preventDefault(); register('Copy/Paste արգելված է:'); };
    const onVis = () => { if (document.hidden) register('Դուք լքել եք էջը:'); };
    const onFs = () => { if (!document.fullscreenElement && session?.status === 'in_progress') register('Դուրս եք եկել Fullscreen-ից:'); };
    const onKey = (e) => {
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I','J'].includes(e.key.toUpperCase()))) {
        e.preventDefault(); register('Այս ստեղները արգելված են:');
      }
    };
    document.addEventListener('contextmenu', onCtx);
    document.addEventListener('copy', onCopy);
    document.addEventListener('visibilitychange', onVis);
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('contextmenu', onCtx);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('visibilitychange', onVis);
      document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('keydown', onKey);
    };
  }, [session?.status]);

  const startExam = async (e) => {
    e.preventDefault();
    if (!subjectId) return alert('Ընտրեք առարկա');
    const subject = subjects.find(s => s.id === subjectId);
    const questions = await api.getQuestions(subjectId);
    if (!questions.length) return alert('Այս առարկայի համար հարցեր չկան:');

    try { await document.documentElement.requestFullscreen(); } catch {}

    setSession({
      studentName: user.name, studentGroup: user.group,
      subjectName: subject.name,
      timerMinutes: subject.timerMinutes,
      passMarkPercent: subject.passMarkPercent,
      questions, answers: {}, currentIndex: 0,
      remainingSeconds: subject.timerMinutes * 60,
      status: 'in_progress'
    });
    setViolations(0);
    setStep('portal');
  };

  useEffect(() => {
    if (step !== 'portal' || !session) return;
    timerRef.current = setInterval(() => {
      setSession(s => {
        if (!s) return s;
        const rem = s.remainingSeconds - 1;
        if (rem <= 0) { clearInterval(timerRef.current); finishExam('Ժամանակն ավարտվեց'); return { ...s, remainingSeconds: 0 }; }
        return { ...s, remainingSeconds: rem };
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [step]);

  const finishExam = async (reason = 'Ավարտված') => {
    clearInterval(timerRef.current);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    const s = session;
    if (!s) return;
    let gained = 0, total = 0;
    s.questions.forEach((q, i) => {
      total += q.points || 1;
      if (s.answers[i] === q.correct) gained += q.points || 1;
    });
    const percentage = Math.round((gained / total) * 100) || 0;
    const passed = percentage >= s.passMarkPercent;
    const record = {
      studentName: s.studentName, studentGroup: s.studentGroup,
      subjectName: s.subjectName, score: `${gained}/${total}`,
      percentage, passed, violations, submissionReason: reason,
      date: new Date().toLocaleString('hy-AM')
    };
    try { await api.addResult(record); } catch (e) { console.error(e); }
    setSummary({ ...record, passMarkPercent: s.passMarkPercent });
    setSession(null);
    setStep('summary');
  };

  const confirmSubmit = () => {
    const answered = Object.keys(session.answers).length;
    if (!confirm(`Պատասխանել եք ${answered}/${session.questions.length} հարցի: Ավարտե՞լ:`)) return;
    finishExam('Ուղարկված է ուսանողի կողմից');
  };

  const selectOption = (i) => setSession(s => ({ ...s, answers: { ...s.answers, [s.currentIndex]: i } }));
  const nav = (dir) => setSession(s => {
    const ni = s.currentIndex + dir;
    if (ni < 0 || ni >= s.questions.length) return s;
    return { ...s, currentIndex: ni };
  });

  // ENTRY
  if (step === 'entry') return (
    <div className="max-w-lg mx-auto bg-dark-card border border-dark-border rounded-3xl p-8 space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded-2xl flex items-center justify-center mx-auto text-2xl mb-2">
          <i className="fa-solid fa-user-check"></i>
        </div>
        <h2 className="text-2xl font-bold">Բարև, {user.name}!</h2>
        <p className="text-xs text-gray-400">Խումբ: {user.group}</p>
      </div>
      <form onSubmit={startExam} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Ընտրեք Առարկան</label>
          <select value={subjectId} onChange={e => setSubjectId(e.target.value)}
            className="w-full bg-dark-bg border border-dark-border rounded-xl p-3.5 text-sm">
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.timerMinutes}ր)</option>)}
          </select>
        </div>
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300">
          <strong>⚠️ Կանոններ:</strong> Fullscreen պարտադիր է, tab-switch/copy արգելված: 3 խախտում = ավտոմատ ավարտ:
        </div>
        <button className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 rounded-xl">
          <i className="fa-solid fa-play mr-2"></i>Սկսել Քննությունը
        </button>
      </form>
    </div>
  );

  // PORTAL
  if (step === 'portal' && session) {
    const q = session.questions[session.currentIndex];
    const mins = Math.floor(session.remainingSeconds / 60);
    const secs = session.remainingSeconds % 60;
    const timeStr = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
    return (
      <div className="space-y-6 select-none-custom">
        <div className="bg-dark-card border border-dark-border rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-bold">{session.studentName} ({session.studentGroup})</h3>
            <p className="text-xs text-gray-400">{session.subjectName}</p>
          </div>
          <div className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
            violations > 0 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
            <i className="fa-solid fa-shield-check mr-1"></i> Խախտում: {violations}/3
          </div>
          <div className="flex items-center gap-2 bg-dark-bg border border-dark-border px-4 py-2 rounded-xl">
            <i className="fa-solid fa-stopwatch text-brand-500"></i>
            <span className={`font-mono text-xl font-bold ${session.remainingSeconds <= 120 ? 'text-red-500 timer-warning' : 'text-brand-500'}`}>
              {timeStr}
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 bg-dark-card border border-dark-border rounded-2xl p-6 space-y-6">
            <div className="flex justify-between text-xs font-semibold border-b border-dark-border pb-3">
              <span>Հարց {session.currentIndex+1} / {session.questions.length}</span>
              <span className="text-brand-400">{q.points || 1} միավոր</span>
            </div>
            <h2 className="text-xl font-semibold">{q.text}</h2>
            <div className="space-y-3">
              {q.options.map((opt, i) => {
                const sel = session.answers[session.currentIndex] === i;
                return (
                  <button key={i} onClick={() => selectOption(i)}
                    className={`w-full text-left p-4 rounded-xl border text-sm font-medium transition-all flex items-center gap-3 ${
                      sel ? 'bg-brand-500/20 border-brand-500 text-white' : 'bg-dark-bg border-dark-border text-gray-300 hover:border-gray-500'}`}>
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                      sel ? 'bg-brand-600 text-white' : 'bg-dark-card border border-dark-border'}`}>
                      {String.fromCharCode(65+i)}
                    </span>
                    <span>{opt}</span>
                    {sel && <i className="fa-solid fa-circle-check text-brand-400 ml-auto"></i>}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between border-t border-dark-border pt-4">
              <button onClick={() => nav(-1)} disabled={session.currentIndex===0}
                className="bg-dark-bg border border-dark-border px-5 py-2.5 rounded-xl text-sm disabled:opacity-40">
                <i className="fa-solid fa-arrow-left mr-1"></i> Նախորդ
              </button>
              <button onClick={() => nav(1)} className="bg-brand-600 hover:bg-brand-700 px-6 py-2.5 rounded-xl text-sm">
                Հաջորդ <i className="fa-solid fa-arrow-right ml-1"></i>
              </button>
            </div>
          </div>

          <div className="bg-dark-card border border-dark-border rounded-2xl p-6 space-y-6">
            <div>
              <h4 className="text-xs font-bold uppercase text-gray-400 mb-3">Հարցեր</h4>
              <div className="grid grid-cols-5 gap-2">
                {session.questions.map((_, i) => {
                  const ans = session.answers[i] !== undefined;
                  const cur = session.currentIndex === i;
                  return (
                    <button key={i} onClick={() => setSession(s => ({...s, currentIndex: i}))}
                      className={`h-10 rounded-xl text-xs font-bold border ${
                        cur ? 'bg-brand-600 text-white ring-2 ring-brand-500' :
                        ans ? 'bg-brand-500/20 text-brand-400 border-brand-500/40' :
                        'bg-dark-bg text-gray-400 border-dark-border'}`}>{i+1}</button>
                  );
                })}
              </div>
            </div>
            <button onClick={confirmSubmit}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl text-sm">
              <i className="fa-solid fa-paper-plane mr-2"></i>Ավարտել
            </button>
          </div>
        </div>

        {showViolationModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-dark-card border border-red-500/50 rounded-3xl p-8 max-w-md w-full text-center space-y-5">
              <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-2xl flex items-center justify-center mx-auto text-3xl">
                <i className="fa-solid fa-triangle-exclamation"></i>
              </div>
              <h3 className="text-xl font-bold">Անվտանգության Խախտում!</h3>
              <p className="text-xs text-gray-300">{violationMsg}</p>
              <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-xs font-semibold text-red-400">
                Զգուշացում: {violations}/3
              </div>
              <button onClick={() => { setShowViolationModal(false); document.documentElement.requestFullscreen().catch(()=>{}); }}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl text-sm">
                Ընդունում եմ
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // SUMMARY
  if (step === 'summary' && summary) return (
    <div className="max-w-xl mx-auto bg-dark-card border border-dark-border rounded-3xl p-8 text-center space-y-6">
      <div className="w-20 h-20 bg-brand-500/10 text-brand-400 rounded-full flex items-center justify-center mx-auto text-3xl">
        <i className="fa-solid fa-award"></i>
      </div>
      <h2 className="text-2xl font-bold">Քննությունն Ավարտված է</h2>
      <div className="grid grid-cols-3 gap-3 bg-dark-bg border border-dark-border p-4 rounded-2xl">
        <div><p className="text-xs text-gray-400 uppercase">Ճիշտ</p><h3 className="text-xl font-bold text-brand-400">{summary.score}</h3></div>
        <div><p className="text-xs text-gray-400 uppercase">Տոկոս</p><h3 className="text-xl font-bold text-blue-400">{summary.percentage}%</h3></div>
        <div><p className="text-xs text-gray-400 uppercase">Խախտում</p><h3 className="text-xl font-bold text-amber-400">{summary.violations}</h3></div>
      </div>
      <div className="text-left text-xs space-y-2 border-t border-dark-border pt-4">
        <div className="flex justify-between"><span className="text-gray-400">Առարկա:</span><span className="font-bold">{summary.subjectName}</span></div>
        <div className="flex justify-between"><span className="text-gray-400">Շեմ:</span><span className="font-bold">{summary.passMarkPercent}%</span></div>
        <div className="flex justify-between">
          <span className="text-gray-400">Կարգավիճակ:</span>
          <span className={`font-bold ${summary.passed ? 'text-emerald-400' : 'text-red-400'}`}>
            {summary.passed ? 'ԱՆՑԱԾ' : 'ՉԱՆՑԱԾ'}
          </span>
        </div>
      </div>
      <button onClick={() => { setStep('entry'); setSummary(null); }}
        className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 rounded-xl text-sm">
        Նոր Քննություն
      </button>
    </div>
  );

  return null;
}