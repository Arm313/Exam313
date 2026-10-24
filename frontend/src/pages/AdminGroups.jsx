import { useEffect, useState } from 'react';
import { api } from '../api';

export default function AdminGroups() {
  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const loadData = async () => {
    setLoading(true);
    try {
      const [grps, res] = await Promise.all([api.getGroups(), api.getResults()]);
      setGroups(grps);
      
      const uniqueStudents = {};
      res.forEach(r => {
        if (!uniqueStudents[r.studentGroup]) uniqueStudents[r.studentGroup] = new Set();
        uniqueStudents[r.studentGroup].add(r.studentName);
      });
      
      const studentList = Object.keys(uniqueStudents).map(grpName => ({
        groupName: grpName,
        students: Array.from(uniqueStudents[grpName])
      }));
      setStudents(studentList);
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const addGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      await api.addGroup(newGroupName);
      setNewGroupName('');
      loadData();
    } catch (e) { alert(e.message); }
  };

  const saveEdit = async (id) => {
    if (!editGroupName.trim()) return;
    try {
      await api.updateGroup(id, editGroupName);
      setEditingGroupId(null);
      setEditGroupName('');
      if (selectedGroup === groups.find(g => g.id === id)?.name) {
        setSelectedGroup(editGroupName.trim());
      }
      loadData();
    } catch (e) { alert(e.message); }
  };

  const deleteGroup = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Ջնջե՞լ այս խումբը: Սա չի ջնջի ուսանողների արդյունքները, բայց նրանք այլևս չեն տեսնի խումբը:')) return;
    try {
      await api.deleteGroup(id);
      if (selectedGroup === groups.find(g => g.id === id)?.name) setSelectedGroup(null);
      loadData();
    } catch (e) { alert(e.message); }
  };

 const requestSort = (key) => {
  let direction = 'asc';
  if (sortConfig.key === key && sortConfig.direction === 'asc') {
    direction = 'desc';
  }
  setSortConfig({ key, direction });
};

  let sortedGroups = [...groups];
