import { useState } from 'react';
import axios from 'axios';

const blank = { name: '', email: '', phone: '', courseId: '' };
export default function TeacherStudentActions({ API_URL, permissions = {}, students, courses, onChange }) {
  const [selected, setSelected] = useState('');
  const [form, setForm] = useState(blank);
  const [bulk, setBulk] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const request = async (method, path, data) => {
    setBusy(true); setMessage('');
    try {
      const response = await axios({ method, url: `${API_URL}/teachers${path}`, data, headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      const results = response.data.data;
      setMessage(results?.failed ? `${results.successful.length} imported. ${results.failed.length} failed. ${results.failed.map(row => `${row.email || 'Row'}: ${row.error}`).join(' ')}` : response.data.message);
      setSelected(''); setForm(blank); await onChange();
    } catch (error) { setMessage(error.response?.data?.message || 'Action failed. Please try again.'); }
    finally { setBusy(false); }
  };
  if (!['canCreateStudents', 'canEditStudents', 'canDeleteStudents', 'canBulkUpload'].some(key => permissions[key])) return null;
  return <div className="bg-white border rounded-xl p-5 mb-6 space-y-4">
    <h3 className="font-semibold text-lg">Manage Students</h3>
    {message && <p role="status" className="text-sm whitespace-pre-wrap">{message}</p>}
    {(permissions.canCreateStudents || permissions.canEditStudents || permissions.canDeleteStudents) && <form className="space-y-3" onSubmit={e => { e.preventDefault(); request(selected ? 'put' : 'post', selected ? `/students/${selected}` : '/students', form); }}>
      <label className="block text-sm">Student
        <select value={selected} disabled={busy} onChange={e => {
          setSelected(e.target.value); const student = students.find(s => s._id === e.target.value);
          setForm(student ? { name: student.name, email: student.email, phone: student.phone || '', courseId: student.courseId?._id || student.courseId } : blank);
        }} className="block w-full border rounded p-2 mt-1">
          <option value="">{permissions.canCreateStudents ? 'New student' : 'Select a student'}</option>
          {(permissions.canEditStudents || permissions.canDeleteStudents) && students.map(s => <option key={s._id} value={s._id}>{s.name} — {s.email}</option>)}
        </select>
      </label>
      {((selected && permissions.canEditStudents) || (!selected && permissions.canCreateStudents)) && <>
        <div className="grid sm:grid-cols-2 gap-3">
          {['name', 'email', 'phone'].map(key => <label key={key} className="text-sm capitalize">{key}<input aria-label={`Student ${key}`} type={key === 'email' ? 'email' : 'text'} required={key !== 'phone'} value={form[key]} disabled={busy} onChange={e => setForm({ ...form, [key]: e.target.value })} className="block w-full border rounded p-2 mt-1" /></label>)}
          <label className="text-sm">Course<select required value={form.courseId} disabled={busy} onChange={e => setForm({ ...form, courseId: e.target.value })} className="block w-full border rounded p-2 mt-1"><option value="">Select course</option>{courses.map(c => <option key={c._id} value={c._id}>{c.courseName}</option>)}</select></label>
        </div>
        <button disabled={busy} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">{selected ? 'Save Changes' : 'Create Student'}</button>
      </>}
      {selected && permissions.canDeleteStudents && <button type="button" disabled={busy} onClick={() => { if (window.confirm('Delete this student? This cannot be undone.')) request('delete', `/students/${selected}`); }} className="ml-3 text-red-600">Delete Student</button>}
    </form>}
    {permissions.canBulkUpload && <div className="border-t pt-4 space-y-3">
      <h4 className="font-medium">Bulk Upload Students</h4>
      <p className="text-sm text-gray-600">One student per line: name, email, phone, courseCode. Use assigned course codes. Fields must not contain commas.</p>
      <input aria-label="Student CSV file" type="file" accept=".csv,text/csv" disabled={busy} onChange={async e => { const file = e.target.files?.[0]; if (file) setBulk(await file.text()); }} />
      <textarea aria-label="Bulk student rows" value={bulk} disabled={busy} onChange={e => setBulk(e.target.value)} className="block w-full border rounded p-2" rows={4} />
      <button type="button" disabled={busy || !bulk.trim()} onClick={() => {
        const lines = bulk.trim().split(/\r?\n/).filter(line => line.trim());
        const rows = lines.map(line => { const [name, email, phone, courseCode] = line.split(',').map(value => value.trim()); return { name, email, phone, courseCode }; }).filter(row => !(row.name.toLowerCase() === 'name' && row.email?.toLowerCase() === 'email'));
        if (lines.some(line => line.split(',').length !== 4)) return setMessage('Each row must have exactly four comma-separated fields.');
        request('post', '/students/bulk-upload', { students: rows });
      }} className="bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-50">Upload Students</button>
    </div>}
  </div>;
}
