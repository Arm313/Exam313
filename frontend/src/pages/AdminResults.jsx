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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [grading, setGrading] = useState(false);

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

  const handleArchive = async (id, currentStatus) => {
    try { await api.archiveResult(id, !currentStatus); load(); } 
    catch (e) { alert(e.message); }
  };

  const handleDelete = async (id, studentName) => {
    if (!confirm(`Ջնջե՞լ ${studentName}-ի այս արդյունքը:`)) return;
    try { await api.deleteResult(id); load(); } 
    catch (e) { alert(e.message); }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredResults.length) setSelectedIds([]);
    else setSelectedIds(filteredResults.map(r => r.id));
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const bulkDelete = async () => {
    if (!confirm(`Ջնջե՞լ ընտրված ${selectedIds.length} արդյունքները:`)) return;
    setLoading(true);
    try {
      await Promise.all(selectedIds.map(id => api.deleteResult(id)));
      setSelectedIds([]); load();
    } catch (e) { alert(e.message); setLoading(false); }
  };

  const bulkArchive = async () => {
    setLoading(true);
    try {
      await Promise.all(selectedIds.map(id => {
        const res = results.find(r => r.id === id);
        return api.archiveResult(id, !res.isArchived);
      }));
      setSelectedIds([]); load();
    } catch (e) { alert(e.message); setLoading(false); }
  };

  // ✅ Excel ներբեռնում (յուրաքանչյուր տողի համար)
  const exportExcel = () => {
    const dataToExport = selectedIds.length > 0 ? filteredResults.filter(r => selectedIds.includes(r.id)) : filteredResults;
    if (!dataToExport.length) return alert('Արդյունքներ չկան');
    
    const data = dataToExport.map((r, i) => ({
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

  // ✅ PDF ներբեռնում (ընդհանուր աղյուսակի)
  const exportPDF = () => {
    const dataToExport = selectedIds.length > 0 ? filteredResults.filter(r => selectedIds.includes(r.id)) : filteredResults;
    if (!dataToExport.length) return alert('Արդյունքներ չկան');

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
      body: dataToExport.map((r, i) => [i + 1, r.studentName, r.studentGroup, r.subjectName, r.score, `${r.percentage}%`, r.needsGrading ? 'Սպասում է' : r.passed ? 'Անցել է' : 'Չի անցել', r.violations || 0, new Date(r.date).toLocaleDateString('hy-AM')]),
      styles: { font: 'NotoSansArmenian', fontSize: 8 },
      headStyles: { fillColor: [22, 163, 74], font: 'NotoSansArmenian' },
      bodyStyles: { font: 'NotoSansArmenian' },
    });
    doc.save(`EduExam_Results_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handleGrade = async (resultId, questionId, earnedPoints, maxPoints) => {
    const safePoints = Math.min(Number(earnedPoints), maxPoints);
    setGrading(true);
    try {
      await api.gradeResult(resultId, questionId, safePoints);
      const updatedAnswers = detail.answers.map(a => 
        a.questionId === questionId ? { ...a, earnedPoints: safePoints, isCorrect: safePoints >= a.points } : a
      );
      const stillNeedsGrading = updatedAnswers.some(a => a.type === 'text' && (a.earnedPoints === undefined || a.earnedPoints === null));
      setDetail({ ...detail, answers: updatedAnswers, needsGrading: stillNeedsGrading });
      load(); 
    } catch (e) { alert(e.message); }
    finally { setGrading(false); }
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
    if (searchQuery && !r.studentName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getGroupStats = () => {
    const passed = filteredResults.filter(r => r.passed).length;
    const pending = filteredResults.filter(r => r.needsGrading).length;
    return { total: filteredResults.length, passed, pending };
  };
  const groupStats = getGroupStats();

  const downloadStudentPDF = (studentDetail) => {
    const doc = new jsPDF();
    doc.addFileToVFS('NotoSansArmenian.ttf', NOTO_ARMENIAN_BASE64);
    doc.addFont('NotoSansArmenian.ttf', 'NotoSansArmenian', 'normal');
    doc.setFont('NotoSansArmenian');
    doc.setFontSize(18);
    doc.text('EduExam Pro — Արդյունքի Թերթիկ', 14, 16);
    doc.setFontSize(10);
    doc.text(`Ուսանող: ${studentDetail.studentName} (${studentDetail.studentGroup})`, 14, 25);
    doc.text(`Առարկա: ${studentDetail.subjectName}`, 14, 30);
    doc.text(`Ամսաթիվ: ${new Date(studentDetail.date).toLocaleString('hy-AM')}`, 14, 35);
    doc.text(`Միավոր: ${studentDetail.score} (${studentDetail.percentage}%)`, 14, 40);
    if (studentDetail.studentEmail) doc.text(`Email: ${studentDetail.studentEmail}`, 14, 45);
    
    if (studentDetail.answers && Array.isArray(studentDetail.answers)) {
      autoTable(doc, {
        startY: 55,
        head: [['#', 'Հարց', 'Ուսանողի պատասխանը', 'Ճիշտ պատասխանը', 'Միավոր']],
        body: studentDetail.answers.map((a, i) => [
          i + 1, a.text, 
          a.type === 'text' ? (a.selected || '—') : (a.selected !== null && a.options && a.options[a.selected] ? a.options[a.selected] : '—'),
          a.type === 'text' ? '—' : (a.options && a.options[a.correct] ? a.options[a.correct] : '—'),
          a.type === 'text' ? `${a.earnedPoints ?? 0}/${a.points}` : (a.isCorrect ? `✅ ${a.points}` : `❌ 0`)
        ]),
        styles: { font: 'NotoSansArmenian', fontSize: 8 },
        headStyles: { fillColor: [22, 163, 74], font: 'NotoSansArmenian' },
        bodyStyles: { font: 'NotoSansArmenian' },
      });
    }
    doc.save(`${studentDetail.studentName}_${studentDetail.subjectName}.pdf`);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4">
      
      <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-4 flex flex-wrap gap-3 items-center justify-between shadow-sm">
        <div className="flex flex-wrap gap-3 items-center flex-1">
          <div>
            <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Որոնում</label>
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Ուսանողի անուն..." className="bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg px-3 py-1.5 text-xs text-gray-800 dark:text-gray-200 w-40" />
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Առարկա</label>
            <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} className="bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg px-3 py-1.5 text-xs">
              <option value="all">Բոլորը</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Խումբ</label>
            <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)} className="bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg px-3 py-1.5 text-xs">
              <option value="all">Բոլորը</option>
              {uniqueGroups.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Կարգավիճակ</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg px-3 py-1.5 text-xs">
              <option value="all">Բոլորը</option>
              <option value="passed">Անցած</option>
              <option value="failed">Չանցած</option>
              <option value="pending">Սպասում է</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Պահոց</label>
            <select value={filterArchive} onChange={e => setFilterArchive(e.target.value)} className="bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg px-3 py-1.5 text-xs">
              <option value="active">Ակտիվ</option>
              <option value="archived">Արխիվ</option>
            </select>
          </div>
        </div>
        
        {/* ✅ ԱՅՍՏԵՂ Է ՓՈՓՈԽՎԵԼԸ. Թարմացնելու փոխարեն Excel և PDF */}
        <div className="flex gap-2">
          <button onClick={exportExcel} className="bg-emerald-600 text-white text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1">
            <i className="fa-solid fa-file-excel"></i> Excel
          </button>
          <button onClick={exportPDF} className="bg-red-600 text-white text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1">
            <i className="fa-solid fa-file-pdf"></i> PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12"><i className="fa-solid fa-spinner fa-spin text-4xl text-brand-500"></i></div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-2xl p-4 text-center">
              <p className="text-xs text-blue-600 dark:text-blue-400 uppercase font-bold">Ընդհանուր</p>
              <h3 className="text-2xl font-bold text-blue-700 dark:text-blue-300">{groupStats.total}</h3>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl p-4 text-center">
              <p className="text-xs text-emerald-600 dark:text-emerald-400 uppercase font-bold">Անցածներ</p>
              <h3 className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{groupStats.passed}</h3>
            </div>
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4 text-center">
              <p className="text-xs text-amber-600 dark:text-amber-400 uppercase font-bold">Սպասում է</p>
              <h3 className="text-2xl font-bold text-amber-700 dark:text-amber-300">{groupStats.pending}</h3>
            </div>
          </div>

          {selectedIds.length > 0 && (
            <div className="bg-brand-500/10 border border-brand-500/30 rounded-xl p-3 flex items-center justify-between">
              <span className="text-sm font-bold text-brand-600 dark:text-brand-400">Ընտրված է {selectedIds.length} արդյունք</span>
              <div className="flex gap-2">
                <button onClick={bulkArchive} className="bg-amber-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">Արխիվ</button>
                <button onClick={bulkDelete} className="bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">Ջնջել</button>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-5 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 dark:border-dark-border text-xs uppercase text-gray-500">
                  <th className="py-3 px-3 w-10">
                    <input type="checkbox" checked={selectedIds.length === filteredResults.length && filteredResults.length > 0} onChange={toggleSelectAll} className="accent-brand-500 w-4 h-4 cursor-pointer" />
                  </th>
                  <th className="py-3 px-3">Ուսանող</th>
                  <th className="py-3 px-3">Խումբ</th>
                  <th className="py-3 px-3">Առարկա</th>
                  <th className="py-3 px-3">Միավոր</th>
                  <th className="py-3 px-3">Կարգավիճակ</th>
                  <th className="py-3 px-3">Email</th>
                  <th className="py-3 px-3 text-right">Գործողություն</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-dark-border text-sm">
                {filteredResults.map((r) => (
                  <tr key={r.id} className={`hover:bg-gray-50 dark:hover:bg-dark-bg/40 ${selectedIds.includes(r.id) ? 'bg-brand-50 dark:bg-brand-500/5' : ''}`}>
                    <td className="py-3 px-3">
                      <input type="checkbox" checked={selectedIds.includes(r.id)} onChange={() => toggleSelect(r.id)} className="accent-brand-500 w-4 h-4 cursor-pointer" />
                    </td>
                    <td className="py-3 px-3 font-bold text-gray-800 dark:text-gray-200">{r.studentName}</td>
                    <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{r.studentGroup}</td>
                    <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{r.subjectName}</td>
                    <td className="py-3 px-3 font-mono font-bold text-gray-800 dark:text-gray-200">{r.score} <span className="text-xs text-blue-500 font-normal">({r.percentage}%)</span></td>
                    <td className="py-3 px-3">
                      {r.needsGrading ? <span className="bg-amber-500/10 text-amber-500 px-2 py-1 rounded-lg text-xs font-bold">Ստուգում</span> : <span className={`px-2 py-1 rounded-lg text-xs font-bold ${r.passed ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>{r.passed ? 'Անցել' : 'Չի անցել'}</span>}
                    </td>
                    <td className="py-3 px-3 text-gray-500 text-xs">{r.studentEmail || '—'}</td>
                    <td className="py-3 px-3 text-right space-x-1">
                      <button onClick={() => setDetail(r)} className="text-blue-500 p-2 hover:bg-blue-500/10 rounded-lg"><i className="fa-solid fa-eye"></i></button>
                      <button onClick={() => downloadStudentPDF(r)} className="text-red-500 p-2 hover:bg-red-500/10 rounded-lg"><i className="fa-solid fa-file-pdf"></i></button>
                      <button onClick={() => handleArchive(r.id, r.isArchived)} className={`p-2 rounded-lg ${r.isArchived ? 'text-emerald-500' : 'text-amber-500'}`}><i className={`fa-solid ${r.isArchived ? 'fa-box-open' : 'fa-box-archive'}`}></i></button>
                      <button onClick={() => handleDelete(r.id, r.studentName)} className="text-red-500 p-2 hover:bg-red-500/10 rounded-lg"><i className="fa-solid fa-trash-can"></i></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {detail && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-3xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{detail.studentName} ({detail.studentGroup})</h3>
                <p className="text-xs text-gray-500 mt-1">{detail.subjectName} · {new Date(detail.date).toLocaleString('hy-AM')}</p>
              </div>
              <button onClick={() => setDetail(null)} className="text-gray-400 text-xl"><i className="fa-solid fa-xmark"></i></button>
            </div>
            
            <div className="grid grid-cols-3 gap-3 bg-gray-50 dark:bg-dark-bg p-3 rounded-xl mb-4">
              <div><p className="text-xs text-gray-500 uppercase">Միավոր</p><h4 className="text-lg font-bold">{detail.score}</h4></div>
              <div><p className="text-xs text-gray-500 uppercase">Տոկոս</p><h4 className={`text-lg font-bold ${detail.passed ? 'text-emerald-500' : 'text-red-500'}`}>{detail.percentage}%</h4></div>
              <div><p className="text-xs text-gray-500 uppercase">Խախտում</p><h4 className="text-lg font-bold text-amber-500">{detail.violations}</h4></div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-bold text-sm">Պատասխաններ</h4>
              {detail.answers && detail.answers.map((a, i) => (
                <div key={i} className={`p-3 rounded-lg text-xs border ${a.isCorrect ? 'bg-emerald-500/5 border-emerald-500/30' : a.type === 'text' && a.earnedPoints == null ? 'bg-amber-500/5 border-amber-500/30' : 'bg-red-500/5 border-red-500/30'}`}>
                  <div className="font-bold mb-2 text-gray-900 dark:text-gray-100">{i + 1}. {a.text}</div>
                  
                  {a.type === 'text' ? (
                    <div>
                      <div className="bg-gray-50 dark:bg-dark-bg text-gray-800 dark:text-gray-200 p-2 rounded mb-3 border border-gray-200 dark:border-dark-border">
                        {a.selected || 'Չի պատասխանել'}
                      </div>

                      {a.earnedPoints == null ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Միավոր (0-{a.points}):</span>
                          <input 
                            type="number" 
                            min="0" 
                            max={a.points} 
                            step="0.5" 
                            id={`grade-input-${a.questionId}`} 
                            defaultValue={0} 
                            className="w-16 bg-white dark:bg-dark-bg border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded p-1 text-center" 
                          />
                          <button 
                            onClick={() => handleGrade(detail.id, a.questionId, document.getElementById(`grade-input-${a.questionId}`).value, a.points)} 
                            disabled={grading} 
                            className="px-3 py-1.5 text-xs font-bold bg-brand-600 text-white rounded disabled:opacity-50"
                          >
                            {grading ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Պահպանել'}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="text-emerald-600 dark:text-emerald-400 font-bold">
                            Գնահատված է՝ {a.earnedPoints} / {a.points}
                          </div>
                          <button 
                            onClick={() => {
                              setDetail(prev => ({
                                ...prev,
                                answers: prev.answers.map(ans => ans.questionId === a.questionId ? { ...ans, earnedPoints: null } : ans)
                              }));
                            }} 
                            className="text-xs text-blue-500 hover:text-blue-600 font-bold flex items-center gap-1 bg-blue-500/10 px-2 py-1 rounded"
                          >
                            <i className="fa-solid fa-pen"></i> Խմբագրել
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <div className={`p-2 rounded ${a.isCorrect ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                        <span className="opacity-70 block mb-1">Ուսանող:</span> {a.selected !== null && a.options[a.selected] ? a.options[a.selected] : '—'}
                      </div>
                      <div className="p-2 rounded bg-gray-100 dark:bg-dark-bg">
                        <span className="opacity-70 block mb-1">Ճիշտ:</span> {a.options[a.correct]}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}