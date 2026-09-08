import { useState } from 'react';
import axios from 'axios';

export default function TeacherCreateCourse({ API_URL, onCreated }) {
  const [form, setForm] = useState({ courseName: '', courseCode: '', description: '', duration: '' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  return <form className="bg-white rounded-xl border p-6 space-y-4" onSubmit={async e => {
    e.preventDefault(); setBusy(true); setMessage('');
    try {
      await axios.post(`${API_URL}/teachers/courses`, form, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      setMessage('Course created and assigned to you.'); setForm({ courseName: '', courseCode: '', description: '', duration: '' }); await onCreated();
    } catch (error) { setMessage(error.response?.data?.message || 'Could not create course.'); }
    finally { setBusy(false); }
  }}>
    <h2 className="text-xl font-semibold">Create Course</h2>
    <p className="text-sm text-gray-600">The course will belong to your institute and be assigned to you.</p>
    {Object.entries({ courseName: 'Course Name', courseCode: 'Course Code', description: 'Description', duration: 'Duration' }).map(([key, label]) => <label key={key} className="block text-sm">{label}<input required={['courseName', 'courseCode'].includes(key)} value={form[key]} disabled={busy} onChange={e => setForm({ ...form, [key]: e.target.value })} className="block w-full border rounded p-2 mt-1" /></label>)}
    {message && <p role="status">{message}</p>}
    <button disabled={busy} className="bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-50">{busy ? 'Creating…' : 'Create Course'}</button>
  </form>;
}
