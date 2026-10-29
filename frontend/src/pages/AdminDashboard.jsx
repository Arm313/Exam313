import { useEffect, useState, useRef } from "react";
import { api } from "../api";
import * as XLSX from "xlsx";

const emptyForm = {
  type: "multiple_choice",
  text: "",
  options: ["", "", "", ""],
  correct: 0,
  points: 1,
};
const optLetters = ["A", "B", "C", "D"];

export default function AdminDashboard({ user }) {
  const [subjects, setSubjects] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [allQuestions, setAllQuestions] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [stats, setStats] = useState({
    subjects: 0,
    questions: 0,
    students: 0,
  });

  const [loading, setLoading] = useState(true);
  const [qLoading, setQLoading] = useState(false);
  const [savingSubject, setSavingSubject] = useState(false);
  const [savingGroups, setSavingGroups] = useState(false);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [addingSubject, setAddingSubject] = useState(false);

  const [newSubjectName, setNewSubjectName] = useState("");
  const [subjectForm, setSubjectForm] = useState(null);
  const [editingSubject, setEditingSubject] = useState(false);
  const [qForm, setQForm] = useState(emptyForm);
  const [editingQId, setEditingQId] = useState(null);

  const [showArchived, setShowArchived] = useState(false);
  const [selectedQIds, setSelectedQIds] = useState([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const [subjectSearch, setSubjectSearch] = useState("");

  // ✅ Փակ/Բաց վիճակներ հարցերի և ֆորմի համար
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [showQuestionsList, setShowQuestionsList] = useState(false);

  const editFormRef = useRef(null);
  const questionsSectionRef = useRef(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [subs, grps, qs, rs] = await Promise.all([
        api.getSubjects(),
        api.getGroups(),
        api.getQuestions(),
        api.getResults(),
      ]);
      setSubjects(subs);
      setGroups(grps);
      setAllQuestions(qs);
      if (subs.length > 0 && !selectedId) setSelectedId(subs[0].id);

      const uniqueStudents = new Set(rs.map((r) => r.studentName)).size;
      setStats({
        subjects: subs.length,
        questions: qs.length,
        students: uniqueStudents,
      });
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setQLoading(true);
    api.getQuestions(selectedId).then((qs) => {
      setQuestions(qs);
      setAllQuestions((prev) => {
        const others = prev.filter((q) => q.subjectId !== selectedId);
        return [...others, ...qs];
      });
      setQLoading(false);
    });
    const s = subjects.find((x) => x.id === selectedId);
    if (s) {
      let parsedGroups = [];
      try {
        parsedGroups =
          typeof s.allowedGroups === "string"
            ? JSON.parse(s.allowedGroups)
            : s.allowedGroups || [];
      } catch (e) {}
      setSubjectForm({ ...s, allowedGroups: parsedGroups });
    }
    setEditingQId(null);
    setQForm(emptyForm);
    setSelectedQIds([]);
  }, [selectedId, subjects]);

  const getSubjectCounts = (subjectId) => {
    const subjQs = allQuestions.filter((q) => q.subjectId === subjectId);
    return {
      active: subjQs.filter((q) => q.isArchived !== 1).length,
      archived: subjQs.filter((q) => q.isArchived === 1).length,
      total: subjQs.length,
    };
  };

  const filteredSubjects = subjects
    .filter((s) => s.name.toLowerCase().includes(subjectSearch.toLowerCase()))
    .sort((a, b) => b.id.localeCompare(a.id));

  const displayedQuestions = questions.filter((q) =>
    showArchived ? q.isArchived === 1 : q.isArchived !== 1,
  );

  const toggleSelectAll = () => {
    if (selectedQIds.length === displayedQuestions.length) setSelectedQIds([]);
    else setSelectedQIds(displayedQuestions.map((q) => q.id));
  };

  const toggleSelectOne = (id) => {
    setSelectedQIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const bulkArchive = async () => {
    if (!confirm(`Արխիվացնե՞լ ընտրված ${selectedQIds.length} հարցերը:`)) return;
    setBulkProcessing(true);
    try {
      await Promise.all(selectedQIds.map((id) => api.archiveQuestion(id)));
      const qs = await api.getQuestions(selectedId);
      setQuestions(qs);
      setAllQuestions((prev) => {
        const others = prev.filter((q) => q.subjectId !== selectedId);
        return [...others, ...qs];
      });
      setSelectedQIds([]);
    } catch (e) {
      alert(e.message);
    } finally {
      setBulkProcessing(false);
    }
  };

  const bulkRestore = async () => {
    if (!confirm(`Վերականգնե՞լ ընտրված ${selectedQIds.length} հարցերը:`))
      return;
    setBulkProcessing(true);
    try {
      await Promise.all(selectedQIds.map((id) => api.restoreQuestion(id)));
      const qs = await api.getQuestions(selectedId);
      setQuestions(qs);
      setAllQuestions((prev) => {
        const others = prev.filter((q) => q.subjectId !== selectedId);
        return [...others, ...qs];
      });
      setSelectedQIds([]);
    } catch (e) {
      alert(e.message);
    } finally {
      setBulkProcessing(false);
    }
  };

  const bulkDelete = async () => {
    if (!confirm(`⚠️ ՋՆՋԵ՞Լ ընտրված ${selectedQIds.length} հարցերը:`)) return;
    setBulkProcessing(true);
    try {
      await Promise.all(selectedQIds.map((id) => api.deleteQuestion(id)));
      const qs = await api.getQuestions(selectedId);
      setQuestions(qs);
      setAllQuestions((prev) => {
        const others = prev.filter((q) => q.subjectId !== selectedId);
        return [...others, ...qs];
      });
      setSelectedQIds([]);
    } catch (e) {
      alert(e.message);
    } finally {
      setBulkProcessing(false);
    }
  };

  const addSubject = async () => {
    if (!newSubjectName.trim()) return;
    setAddingSubject(true);
    try {
      const sub = await api.addSubject({ name: newSubjectName });
      setNewSubjectName("");
      setSubjects((prev) => [sub, ...prev]);
      setSelectedId(sub.id);
      setStats((prev) => ({ ...prev, subjects: prev.subjects + 1 }));
    } catch (e) {
      alert(e.message);
    } finally {
      setAddingSubject(false);
    }
  };

  const saveSubject = async () => {
    setSavingSubject(true);
    try {
      await api.updateSubject(selectedId, subjectForm);
      await loadData();
      setEditingSubject(false);
      alert("✅ Պահպանվեց");
    } catch (e) {
      alert("❌ " + e.message);
    } finally {
      setSavingSubject(false);
    }
  };

  const saveGroupsOnly = async () => {
    setSavingGroups(true);
    try {
      await api.updateSubject(selectedId, subjectForm);
      await loadData();
      alert("✅ Խմբերը պահպանվեցին");
    } catch (e) {
      alert("❌ " + e.message);
    } finally {
      setSavingGroups(false);
    }
  };

  const toggleGroup = (groupName) => {
    setSubjectForm((prev) => {
      let currentGroups = prev.allowedGroups;
      if (!Array.isArray(currentGroups)) currentGroups = [];
      const newGroups = currentGroups.includes(groupName)
        ? currentGroups.filter((g) => g !== groupName)
        : [...currentGroups, groupName];
      return { ...prev, allowedGroups: newGroups };
    });
  };

  const deleteSubject = async () => {
    if (!confirm("Ջնջե՞լ այս առարկան իր բոլոր հարցերով:")) return;
    try {
      await api.deleteSubject(selectedId);
      setSelectedId("");
      setQuestions([]);
      await loadData();
    } catch (e) {
      alert(e.message);
    }
  };

  const submitQuestion = async (e) => {
    e.preventDefault();
    if (!qForm.text.trim()) return alert("Լրացրեք հարցի տեքստը");
    if (
      qForm.type === "multiple_choice" &&
      !qForm.options.every((o) => o.trim())
    )
      return alert("Լրացրեք բոլոր 4 տարբերակները");

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
      setAllQuestions((prev) => {
        const others = prev.filter((q) => q.subjectId !== selectedId);
        return [...others, ...qs];
      });
    } catch (e) {
      alert(e.message);
    } finally {
      setSavingQuestion(false);
    }
  };

  // ✅ Խմբագրելիս ֆորմը բացվում է, էջը չի բարձրանում
  const startEditQuestion = (q) => {
    setShowQuestionForm(true);
    setEditingQId(q.id);
    setQForm({
      type: q.type || "multiple_choice",
      text: q.text,
      options:
        q.options && q.options.length ? [...q.options] : ["", "", "", ""],
      correct: q.correct !== null ? q.correct : 0,
      points: q.points,
    });
    setTimeout(() => {
      editFormRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }, 100);
  };

  const deleteQuestion = async (id) => {
    if (!confirm("Ջնջե՞լ այս հարցը:")) return;
    await api.deleteQuestion(id);
    const qs = await api.getQuestions(selectedId);
    setQuestions(qs);
    setAllQuestions((prev) => {
      const others = prev.filter((q) => q.subjectId !== selectedId);
      return [...others, ...qs];
    });
    setSelectedQIds((prev) => prev.filter((i) => i !== id));
  };

  const archiveQuestion = async (id) => {
    if (!confirm("Արխիվացնե՞լ այս հարցը: Այն չի ցուցադրվի քննության ժամանակ:"))
      return;
    try {
      await api.archiveQuestion(id);
      const qs = await api.getQuestions(selectedId);
      setQuestions(qs);
      setAllQuestions((prev) => {
        const others = prev.filter((q) => q.subjectId !== selectedId);
        return [...others, ...qs];
      });
      setSelectedQIds((prev) => prev.filter((i) => i !== id));
    } catch (e) {
      alert(e.message);
    }
  };

  const restoreQuestion = async (id) => {
    try {
      await api.restoreQuestion(id);
      const qs = await api.getQuestions(selectedId);
      setQuestions(qs);
      setAllQuestions((prev) => {
        const others = prev.filter((q) => q.subjectId !== selectedId);
        return [...others, ...qs];
      });
      setSelectedQIds((prev) => prev.filter((i) => i !== id));
    } catch (e) {
      alert(e.message);
    }
  };

  const handleBulkImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const formatted = data.map((row) => {
          const isText = row["Տեսակ"] === "Տեքստ";
          return {
            type: isText ? "text" : "multiple_choice",
            text: row["Հարց"] || "Անանուն հարց",
            options: isText
              ? []
              : [
                  row["A"] || "",
                  row["B"] || "",
                  row["C"] || "",
                  row["D"] || "",
                ],
            correct: isText
              ? null
              : ["A", "B", "C", "D"].indexOf(row["Ճիշտ"] || "A"),
            points: Number(row["Միավոր"]) || 1,
          };
        });

        const res = await api.bulkImportQuestions(selectedId, formatted);
        alert(`✅ Հաջողությամբ ավելացվեց ${res.added} հարց`);
        const qs = await api.getQuestions(selectedId);
        setQuestions(qs);
        setAllQuestions((prev) => {
          const others = prev.filter((q) => q.subjectId !== selectedId);
          return [...others, ...qs];
        });
      } catch (err) {
        alert("❌ Սխալ ֆայլի ձևաչափ: " + err.message);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = null;
  };

  const exportQuestionsToExcel = () => {
    if (!selectedId) return alert("Ընտրեք առարկա");
    const subject = subjects.find((s) => s.id === selectedId);
    if (!questions || questions.length === 0)
      return alert("Այս առարկայի հարցերը դատարկ են");

    const dataToExport =
      displayedQuestions.length > 0 ? displayedQuestions : questions;

    const data = dataToExport.map((q, i) => {
      const base = {
        "№": i + 1,
        Տեսակ: q.type === "text" ? "Տեքստ" : "Ընտրովի",
        Հարց: q.text,
        Միավոր: q.points,
        Կարգավիճակ: q.isArchived === 1 ? "Արխիվ" : "Ակտիվ",
      };
      if (q.type === "text") {
        return { ...base, A: "", B: "", C: "", D: "", Ճիշտ: "" };
      }
      return {
        ...base,
        A: q.options?.[0] || "",
        B: q.options?.[1] || "",
        C: q.options?.[2] || "",
        D: q.options?.[3] || "",
        Ճիշտ: ["A", "B", "C", "D"][q.correct] || "",
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    const sheetName =
      subject.name.substring(0, 28).replace(/[*?:\\/\[\]]/g, "") || "Հարցեր";
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(
      wb,
      `${subject.name}_հարցեր_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <i className="fa-solid fa-spinner fa-spin text-4xl text-brand-500"></i>
      </div>
    );
  }

  const currentCounts = selectedId
    ? getSubjectCounts(selectedId)
    : { active: 0, archived: 0, total: 0 };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-5">
      {/* Վիճակագրություն */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {[
          {
            label: "Առարկաներ",
            val: stats.subjects,
            icon: "fa-book",
            color: "blue",
          },
          {
            label: "Հարցեր",
            val: stats.questions,
            icon: "fa-clipboard-question",
            color: "emerald",
          },
          {
            label: "Ուսանողներ",
            val: stats.students,
            icon: "fa-users",
            color: "purple",
          },
        ].map((s, i) => (
          <div
            key={i}
            className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border p-4 rounded-2xl flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">
                {s.label}
              </p>
              <h3 className="text-xl sm:text-2xl font-bold mt-1">{s.val}</h3>
            </div>
            <div
              className={`p-2.5 sm:p-3 bg-${s.color}-500/10 text-${s.color}-500 rounded-xl`}
            >
              <i className={`fa-solid ${s.icon} text-lg sm:text-2xl`}></i>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Ձախ — ԱՌԱՐԿԱՆԵՐ */}
        <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold">
              <i className="fa-solid fa-folder-plus text-brand-500 mr-2"></i>
              Առարկաներ
            </h3>
            <label
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs cursor-pointer inline-block transition-colors"
              title="Ներմուծել Excel-ից"
            >
              <i className="fa-solid fa-file-excel mr-1"></i> Import
              <input
                type="file"
                accept=".xlsx,.csv"
                onChange={handleBulkImport}
                className="hidden"
                disabled={!selectedId}
              />
            </label>
          </div>

          <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
            <input
              value={subjectSearch}
              onChange={(e) => setSubjectSearch(e.target.value)}
              placeholder="Փնտրել առարկա..."
              className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
            {filteredSubjects.length === 0 ? (
              <p className="text-xs text-center text-gray-400 py-4">
                {subjectSearch ? "Ոչինչ չգտնվեց" : "Դեռ առարկաներ չկան"}
              </p>
            ) : (
              filteredSubjects.map((s) => {
                const isSelected = selectedId === s.id;
                const counts = getSubjectCounts(s.id);
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? "border-brand-500 bg-brand-500/5"
                        : "border-gray-200 dark:border-dark-border hover:border-brand-300 bg-white dark:bg-dark-bg/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4
                        className={`text-sm font-bold truncate ${isSelected ? "text-brand-500" : "text-gray-800 dark:text-gray-200"}`}
                      >
                        {s.name}
                      </h4>
                      {isSelected && (
                        <i className="fa-solid fa-check text-brand-500 text-xs shrink-0"></i>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500 mt-1.5">
                      <span>
                        <i className="fa-regular fa-clock mr-0.5"></i>{" "}
                        {s.timerMinutes}ր
                      </span>
                      <span>
                        <i className="fa-solid fa-bullseye mr-0.5"></i>{" "}
                        {s.passMarkPercent}%
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        <i className="fa-solid fa-circle-check mr-0.5"></i>
                        {counts.active} ակտիվ
                      </span>
                      {counts.archived > 0 && (
                        <span className="text-amber-600 dark:text-amber-400 font-bold">
                          <i className="fa-solid fa-box-archive mr-0.5"></i>
                          {counts.archived} արխիվ
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-3 border-t border-gray-200 dark:border-dark-border space-y-2">
            <input
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              placeholder="Նոր առարկա..."
              className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl px-4 py-2.5 text-sm"
            />
            <button
              onClick={addSubject}
              disabled={addingSubject}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            >
              {addingSubject ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Ստեղծվում...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-plus"></i> Ավելացնել
                </>
              )}
            </button>
          </div>
        </div>

        {/* Աջ — ԿԱՐԳԱՎՈՐՈՒՄՆԵՐ */}
        <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-5 space-y-3">
          {selectedId && subjectForm ? (
            <>
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-dark-border pb-2.5">
                <h3 className="text-base font-bold truncate">
                  <i className="fa-solid fa-gear text-brand-500 mr-2"></i>
                  {subjectForm.name}
                </h3>
                <button
                  onClick={() => setEditingSubject((v) => !v)}
                  className="text-brand-500 text-sm shrink-0 ml-2"
                >
                  <i
                    className={`fa-solid ${editingSubject ? "fa-xmark" : "fa-pen"}`}
                  ></i>
                </button>
              </div>

              {editingSubject ? (
                <div className="space-y-2.5">
                  <input
                    value={subjectForm.name}
                    onChange={(e) =>
                      setSubjectForm({ ...subjectForm, name: e.target.value })
                    }
                    className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg p-2.5 text-sm"
                    placeholder="Անվանում"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={subjectForm.timerMinutes}
                      onChange={(e) =>
                        setSubjectForm({
                          ...subjectForm,
                          timerMinutes: +e.target.value,
                        })
                      }
                      className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg p-2.5 text-sm"
                      placeholder="Րոպե"
                    />
                    <input
                      type="number"
                      inputMode="numeric"
                      value={subjectForm.passMarkPercent}
                      onChange={(e) =>
                        setSubjectForm({
                          ...subjectForm,
                          passMarkPercent: +e.target.value,
                        })
                      }
                      className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg p-2.5 text-sm"
                      placeholder="Շեմ %"
                    />
                  </div>
                  <button
                    onClick={saveSubject}
                    disabled={savingSubject}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2"
                  >
                    {savingSubject ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin"></i>{" "}
                        Պահպանվում...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-floppy-disk"></i> Պահպանել
                      </>
                    )}
                  </button>
                  <button
                    onClick={deleteSubject}
                    className="w-full bg-red-500/10 text-red-500 border border-red-500/20 text-sm font-semibold py-2 rounded-lg"
                  >
                    <i className="fa-solid fa-trash-can mr-1"></i>Ջնջել
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-gray-50 dark:bg-dark-bg p-3 rounded-lg text-center">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">
                      Տևող.
                    </p>
                    <p className="text-xl font-bold text-brand-500">
                      {subjectForm.timerMinutes}
                      <span className="text-xs">ր</span>
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-dark-bg p-3 rounded-lg text-center">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">
                      Շեմ
                    </p>
                    <p className="text-xl font-bold text-blue-500">
                      {subjectForm.passMarkPercent}
                      <span className="text-xs">%</span>
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-dark-bg p-3 rounded-lg text-center">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">
                      Հարցեր
                    </p>
                    <p className="text-xl font-bold text-emerald-500">
                      {currentCounts.active}
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-gray-200 dark:border-dark-border">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase">
                    Խմբեր
                  </label>
                  <button
                    onClick={() => {
                      const current = subjectForm.allowedGroups || [];
                      const allSelected = current.length === groups.length;
                      setSubjectForm({
                        ...subjectForm,
                        allowedGroups: allSelected
                          ? []
                          : groups.map((g) => g.name),
                      });
                    }}
                    className="text-[10px] text-brand-500 hover:text-brand-600 font-bold"
                  >
                    {subjectForm.allowedGroups?.length === groups.length
                      ? "Մաքրել"
                      : "Բոլորը"}
                  </button>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {groups.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-2">
                      Խմբեր չկան
                    </p>
                  ) : (
                    groups.map((g) => (
                      <label
                        key={g.id}
                        className="flex items-center gap-2 cursor-pointer text-sm bg-gray-50 dark:bg-dark-bg p-2 rounded border border-gray-100 dark:border-dark-border hover:border-brand-500 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={(subjectForm.allowedGroups || []).includes(
                            g.name,
                          )}
                          onChange={() => toggleGroup(g.name)}
                          className="accent-brand-500"
                        />
                        {g.name}
                      </label>
                    ))
                  )}
                </div>
                <button
                  onClick={saveGroupsOnly}
                  disabled={savingGroups}
                  className="w-full mt-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-semibold py-2 rounded-lg flex items-center justify-center gap-2"
                >
                  {savingGroups ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i>{" "}
                      Պահպանվում...
                    </>
                  ) : (
                    "Պահպանել խմբերը"
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-10 text-gray-400">
              <i className="fa-solid fa-hand-pointer text-4xl mb-3"></i>
              <p className="text-sm">Ընտրեք առարկա</p>
            </div>
          )}
        </div>
      </div>

      {selectedId && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => {
              const next = !showQuestionForm;
              setShowQuestionForm(next);
              if (next) {
                setTimeout(() => {
                  editFormRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }, 100);
              }
            }}
            className={`flex items-center justify-between gap-2 p-4 rounded-2xl border-2 font-bold transition-all duration-200 ${
              showQuestionForm
                ? "border-brand-500 bg-brand-500/15 text-brand-500 shadow-lg shadow-brand-500/20 ring-2 ring-brand-500/30"
                : "border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-700 dark:text-gray-200 hover:border-brand-300 hover:bg-brand-500/5"
            } active:scale-95`}
          >
            <div className="flex items-center gap-2">
              <i
                className={`fa-solid ${editingQId ? "fa-pen-to-square" : "fa-square-plus"} text-lg`}
              ></i>
              <span className="text-sm">
                {editingQId ? "Խմբագրել հարցը" : "Ավելացնել նոր հարց"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {showQuestionForm && (
                <span className="text-[10px] uppercase tracking-wider font-bold bg-brand-500 text-white px-2 py-0.5 rounded-full">
                  Բաց
                </span>
              )}
              <i
                className={`fa-solid fa-chevron-${showQuestionForm ? "up" : "down"} text-xs`}
              ></i>
            </div>
          </button>

          <button
            onClick={() => {
              const next = !showQuestionsList;
              setShowQuestionsList(next);
              if (next) {
                setTimeout(() => {
                  questionsSectionRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }, 100);
              }
            }}
            className={`flex items-center justify-between gap-2 p-4 rounded-2xl border-2 font-bold transition-all duration-200 ${
              showQuestionsList
                ? "border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-500/30"
                : "border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-700 dark:text-gray-200 hover:border-emerald-300 hover:bg-emerald-500/5"
            } active:scale-95`}
          >
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-list-check text-lg"></i>
              <span className="text-sm">
                Հարցերի ցանկ ({currentCounts.active + currentCounts.archived})
              </span>
            </div>
            <div className="flex items-center gap-2">
              {showQuestionsList && (
                <span className="text-[10px] uppercase tracking-wider font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                  Բաց
                </span>
              )}
              <i
                className={`fa-solid fa-chevron-${showQuestionsList ? "up" : "down"} text-xs`}
              ></i>
            </div>
          </button>
        </div>
      )}
      {selectedId && showQuestionForm && (
        <div
          ref={editFormRef}
          className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-5 space-y-3"
        >
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-dark-border pb-2.5">
            <h3 className="text-base font-bold">
              <i
                className={`fa-solid ${editingQId ? "fa-pen-to-square" : "fa-square-plus"} text-brand-500 mr-2`}
              ></i>
              {editingQId ? "Խմբագրել Հարցը" : "Նոր Հարց"}
            </h3>
            <button
              onClick={() => {
                setShowQuestionForm(false);
                setEditingQId(null);
                setQForm(emptyForm);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>

          <form onSubmit={submitQuestion} className="space-y-3">
            <div className="flex bg-gray-100 dark:bg-dark-bg p-1 rounded-xl w-full sm:w-64">
              <button
                type="button"
                onClick={() => setQForm({ ...qForm, type: "multiple_choice" })}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg ${qForm.type !== "text" ? "bg-white dark:bg-dark-card text-brand-500 shadow-sm" : "text-gray-500"}`}
              >
                📝 Ընտրովի
              </button>
              <button
                type="button"
                onClick={() => setQForm({ ...qForm, type: "text" })}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg ${qForm.type === "text" ? "bg-white dark:bg-dark-card text-brand-500 shadow-sm" : "text-gray-500"}`}
              >
                ✍️ Տեքստ
              </button>
            </div>
            <textarea
              value={qForm.text}
              onChange={(e) => setQForm({ ...qForm, text: e.target.value })}
              rows={3}
              placeholder="Հարցի տեքստը..."
              required
              className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl p-3 text-sm focus:outline-none focus:border-brand-500"
            />
            {qForm.type !== "text" && (
              <div className="grid grid-cols-2 gap-2">
                {qForm.options.map((opt, i) => (
                  <input
                    key={i}
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...qForm.options];
                      newOpts[i] = e.target.value;
                      setQForm({ ...qForm, options: newOpts });
                    }}
                    required
                    placeholder={`Տարբերակ ${optLetters[i]}`}
                    className="bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl p-2.5 text-sm focus:outline-none focus:border-brand-500"
                  />
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {qForm.type !== "text" && (
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase">
                    Ճիշտ
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {optLetters.map((l, i) => (
                      <label
                        key={i}
                        className={`flex items-center justify-center py-2 border rounded-lg cursor-pointer ${qForm.correct === i ? "border-brand-500 bg-brand-500/10" : "border-gray-200 dark:border-dark-border"}`}
                      >
                        <input
                          type="radio"
                          name="correct"
                          checked={qForm.correct === i}
                          onChange={() => setQForm({ ...qForm, correct: i })}
                          className="hidden"
                        />
                        <span className="text-xs font-bold">{l}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className={qForm.type === "text" ? "col-span-2" : ""}>
                <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase">
                  Միավոր
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="100"
                  value={qForm.points}
                  onChange={(e) =>
                    setQForm({ ...qForm, points: +e.target.value })
                  }
                  className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg p-2 text-sm focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={savingQuestion}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
            >
              {savingQuestion ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Պահպանվում...
                </>
              ) : (
                <>
                  <i
                    className={`fa-solid ${editingQId ? "fa-floppy-disk" : "fa-plus-circle"}`}
                  ></i>{" "}
                  {editingQId ? "Թարմացնել" : "Պահպանել"}
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* ✅ ՀԱՐՑԵՐԻ ԱՂՅՈՒՍԱԿ — ՄԻԱՅՆ ԲԱՑԵԼՈՒՑ ՀԵՏՈ */}
      {selectedId && showQuestionsList && (
        <div
          ref={questionsSectionRef}
          className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-5"
        >
          <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
            <h3 className="text-base font-bold">
              <i className="fa-solid fa-list-check text-brand-500 mr-2"></i>
              Հարցեր {showArchived ? "(Արխիվ)" : ""} (
              {displayedQuestions.length})
            </h3>

            <div className="flex flex-wrap gap-1.5">
              {selectedId && (
                <button
                  onClick={exportQuestionsToExcel}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  <i className="fa-solid fa-file-excel"></i> Excel
                </button>
              )}
              <button
                onClick={() => {
                  setShowArchived(!showArchived);
                  setSelectedQIds([]);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${showArchived ? "bg-amber-500 text-white" : "bg-gray-100 dark:bg-dark-bg text-gray-600 dark:text-gray-300"}`}
              >
                <i
                  className={`fa-solid ${showArchived ? "fa-list" : "fa-box-archive"} mr-1`}
                ></i>
                {showArchived ? "Ակտիվ" : "Արխիվ"}
              </button>
              <button
                onClick={() => setShowQuestionsList(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
          </div>

          {selectedQIds.length > 0 && (
            <div className="bg-brand-500/10 border border-brand-500/30 rounded-lg p-2 mb-3 flex flex-wrap items-center justify-between gap-1.5">
              <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
                {selectedQIds.length} ընտրված
              </span>
              <div className="flex flex-wrap gap-1">
                {!showArchived ? (
                  <button
                    onClick={bulkArchive}
                    disabled={bulkProcessing}
                    className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 disabled:opacity-50"
                  >
                    {bulkProcessing ? (
                      <i className="fa-solid fa-spinner fa-spin"></i>
                    ) : (
                      <i className="fa-solid fa-box-archive"></i>
                    )}{" "}
                    Արխիվ
                  </button>
                ) : (
                  <button
                    onClick={bulkRestore}
                    disabled={bulkProcessing}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 disabled:opacity-50"
                  >
                    {bulkProcessing ? (
                      <i className="fa-solid fa-spinner fa-spin"></i>
                    ) : (
                      <i className="fa-solid fa-box-open"></i>
                    )}{" "}
                    Վերականգ.
                  </button>
                )}
                <button
                  onClick={bulkDelete}
                  disabled={bulkProcessing}
                  className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 disabled:opacity-50"
                >
                  {bulkProcessing ? (
                    <i className="fa-solid fa-spinner fa-spin"></i>
                  ) : (
                    <i className="fa-solid fa-trash-can"></i>
                  )}{" "}
                  Ջնջել
                </button>
                <button
                  onClick={() => setSelectedQIds([])}
                  className="bg-gray-500 hover:bg-gray-600 text-white text-[10px] font-bold px-2 py-1 rounded"
                >
                  Չեղարկել
                </button>
              </div>
            </div>
          )}

          {qLoading ? (
            <div className="text-center py-6">
              <i className="fa-solid fa-spinner fa-spin text-2xl text-brand-500"></i>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-white dark:bg-dark-card z-10">
                  <tr className="border-b border-gray-200 dark:border-dark-border text-[10px] uppercase font-semibold text-gray-500">
                    <th className="py-2 px-2 w-8">
                      <input
                        type="checkbox"
                        checked={
                          displayedQuestions.length > 0 &&
                          selectedQIds.length === displayedQuestions.length
                        }
                        onChange={toggleSelectAll}
                        className="accent-brand-500 w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th className="py-2 px-2">#</th>
                    <th className="py-2 px-2">Տեսակ</th>
                    <th className="py-2 px-2">Տեքստ</th>
                    <th className="py-2 px-2">Մ.</th>
                    <th className="py-2 px-2 text-right">Գործ.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-dark-border text-xs">
                  {displayedQuestions.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center py-5 text-gray-400 text-xs"
                      >
                        Հարցեր չկան
                      </td>
                    </tr>
                  )}

                  {displayedQuestions.map((q, idx) => (
                    <tr
                      key={q.id}
                      className={`${editingQId === q.id ? "bg-amber-500/5" : ""} ${selectedQIds.includes(q.id) ? "bg-brand-500/5" : ""}`}
                    >
                      <td className="py-2 px-2">
                        <input
                          type="checkbox"
                          checked={selectedQIds.includes(q.id)}
                          onChange={() => toggleSelectOne(q.id)}
                          className="accent-brand-500 w-4 h-4 cursor-pointer"
                        />
                      </td>
                      <td className="py-2 px-2 font-bold text-gray-400">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-2">
                        {q.type === "text" ? (
                          <span className="bg-purple-500/10 text-purple-500 px-1.5 py-0.5 rounded font-bold text-[10px]">
                            ✍️
                          </span>
                        ) : (
                          <span className="bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded font-bold text-[10px]">
                            📝
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 max-w-[200px] truncate">
                        {q.text}
                      </td>
                      <td className="py-2 px-2">{q.points}</td>
                      <td className="py-2 px-2 text-right whitespace-nowrap">
                        {!showArchived ? (
                          <>
                            <button
                              type="button"
                              onClick={() => startEditQuestion(q)}
                              className="text-blue-500 p-2 hover:bg-blue-500/10 rounded-lg"
                              title="Խմբագրել"
                            >
                              <i className="fa-solid fa-pen text-xs"></i>
                            </button>
                            <button
                              type="button"
                              onClick={() => archiveQuestion(q.id)}
                              className="text-amber-500 p-2 hover:bg-amber-500/10 rounded-lg"
                              title="Արխիվ"
                            >
                              <i className="fa-solid fa-box-archive text-xs"></i>
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteQuestion(q.id)}
                              className="text-red-500 p-2 hover:bg-red-500/10 rounded-lg"
                              title="Ջնջել"
                            >
                              <i className="fa-solid fa-trash-can text-xs"></i>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => restoreQuestion(q.id)}
                              className="text-emerald-500 p-2 hover:bg-emerald-500/10 rounded-lg"
                              title="Վերականգնել"
                            >
                              <i className="fa-solid fa-box-open text-xs"></i>
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteQuestion(q.id)}
                              className="text-red-500 p-2 hover:bg-red-500/10 rounded-lg"
                              title="Ջնջել"
                            >
                              <i className="fa-solid fa-trash-can text-xs"></i>
                            </button>
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
      )}
    </div>
  );
}
