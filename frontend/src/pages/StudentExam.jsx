import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { auth } from "../auth";

export default function StudentExam({ user }) {
  const navigate = useNavigate();
  const [step, setStep] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [session, setSession] = useState(null);
  const [violations, setViolations] = useState(0);
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [violationMsg, setViolationMsg] = useState("");
  const [summary, setSummary] = useState(null);
  const [settings, setSettings] = useState({
    violationLimit: "3",
    fullscreenRequired: "1",
  });
  const timerRef = useRef(null);
  const sessionRef = useRef(null);

  const violationLimit = parseInt(settings.violationLimit || "3");
  const fullscreenRequired = settings.fullscreenRequired === "1";

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    if (!user) {
      navigate("/student/login");
      return;
    }
    Promise.all([api.getSubjects(), api.getSettings()])
      .then(async ([subs, st]) => {
        setSettings(st);
        const activeList = [];
        const now = new Date().getTime();

        for (const s of subs) {
          if (s.isActive === 0) continue;

          // ✅ ՍՏՈՒԳՈՒՄ ԵՆՔ ԽՄԲԵՐԸ
          const allowedGroups = s.allowedGroups
            ? JSON.parse(s.allowedGroups)
            : [];
          if (allowedGroups.length > 0 && !allowedGroups.includes(user.group))
            continue;

          const isStarted =
            !s.startTime || now >= new Date(s.startTime).getTime();
          const isNotEnded = !s.endTime || now <= new Date(s.endTime).getTime();

          if (isStarted && isNotEnded) {
            const attempts = await api.getAttempts(s.id);
            const canTake = s.allowRetake || attempts.count === 0;
            if (canTake) activeList.push(s);
          }
        }
        if (activeList.length === 0) {
          setErrorMsg("Ակտիվ քննություններ չկան:");
          setStep("error");
        } else {
          setAvailableSubjects(activeList);
          setStep("select");
        }
      })
      .catch(() => {
        setErrorMsg("Սխալ տվյալներ բեռնելիս:");
        setStep("error");
      });
  }, [user, navigate]);

  // Anti-cheat
  useEffect(() => {
    if (!session || session.status !== "in_progress") return;
    const register = (msg) => {
      setViolations((v) => {
        const n = v + 1;
        if (n >= violationLimit)
          finishExam("Դադարեցվել է խախտումների պատճառով");
        else {
          setViolationMsg(msg);
          setShowViolationModal(true);
        }
        return n;
      });
    };
    const onCtx = (e) => {
      e.preventDefault();
      register("Աջ կտտոցն արգելված է:");
    };
    const onCopy = (e) => {
      e.preventDefault();
      register("Copy/Paste արգելված է:");
    };
    const onVis = () => {
      if (document.hidden) register("Դուք լքել եք էջը:");
    };
    const onFs = () => {
      if (
        fullscreenRequired &&
        !document.fullscreenElement &&
        sessionRef.current?.status === "in_progress"
      )
        register("Դուրս եք եկել Fullscreen-ից:");
    };
    const onKey = (e) => {
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && ["I", "J"].includes(e.key.toUpperCase()))
      ) {
        e.preventDefault();
        register("Այս ստեղները արգելված են:");
      }
    };
    document.addEventListener("contextmenu", onCtx);
    document.addEventListener("copy", onCopy);
    document.addEventListener("visibilitychange", onVis);
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("contextmenu", onCtx);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("visibilitychange", onVis);
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("keydown", onKey);
    };
  }, [session?.status, violationLimit, fullscreenRequired]);

  const startExam = async () => {
    if (!selectedSubject) return;
    try {
      const qs = await api.getQuestions(selectedSubject.id);
      if (!qs.length) return alert("Հարցեր չկան:");
      if (fullscreenRequired) {
        try {
          await document.documentElement.requestFullscreen();
        } catch {}
      }
      setSession({
        studentName: user.name,
        studentGroup: user.group,
        subjectId: selectedSubject.id,
        subjectName: selectedSubject.name,
        timerMinutes: selectedSubject.timerMinutes,
        passMarkPercent: selectedSubject.passMarkPercent,
        showAnswersAfter: !!selectedSubject.showAnswersAfter,
        questions: qs,
        answers: {},
        currentIndex: 0,
        remainingSeconds: selectedSubject.timerMinutes * 60,
        status: "in_progress",
      });
      setViolations(0);
      setStep("portal");
    } catch (e) {
      alert("Սխալ: " + e.message);
    }
  };

  useEffect(() => {
    if (step !== "portal" || !session) return;
    timerRef.current = setInterval(() => {
      setSession((s) => {
        if (!s) return s;
        const rem = s.remainingSeconds - 1;
        if (rem <= 0) {
          clearInterval(timerRef.current);
          finishExam("Ժամանակն ավարտվեց");
          return { ...s, remainingSeconds: 0 };
        }
        return { ...s, remainingSeconds: rem };
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [step]);

  const finishExam = async (reason = "Ավարտված") => {
    clearInterval(timerRef.current);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    const s = sessionRef.current;
    if (!s) return;
    const answersByQuestionId = {};
    const displayIds = [];
    s.questions.forEach((q, i) => {
      displayIds.push(q.id);
      if (s.answers[i] !== undefined && s.answers[i] !== "")
        answersByQuestionId[q.id] = s.answers[i];
    });
    try {
      const fullResult = await api.addResult({
        subjectId: s.subjectId,
        violations,
        submissionReason: reason,
        answers: answersByQuestionId,
        questionIds: displayIds,
      });
      setSummary(fullResult);
    } catch (e) {
      console.error(e);
    }
    setSession(null);
    setStep("summary");
  };

  const confirmSubmit = () => {
    const answered = Object.keys(session.answers).length;
    if (
      !confirm(
        `Պատասխանել եք ${answered}/${session.questions.length} հարցի: Ավարտե՞լ:`,
      )
    )
      return;
    finishExam("Ուղարկված է");
  };

  const selectOption = (val) =>
    setSession((s) => ({
      ...s,
      answers: { ...s.answers, [s.currentIndex]: val },
    }));
  const nav = (dir) =>
    setSession((s) => {
      const ni = s.currentIndex + dir;
      if (ni < 0 || ni >= s.questions.length) return s;
      return { ...s, currentIndex: ni };
    });

  const handleExit = () => {
    auth.clear();
    navigate("/");
    window.location.reload();
  };

  if (!user) return null;
  if (step === "loading")
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <i className="fa-solid fa-spinner fa-spin text-3xl text-brand-500"></i>
      </div>
    );
  if (step === "error")
    return (
      <div className="max-w-lg mx-auto p-4 mt-20">
        <div className="bg-white dark:bg-dark-card border border-red-200 rounded-3xl p-8 text-center space-y-4">
          <h2 className="text-xl font-bold">Ուշադրություն</h2>
          <p className="text-sm text-gray-500">{errorMsg}</p>
          <button
            onClick={handleExit}
            className="w-full bg-gray-100 dark:bg-dark-bg text-gray-700 font-bold py-3 rounded-xl"
          >
            Վերադառնալ
          </button>
        </div>
      </div>
    );

  if (step === "select")
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6 mt-10">
        <h1 className="text-3xl font-bold mb-8 text-center">
          Ընտրեք Քննությունը
        </h1>
        <div className="grid md:grid-cols-2 gap-4">
          {availableSubjects.map((sub) => (
            <div
              key={sub.id}
              onClick={() => setSelectedSubject(sub)}
              className={`cursor-pointer p-6 rounded-3xl border-2 transition-all ${selectedSubject?.id === sub.id ? "border-brand-500 bg-brand-500/5 scale-[1.02]" : "border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card"}`}
            >
              <h3 className="text-lg font-bold mb-2">{sub.name}</h3>
              <div className="flex gap-4 text-xs text-gray-500">
                <span>
                  <i className="fa-regular fa-clock mr-1"></i>
                  {sub.timerMinutes} րոպե
                </span>
                <span>
                  <i className="fa-solid fa-bullseye mr-1"></i>Շեմ՝{" "}
                  {sub.passMarkPercent}%
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <button
            onClick={startExam}
            disabled={!selectedSubject}
            className="bg-brand-600 text-white font-bold py-4 px-12 rounded-2xl disabled:opacity-50"
          >
            Սկսել
          </button>
        </div>
      </div>
    );

  if (step === "portal" && session) {
    const q = session.questions[session.currentIndex];
    const timeStr = `${String(Math.floor(session.remainingSeconds / 60)).padStart(2, "0")}:${String(session.remainingSeconds % 60).padStart(2, "0")}`;
    return (
      <div className="space-y-3 sm:space-y-6 p-3 sm:p-4 select-none">
        <div className="bg-white dark:bg-dark-card border rounded-2xl p-4 flex justify-between items-center">
          <div>
            <h3 className="font-bold">{session.studentName}</h3>
            <p className="text-xs text-gray-500">{session.subjectName}</p>
          </div>
          <div
            className={`px-3 py-1 rounded-lg text-xs font-bold ${violations > 0 ? "bg-red-500/20 text-red-500" : "bg-emerald-500/10 text-emerald-500"}`}
          >
            Խախտում: {violations}/{violationLimit}
          </div>
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg">
            <i className="fa-solid fa-stopwatch text-brand-500"></i>
            <span
              className={`font-mono text-lg font-bold ${session.remainingSeconds <= 120 ? "text-red-500 animate-pulse" : "text-brand-500"}`}
            >
              {timeStr}
            </span>
          </div>
        </div>
        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 bg-white dark:bg-dark-card border rounded-2xl p-6 space-y-6">
            <div className="flex justify-between text-xs font-semibold border-b pb-3">
              <span>
                Հարց {session.currentIndex + 1} / {session.questions.length}
              </span>
              <span className="text-brand-500">{q.points} միավոր</span>
            </div>
            <h2 className="text-xl font-semibold">{q.text}</h2>
            {q.type === "text" ? (
              <textarea
                value={session.answers[session.currentIndex] || ""}
                onChange={(e) => selectOption(e.target.value)}
                placeholder="Գրեք ձեր պատասխանը այստեղ..."
                className="w-full bg-white dark:bg-dark-bg text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-dark-border rounded-xl p-4 min-h-[150px] focus:outline-none focus:border-brand-500"
              />
            ) : (
              <div className="space-y-3">
                {(q.options || []).map((opt, i) => {
                  const sel = session.answers[session.currentIndex] === i;
                  return (
                    <button
                      key={i}
                      onClick={() => selectOption(i)}
                      className={`w-full text-left p-4 rounded-xl border flex gap-3 ${sel ? "bg-brand-500/20 border-brand-500" : "border-gray-200"}`}
                    >
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${sel ? "bg-brand-600 text-white" : "bg-gray-100"}`}
                      >
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="flex justify-between border-t pt-4">
              <button
                onClick={() => nav(-1)}
                disabled={session.currentIndex === 0}
                className="px-4 py-2 border rounded-xl disabled:opacity-40"
              >
                Նախորդ
              </button>
              <button
                onClick={() => nav(1)}
                disabled={session.currentIndex === session.questions.length - 1}
                className="px-6 py-2 bg-brand-600 text-white rounded-xl disabled:opacity-40"
              >
                Հաջորդ
              </button>
            </div>
          </div>
          <div className="bg-white dark:bg-dark-card border rounded-2xl p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-gray-500">
              Հարցեր
            </h4>
            <div className="grid grid-cols-5 gap-1.5">
              {session.questions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSession((s) => ({ ...s, currentIndex: i }))}
                  className={`h-9 rounded-lg text-xs font-bold border ${session.currentIndex === i ? "bg-brand-600 text-white" : session.answers[i] !== undefined ? "bg-brand-500/20 text-brand-500" : "bg-gray-50"}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              onClick={confirmSubmit}
              className="w-full bg-red-600 text-white font-bold py-3 rounded-xl text-sm"
            >
              Ավարտել
            </button>
          </div>
        </div>
        {showViolationModal && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-dark-card rounded-3xl p-6 max-w-md w-full text-center space-y-5">
              <i className="fa-solid fa-triangle-exclamation text-red-500 text-4xl"></i>
              <h3 className="text-xl font-bold">Խախտում!</h3>
              <p className="text-sm">{violationMsg}</p>
              <button
                onClick={() => {
                  setShowViolationModal(false);
                  if (fullscreenRequired)
                    document.documentElement
                      .requestFullscreen()
                      .catch(() => {});
                }}
                className="w-full bg-red-600 text-white font-bold py-3 rounded-xl"
              >
                Ընդունում եմ
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ✅ ՍԻՐՈՒՆ SUMMARY ԷՋԸ
  if (step === "summary" && summary) {
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-6 mt-10">
        <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto text-4xl ${summary.needsGrading ? "bg-amber-500/10 text-amber-500" : "bg-brand-500/10 text-brand-500"}`}
          >
            <i
              className={`fa-solid ${summary.needsGrading ? "fa-hourglass-half fa-spin" : "fa-check-circle"}`}
            ></i>
          </div>
          <div>
            <h2 className="text-2xl font-bold">
              {summary.needsGrading
                ? "Սպասում է գնահատման"
                : "Քննությունն Ավարտված է"}
            </h2>
            <p className="text-sm text-gray-500 mt-2">
              {summary.needsGrading
                ? "Խնդրում ենք սպասել դասախոսի գնահատմանը:"
                : "Ձեր պատասխանները պահպանված են:"}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border p-4 rounded-2xl">
            <div>
              <p className="text-xs text-gray-500 uppercase">Միավոր</p>
              <h3 className="text-xl font-bold text-brand-500">
                {summary.score}
              </h3>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Տոկոս</p>
              <h3 className="text-xl font-bold text-blue-500">
                {summary.percentage}%
              </h3>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Խախտում</p>
              <h3 className="text-xl font-bold text-amber-500">
                {summary.violations}
              </h3>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-dark-border">
            <button
              onClick={handleExit}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 rounded-xl text-sm transition-colors"
            >
              <i className="fa-solid fa-right-from-bracket mr-2"></i>Ավարտել և
              Դուրս գալ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
