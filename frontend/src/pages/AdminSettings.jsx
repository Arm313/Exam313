import { useEffect, useState } from 'react';
import { api } from '../api';

function Toggle({ label, value, onChange, desc }) {
  const isOn = String(value) === '1';
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-dark-border last:border-0 gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">{label}</div>
        {desc && <div className="text-xs text-gray-500 mt-0.5">{desc}</div>}
      </div>
      <button type="button" onClick={() => onChange(isOn ? '0' : '1')} role="switch" aria-checked={isOn}
        className={`relative inline-flex shrink-0 w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${isOn ? 'bg-brand-600' : 'bg-gray-300 dark:bg-gray-700'}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${isOn ? 'translate-x-6' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}

function Field({ label, desc, children }) {
  return (
    <div className="py-3 border-b border-gray-200 dark:border-dark-border last:border-0">
      <label className="block text-sm font-semibold mb-1">{label}</label>
      {desc && <p className="text-xs text-gray-500 mb-2">{desc}</p>}
      {children}
    </div>
  );
}

const inputClass = 'w-full bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl p-3 text-sm focus:outline-none focus:border-brand-500';

export default function AdminSettings() {
  const [settings, setSettings] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [subjectForm, setSubjectForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    Promise.all([api.getSettings(), api.getSubjects()]).then(([st, subs]) => {
      setSettings(st); setSubjects(subs);
      if (subs.length) setSelectedSubject(subs[0].id);
    });
  }, []);

  useEffect(() => {
    const s = subjects.find((x) => x.id === selectedSubject);
    if (s) setSubjectForm(s);
  }, [selectedSubject, subjects]);

  const updateSetting = (key, value) => setSettings((prev) => ({ ...prev, [key]: value }));
  const updateSubject = (key, value) => setSubjectForm((prev) => ({ ...prev, [key]: value }));

  const saveGlobal = async () => {
    setSaving(true);
    try {
      const updated = await api.saveSettings(settings);
      setSettings(updated);
      alert('✅ Կարգավորումները պահպանվեցին');
    } catch (e) { alert('❌ ' + e.message); } finally { setSaving(false); }
  };

  const saveSubject = async () => {
    if (!subjectForm) return;
    try {
      await api.updateSubject(selectedSubject, subjectForm);
      const subs = await api.getSubjects();
      setSubjects(subs);
      alert('✅ Առարկայի կարգավորումները պահպանվեցին');
    } catch (e) { alert('❌ ' + e.message); }
  };

  if (!settings) return <div className="text-center p-8"><i className="fa-solid fa-spinner fa-spin text-2xl text-brand-500"></i></div>;

  // ✅ 24-ԺԱՄՅԱ ՖՈՒՆԿՑԻԱՆԵՐ (ԱՌԱՆՑ ԲՐԱՈՒԶԵՐԻ AM/PM-Ի)
  const getDatePart = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const getHourPart = (iso) => iso ? String(new Date(iso).getHours()).padStart(2, '0') : '09';
  const getMinutePart = (iso) => iso ? String(new Date(iso).getMinutes()).padStart(2, '0') : '00';

  const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  const handleScheduleChange = (newDate, startH, startM, endH, endM) => {
    if (!newDate) {
      updateSubject('startTime', null);
      updateSubject('endTime', null);
      return;
    }
    const startStr = `${newDate}T${startH}:${startM}:00`;
    updateSubject('startTime', new Date(startStr).toISOString());
    const endStr = `${newDate}T${endH}:${endM}:00`;
    updateSubject('endTime', new Date(endStr).toISOString());
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex flex-wrap gap-2 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border p-1.5 rounded-xl w-fit">
        {[
          { id: 'general', label: 'Ընդհանուր', icon: 'fa-cog' },
          { id: 'security', label: 'Անվտանգություն', icon: 'fa-shield-halved' },
          { id: 'email', label: 'Email', icon: 'fa-envelope' },
          { id: 'subject', label: 'Առարկաներ', icon: 'fa-book' },
          // ✅ Խմբերի ներդիրը հանված է, քանի որ այն առանձին մենյուում է
        ].map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${activeTab === t.id ? 'bg-brand-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-bg'}`}>
            <i className={`fa-solid ${t.icon} mr-1.5`}></i>{t.label}
          </button>
        ))}
      </div>

      {activeTab === 'general' && (
        <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-5">
          <h3 className="text-base font-bold mb-2"><i className="fa-solid fa-cog text-brand-500 mr-2"></i>Ընդհանուր Կարգավորումներ</h3>
          <Field label="Համակարգի Անվանում" desc="Ցուցադրվում է header-ում">
            <input value={settings.siteName || ''} onChange={(e) => updateSetting('siteName', e.target.value)} placeholder="EduExam Pro" className={inputClass} />
          </Field>
          <Field label="Ժամանակի Նախազգուշացում (րոպե)" desc="Ուսանողը նախազգուշացում կստանա այսքան րոպե առաջ">
            <input type="number" min="1" max="30" value={settings.warningMinutes || '5'} onChange={(e) => updateSetting('warningMinutes', e.target.value)} className={inputClass} />
          </Field>
          <button onClick={saveGlobal} disabled={saving} className="mt-4 w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm">
            <i className="fa-solid fa-floppy-disk mr-2"></i>{saving ? 'Պահպանվում...' : 'Պահպանել'}
          </button>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-5">
          <h3 className="text-base font-bold mb-2"><i className="fa-solid fa-shield-halved text-brand-500 mr-2"></i>Անվտանգության Կարգավորումներ</h3>
          <Field label="Խախտումների Սահմանաչափ" desc="Այսքան խախտումից հետո քննությունը կդադարեցվի">
            <input type="number" min="1" max="10" value={settings.violationLimit || '3'} onChange={(e) => updateSetting('violationLimit', e.target.value)} className={inputClass} />
          </Field>
          <Toggle label="Fullscreen պարտադիր" desc="Ուսանողը պետք է ամբողջ էկրանով լինի" value={settings.fullscreenRequired ?? '1'} onChange={(v) => updateSetting('fullscreenRequired', v)} />
          <button onClick={saveGlobal} disabled={saving} className="mt-4 w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm">
            <i className="fa-solid fa-floppy-disk mr-2"></i>{saving ? 'Պահպանվում...' : 'Պահպանել'}
          </button>
        </div>
      )}

      {activeTab === 'email' && (
        <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-5">
          <h3 className="text-base font-bold mb-2"><i className="fa-solid fa-envelope text-brand-500 mr-2"></i>Email Կարգավորումներ</h3>
          <Toggle label="Միացնել Email ծանուցումները" desc="Ուսանողը/ուսուցիչը կստանան արդյունքները email-ով" value={settings.emailNotifications} onChange={(v) => updateSetting('emailNotifications', v)} />
          <Field label="Ում ուղարկել">
            <select value={settings.emailRecipients || 'student'} onChange={(e) => updateSetting('emailRecipients', e.target.value)} className={inputClass}>
              <option value="student">Միայն ուսանողին</option>
              <option value="teacher">Միայն ուսուցչին</option>
              <option value="both">Երկուսին</option>
              <option value="none">Ոչ մեկին</option>
            </select>
          </Field>
          <Field label="Ուսուցչի Email" desc="Երբ emailRecipients-ը 'teacher' կամ 'both' է">
            <input type="email" value={settings.teacherEmail || ''} onChange={(e) => updateSetting('teacherEmail', e.target.value)} placeholder="teacher@school.com" className={inputClass} />
          </Field>
          <button onClick={saveGlobal} disabled={saving} className="mt-4 w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm">
            <i className="fa-solid fa-floppy-disk mr-2"></i>{saving ? 'Պահպանվում...' : 'Պահպանել'}
          </button>
        </div>
      )}

      {activeTab === 'subject' && (
        <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-5 space-y-4">
          <h3 className="text-base font-bold"><i className="fa-solid fa-book text-brand-500 mr-2"></i>Առարկայի Կարգավորումներ</h3>
          <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className={inputClass}>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          {subjectForm && (
            <div className="space-y-3 pt-3">
              <div className="grid md:grid-cols-2 gap-3">
                <Field label="Անվանում">
                  <input value={subjectForm.name} onChange={(e) => updateSubject('name', e.target.value)} className={inputClass} />
                </Field>
                <Field label="Տևողություն (ր)">
                  <input type="number" value={subjectForm.timerMinutes} onChange={(e) => updateSubject('timerMinutes', +e.target.value)} className={inputClass} />
                </Field>
                <Field label="Անցողիկ Շեմ (%)">
                  <input type="number" value={subjectForm.passMarkPercent} onChange={(e) => updateSubject('passMarkPercent', +e.target.value)} className={inputClass} />
                </Field>
                <Field label="Առավելագույն փորձեր" desc="0 = անսահմանափակ">
                  <input type="number" value={subjectForm.maxAttempts} onChange={(e) => updateSubject('maxAttempts', +e.target.value)} className={inputClass} />
                </Field>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-dark-bg rounded-xl border border-gray-200 dark:border-dark-border space-y-3">
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <i className="fa-regular fa-calendar-days text-brand-500"></i> Ժամանակացույց (24-ժամյա)
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Field label="Օրը">
                    <input type="date" value={getDatePart(subjectForm.startTime || subjectForm.endTime)} onChange={(e) => handleScheduleChange(e.target.value, getHourPart(subjectForm.startTime), getMinutePart(subjectForm.startTime), getHourPart(subjectForm.endTime), getMinutePart(subjectForm.endTime))} className={inputClass} />
                  </Field>
                  <Field label="Սկսվելու Ժամը">
                    <div className="flex gap-2">
                      <select value={getHourPart(subjectForm.startTime)} onChange={(e) => handleScheduleChange(getDatePart(subjectForm.startTime), e.target.value, getMinutePart(subjectForm.startTime), getHourPart(subjectForm.endTime), getMinutePart(subjectForm.endTime))} className={`${inputClass} text-center`}>
                        {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <span className="self-center font-bold">:</span>
                      <select value={getMinutePart(subjectForm.startTime)} onChange={(e) => handleScheduleChange(getDatePart(subjectForm.startTime), getHourPart(subjectForm.startTime), e.target.value, getHourPart(subjectForm.endTime), getMinutePart(subjectForm.endTime))} className={`${inputClass} text-center`}>
                        {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </Field>
                  <Field label="Ավարտվելու Ժամը">
                    <div className="flex gap-2">
                      <select value={getHourPart(subjectForm.endTime)} onChange={(e) => handleScheduleChange(getDatePart(subjectForm.endTime), getHourPart(subjectForm.startTime), getMinutePart(subjectForm.startTime), e.target.value, getMinutePart(subjectForm.endTime))} className={`${inputClass} text-center`}>
                        {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <span className="self-center font-bold">:</span>
                      <select value={getMinutePart(subjectForm.endTime)} onChange={(e) => handleScheduleChange(getDatePart(subjectForm.endTime), getHourPart(subjectForm.startTime), getMinutePart(subjectForm.startTime), getHourPart(subjectForm.endTime), e.target.value)} className={`${inputClass} text-center`}>
                        {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </Field>
                </div>
              </div>

              <Field label="Հարցերի Քանակ (Պատահական ընտրություն)">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={subjectForm.questionsCount > 0} onChange={(e) => updateSubject('questionsCount', e.target.checked ? 5 : 0)} className="w-4 h-4 accent-brand-500" />
                    <span className="text-sm">Սահմանափակել հարցերի քանակը</span>
                  </label>
                  {subjectForm.questionsCount > 0 && (
                    <input type="number" min="1" value={subjectForm.questionsCount} onChange={(e) => updateSubject('questionsCount', +e.target.value)} className="w-24 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg p-2 text-sm" />
                  )}
                </div>
              </Field>

              <div className="space-y-1 mt-2">
                <Toggle label="Հարցերի Shuffle" desc="Հարցերը պատահական կարգով" value={subjectForm.shuffleQuestions ? '1' : '0'} onChange={(v) => updateSubject('shuffleQuestions', +v)} />
                <Toggle label="Ցույց տալ պատասխանները" desc="Քննությունից հետո ուսանողը տեսնում է ճիշտ պատասխանները" value={subjectForm.showAnswersAfter ? '1' : '0'} onChange={(v) => updateSubject('showAnswersAfter', +v)} />
                <Toggle label="Թույլատրել կրկնել" desc="Ուսանողը կարող է նորից հանձնել" value={subjectForm.allowRetake ? '1' : '0'} onChange={(v) => updateSubject('allowRetake', +v)} />
              </div>

              <button onClick={saveSubject} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl text-sm mt-4">
                <i className="fa-solid fa-floppy-disk mr-2"></i>Պահպանել Առարկան
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}