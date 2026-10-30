import { auth } from './auth';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

async function request(path, { method = 'GET', body, needAuth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  
  if (needAuth) {
    const token = auth.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && needAuth) {
    auth.clear();
    throw new Error('Սեսիան ավարտվել է, խնդրում ենք նորից մուտք գործել');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Սերվերի սխալ տեղի ունեցավ');
  
  return data;
}

export const api = {
  adminLogin: (username, password) => request('/auth/admin/login', { method: 'POST', body: { username, password }, needAuth: false }),
  studentLogin: (name, group, email) => request('/auth/student/login', { method: 'POST', body: { name, group, email }, needAuth: false }),
  me: () => request('/auth/me'),

  getAdmins: () => request('/admins'),
  addAdmin: (data) => request('/admins', { method: 'POST', body: data }),
  updateAdminPassword: (id, password) => request(`/admins/${id}/password`, { method: 'PUT', body: { password } }),
  deleteAdmin: (id) => request(`/admins/${id}`, { method: 'DELETE' }),

  // ✅ Առարկաներ
  getSubjects: () => request('/subjects'),
  getSubjectsPublic: () => request('/subjects/public', { needAuth: false }),
  addSubject: (data) => request('/subjects', { method: 'POST', body: data }),
  updateSubject: (id, data) => request(`/subjects/${id}`, { method: 'PUT', body: data }),
  deleteSubject: (id) => request(`/subjects/${id}`, { method: 'DELETE' }),

  // ✅ Խմբեր
  getGroups: () => request('/groups'),
  getGroupsPublic: () => request('/groups/public', { needAuth: false }),
  addGroup: (name) => request('/groups', { method: 'POST', body: { name } }),
  deleteGroup: (id) => request(`/groups/${id}`, { method: 'DELETE' }),
  updateGroup: (id, name) => request(`/groups/${id}`, { method: 'PUT', body: { name } }), 

  // ✅ Հարցեր
  getQuestions: (subjectId) => request(`/questions${subjectId ? '?subjectId=' + subjectId : ''}`),
  getQuestionsPublic: (subjectId) => request(`/questions/public${subjectId ? '?subjectId=' + subjectId : ''}`, { needAuth: false }), // ✅ ՓՈԽՎԱԾ Է
  addQuestion: (data) => request('/questions', { method: 'POST', body: data }),
  updateQuestion: (id, data) => request(`/questions/${id}`, { method: 'PUT', body: data }),
  deleteQuestion: (id) => request(`/questions/${id}`, { method: 'DELETE' }),
  archiveQuestion: (id) => request(`/questions/${id}/archive`, { method: 'PUT' }),
  restoreQuestion: (id) => request(`/questions/${id}/restore`, { method: 'PUT' }),
  bulkImportQuestions: (subjectId, questions) => request('/bulk/questions', { method: 'POST', body: { subjectId, questions } }),

  // ✅ Արդյունքներ
  getResults: () => request('/results'),
  getStudentsCount: () => request('/results/students-count'),
  getResult: (id) => request(`/results/${id}`),
  getAttempts: (subjectId) => request(`/results/attempts/${subjectId}`),
  addResult: (data) => request('/results', { method: 'POST', body: data }),
  gradeResult: (id, questionId, earnedPoints) => request(`/results/${id}/grade`, { method: 'PUT', body: { questionId, earnedPoints } }),
  archiveResult: (id, isArchived) => request(`/results/${id}/archive`, { method: 'PUT', body: { isArchived } }),
  deleteResult: (id) => request(`/results/${id}`, { method: 'DELETE' }),
  clearResults: () => request('/results', { method: 'DELETE' }),

  // ✅ Կարգավորումներ
  getSettings: () => request('/settings', { needAuth: false }), 
  saveSettings: (data) => request('/settings', { method: 'PUT', body: data }),
};