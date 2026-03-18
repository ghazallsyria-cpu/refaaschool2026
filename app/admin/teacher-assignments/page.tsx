'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Save, ArrowRight, Users } from 'lucide-react';
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
      supabase.from('teacher_sections').select('teacher_id, section_id, subject_id, teacher:teachers(users(full_name)), section:sections(name, classes(name)), subject:subjects(name)')
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

    const { error } = await supabase.from('teacher_sections').upsert(validAssignments, { ignoreDuplicates: true });
    if (!error) {
      setNewAssignments([]);
      fetchData();
      alert('تم حفظ التعيينات بنجاح');
    } else {
      alert('فشل حفظ التعيينات: ' + error.message);
    }
  };

  const handleDelete = async (teacher_id: string, section_id: string, subject_id: string) => {
    await supabase.from('teacher_sections').delete()
      .eq('teacher_id', teacher_id)
      .eq('section_id', section_id)
      .eq('subject_id', subject_id);
    fetchData();
  };

  return (
    <div className="p-4 md:p-8 space-y-10 bg-slate-50/50 min-h-screen pb-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="group flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-all bg-white px-4 py-2 rounded-xl shadow-sm ring-1 ring-slate-200 hover:ring-indigo-200">
              <ArrowRight className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> 
              العودة للوحة التحكم
            </Link>
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">إدارة تعيينات المعلمين</h1>
            <p className="text-lg text-slate-500 font-medium">تخصيص المعلمين للفصول والمواد الدراسية بدقة</p>
          </div>
        </div>
        
        <button 
          onClick={addRow} 
          className="inline-flex items-center justify-center gap-3 rounded-2xl bg-indigo-600 px-8 py-4 text-sm font-black text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition-all active:scale-95 self-start md:self-end"
        >
          <Plus className="h-5 w-5" />
          إضافة تعيين جديد
        </button>
      </div>
      
      {newAssignments.length > 0 && (
        <div className="glass-card p-8 md:p-10 rounded-4xl shadow-2xl shadow-indigo-100/50 space-y-8 border-t-8 border-indigo-600 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">إضافة تعيينات جديدة</h2>
              <p className="text-slate-500 font-medium text-sm">قم بتعبئة البيانات أدناه لحفظ التعيينات الجديدة في النظام</p>
            </div>
            <button 
              onClick={() => setNewAssignments([])} 
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-all"
            >
              <Trash2 className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-4">
            {newAssignments.map((assignment, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end p-6 bg-slate-50/50 rounded-3xl border border-slate-100 hover:border-indigo-200 transition-all group">
                <div className="md:col-span-4 space-y-2">
                  <label className="text-sm font-black text-slate-700 mr-1">المعلم</label>
                  <select 
                    className="w-full rounded-2xl border-0 py-3.5 px-4 text-slate-900 bg-white shadow-sm ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm transition-all" 
                    value={assignment.teacher_id} 
                    onChange={e => updateRow(index, 'teacher_id', e.target.value)}
                  >
                    <option value="">اختر المعلم</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.users?.full_name}</option>)}
                  </select>
                </div>
                <div className="md:col-span-3 space-y-2">
                  <label className="text-sm font-black text-slate-700 mr-1">الفصل</label>
                  <select 
                    className="w-full rounded-2xl border-0 py-3.5 px-4 text-slate-900 bg-white shadow-sm ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm transition-all" 
                    value={assignment.section_id} 
                    onChange={e => updateRow(index, 'section_id', e.target.value)}
                  >
                    <option value="">اختر الفصل</option>
                    {sections.map(s => <option key={s.id} value={s.id}>{s.classes?.name} - {s.name}</option>)}
                  </select>
                </div>
                <div className="md:col-span-4 space-y-2">
                  <label className="text-sm font-black text-slate-700 mr-1">المادة</label>
                  <select 
                    className="w-full rounded-2xl border-0 py-3.5 px-4 text-slate-900 bg-white shadow-sm ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm transition-all" 
                    value={assignment.subject_id} 
                    onChange={e => updateRow(index, 'subject_id', e.target.value)}
                  >
                    <option value="">اختر المادة</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="md:col-span-1 flex justify-center pb-1">
                  <button 
                    onClick={() => removeRow(index)} 
                    className="p-3 text-red-500 hover:bg-red-50 rounded-2xl transition-all hover:scale-110 active:scale-90"
                    title="إزالة الصف"
                  >
                    <Trash2 className="h-6 w-6" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex flex-col sm:flex-row-reverse justify-start gap-4 pt-6 border-t border-slate-100">
            <button 
              onClick={handleSaveAll} 
              className="inline-flex items-center justify-center gap-3 rounded-2xl bg-indigo-600 px-10 py-4 text-sm font-black text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
            >
              <Save className="h-5 w-5" />
              حفظ كافة التعيينات
            </button>
            <button 
              onClick={() => setNewAssignments([])} 
              className="inline-flex items-center justify-center rounded-2xl bg-white px-8 py-4 text-sm font-black text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50 transition-all"
            >
              إلغاء العملية
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {teachers.map(teacher => {
          const teacherAssignments = assignments.filter(a => a.teacher_id === teacher.id);
          return (
            <div key={teacher.id} className="group glass-card rounded-4xl border border-slate-200/60 overflow-hidden hover:shadow-2xl hover:shadow-indigo-100 transition-all duration-500 flex flex-col hover:-translate-y-1">
              <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center group-hover:bg-indigo-50/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-600 font-black border border-slate-100">
                    {teacher.users?.full_name?.charAt(0) || 'أ'}
                  </div>
                  <h3 className="font-black text-slate-900 tracking-tight">{teacher.users?.full_name}</h3>
                </div>
                <span className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-xl font-black shadow-lg shadow-indigo-100">
                  {teacherAssignments.length} تعيينات
                </span>
              </div>
              <div className="flex-1 overflow-hidden">
                {teacherAssignments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                      <thead className="bg-slate-50/30 text-slate-400 border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px]">الفصل الدراسي</th>
                          <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px]">المادة العلمية</th>
                          <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] w-20">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {teacherAssignments.map(a => (
                          <tr key={`${a.teacher_id}-${a.section_id}-${a.subject_id}`} className="group/row hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-700">{a.section?.classes?.name} - {a.section?.name}</td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs">
                                {a.subject?.name}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <button 
                                onClick={() => handleDelete(a.teacher_id, a.section_id, a.subject_id)} 
                                className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover/row:opacity-100"
                                title="حذف التعيين"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <div className="mx-auto h-16 w-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
                      <Users className="h-8 w-8 text-slate-200" />
                    </div>
                    <p className="text-slate-400 font-medium italic">
                      لا يوجد تعيينات مسجلة لهذا المعلم
                    </p>
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
