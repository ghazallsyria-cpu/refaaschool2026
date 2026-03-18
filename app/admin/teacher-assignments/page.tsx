'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Save, ArrowRight } from 'lucide-react';
import Link from 'next/link';

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
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/dashboard" className="text-slate-500 hover:text-indigo-600 flex items-center gap-1 text-sm transition-colors">
              <ArrowRight className="h-4 w-4" /> العودة للوحة التحكم
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">إدارة تعيينات المعلمين</h1>
          <p className="text-slate-500">تخصيص المعلمين للفصول والمواد الدراسية</p>
        </div>
        <button onClick={addRow} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm self-start">
          <Plus className="h-4 w-4" /> إضافة تعيين جديد
        </button>
      </div>
      
      {newAssignments.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm ring-1 ring-slate-200 space-y-4 border-t-4 border-indigo-500">
          <h2 className="font-bold text-lg text-slate-800">إضافة تعيينات جديدة</h2>
          <div className="space-y-3">
            {newAssignments.map((assignment, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center p-4 bg-slate-50 rounded-lg">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500">المعلم</label>
                  <select className="w-full p-2 border rounded-md bg-white" value={assignment.teacher_id} onChange={e => updateRow(index, 'teacher_id', e.target.value)}>
                    <option value="">اختر المعلم</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.users?.full_name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500">الفصل</label>
                  <select className="w-full p-2 border rounded-md bg-white" value={assignment.section_id} onChange={e => updateRow(index, 'section_id', e.target.value)}>
                    <option value="">اختر الفصل</option>
                    {sections.map(s => <option key={s.id} value={s.id}>{s.classes?.name} - {s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500">المادة</label>
                  <select className="w-full p-2 border rounded-md bg-white" value={assignment.subject_id} onChange={e => updateRow(index, 'subject_id', e.target.value)}>
                    <option value="">اختر المادة</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="flex justify-end pt-4">
                  <button onClick={() => removeRow(index)} className="text-red-600 p-2 hover:bg-red-50 rounded-full transition-colors"><Trash2 className="h-5 w-5" /></button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setNewAssignments([])} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">إلغاء</button>
            <button onClick={handleSaveAll} className="bg-indigo-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 shadow-sm">
              <Save className="h-4 w-4" /> حفظ التعيينات
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {teachers.map(teacher => {
          const teacherAssignments = assignments.filter(a => a.teacher_id === teacher.id);
          return (
            <div key={teacher.id} className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 overflow-hidden flex flex-col">
              <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                <h3 className="font-bold text-slate-800">{teacher.users?.full_name}</h3>
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-medium">
                  {teacherAssignments.length} تعيينات
                </span>
              </div>
              <div className="flex-1 p-0">
                {teacherAssignments.length > 0 ? (
                  <table className="w-full text-right text-sm">
                    <thead className="bg-slate-50/50 text-slate-500 border-b">
                      <tr>
                        <th className="p-3 font-medium">الفصل</th>
                        <th className="p-3 font-medium">المادة</th>
                        <th className="p-3 font-medium w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {teacherAssignments.map(a => (
                        <tr key={a.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                          <td className="p-3">{a.section?.name}</td>
                          <td className="p-3">{a.subject?.name}</td>
                          <td className="p-3">
                            <button onClick={() => handleDelete(a.id)} className="text-slate-400 hover:text-red-600 transition-colors">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-8 text-center text-slate-400 italic">
                    لا يوجد تعيينات مسجلة لهذا المعلم
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
