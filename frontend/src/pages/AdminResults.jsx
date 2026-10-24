import { useEffect, useState } from 'react';
import { api } from '../api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { NOTO_ARMENIAN_BASE64 } from '../utils/fonts';

export default function AdminResults() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [subjects, setSubjects] = useState([]);
  
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterGroup, setFilterGroup] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterArchive, setFilterArchive] = useState('active');

  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

  const load = async () => {
    setLoading(true);
    try { 
      const [res, subs] = await Promise.all([api.getResults(), api.getSubjects()]);
      setResults(res); 
      setSubjects(subs);
    }
    catch (e) { alert(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // ✅ ՋՆՋԵԼՈՒ ՖՈՒՆԿՑԻԱ
  const handleDelete = async (id, studentName) => {
    if (!confirm(`Ջնջե՞լ ${studentName}-ի այս արդյունքը: Այն հնարավոր չի լինի վերականգնել:`)) return;
    try { await api.deleteResult(id); load(); } 
    catch (e) { alert(e.message); }
  };

  // ✅ ԱՐԽԻՎԱՑՄԱՆ ՖՈՒՆԿՑԻԱ
  const handleArchive = async (id, currentStatus) => {
    try { await api.archiveResult(id, !currentStatus); load(); } 
    catch (e) { alert(e.message); }
  };

  const clearAll = async () => {
    if (!confirm('Մաքրե՞լ ԲՈԼՈՐ արդյունքները:')) return;
    await api.clearResults(); load();
  };

  const uniqueGroups = [...new Set(results.map(r => r.studentGroup))].filter(Boolean);

  let filteredResults = results.filter(r => {
    if (filterSubject !== 'all' && r.subjectId !== filterSubject) return false;
    if (filterGroup !== 'all' && r.studentGroup !== filterGroup) return false; 
    if (filterStatus === 'passed' && !r.passed) return false;
    if (filterStatus === 'failed' && (r.passed || r.needsGrading)) return false;
    if (filterStatus === 'pending' && !r.needsGrading) return false;
    if (filterArchive === 'active' && r.isArchived) return false;
    if (filterArchive === 'archived' && !r.isArchived) return false;
    return true;
  });

  filteredResults.sort((a, b) => {
    if (sortConfig.key === 'percentage') {
      return sortConfig.direction === 'asc' ? a.percentage - b.percentage : b.percentage - a.percentage;
    }
    if (sortConfig.key === 'studentName') {
      return sortConfig.direction === 'asc' ? a.studentName.localeCompare(b.studentName) : b.studentName.localeCompare(a.studentName);
    }
    return 0;
  });

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const getGroupStats = () => {
    if (filterGroup === 'all') return null;
    const groupResults = results.filter(r => r.studentGroup === filterGroup && !r.isArchived);
    const passed = groupResults.filter(r => r.passed).length;
    const avg = groupResults.length ? Math.round(groupResults.reduce((acc, curr) => acc + curr.percentage, 0) / groupResults.length) : 0;
    return { total: groupResults.length, passed, avg };
  };
  const groupStats = getGroupStats();

  // ... (exportExcel, exportPDF, handleGrade ֆունկցիաները մնում են նույնը)
  const exportExcel = () => {
    if (!filteredResults.length) return alert('Արդյունքներ չկան');
    const data = filteredResults.map((r, i) => ({
      '№': i + 1, 'Ուսանող': r.studentName, 'Խումբ': r.studentGroup, 'Առարկա': r.subjectName,
      'Միավոր': r.score, 'Տոկոս': `${r.percentage}%`, 
      'Կարգավիճակ': r.isArchived ? 'Արխիվ' : r.needsGrading ? 'Սպասում է' : r.passed ? 'Անցել է' : 'Չի անցել',
      'Խախտումներ': r.violations || 0, 'Ամսաթիվ': r.date,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Արդյունքներ');
    XLSX.writeFile(wb, `EduExam_Results_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportPDF = () => {
    if (!filteredResults.length) return alert('Արդյունքներ չկան');
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.addFileToVFS('NotoSansArmenian.ttf', NOTO_ARMENIAN_BASE64);
    doc.addFont('NotoSansArmenian.ttf', 'NotoSansArmenian', 'normal');
    doc.setFont('NotoSansArmenian');
    doc.setFontSize(18);
    doc.text('EduExam Pro — Արդյունքներ', 14, 16);
    doc.setFontSize(10);
    doc.text(`Արտահանման ամսաթիվ: ${new Date().toLocaleString('hy-AM')}`, 14, 23);
    
    autoTable(doc, {
      startY: 30,
      head: [['№', 'Ուսանող', 'Խումբ', 'Առարկա', 'Միավոր', 'Տոկոս', 'Կարգավիճակ', 'Խախտ.', 'Ամսաթիվ']],
      body: filteredResults.map((r, i) => [i + 1, r.studentName, r.studentGroup, r.subjectName, r.score, `${r.percentage}%`, r.needsGrading ? 'Սպասում է' : r.passed ? 'Անցել է' : 'Չի անցել', r.violations || 0, new Date(r.date).toLocaleDateString('hy-AM')]),
      styles: { font: 'NotoSansArmenian', fontSize: 8 },
      headStyles: { fillColor: [22, 163, 74], font: 'NotoSansArmenian' },
      bodyStyles: { font: 'NotoSansArmenian' },
    });
    doc.save(`EduExam_Results_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handleGrade = async (resultId, questionId, earnedPoints, maxPoints) => {
    const safePoints = Math.min(Number(earnedPoints), maxPoints);
    try {
      await api.gradeResult(resultId, questionId, safePoints);
      const updatedAnswers = detail.answers.map(a => 
        a.questionId === questionId ? { ...a, earnedPoints: safePoints, isCorrect: safePoints >= a.points } : a
      );
      const stillNeedsGrading = updatedAnswers.some(a => a.type === 'text' && (a.earnedPoints === undefined || a.earnedPoints === null));
      setDetail({ ...detail, answers: updatedAnswers, needsGrading: stillNeedsGrading });
      load(); 
    } catch (e) { alert(e.message); }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      
      {/* ՖԻԼՏՐՆԵՐ */}
      <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-4 flex flex-wrap gap-3 items-center justify-between shadow-sm">
        <div className="flex flex-wrap gap-3 items-center flex-1">
          <div>
            <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Առարկա</label>
            <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} className="bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg px-3 py-1.5 text-xs text-gray-800 dark:text-gray-200">
              <option value="all">Բոլորը</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Խումբ</label>
            <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)} className="bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg px-3 py-1.5 text-xs text-gray-800 dark:text-gray-200">
              <option value="all">Բոլորը</option>
              {uniqueGroups.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Կարգավիճակ</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg px-3 py-1.5 text-xs text-gray-800 dark:text-gray-200">
              <option value="all">Բոլորը</option>
              <option value="passed">Անցած</option>
              <option value="failed">Չանցած</option>
              <option value="pending">Սպասում է</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={exportExcel} className="bg-emerald-600 text-white text-xs font-semibold px-3 py-2 rounded-xl"><i className="fa-solid fa-file-excel mr-1"></i>Excel</button>
          <button onClick={exportPDF} className="bg-red-600 text-white text-xs font-semibold px-3 py-2 rounded-xl"><i className="fa-solid fa-file-pdf mr-1"></i>PDF</button>
          <button onClick={clearAll} className="bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-semibold px-3 py-2 rounded-xl">Մաքրել</button>
        </div>
      </div>

      {/* ԽՄԲԻ ԱՄՓՈՓՈՒՄ */}
      {groupStats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-2xl p-4 text-center">
            <p className="text-xs text-blue-600 dark:text-blue-400 uppercase font-bold">Հանձնել են</p>
            <h3 className="text-2xl font-bold text-blue-700 dark:text-blue-300">{groupStats.total} ուսանող</h3>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl p-4 text-center">
            <p className="text-xs text-emerald-600 dark:text-emerald-400 uppercase font-bold">Անցածներ</p>
            <h3 className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{groupStats.passed} ուսանող</h3>
          </div>
          <div className="bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/20 rounded-2xl p-4 text-center">
            <p className="text-xs text-brand-600 dark:text-brand-400 uppercase font-bold">Խմբի Միջինը</p>
            <h3 className="text-2xl font-bold text-brand-700 dark:text-brand-300">{groupStats.avg}%</h3>
          </div>
        </div>
      )}

      {/* ✅ ԱՂՅՈՒՍԱԿ ՍՈՐՏԱՎՈՐՄԱՆ ԿՈՃԱԿՆԵՐՈՎ ԵՎ ԳՈՐԾՈՂՈՒԹՅՈՒՆՆԵՐՈՎ */}
      <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-5">
        
        {/* Սորտավորման վահանակ */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs text-gray-500 font-semibold">Սորտավորել.</span>
          <button onClick={() => requestSort('studentName')} className={`px-3 py-1 rounded-lg text-xs font-semibold border ${sortConfig.key === 'studentName' ? 'bg-brand-500 text-white border-brand-500' : 'bg-gray-50 dark:bg-dark-bg border-gray-200 dark:border-dark-border hover:bg-gray-100'}`}>
            Անունով {sortConfig.key === 'studentName' && (sortConfig.direction === 'asc' ? '⬆' : '⬇')}
          </button>
          <button onClick={() => requestSort('percentage')} className={`px-3 py-1 rounded-lg text-xs font-semibold border ${sortConfig.key === 'percentage' ? 'bg-brand-500 text-white border-brand-500' : 'bg-gray-50 dark:bg-dark-bg border-gray-200 dark:border-dark-border hover:bg-gray-100'}`}>
            Միավորով {sortConfig.key === 'percentage' && (sortConfig.direction === 'asc' ? '⬆' : '⬇')}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200 dark:border-dark-border text-xs uppercase text-gray-500">
                <th className="py-3 px-3">Ուսանող</th>
                <th className="py-3 px-3">Խումբ</th>
                <th className="py-3 px-3">Առարկա</th>
                <th className="py-3 px-3">Միավոր</th>
                <th className="py-3 px-3">Կարգավիճակ</th>
                <th className="py-3 px-3">Գործողություն</th>
                <th className="py-3 px-3 text-right">Մանրամասն</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-dark-border text-sm">
              {filteredResults.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-dark-bg/40">
                  <td className="py-3 px-3 font-bold text-gray-800 dark:text-gray-200">{r.studentName}</td>
                  <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{r.studentGroup}</td>
                  <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{r.subjectName}</td>
                  <td className="py-3 px-3 font-mono font-bold text-gray-800 dark:text-gray-200">{r.score} <span className="text-xs text-blue-500 font-normal">({r.percentage}%)</span></td>
                  <td className="py-3 px-3">
                    {r.needsGrading ? <span className="bg-amber-500/10 text-amber-500 px-2 py-1 rounded-lg text-xs font-bold">Ստուգում</span> : <span className={`px-2 py-1 rounded-lg text-xs font-bold ${r.passed ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>{r.passed ? 'Անցել' : 'Չի անցել'}</span>}
                  </td>
                  
                  {/* ✅ ԳՈՐԾՈՂՈՒԹՅՈՒՆՆԵՐ */}
                  <td className="py-3 px-3 flex gap-1">
                    <button onClick={() => handleArchive(r.id, r.isArchived)} className={`p-1.5 rounded-lg border ${r.isArchived ? 'text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/10' : 'text-amber-500 border-amber-500/20 hover:bg-amber-500/10'}`} title={r.isArchived ? "Վերականգնել" : "Արխիվացնել"}>
                      <i className={`fa-solid ${r.isArchived ? 'fa-box-open' : 'fa-box-archive'}`}></i>
                    </button>
                    <button onClick={() => handleDelete(r.id, r.studentName)} className="p-1.5 rounded-lg border border-red-500/20 text-red-500 hover:bg-red-500/10" title="Ջնջել">
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </td>

                  <td className="py-3 px-3 text-right">
                    <button onClick={() => setDetail(r)} className="text-blue-500 p-2 hover:bg-blue-500/10 rounded-lg"><i className="fa-solid fa-eye"></i></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ՄՈԴԱԼ - ՄԵՏՔԸ ՍՊԻՏԱԿ ՖՈՆՈՎ ԵՎ Սև Տառերով */}
      {detail && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-3xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{detail.studentName} ({detail.studentGroup})</h3>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setDetail(null)} className="text-gray-400 text-xl ml-2 hover:text-gray-600"><i className="fa-solid fa-xmark"></i></button>
              </div>
            </div>
            
            {detail.answers && detail.answers.map((a, i) => (
              <div key={i} className={`p-4 mb-2 rounded-xl text-sm border ${a.isCorrect ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-red-500/5 border-red-500/30'}`}>
                <div className="font-bold mb-2 text-gray-900 dark:text-gray-100">{i + 1}. {a.text}</div>
                {a.type === 'text' ? (
                  <div>
                    {/* ✅ Սև տեքստ սպիտակ ֆոնի վրա */}
                    <div className="bg-gray-50 dark:bg-dark-bg text-gray-800 dark:text-gray-200 p-3 rounded-lg mb-3 border border-gray-200 dark:border-dark-border font-mono text-sm">
                      {a.selected || <span className="text-gray-400 italic">Չի պատասխանել</span>}
                    </div>
                    {a.earnedPoints == null ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Միավոր (0-{a.points}):</span>
                        <input type="number" min="0" max={a.points} step="0.5" id={`grade-input-${a.questionId}`} defaultValue={0} className="w-16 bg-white dark:bg-dark-bg border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded p-1 text-center" />
                        <button onClick={() => handleGrade(detail.id, a.questionId, document.getElementById(`grade-input-${a.questionId}`).value, a.points)} className="px-3 py-1.5 text-xs font-bold bg-brand-600 text-white rounded">Պահպանել</button>
                      </div>
                    ) : <div className="text-emerald-600 dark:text-emerald-400 font-bold">Գնահատված է՝ {a.earnedPoints} / {a.points}</div>}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className={`p-2 rounded-lg ${a.isCorrect ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-red-500/10 text-red-700 dark:text-red-400'}`}>
                      <span className="opacity-70 block mb-1">Ընտրել է.</span>
                      <span className="font-bold">{a.selected !== null && a.options[a.selected] ? a.options[a.selected] : '—'}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-gray-100 dark:bg-dark-bg text-gray-800 dark:text-gray-200">
                      <span className="opacity-70 block mb-1">Ճիշտն է.</span>
                      <span className="font-bold text-brand-600 dark:text-brand-400">{a.options[a.correct]}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}