import { useEffect, useState } from 'react';
import { api } from '../api';

export default function ResultsView() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setResults(await api.getResults());
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const clearAll = async () => {
    if (!confirm('Մաքրե՞լ բոլոր արդյունքները:')) return;
    try {
      await api.clearResults();
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  const exportCSV = () => {
    if (!results.length) return alert('Արդյունքներ չկան');
    let csv =
      '\uFEFF' +
      'Ուսանող,Խումբ,Առարկա,Միավոր,Տոկոս,Կարգավիճակ,Ամսաթիվ,Խախտումներ\n';
    results.forEach((r) => {
      csv +=
        [
          `"${r.studentName}"`,
          `"${r.studentGroup}"`,
          `"${r.subjectName}"`,
          `"${r.score}"`,
          `"${r.percentage}%"`,
          `"${r.passed ? 'Անցել է' : 'Չի անցել'}"`,
          `"${r.date}"`,
          `"${r.violations}"`,
        ].join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Exam_Results_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-dark-card border border-dark-border rounded-2xl p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold flex items-center gap-2">
            <i className="fa-solid fa-shield-halved text-brand-500"></i>
            Քննությունների Արդյունքներ և Խախտումներ
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Ընդհանուր՝ {results.length} արդյունք
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            <i className="fa-solid fa-file-csv mr-1"></i>CSV
          </button>
          <button
            onClick={clearAll}
            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-colors"
          >
            <i className="fa-solid fa-trash-can mr-1"></i>Մաքրել
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <i className="fa-solid fa-spinner fa-spin text-2xl text-brand-500"></i>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-dark-border text-xs uppercase font-semibold text-gray-400 bg-dark-bg/50">
                <th className="py-3.5 px-4">Ուսանող</th>
                <th className="py-3.5 px-4">Խումբ</th>
                <th className="py-3.5 px-4">Առարկա</th>
                <th className="py-3.5 px-4">Միավոր</th>
                <th className="py-3.5 px-4">Տոկոս</th>
                <th className="py-3.5 px-4">Կարգավիճակ</th>
                <th className="py-3.5 px-4">Ամսաթիվ</th>
                <th className="py-3.5 px-4">Խախտում</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border text-sm">
              {results.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-8 text-gray-500 text-xs"
                  >
                    Արդյունքներ չկան:
                  </td>
                </tr>
              )}
              {results.map((r) => (
                <tr key={r.id} className="hover:bg-dark-bg/40 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white">
                    {r.studentName}
                  </td>
                  <td className="py-3.5 px-4 text-gray-300">{r.studentGroup}</td>
                  <td className="py-3.5 px-4 text-gray-300">{r.subjectName}</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-white">
                    {r.score}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-blue-400">
                    {r.percentage}%
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                        r.passed
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}
                    >
                      {r.passed ? 'Անցել է' : 'Չի անցել'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-gray-400 whitespace-nowrap">
                    {r.date}
                  </td>
                  <td className="py-3.5 px-4">
                    {r.violations > 0 ? (
                      <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-bold">
                        {r.violations}
                      </span>
                    ) : (
                      <span className="text-gray-500">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}