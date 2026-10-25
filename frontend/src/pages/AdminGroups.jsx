import { useEffect, useState } from 'react';
import { api } from '../api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { NOTO_ARMENIAN_BASE64 } from '../utils/fonts';

export default function AdminGroups() {
  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [grps, res] = await Promise.all([api.getGroups(), api.getResults()]);
      setGroups(grps);
      
      const studentStats = {};
      res.forEach(r => {
        if (!studentStats[r.studentName]) {
          studentStats[r.studentName] = { name: r.studentName, group: r.studentGroup, email: r.studentEmail, allSubjects: [] };
        }
        studentStats[r.studentName].allSubjects.push(r);
      });
      setStudents(Object.values(studentStats));
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const addGroup = async () => {
    if (!newGroupName.trim()) return;
    setIsSaving(true);
    try {
      await api.addGroup(newGroupName);
      setNewGroupName('');
      loadData();
    } catch (e) { alert(e.message); }
    finally { setIsSaving(false); }
  };

  const saveEdit = async (id) => {
    if (!editGroupName.trim()) return;
    setIsSaving(true);
    try {
      await api.updateGroup(id, editGroupName);
      setEditingGroupId(null);
      setEditGroupName('');
      if (selectedGroup === groups.find(g => g.id === id)?.name) setSelectedGroup(editGroupName.trim());
      loadData();
    } catch (e) { alert(e.message); }
    finally { setIsSaving(false); }
  };

  const deleteGroup = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Ջնջե՞լ այս խումբը:')) return;
    try {
      await api.deleteGroup(id);
      if (selectedGroup === groups.find(g => g.id === id)?.name) setSelectedGroup(null);
      loadData();
    } catch (e) { alert(e.message); }
  };

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
        body: studentDetail.answers.map((a, i) => [i + 1, a.text, a.type === 'text' ? (a.selected || '—') : (a.selected !== null && a.options && a.options[a.selected] ? a.options[a.selected] : '—'), a.type === 'text' ? '—' : (a.options && a.options[a.correct] ? a.options[a.correct] : '—'), a.type === 'text' ? `${a.earnedPoints ?? 0}/${a.points}` : (a.isCorrect ? `✅ ${a.points}` : `❌ 0`)]),
        styles: { font: 'NotoSansArmenian', fontSize: 8 },
        headStyles: { fillColor: [22, 163, 74], font: 'NotoSansArmenian' },
        bodyStyles: { font: 'NotoSansArmenian' },
      });
    }
    doc.save(`${studentDetail.studentName}_${studentDetail.subjectName}.pdf`);
  };

  const activeGroupStudents = students.filter(s => s.group === selectedGroup);
  const filteredStudents = activeGroupStudents.filter(st => st.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-dark-bg"><i className="fa-solid fa-spinner fa-spin text-4xl text-brand-500"></i></div>;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-5 flex flex-col md:flex-row gap-4 justify-between items-center shadow-sm">
        <div>
          <h3 className="text-base font-bold flex items-center gap-2"><i className="fa-solid fa-users text-brand-500"></i> Խմբերի Կառավարում</h3>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Օր.՝ ԻՖ-31" className="bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl px-4 py-2.5 text-sm flex-1 md:w-64 focus:outline-none focus:border-brand-500" />
          <button onClick={addGroup} disabled={isSaving} className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2">
            {isSaving ? <><i className="fa-solid fa-spinner fa-spin"></i> Ստեղծվում...</> : <><i className="fa-solid fa-plus"></i> Ստեղծել</>}
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-5 space-y-4 flex flex-col">
          <h4 className="font-bold text-sm border-b border-gray-200 dark:border-dark-border pb-3">Գոյություն ունեցող խմբեր</h4>
          <div className="space-y-2 overflow-y-auto max-h-[600px] pr-1">
            {groups.map(g => {
              const count = students.filter(s => s.group === g.name).length;
              const isEditing = editingGroupId === g.id;
              return (
                <div key={g.id} onClick={() => !isEditing && setSelectedGroup(g.name)} className={`group flex justify-between items-center p-3 rounded-xl border transition-all ${selectedGroup === g.name ? 'border-brand-500 bg-brand-500/5' : 'border-gray-200 dark:border-dark-border hover:border-gray-300 cursor-pointer'}`}>
                  {isEditing ? (
                    <div className="flex items-center gap-2 w-full">
                      <input autoFocus value={editGroupName} onChange={(e) => setEditGroupName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveEdit(g.id)} className="w-full bg-white dark:bg-dark-bg border border-brand-500 rounded-lg px-2 py-1 text-sm outline-none" />
                      <button onClick={() => saveEdit(g.id)} className="text-emerald-500 p-1"><i className="fa-solid fa-check"></i></button>
                      <button onClick={() => setEditingGroupId(null)} className="text-gray-400 p-1"><i className="fa-solid fa-xmark"></i></button>
                    </div>
                  ) : (
                    <>
                      <div className="font-bold text-sm">{g.name}</div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-gray-100 dark:bg-dark-bg text-gray-500 px-2 py-1 rounded-md">{count} ուս.</span>
                        <button onClick={(e) => { e.stopPropagation(); setEditingGroupId(g.id); setEditGroupName(g.name); }} className="opacity-0 group-hover:opacity-100 text-blue-500 p-1.5 rounded"><i className="fa-solid fa-pen text-xs"></i></button>
                        <button onClick={(e) => deleteGroup(e, g.id)} className="opacity-0 group-hover:opacity-100 text-red-500 p-1.5 rounded"><i className="fa-solid fa-trash-can text-xs"></i></button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-3 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-5 flex flex-col h-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-200 dark:border-dark-border pb-3 mb-4">
            <h4 className="font-bold text-sm">
              {selectedGroup ? <><span className="text-brand-500">{selectedGroup}</span> խմբի ուսանողներ</> : 'Ընտրեք խումբ'}
            </h4>
            {selectedGroup && (
              <div className="relative w-full sm:w-64">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Փնտրել..." className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-brand-500" />
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto max-h-[500px] pr-1">
            {selectedGroup ? (
              <div className="space-y-4">
                {filteredStudents.map((st, i) => (
                  <div key={i} className="p-4 bg-gray-50 dark:bg-dark-bg border border-gray-100 dark:border-dark-border rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center text-sm font-bold shrink-0">{st.name.charAt(0).toUpperCase()}</div>
                      <div>
                        <div className="font-bold text-gray-900 dark:text-white">{st.name}</div>
                        <div className="text-xs text-gray-500 flex gap-3 mt-0.5">
                          <span>Թեստեր՝ <strong className="text-brand-500">{st.allSubjects.length}</strong></span>
                          {st.email && <span>Email՝ <strong className="text-brand-500">{st.email}</strong></span>}
                        </div>
                      </div>
                    </div>
                    {st.allSubjects.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-dark-border">
                        {st.allSubjects.map((sub, idx) => (
                          <button key={idx} onClick={() => downloadStudentPDF(sub)}
                            className={`text-[10px] border px-2 py-1 rounded-md hover:bg-opacity-20 transition-colors flex items-center gap-1 ${sub.passed ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-red-500/10 text-red-600 border-red-500/20'}`}>
                            <i className="fa-solid fa-file-pdf text-[8px]"></i> {sub.subjectName} ({sub.score})
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
                <i className="fa-solid fa-arrow-left text-4xl mb-3 opacity-30"></i>
                <p className="text-sm">Սեղմեք խմբի վրա</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}