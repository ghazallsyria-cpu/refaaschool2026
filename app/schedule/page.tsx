'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Printer, User, Users, Info, X } from 'lucide-react';

const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
const PERIODS = [1, 2, 3, 4, 5];

export default function SchedulePage() {
  const [viewType, setViewType] = useState<'teacher' | 'section'>('teacher');
  const [teachers, setTeachers] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{day: number, period: number} | null>(null);
  const [formData, setFormData] = useState({ teacher_id: '', section_id: '', subject_id: '' });

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  const fetchFilters = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || null);
        const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
        setUserRole(profile?.role || null);
        
        // التحقق من الدور أو البريد الإلكتروني للمدير الرئيسي
        const isSystemAdmin = profile?.role === 'admin' || profile?.role === 'management' || user.email === 'ghazallsyria@gmail.com';
        setIsAdmin(isSystemAdmin);
      } else {
        setIsAdmin(false);
      }

      const [teachersRes, sectionsRes, subjectsRes] = await Promise.all([
        supabase.from('teachers').select('id, specialization, users(full_name)'),
        supabase.from('sections').select('id, name, classes(name)'),
        supabase.from('subjects').select('id, name')
      ]);

      if (teachersRes.data) setTeachers(teachersRes.data);
      if (sectionsRes.data) setSections(sectionsRes.data);
      if (subjectsRes.data) setSubjects(subjectsRes.data);

      if (teachersRes.data?.[0]) setSelectedId(teachersRes.data[0].id);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  const handleAddSchedule = async () => {
    if (!formData.teacher_id || !formData.section_id || !formData.subject_id || !selectedSlot) {
      alert('يرجى تعبئة جميع الحقول');
      return;
    }
    
    try {
      // 1. التحقق من وجود تضارب
      const { data: conflicts, error: conflictError } = await supabase
        .from('schedule')
        .select('id')
        .eq('day_of_week', selectedSlot.day)
        .eq('period', selectedSlot.period)
        .or(`teacher_id.eq.${formData.teacher_id},section_id.eq.${formData.section_id}`);

      if (conflictError) throw conflictError;

      if (conflicts && conflicts.length > 0) {
        alert('لا يمكن إضافة الحصة: يوجد تضارب (المعلم أو الفصل مشغول في هذا الوقت).');
        return;
      }

      // 2. الإضافة إذا لم يوجد تضارب
      const { error } = await supabase.from('schedule').insert({
        teacher_id: formData.teacher_id,
        section_id: formData.section_id,
        subject_id: formData.subject_id,
        day_of_week: selectedSlot.day,
        period: selectedSlot.period
      });
      if (error) throw error;
      
      setIsModalOpen(false);
      setFormData({ teacher_id: '', section_id: '', subject_id: '' });
      fetchSchedule(); // تحديث الجدول
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء إضافة الحصة');
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الحصة؟')) return;
    try {
      const { error } = await supabase.from('schedule').delete().eq('id', id);
      if (error) throw error;
      fetchSchedule();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء حذف الحصة');
    }
  };

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('schedule').select(`
        id, day_of_week, period,
        teachers(id, users(full_name), zoom_link),
        sections(id, name, classes(name)),
        subjects(id, name)
      `);

      if (viewType === 'teacher') {
        query = query.eq('teacher_id', selectedId);
      } else {
        query = query.eq('section_id', selectedId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setScheduleData(data || []);
    } catch (err: any) {
      console.error('Error fetching schedule:', err);
      setScheduleData([]);
    } finally {
      setLoading(false);
    }
  }, [selectedId, viewType]);

  useEffect(() => {
    if (!selectedId) return;
    fetchSchedule();
  }, [selectedId, viewType, fetchSchedule]);

  const handlePrint = () => {
    window.print();
  };

  const groupedTeachers = teachers.reduce((acc, teacher) => {
    const spec = teacher.specialization || 'غير محدد';
    if (!acc[spec]) acc[spec] = [];
    acc[spec].push(teacher);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-6 print:m-0 print:p-0">
      {/* Debug Info */}
      {!isAdmin && (
        <div className="bg-yellow-100 p-4 rounded-lg text-sm text-yellow-800">
          <p className="font-bold">Debug Info:</p>
          <p>isAdmin: {String(isAdmin)}</p>
          <p>Email: {userEmail || 'غير مسجل'}</p>
          <p>Role: {userRole || 'بدون دور'}</p>
          <p>إذا كنت مديراً ولا تظهر خيارات الإدارة، يرجى التأكد من دورك في قاعدة البيانات أو التواصل مع المطور.</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">الجدول الدراسي</h1>
          <p className="text-slate-500">عرض الجداول الدراسية للمعلمين والفصول</p>
        </div>
        <button 
          onClick={handlePrint}
          className="inline-flex items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
        >
          <Printer className="mr-2 h-4 w-4 ml-2" />
          طباعة الجدول
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-slate-200 print:hidden">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex rounded-md shadow-sm" role="group">
            <button
              type="button"
              onClick={() => {
                setViewType('teacher');
                if (teachers.length > 0) setSelectedId(teachers[0].id);
              }}
              className={`px-4 py-2 text-sm font-medium rounded-r-lg border ${
                viewType === 'teacher' 
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 z-10' 
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <User className="inline-block w-4 h-4 ml-2" />
              جدول المعلمين
            </button>
            <button
              type="button"
              onClick={() => {
                setViewType('section');
                if (sections.length > 0) setSelectedId(sections[0].id);
              }}
              className={`px-4 py-2 text-sm font-medium rounded-l-lg border-y border-l ${
                viewType === 'section' 
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 z-10' 
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Users className="inline-block w-4 h-4 ml-2" />
              جدول الفصول
            </button>
          </div>

          <div className="flex-1 w-full sm:max-w-xs">
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="block w-full rounded-md border-0 py-2 pl-3 pr-10 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
            >
              {viewType === 'teacher' ? (
                teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.users?.full_name || 'معلم غير معروف'}</option>
                ))
              ) : (
                sections.map(s => (
                  <option key={s.id} value={s.id}>{s.classes?.name} - {s.name}</option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">إضافة حصة جديدة</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">المعلم</label>
                <select className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" onChange={(e) => setFormData({...formData, teacher_id: e.target.value})}>
                  <option value="">اختر المعلم</option>
                  {Object.entries(groupedTeachers).map(([spec, teachersInSpec]) => (
                    <optgroup key={spec} label={spec}>
                      {(teachersInSpec as any[]).map(t => <option key={t.id} value={t.id}>{t.users?.full_name}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">الفصل</label>
                <select className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" onChange={(e) => setFormData({...formData, section_id: e.target.value})}>
                  <option value="">اختر الفصل</option>
                  {sections.map(s => <option key={s.id} value={s.id}>{s.classes?.name} - {s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">المادة</label>
                <select className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" onChange={(e) => setFormData({...formData, subject_id: e.target.value})}>
                  <option value="">اختر المادة</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <button className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium" onClick={() => setIsModalOpen(false)}>إلغاء</button>
              <button className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-sm" onClick={handleAddSchedule}>حفظ الحصة</button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Header */}
      <div className="hidden print:block text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900">مدرسة الرفعة النموذجية</h2>
        <h3 className="text-xl text-slate-700 mt-2">
          {viewType === 'teacher' ? 'الجدول الدراسي للمعلم' : 'الجدول الدراسي للفصل'}
        </h3>
        <p className="text-lg font-medium mt-2">
          {viewType === 'teacher' 
            ? teachers.find(t => t.id === selectedId)?.users?.full_name 
            : sections.find(s => s.id === selectedId)?.classes?.name + ' - ' + sections.find(s => s.id === selectedId)?.name}
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 overflow-hidden print:shadow-none print:ring-2 print:ring-black">
        <div className="overflow-x-auto">
          <div className="min-w-[800px] p-6 print:p-0">
            <div className="grid grid-cols-6 gap-3 print:gap-1">
              {/* Header Row */}
              <div className="font-bold text-center p-4 bg-slate-100 rounded-lg flex items-center justify-center print:bg-slate-200 print:border print:border-black">
                اليوم / الحصة
              </div>
              {PERIODS.map(p => (
                <div key={p} className="font-bold text-center p-4 bg-slate-100 rounded-lg print:bg-slate-200 print:border print:border-black">
                  الحصة {p}
                </div>
              ))}

              {/* Body Rows */}
              {loading ? (
                <div className="col-span-6 py-20 text-center text-slate-500">
                  جاري تحميل الجدول...
                </div>
              ) : (
                DAYS.map((day, dayIndex) => (
                  <React.Fragment key={day}>
                    <div className="font-bold text-center p-4 bg-slate-50 rounded-lg flex items-center justify-center print:border print:border-black">
                      {day}
                    </div>
                    {PERIODS.map(period => {
                      const slot = scheduleData.find(s => s.day_of_week === dayIndex && s.period === period);
                      return (
                        <div key={`${day}-${period}`} className={`p-3 border border-slate-200 rounded-lg bg-white min-h-[100px] flex flex-col items-center justify-center text-center print:border-black print:min-h-[80px] ${isAdmin ? 'cursor-pointer hover:bg-slate-50' : ''} ${slot?.teachers?.zoom_link ? 'cursor-pointer hover:bg-indigo-50' : ''}`}
                          onClick={() => {
                            if (isAdmin) {
                              setSelectedSlot({day: dayIndex, period: period});
                              setIsModalOpen(true);
                            } else if (slot?.teachers?.zoom_link) {
                              window.open(slot.teachers.zoom_link, '_blank');
                            }
                          }}
                        >
                          {slot ? (
                            <>
                              <span className="font-bold text-indigo-700 print:text-black">{slot.subjects?.name}</span>
                              {viewType === 'teacher' ? (
                                <span className="text-sm text-slate-600 mt-1 print:text-black">
                                  {slot.sections?.classes?.name} - {slot.sections?.name}
                                </span>
                              ) : (
                                <span className="text-sm text-slate-600 mt-1 print:text-black">
                                  {slot.teachers?.users?.full_name}
                                </span>
                              )}
                              {slot.teachers?.zoom_link && (
                                <span className="text-xs text-indigo-500 mt-1">رابط زوم</span>
                              )}
                              {isAdmin && (
                                <button className="mt-2 text-red-500 text-xs" onClick={(e) => { e.stopPropagation(); handleDeleteSchedule(slot.id); }}>حذف</button>
                              )}
                            </>
                          ) : (
                            <span className="text-slate-300 text-sm print:text-transparent">-</span>
                          )}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
