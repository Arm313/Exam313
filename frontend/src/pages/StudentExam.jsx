import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

const formatDateTime = (isoString) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export default function StudentExam({ user }) {
  const navigate = useNavigate();
  const [step, setStep] = useState('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [session, setSession] = useState(null);
  const [violations, setViolations] = useState(0);
  
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [violationMsg, setViolationMsg] = useState('');
  
  const [summary, setSummary] = useState(null);
  const [settings, setSettings] = useState({ violationLimit: '3', fullscreenRequired: '1' });
  
  const [starting, setStarting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [showTimeWarning, setShowTimeWarning] = useState(false);

  const timerRef = useRef(null);
  const sessionRef = useRef(null);
  const isFinishingRef = useRef(false);

  const violationLimit = parseInt(settings.violationLimit || '3');
  const fullscreenRequired = settings.fullscreenRequired === '1';

  useEffect(() => { sessionRef.current = session; }, [session]);

  const loadData = async () => {
    if (!user) { navigate('/student/login'); return; }
    setStep('loading');
    
    try {
      const [subs, st] = await Promise.all([api.getSubjects(), api.getSettings()]);
      setSettings(st);
      
      const list = [];
      const now = new Date().getTime();
      
      for (const s of subs) {
        if (s.isActive === 0) continue; 
        let allowedGroups = [];
        try { 
          const raw = s.allowedGroups !== undefined ? s.allowedGroups : s.allowedgroups;
          allowedGroups = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : []; 
        } catch (e) {}

        if (allowedGroups.length > 0 && !allowedGroups.includes(user.group)) continue;

        try {
          const attempts = await api.getAttempts(s.id);
          if (s.allowRetake || attempts.count === 0) {
            let qCount = 0;
            try {
              const qs = await api.getQuestions(s.id);
              const limit = parseInt(s.questionsCount !== undefined ? s.questionsCount : s.questionscount) || 0;
              qCount = limit > 0 ? Math.min(limit, qs.length) : qs.length;
            } catch (e) { qCount = 0; }
            list.push({ ...s, totalQuestions: qCount });
          }
        } catch (e) { console.error(e); }
      }
      
      setAvailableSubjects(list);
      setStep('select');
    } catch (e) {
      setErrorMsg('Տվյալները բեռնելիս սխալ տեղի ունեցավ:'); 
      setStep('error');
    }
  };

  useEffect(() => { loadData(); }, [user, navigate]);

  useEffect(() => {
    if (!session || session.status !== 'in_progress') return;

    const registerViolation = (msg) => {
      if (isFinishingRef.current) return; 
      setViolations((v) => {
        const n = v + 1;
        if (n >= violationLimit) finishExam('Դադարեցվել է խախտումների պատճառով');
        else { setViolationMsg(msg); setShowViolationModal(true); }
        return n;
      });
    };

    const onCtx = (e) => { e.preventDefault(); };
    const onVis = () => { if (document.hidden) registerViolation('Դուք լքել եք քննության էջը:'); };
    const onFs = () => { 
      if (fullscreenRequired && !document.fullscreenElement && sessionRef.current?.status === 'in_progress' && !isFinishingRef.current) {
        registerViolation('Դուրս եք եկել Fullscreen-ից:');
      }
    };
    
    const onKey = (e) => {
      if (e.key === 'F5' || e.key === 'F12') { e.preventDefault(); return; }
      if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) { e.preventDefault(); return; }
      if (e.altKey && e.shiftKey && e.key.toUpperCase() === 'I') { e.preventDefault(); return; }
      if (e.ctrlKey && ['C', 'V'].includes(e.key.toUpperCase())) {
        e.preventDefault();
        registerViolation('Պատճենումը (Copy/Paste) արգելված է:');
        return;
      }
    };
    
    document.addEventListener('contextmenu', onCtx);
    document.addEventListener('visibilitychange', onVis);
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('keydown', onKey);
    
    return () => {
      document.removeEventListener('contextmenu', onCtx);
      document.removeEventListener('visibilitychange', onVis);
      document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('keydown', onKey);
    };
  }, [session?.status, violationLimit, fullscreenRequired]);

  const startExam = async () => {
    if (!selectedSubject) return;
    
    const now = new Date().getTime();
    const startT = selectedSubject.startTime ? new Date(selectedSubject.startTime).getTime() : null;
    const endT = selectedSubject.endTime ? new Date(selectedSubject.endTime).getTime() : null;

    if (startT && now < startT) return alert(`⏳ Դեռ չի սկսվել: Կսկսվի՝ ${formatDateTime(selectedSubject.startTime)}`);
    if (endT && now > endT) return alert(`⏰ Ժամանակը լրացել է: Փակվել է՝ ${formatDateTime(selectedSubject.endTime)}`);

    setStarting(true);
    
    try {
      let qs = await api.getQuestions(selectedSubject.id);
      if (!qs.length) { alert('Հարցեր չկան:'); setStarting(false); return; }
      
      qs = qs.sort(() => Math.random() - 0.5); 
      const countStr = selectedSubject.questionsCount !== undefined ? selectedSubject.questionsCount : selectedSubject.questionscount;
      const limit = parseInt(countStr) || 0;
      if (limit > 0 && limit < qs.length) qs = qs.slice(0, limit); 
      
      if (fullscreenRequired) { try { await document.documentElement.requestFullscreen(); } catch {} }
      
      const tMinutes = selectedSubject.timerMinutes !== undefined ? selectedSubject.timerMinutes : selectedSubject.timerminutes;
      const pMark = selectedSubject.passMarkPercent !== undefined ? selectedSubject.passMarkPercent : selectedSubject.passmarkpercent;
      const allowR = selectedSubject.allowRetake !== undefined ? selectedSubject.allowRetake : selectedSubject.allowretake;

      setSession({
        studentName: user.name, studentGroup: user.group, 
        subjectId: selectedSubject.id, subjectName: selectedSubject.name,
        timerMinutes: tMinutes, passMarkPercent: pMark,
        allowRetake: allowR === 1 || allowR === true,
        questions: qs, answers: {},
        currentIndex: 0, remainingSeconds: tMinutes * 60, status: 'in_progress',
      });
      setViolations(0);
      setShowTimeWarning(false);
      setStep('portal');
    } catch (e) { alert('Սխալ: ' + e.message); }
    finally { setStarting(false); }
  };

  useEffect(() => {
    if (step !== 'portal' || !session) return;
    
    timerRef.current = setInterval(() => {
      setSession((s) => {
        if (!s) return s;
        const rem = s.remainingSeconds - 1;
        if (rem === 300) setShowTimeWarning(true);
        if (rem <= 0) { 
          clearInterval(timerRef.current); 
          finishExam('Ժամանակն ավարտվեց'); 
          return { ...s, remainingSeconds: 0 }; 
        }
        return { ...s, remainingSeconds: rem };
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [step]);

  const finishExam = async (reason = 'Ավարտված') => {
    isFinishingRef.current = true; 
    clearInterval(timerRef.current);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    const s = sessionRef.current;
    if (!s) return;
    
    setFinishing(true);
    const currentViolations = violations; 

    const answersByQuestionId = {};
    const displayIds = [];
    s.questions.forEach((q, i) => {
      displayIds.push(q.id);
      if (s.answers[i] !== undefined && s.answers[i] !== '') answersByQuestionId[q.id] = s.answers[i];
    });
    
    try {
      await api.addResult({ subjectId: s.subjectId, violations: currentViolations, submissionReason: reason, answers: answersByQuestionId, questionIds: displayIds });
      const newHistory = await api.getResults();
      
      const latestResult = newHistory[0]; 
      if (latestResult) {
        setSummary({
          ...latestResult,
          subjectName: latestResult.subjectName || s.subjectName,
          passMarkPercent: s.passMarkPercent,
          allowRetake: s.allowRetake
        });
      }
    } catch (e) { console.error(e); alert("Սխալ: " + e.message); }
    setSession(null); 
    setStep('summary');
    setFinishing(false);
    setTimeout(() => { isFinishingRef.current = false; }, 1000);
  };

  const confirmSubmit = () => {
    isFinishingRef.current = true; 
    if (confirm('Վստա՞հ եք, որ ցանկանում եք ավարտել քննությունը:')) {
      finishExam('Ուղարկված է');
    } else {
      if (fullscreenRequired) document.documentElement.requestFullscreen().catch(() => {});
      isFinishingRef.current = false;
    }
  };

  const selectOption = (val) => setSession((s) => ({ ...s, answers: { ...s.answers, [s.currentIndex]: val } }));
  const nav = (dir) => setSession((s) => {
    const ni = s.currentIndex + dir;
    if (ni < 0 || ni >= s.questions.length) return s;
    return { ...s, currentIndex: ni };
  });

  const handleReturn = () => {
    setStep('select'); setSummary(null); loadData();
  };

  if (!user) return null;

  if (step === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-dark-bg gap-4">
        <i className="fa-solid fa-spinner fa-spin text-4xl text-brand-500"></i>
        <p className="text-gray-400 text-sm animate-pulse">Բեռնվում է...</p>
      </div>
    );
  }

  if (step === 'error') return (
    <div className="max-w-lg mx-auto p-4 mt-20 text-center space-y-4">
      <i className="fa-solid fa-circle-exclamation text-5xl text-red-500"></i>
      <h2 className="text-xl font-bold">Ուշադրություն</h2>
      <p className="text-gray-500">{errorMsg}</p>
      <button onClick={handleReturn} className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl">Վերադառնալ</button>
    </div>
  );

  if (step === 'select') {
    const now = new Date().getTime();
    return (
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-6 text-center">Ընտրեք Քննությունը</h1>
          <div className="grid md:grid-cols-2 gap-4">
            {availableSubjects.map(sub => {
              const tMinutes = sub.timerMinutes !== undefined ? sub.timerMinutes : sub.timerminutes;
              const pMark = sub.passMarkPercent !== undefined ? sub.passMarkPercent : sub.passmarkpercent;
              
              const startT = sub.startTime ? new Date(sub.startTime).getTime() : null;
              const endT = sub.endTime ? new Date(sub.endTime).getTime() : null;
              
              const isStarted = !startT || now >= startT;
              const isEnded = endT && now > endT;
              const isAvailable = isStarted && !isEnded;
              const isSelected = selectedSubject?.id === sub.id;

              return (
                <div key={sub.id} onClick={() => { if (isAvailable) setSelectedSubject(sub); }} 
                  className={`p-6 rounded-3xl border-2 transition-all relative overflow-hidden ${
                    !isAvailable ? 'border-gray-200 dark:border-dark-border bg-gray-100 dark:bg-dark-bg/50 opacity-60 cursor-not-allowed' 
                    : isSelected ? 'border-brand-500 bg-brand-500/5 scale-[1.02] cursor-pointer' 
                    : 'border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card hover:border-brand-300 cursor-pointer'}`}>
                  <h3 className="text-lg font-bold mb-2 flex items-center justify-between">
                    {sub.name}
                    {!isAvailable && <i className="fa-solid fa-lock text-gray-400"></i>}
                  </h3>
                  <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                    <span><i className="fa-regular fa-clock mr-1"></i>{tMinutes} րոպե</span>
                    <span><i className="fa-solid fa-bullseye mr-1"></i>Շեմ՝ {pMark}%</span>
                    <span><i className="fa-solid fa-list-ol mr-1"></i>{sub.totalQuestions} հարց</span>
                  </div>
                  {(startT || endT) && (
                    <div className="mt-3 text-[11px] font-semibold space-y-1 bg-gray-50 dark:bg-dark-bg p-2 rounded-lg border border-gray-100 dark:border-dark-border">
                      {startT && <div className={!isStarted ? 'text-amber-500' : 'text-emerald-500'}><i className="fa-solid fa-calendar-check mr-1"></i>Սկիզբ՝ {formatDateTime(sub.startTime)}</div>}
                      {endT && <div className={isEnded ? 'text-red-500' : 'text-gray-500'}><i className="fa-solid fa-calendar-xmark mr-1"></i>Ավարտ՝ {formatDateTime(sub.endTime)}</div>}
                    </div>
                  )}
                </div>
              );
            })}
            {availableSubjects.length === 0 && (
              <div className="col-span-2 text-center py-8 text-gray-500">
                <i className="fa-solid fa-check-circle text-4xl mb-3 text-emerald-500"></i>
                <p>Դուք արդեն հանձնել եք բոլոր ակտիվ քննությունները:</p>
              </div>
            )}
          </div>
          {availableSubjects.length > 0 && (
            <div className="mt-8 text-center">
              <button onClick={startExam} disabled={!selectedSubject || starting} className="bg-brand-600 hover:bg-brand-700 text-white font-bold py-4 px-12 rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2 mx-auto min-w-[250px]">
                {starting ? <><i className="fa-solid fa-spinner fa-spin"></i> Պատրաստվում է...</> : 'Սկսել Քննությունը'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step === 'portal' && session) {
    const q = session.questions[session.currentIndex];
    const mins = Math.floor(session.remainingSeconds / 60);
    const secs = session.remainingSeconds % 60;
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    
    return (
      <div className="space-y-3 sm:space-y-6 p-3 sm:p-4 select-none">
        {showTimeWarning && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 p-4 rounded-2xl flex items-start gap-3 animate-pulse">
            <i className="fa-solid fa-triangle-exclamation text-2xl mt-0.5"></i>
            <div>
              <h4 className="font-bold">Ուշադրություն</h4>
              <p className="text-sm mt-1">Մնացել է 5 րոպե: Ժամանակը լրանալուց հետո պատասխանները ավտոմատ կպահպանվեն:</p>
            </div>
          </div>
        )}
        <div className="bg-white dark:bg-dark-card border rounded-2xl p-4 flex justify-between items-center">
          <div><h3 className="font-bold">{session.studentName}</h3><p className="text-xs text-gray-500">{session.subjectName}</p></div>
          <div className={`px-3 py-1 rounded-lg text-xs font-bold ${violations > 0 ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>Խախտում: {violations}/{violationLimit}</div>
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg"><i className="fa-solid fa-stopwatch text-brand-500"></i><span className={`font-mono text-lg font-bold ${session.remainingSeconds <= 300 ? 'text-red-500 animate-pulse' : 'text-brand-500'}`}>{timeStr}</span></div>
        </div>
        
        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 bg-white dark:bg-dark-card border rounded-2xl p-6 space-y-6">
            <div className="flex justify-between text-xs font-semibold border-b pb-3"><span>Հարց {session.currentIndex + 1} / {session.questions.length}</span><span className="text-brand-500">{q.points} միավոր</span></div>
            <h2 className="text-xl font-semibold">{q.text}</h2>
            {q.type === 'text' ? (
              <textarea value={session.answers[session.currentIndex] || ''} onChange={(e) => selectOption(e.target.value)} className="w-full bg-white dark:bg-dark-bg text-gray-900 dark:text-gray-100 border rounded-xl p-4 min-h-[150px]" placeholder="Ձեր պատասխանը..." />
            ) : (
              <div className="space-y-3">
                {(q.options || []).map((opt, i) => {
                  const sel = session.answers[session.currentIndex] === i;
                  return (
                    <button key={i} onClick={() => selectOption(i)} className={`w-full text-left p-4 rounded-xl border flex gap-3 ${sel ? 'bg-brand-500/20 border-brand-500' : 'border-gray-200'}`}>
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${sel ? 'bg-brand-600 text-white' : 'bg-gray-100'}`}>{String.fromCharCode(65 + i)}</span>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="flex justify-between border-t pt-4">
              <button onClick={() => nav(-1)} disabled={session.currentIndex === 0} className="px-4 py-2 border rounded-xl disabled:opacity-40">Նախորդ</button>
              <button onClick={() => nav(1)} disabled={session.currentIndex === session.questions.length - 1} className="px-6 py-2 bg-brand-600 text-white rounded-xl disabled:opacity-40">Հաջորդ</button>
            </div>
          </div>
          <div className="bg-white dark:bg-dark-card border rounded-2xl p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-gray-500">Հարցեր</h4>
            <div className="grid grid-cols-5 gap-1.5">
              {session.questions.map((_, i) => (
                <button key={i} onClick={() => setSession((s) => ({ ...s, currentIndex: i }))} className={`h-9 rounded-lg text-xs font-bold border ${session.currentIndex === i ? 'bg-brand-600 text-white' : session.answers[i] !== undefined ? 'bg-brand-500/20 text-brand-500' : 'bg-gray-50'}`}>{i + 1}</button>
              ))}
            </div>
            <button onClick={confirmSubmit} disabled={finishing} className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
              {finishing ? <><i className="fa-solid fa-spinner fa-spin"></i> Ստուգվում է...</> : <><i className="fa-solid fa-paper-plane"></i> Ավարտել</>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'summary' && summary) return (
    <div className="max-w-2xl mx-auto p-4 mt-10">
      <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-3xl p-8 text-center space-y-6 shadow-2xl">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto text-5xl ${summary.needsGrading ? 'bg-amber-500/10 text-amber-500' : summary.passed ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
          <i className={`fa-solid ${summary.needsGrading ? 'fa-clock' : summary.passed ? 'fa-award' : 'fa-circle-xmark'}`}></i>
        </div>
        <h2 className="text-2xl font-bold">{summary.needsGrading ? 'Սպասում է գնահատման' : summary.passed ? 'Անցած է!' : 'Չանցած է'}</h2>
        <div className="grid grid-cols-2 gap-3 bg-gray-50 dark:bg-dark-bg p-5 rounded-2xl max-w-sm mx-auto">
          <div><p className="text-xs text-gray-500 uppercase font-semibold mb-1">Միավոր</p><h3 className="text-2xl font-bold text-brand-500">{summary.score}</h3></div>
          <div><p className="text-xs text-gray-500 uppercase font-semibold mb-1">Տոկոս</p><h3 className="text-2xl font-bold text-blue-500">{summary.percentage}%</h3></div>
        </div>
        <div className="pt-4 border-t border-gray-200 dark:border-dark-border">
          <button onClick={handleReturn} className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 rounded-xl text-sm">Վերադառնալ Գլխավոր էջ</button>
        </div>
      </div>
    </div>
  );

  return null;
}