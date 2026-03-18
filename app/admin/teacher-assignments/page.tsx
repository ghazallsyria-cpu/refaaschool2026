'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Save } from 'lucide-react';

export default function TeacherAssignmentsPage() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [newAssignments, setNewAssignments] = useState<{ teacher_id: string; section_id: string; subject_id: string }[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [tRes, sRes, subRes, aRes] = await Promise.all([
      supabase.from('teachers').select('id, users(full_name)'),
      supabase.from('sections').select('id, name, classes(name)'),
      supabase.from('subjects').select('id, name'),
      supabase.from('teacher_sections').select('id, teacher_id, section_id, subject_id, teacher:teachers(users(full_name)), section:sections(name), subject:subjects(name)')
    ]);

    if (tRes.data) setTeachers(tRes.data);
    if (sRes.data) setSections(sRes.data);
    if (subRes.data) setSubjects(subRes.data);
    if (aRes.data) setAssignments(aRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const addRow = () => {
    setNewAssignments([...newAssignments, { teacher_id: '', section_id: '', subject_id: '' }]);
  };

  const updateRow = (index: number, field: string, value: string) => {
    const updated = [...newAssignments];
    updated[index] = { ...updated[index], [field]: value };
    setNewAssignments(updated);
  };

  const removeRow = (index: number) => {
    setNewAssignments(newAssignments.filter((_, i) => i !== index));
  };

  const handleSaveAll = async () => {
    const validAssignments = newAssignments.filter(a => a.teacher_id && a.section_id && a.subject_id);
    if (validAssignments.length === 0) return;

    const { error } = await supabase.from('teacher_sections').insert(validAssignments);
    if (!error) {
      setNewAssignments([]);
      fetchData();
      alert('تم حفظ التعيينات بنجاح');
    } else {
      alert('فشل حفظ التعيينات: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('teacher_sections').delete().eq('id', id);
    fetchData();
  };

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold">إدارة تعيينات المعلمين</h1>
      
      <div className="bg-white p-6 rounded-xl shadow-sm ring-1 ring-slate-200 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-bold">إضافة تعيينات متعددة</h2>
          <button onClick={addRow} className="bg-slate-100 text-slate-700 p-2 rounded flex items-center gap-2">
            <Plus className="h-4 w-4" /> إضافة صف
          </button>
        </div>
        
        {newAssignments.map((assignment, index) => (
          <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <select className="p-2 border rounded" value={assignment.teacher_id} onChange={e => updateRow(index, 'teacher_id', e.target.value)}>
              <option value="">اختر المعلم</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.users?.full_name}</option>)}
            </select>
            <select className="p-2 border rounded" value={assignment.section_id} onChange={e => updateRow(index, 'section_id', e.target.value)}>
              <option value="">اختر الفصل</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.name} ({s.classes?.name})</option>)}
            </select>
            <select className="p-2 border rounded" value={assignment.subject_id} onChange={e => updateRow(index, 'subject_id', e.target.value)}>
              <option value="">اختر المادة</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button onClick={() => removeRow(index)} className="text-red-600 p-2"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        
        {newAssignments.length > 0 && (
          <button onClick={handleSaveAll} className="bg-indigo-600 text-white px-6 py-2 rounded flex items-center gap-2">
            <Save className="h-4 w-4" /> حفظ الكل
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200">
        <table className="w-full text-right">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="p-4">المعلم</th>
              <th className="p-4">الفصل</th>
              <th className="p-4">المادة</th>
              <th className="p-4">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map(a => (
              <tr key={a.id} className="border-b">
                <td className="p-4">{a.teacher?.users?.full_name}</td>
                <td className="p-4">{a.section?.name}</td>
                <td className="p-4">{a.subject?.name}</td>
                <td className="p-4">
                  <button onClick={() => handleDelete(a.id)} className="text-red-600"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