sortedGroups.sort((a, b) => {
  if (sortConfig.key === 'name') {
    return sortConfig.direction === 'asc' 
      ? a.name.localeCompare(b.name) 
      : b.name.localeCompare(a.name);
  }
  if (sortConfig.key === 'students') {
    const countA = students.find(s => s.groupName === a.name)?.students.length || 0;
    const countB = students.find(s => s.groupName === b.name)?.students.length || 0;
    return sortConfig.direction === 'asc' ? countA - countB : countB - countA;
  }
  return 0;
});


  const activeGroupData = students.find(s => s.groupName === selectedGroup);
  const filteredStudents = activeGroupData?.students.filter(st => 
    st.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (loading) return <div className="text-center p-8"><i className="fa-solid fa-spinner fa-spin text-brand-500 text-2xl"></i></div>;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      
      <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-5 flex flex-col md:flex-row gap-4 justify-between items-center shadow-sm">
        <div>
          <h3 className="text-base font-bold flex items-center gap-2">
            <i className="fa-solid fa-users text-brand-500"></i> Խմբերի Կառավարում
          </h3>
          <p className="text-xs text-gray-500 mt-1">Ստեղծեք խմբեր, որ ուսանողները մուտք գործելիս ընտրեն դրանք:</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <input 
            value={newGroupName} 
            onChange={(e) => setNewGroupName(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && addGroup()}
            placeholder="Օր.՝ ԻՖ-31" 
            className="bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl px-4 py-2.5 text-sm flex-1 md:w-64 focus:outline-none focus:border-brand-500" 
          />
          <button onClick={addGroup} className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors shadow-sm">
            <i className="fa-solid fa-plus mr-1"></i> Ստեղծել
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
        
        {/* Ձախ կողմ. Խմբեր */}
        <div className="lg:col-span-2 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-5 space-y-4 flex flex-col">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-dark-border pb-3">
            <h4 className="font-bold text-sm">Գոյություն ունեցող խմբեր</h4>
            
            {/* ✅ Սորտավորման կոճակներ */}
           <div className="flex gap-1 text-[10px]">
  <button onClick={() => requestSort('name')} className={`px-2 py-1 rounded ${sortConfig.key === 'name' ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-dark-bg text-gray-500'}`}>
    Անունով {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '⬆' : '⬇')}
  </button>
  <button onClick={() => requestSort('students')} className={`px-2 py-1 rounded ${sortConfig.key === 'students' ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-dark-bg text-gray-500'}`}>
    Քանակով {sortConfig.key === 'students' && (sortConfig.direction === 'asc' ? '⬆' : '⬇')}
  </button>
</div>
          </div>
          
          <div className="space-y-2 overflow-y-auto max-h-[600px] pr-1">
            {sortedGroups.length === 0 && <p className="text-gray-500 text-xs text-center py-4">Խմբեր չկան:</p>}
            
            {sortedGroups.map(g => {
              const studentCount = students.find(s => s.groupName === g.name)?.students.length || 0;
              const isEditing = editingGroupId === g.id;
              
              return (
                <div 
                  key={g.id} 
                  onClick={() => !isEditing && setSelectedGroup(g.name)} 
                  className={`group flex justify-between items-center p-3 rounded-xl border transition-all ${
                    selectedGroup === g.name 
                      ? 'border-brand-500 bg-brand-500/5' 
                      : 'border-gray-200 dark:border-dark-border hover:border-gray-300 cursor-pointer'
                  }`}
                >
                  {isEditing ? (
                    <div className="flex items-center gap-2 w-full">
                      <input 
                        autoFocus
                        value={editGroupName}
                        onChange={(e) => setEditGroupName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit(g.id)}
                        className="w-full bg-white dark:bg-dark-bg border border-brand-500 rounded-lg px-2 py-1 text-sm outline-none"
                      />
                      <button onClick={() => saveEdit(g.id)} className="text-emerald-500 p-1 hover:bg-emerald-500/10 rounded"><i className="fa-solid fa-check"></i></button>
                      <button onClick={() => setEditingGroupId(null)} className="text-gray-400 p-1 hover:bg-gray-500/10 rounded"><i className="fa-solid fa-xmark"></i></button>
                    </div>
                  ) : (
                    <>
                      <div className="font-bold text-sm text-gray-800 dark:text-gray-200">{g.name}</div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-gray-100 dark:bg-dark-bg text-gray-500 px-2 py-1 rounded-md">{studentCount} ուս.</span>
                        
                        <button onClick={(e) => { e.stopPropagation(); setEditingGroupId(g.id); setEditGroupName(g.name); }} className="opacity-0 group-hover:opacity-100 text-blue-500 hover:bg-blue-500/10 p-1.5 rounded transition-all" title="Խմբագրել"><i className="fa-solid fa-pen text-xs"></i></button>
                        
                        <button onClick={(e) => deleteGroup(e, g.id)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-500/10 p-1.5 rounded transition-all" title="Ջնջել"><i className="fa-solid fa-trash-can text-xs"></i></button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Աջ կողմ. Ուսանողներ */}
        <div className="lg:col-span-3 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-5 flex flex-col h-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-200 dark:border-dark-border pb-3 mb-4">
            <h4 className="font-bold text-sm">
              {selectedGroup ? (
                <><span className="text-brand-500">{selectedGroup}</span> խմբի ուսանողներ</>
              ) : 'Ընտրեք խումբ'}
            </h4>
            
            {selectedGroup && (
              <div className="relative w-full sm:w-64">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                <input 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Փնտրել ուսանողին..." 
                  className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-brand-500"
                />
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto max-h-[500px] pr-1">
            {selectedGroup ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredStudents.map((st, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-bg border border-transparent hover:border-brand-200 dark:hover:border-dark-border rounded-xl transition-colors">
                    <div className="w-8 h-8 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center text-xs font-bold shrink-0">
                      {st.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold text-sm text-gray-700 dark:text-gray-300 truncate">{st}</span>
                  </div>
                ))}
                
                {filteredStudents.length === 0 && (
                  <div className="col-span-1 sm:col-span-2 text-center py-8 text-gray-400">
                    <i className="fa-solid fa-user-slash text-3xl mb-3 opacity-50"></i>
                    <p className="text-xs">{searchQuery ? 'Ուսանող չի գտնվել:' : 'Այս խմբում դեռ ուսանողներ չկան:'}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
                <i className="fa-solid fa-arrow-left text-4xl mb-3 opacity-30"></i>
                <p className="text-sm">Սեղմեք խմբի վրա ձախ կողմում</p>
              </div>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}