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
  const [assignments, setAssignments] = useState<any[]>([]);
  const [copiedLesson, setCopiedLesson] = useState<{subject_id: string, section_id: string, teacher_id: string} | null>(null);
  const [showAllSchedules, setShowAllSchedules] = useState(true);
  const [swappingFrom, setSwappingFrom] = useState<any | null>(null);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  const fetchFilters = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || null);
        const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
        setUserRole(profile?.role || null);
        
        const isSystemAdmin = profile?.role === 'admin' || profile?.role === 'management' || user.email === 'ghazallsyria@gmail.com';
        setIsAdmin(isSystemAdmin);
      } else {
        setIsAdmin(false);
      }

      const [teachersRes, sectionsRes, subjectsRes, assignmentsRes] = await Promise.all([
        supabase.from('teachers').select('id, specialization, users(full_name)'),
        supabase.from('sections').select('id, name, classes(name)'),
        supabase.from('subjects').select('id, name'),
        supabase.from('teacher_sections').select('teacher_id, section_id, subject_id')
      ]);

      if (teachersRes.data) setTeachers(teachersRes.data);
      if (sectionsRes.data) setSections(sectionsRes.data);
      if (subjectsRes.data) setSubjects(subjectsRes.data);
      if (assignmentsRes.data) setAssignments(assignmentsRes.data);

      if (teachersRes.data?.[0]) setSelectedId(teachersRes.data[0].id);
    } catch (err) {
      console.error(err);
    }
  }, []);

  // تصفية الفصول المتاحة بناءً على المعلم المختار (في حال عرض جدول المعلم)
  const availableSections = (viewType === 'teacher' && selectedId)
    ? sections.filter(s => assignments.some(a => a.teacher_id === selectedId && a.section_id === s.id))
    : sections;

  // تصفية المعلمين المتاحين بناءً على الفصل المختار (في حال عرض جدول الفصل)
  const modalAvailableTeachers = (viewType === 'section' && selectedId)
    ? teachers.filter(t => assignments.some(a => a.section_id === selectedId && a.teacher_id === t.id))
    : (formData.section_id 
        ? teachers.filter(t => assignments.some(a => a.section_id === formData.section_id && a.teacher_id === t.id))
        : teachers);

  // تصفية المواد بناءً على الفصل والمعلم المختارين في النموذج
  const availableSubjects = (formData.section_id && formData.teacher_id)
    ? subjects.filter(sub => assignments.some(a => 
        a.section_id === formData.section_id && 
        a.teacher_id === formData.teacher_id && 
        a.subject_id === sub.id
      ))
    : [];

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  const handleSwap = async (targetDay: number, targetPeriod: number, targetSlot: any | null) => {
    if (!swappingFrom) return;

    try {
      setLoading(true);
      
      // If there's a lesson in the target slot, we swap them
      if (targetSlot) {
        // Move target lesson to source position
        const { error: err1 } = await supabase
          .from('schedules')
          .update({ day_of_week: swappingFrom.day_of_week, period: swappingFrom.period })
          .eq('id', targetSlot.id);
        
        if (err1) throw err1;

        // Move source lesson to target position
        const { error: err2 } = await supabase
          .from('schedules')
          .update({ day_of_week: targetDay, period: targetPeriod })
          .eq('id', swappingFrom.id);
        
        if (err2) throw err2;
      } else {
        // Just move the source lesson to the empty target slot
        const { error } = await supabase
          .from('schedules')
          .update({ day_of_week: targetDay, period: targetPeriod })
          .eq('id', swappingFrom.id);
        
        if (error) throw error;
      }

      setSwappingFrom(null);
      fetchSchedule();
      alert('تم تبديل الحصص بنجاح');
    } catch (err) {
      console.error('Error swapping lessons:', err);
      alert('حدث خطأ أثناء تبديل الحصص. قد يكون هناك تضارب في المواعيد.');
      fetchSchedule(); // Refresh to show current state
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchedule = async () => {
    if (!formData.teacher_id || !formData.section_id || !formData.subject_id || !selectedSlot) {
      alert('يرجى تعبئة جميع الحقول');
      return;
    }
    
    try {
      // 1. التحقق من وجود تضارب
      // تضارب للمعلم
      const { data: teacherConflict, error: tError } = await supabase
        .from('schedules')
        .select('id, sections(name, classes(name)), subjects(name)')
        .eq('day_of_week', selectedSlot.day)
        .eq('period', selectedSlot.period)
        .eq('teacher_id', formData.teacher_id)
        .maybeSingle();

      if (tError) throw tError;

      // تضارب للفصل
      const { data: sectionConflict, error: sError } = await supabase
        .from('schedules')
        .select('id, teachers(users(full_name)), subjects(name)')
        .eq('day_of_week', selectedSlot.day)
        .eq('period', selectedSlot.period)
        .eq('section_id', formData.section_id)
        .maybeSingle();

      if (sError) throw sError;

      if (teacherConflict) {
        const section = (Array.isArray(teacherConflict.sections) ? teacherConflict.sections[0] : teacherConflict.sections) as any;
        const subject = (Array.isArray(teacherConflict.subjects) ? teacherConflict.subjects[0] : teacherConflict.subjects) as any;
        const className = (section?.classes && Array.isArray(section.classes) ? section.classes[0]?.name : section?.classes?.name);
        alert(`تضارب: المعلم لديه حصة (${subject?.name}) مع فصل (${className} - ${section?.name}) في هذا الوقت.`);
        return;
      }

      if (sectionConflict) {
        const teacher = (Array.isArray(sectionConflict.teachers) ? sectionConflict.teachers[0] : sectionConflict.teachers) as any;
        const subject = (Array.isArray(sectionConflict.subjects) ? sectionConflict.subjects[0] : sectionConflict.subjects) as any;
        const teacherName = (teacher?.users && Array.isArray(teacher.users) ? teacher.users[0]?.full_name : teacher?.users?.full_name);
        alert(`تضارب: هذا الفصل لديه حصة (${subject?.name}) مع المعلم (${teacherName}) في هذا الوقت.`);
        return;
      }

      // 2. الإضافة إذا لم يوجد تضارب
      const { error } = await supabase.from('schedules').insert({
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
      const { error } = await supabase.from('schedules').delete().eq('id', id);
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
      let query = supabase.from('schedules').select(`
        id, day_of_week, period,
        teachers(id, users(full_name), zoom_link),
        sections(id, name, classes(name)),
        subjects(id, name)
      `);

      // If admin and showAllSchedules is true, fetch all to show occupancy
      if (!(isAdmin && showAllSchedules)) {
        if (viewType === 'teacher') {
          query = query.eq('teacher_id', selectedId);
        } else {
          query = query.eq('section_id', selectedId);
        }
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
  }, [selectedId, viewType, isAdmin, showAllSchedules]);

  useEffect(() => {
    if (!selectedId && !showAllSchedules) return;
    fetchSchedule();
  }, [selectedId, viewType, showAllSchedules, fetchSchedule]);

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
      <style jsx global>{`
        @media print {
          @page {
            size: landscape;
            margin: 1cm;
          }
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
          }
          .print-table th, .print-table td {
            border: 1px solid black !important;
            padding: 4px !important;
            text-align: center !important;
            vertical-align: middle !important;
            word-wrap: break-word !important;
          }
          .print-table th {
            background-color: #f1f5f9 !important;
            font-weight: bold !important;
          }
          .print-others-text {
            font-size: 8px !important;
            color: #444 !important;
            border-top: 1px dashed #ccc !important;
            margin-top: 2px !important;
            display: block !important;
          }
        }
      `}</style>
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
              <option value="">-- اختر {viewType === 'teacher' ? 'المعلم' : 'الفصل'} --</option>
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

          {isAdmin && (
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="showAll" 
                checked={showAllSchedules} 
                onChange={(e) => setShowAllSchedules(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
              />
              <label htmlFor="showAll" className="text-sm font-medium text-slate-700">عرض جميع الحصص (للمدير)</label>
            </div>
          )}
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
              {viewType === 'teacher' ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">المعلم</label>
                  <div className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600">
                    {teachers.find(t => t.id === selectedId)?.users?.full_name}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">الفصل</label>
                  <div className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600">
                    {sections.find(s => s.id === selectedId)?.classes?.name} - {sections.find(s => s.id === selectedId)?.name}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {viewType === 'teacher' ? 'الفصل' : 'المعلم'}
                </label>
                {viewType === 'teacher' ? (
                  <select 
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" 
                    value={formData.section_id}
                    onChange={(e) => setFormData({ ...formData, section_id: e.target.value, subject_id: '' })}
                  >
                    <option value="">اختر الفصل</option>
                    {availableSections.map(s => <option key={s.id} value={s.id}>{s.classes?.name} - {s.name}</option>)}
                  </select>
                ) : (
                  <select 
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" 
                    value={formData.teacher_id}
                    onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value, subject_id: '' })}
                  >
                    <option value="">اختر المعلم</option>
                    {modalAvailableTeachers.map(t => <option key={t.id} value={t.id}>{t.users?.full_name}</option>)}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">المادة</label>
                <select 
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400" 
                  value={formData.subject_id}
                  disabled={!formData.section_id || !formData.teacher_id}
                  onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                >
                  <option value="">اختر المادة</option>
                  {availableSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {(!formData.section_id || !formData.teacher_id) && <p className="text-[10px] text-slate-400 mt-1">يرجى اختيار {viewType === 'teacher' ? 'الفصل' : 'المعلم'} أولاً</p>}
                {formData.section_id && formData.teacher_id && availableSubjects.length === 0 && <p className="text-[10px] text-amber-600 mt-1">لا توجد مواد مسندة لهذا الربط في تعيينات المعلمين</p>}
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

      <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 overflow-hidden print:shadow-none print:ring-0 print:border-0">
        <div className="overflow-x-auto print:hidden">
          <div className="min-w-[800px] p-6">
            <div className="grid grid-cols-6 gap-3">
              {/* Header Row */}
              <div className="font-bold text-center p-4 bg-slate-100 rounded-lg flex items-center justify-center">
                اليوم / الحصة
              </div>
              {PERIODS.map(p => (
                <div key={p} className="font-bold text-center p-4 bg-slate-100 rounded-lg">
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
                    <div className="font-bold text-center p-4 bg-slate-50 rounded-lg flex items-center justify-center">
                      {day}
                    </div>
                    {PERIODS.map(period => {
                      const slot = scheduleData.find(s => 
                        s.day_of_week === dayIndex && 
                        s.period === period && 
                        (viewType === 'teacher' ? s.teachers?.id === selectedId : s.sections?.id === selectedId)
                      );

                      const others = (isAdmin && showAllSchedules) ? scheduleData.filter(s => 
                        s.day_of_week === dayIndex && 
                        s.period === period && 
                        (viewType === 'teacher' ? s.teachers?.id !== selectedId : s.sections?.id !== selectedId)
                      ) : [];

                      return (
                        <div key={`${day}-${period}`} className={`p-3 border border-slate-200 rounded-lg bg-white min-h-[100px] flex flex-col items-center justify-center text-center ${isAdmin ? 'cursor-pointer hover:bg-slate-50' : ''} ${slot?.teachers?.zoom_link ? 'cursor-pointer hover:bg-indigo-50' : ''} ${swappingFrom?.id === slot?.id && slot ? 'ring-2 ring-indigo-500 bg-indigo-50' : ''}`}
                          onClick={() => {
                            if (isAdmin) {
                              if (swappingFrom) {
                                if (swappingFrom.id === slot?.id) {
                                  setSwappingFrom(null); // Cancel swap
                                } else {
                                  handleSwap(dayIndex, period, slot);
                                }
                              } else {
                                setFormData({ 
                                  teacher_id: viewType === 'teacher' ? selectedId : (copiedLesson?.teacher_id || ''), 
                                  section_id: viewType === 'section' ? selectedId : (copiedLesson?.section_id || ''), 
                                  subject_id: copiedLesson?.subject_id || '' 
                                });
                                setSelectedSlot({day: dayIndex, period: period});
                                setIsModalOpen(true);
                              }
                            } else if (slot?.teachers?.zoom_link) {
                              window.open(slot.teachers.zoom_link, '_blank');
                            }
                          }}
                        >
                          {slot ? (
                            <>
                              <span className="font-bold text-indigo-700">{slot.subjects?.name}</span>
                              {viewType === 'teacher' ? (
                                <span className="text-sm text-slate-600 mt-1">
                                  {slot.sections?.classes?.name} - {slot.sections?.name}
                                </span>
                              ) : (
                                <span className="text-sm text-slate-600 mt-1">
                                  {slot.teachers?.users?.full_name}
                                </span>
                              )}
                              {slot.teachers?.zoom_link && (
                                <span className="text-xs text-indigo-500 mt-1">رابط زوم</span>
                              )}
                              {isAdmin && (
                                <div className="mt-2 flex flex-wrap justify-center gap-2">
                                  <button 
                                    className="text-indigo-500 text-[10px] hover:underline" 
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      setCopiedLesson({
                                        subject_id: slot.subjects?.id,
                                        section_id: slot.sections?.id,
                                        teacher_id: slot.teachers?.id
                                      });
                                      alert('تم نسخ تفاصيل الحصة');
                                    }}
                                  >
                                    نسخ
                                  </button>
                                  <button 
                                    className="text-amber-600 text-[10px] hover:underline" 
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      setSwappingFrom(slot);
                                    }}
                                  >
                                    تبديل
                                  </button>
                                  <button className="text-red-500 text-[10px] hover:underline" onClick={(e) => { e.stopPropagation(); handleDeleteSchedule(slot.id); }}>حذف</button>
                                </div>
                              )}
                            </>
                          ) : others.length > 0 ? (
                            <div className="flex flex-col items-center opacity-40">
                              <span className="text-[10px] font-bold text-slate-400 mb-1">حصص أخرى:</span>
                              {others.slice(0, 2).map(o => (
                                <div key={o.id} className="text-[9px] text-slate-500 leading-tight">
                                  {viewType === 'teacher' ? o.sections?.name : o.teachers?.users?.full_name}
                                </div>
                              ))}
                              {others.length > 2 && <span className="text-[8px] text-slate-400">+{others.length - 2} أخرى</span>}
                            </div>
                          ) : (
                            <span className="text-slate-300 text-sm">-</span>
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

        {/* Vertical Table for Print */}
        <div className="hidden print:block p-4">
          <table className="print-table">
            <thead>
              <tr>
                <th className="w-24">الحصة / اليوم</th>
                {DAYS.map(day => <th key={day}>{day}</th>)}
              </tr>
            </thead>
            <tbody>
              {PERIODS.map(period => (
                <tr key={period}>
                  <td className="font-bold bg-slate-50">الحصة {period}</td>
                  {DAYS.map((day, dayIndex) => {
                    const slot = scheduleData.find(s => 
                      s.day_of_week === dayIndex && 
                      s.period === period && 
                      (viewType === 'teacher' ? s.teachers?.id === selectedId : s.sections?.id === selectedId)
                    );

                    const others = (isAdmin && showAllSchedules) ? scheduleData.filter(s => 
                      s.day_of_week === dayIndex && 
                      s.period === period && 
                      (viewType === 'teacher' ? s.teachers?.id !== selectedId : s.sections?.id !== selectedId)
                    ) : [];

                    return (
                      <td key={day} className="h-24">
                        {slot ? (
                          <div className="flex flex-col items-center">
                            <div className="font-bold">{slot.subjects?.name}</div>
                            <div className="text-[10px]">
                              {viewType === 'teacher' 
                                ? `${slot.sections?.classes?.name} - ${slot.sections?.name}`
                                : slot.teachers?.users?.full_name}
                            </div>
                          </div>
                        ) : others.length > 0 ? (
                          <div className="flex flex-col items-center">
                            <span className="text-[8px] text-slate-400">مشغول:</span>
                            {others.slice(0, 3).map(o => (
                              <div key={o.id} className="text-[8px] leading-tight">
                                {viewType === 'teacher' ? o.sections?.name : o.teachers?.users?.full_name}
                              </div>
                            ))}
                            {others.length > 3 && <span className="text-[7px]">+{others.length - 3}</span>}
                          </div>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
