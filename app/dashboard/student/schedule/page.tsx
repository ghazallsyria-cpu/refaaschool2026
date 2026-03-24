'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar, Clock, Plus, Trash2, X, Edit2, AlertCircle, Search } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

// Types
type Section = {
  id: string;
  name: string;
  classes: { name: string };
};

type Subject = {
  id: string;
  name: string;
};

type Teacher = {
  id: string;
  users: { full_name: string };
};

type Schedule = {
  id: string;
  section_id: string;
  subject_id: string;
  teacher_id: string;
  day_of_week: number;
  period: number;
  subjects?: { name: string };
  teachers?: { users?: { full_name: string } };
};

type Period = {
  id: string;
  period_number: number;
  start_time: string;
  end_time: string;
};

const DAYS = [
  { id: 1, name: 'الأحد' },
  { id: 2, name: 'الإثنين' },
  { id: 3, name: 'الثلاثاء' },
  { id: 4, name: 'الأربعاء' },
  { id: 5, name: 'الخميس' },
];

export default function SchedulesPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [studentSectionName, setStudentSectionName] = useState<string>('');
  const [teacherSchedule, setTeacherSchedule] = useState<any[]>([]);
  const [isTeacher, setIsTeacher] = useState(false);
  const [teacherZoomLink, setTeacherZoomLink] = useState<string>('');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [teacherAssignments, setTeacherAssignments] = useState<any[]>([]); // New state
  const [loading, setLoading] = useState(true);
  
  // Modal Data
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const timeToMinutes = (time: string): number => {
    if (!time) return 0;
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const getPeriodStatus = (dayId: number, periodNum: number): 'current' | 'next' | 'past' | 'upcoming' => {
    const jsDay = now.getDay();
    const dbDay = jsDay === 0 ? 1 : jsDay === 1 ? 2 : jsDay === 2 ? 3 :
                  jsDay === 3 ? 4 : jsDay === 4 ? 5 : 0;
    if (dayId !== dbDay) return 'upcoming';
    const p = periods.find((per: any) => per.period_number === periodNum);
    if (!p || !p.start_time || !p.end_time) return 'upcoming';
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const startMin = timeToMinutes(p.start_time);
    const endMin = timeToMinutes(p.end_time);
    if (nowMin >= startMin && nowMin < endMin) return 'current';
    if (nowMin < startMin && startMin - nowMin <= 15) return 'next';
    if (nowMin >= endMin) return 'past';
    return 'upcoming';
  };
  const [scheduleToDelete, setScheduleToDelete] = useState<string | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Current Cell State
  const [currentCell, setCurrentCell] = useState<{
    day: number;
    period: number;
    scheduleId?: string;
    subjectId?: string;
    teacherId?: string;
  }>({ day: 0, period: 1 });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedSectionId) {
      fetchSchedules(selectedSectionId);
    } else {
      setSchedules([]);
    }
  }, [selectedSectionId]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const [sectionsRes, subjectsRes, teachersRes, assignmentsRes, periodsRes] = await Promise.all([
        supabase.from('sections').select('id, name, classes(name)').order('name'),
        supabase.from('subjects').select('id, name').order('name'),
        supabase.from('teachers').select('id, users(full_name)'),
        supabase.from('teacher_sections').select('teacher_id, section_id, subject_id'),
        supabase.from('class_periods').select('*').order('period_number')
      ]);

      if (sectionsRes.data) setSections((sectionsRes.data as unknown) as Section[]);
      if (subjectsRes.data) setSubjects((subjectsRes.data as unknown) as Subject[]);
      if (teachersRes.data) setTeachers((teachersRes.data as unknown) as Teacher[]);
      if (assignmentsRes.data) setTeacherAssignments(assignmentsRes.data);
      if (periodsRes.data) setPeriods(periodsRes.data);

      // إذا كان المستخدم طالباً، نجلب فصله تلقائياً
      if (user) {
        const { data: userData } = await supabase
          .from('users').select('role').eq('id', user.id).single();
        
        setUserRole(userData?.role || null);

        // الطالب → فصله فقط
        if (userData?.role === 'student') {
          const { data: studentData } = await supabase
            .from('students').select('section_id, sections(name, classes(name))').eq('id', user.id).single();
          if (studentData?.section_id) {
            setSelectedSectionId(studentData.section_id);
            const sec = studentData.sections as any;
            setStudentSectionName(`${sec?.classes?.name} - ${sec?.name}`);
            return;
          }
        }

        // المعلم → جدوله الشخصي
        if (userData?.role === 'teacher') {
          setIsTeacher(true);
          const { data: tSchedule } = await supabase
            .from('schedules')
            .select('id, day_of_week, period, subjects(name), sections(name, classes(name)), teachers(zoom_link)')
            .eq('teacher_id', user.id)
            .order('day_of_week').order('period');
          setTeacherSchedule(tSchedule || []);
          // جلب رابط Zoom الخاص بالمعلم
          const { data: teacherInfo } = await supabase
            .from('teachers')
            .select('zoom_link')
            .eq('id', user.id)
            .single();
          setTeacherZoomLink(teacherInfo?.zoom_link || '');
          return;
        }
      }

      // للمدير والمعلم: أول فصل في القائمة
      if (sectionsRes.data && sectionsRes.data.length > 0) {
        setSelectedSectionId(sectionsRes.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedules = async (sectionId: string) => {
  setLoading(true);
  try {
    const { data: { user } } = await supabase.auth.getUser();

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user?.id)
      .single();

    let data: any[] = [];

    if (userData?.role === 'student') {
      const { data: studentData } = await supabase
        .from('students')
        .select('section_id')
        .eq('id', user?.id)
        .single();

      const res = await supabase
        .from('schedules')
        .select(`
          id,
          section_id,
          subject_id,
          teacher_id,
          day_of_week,
          period,
          subjects (name),
          teachers (zoom_link, users (full_name))
        `)
        .eq('section_id', studentData?.section_id);

      data = res.data || [];
    } else if (userData?.role === 'teacher') {
      const res = await supabase
        .from('schedules')
        .select(`
          id,
          section_id,
          subject_id,
          teacher_id,
          day_of_week,
          period,
          subjects (name),
          teachers (zoom_link, users (full_name))
        `)
        .eq('teacher_id', user?.id);

      data = res.data || [];
    } else {
      const res = await supabase
        .from('schedules')
        .select(`
          id,
          section_id,
          subject_id,
          teacher_id,
          day_of_week,
          period,
          subjects (name),
          teachers (zoom_link, users (full_name))
        `)
        .eq('section_id', sectionId);

      data = res.data || [];
    }

    setSchedules((data as unknown) as Schedule[]);
  } catch (error) {
    console.error('Error fetching schedules:', error);
  } finally {
    setLoading(false);
  }
};

  const openCellModal = (day: number, period: number, existingSchedule?: Schedule) => {
    if (!selectedSectionId) {
      showNotification('error', 'الرجاء اختيار الشعبة أولاً');
      return;
    }
    
    setCurrentCell({
      day,
      period,
      scheduleId: existingSchedule?.id,
      subjectId: existingSchedule?.subject_id || '',
      teacherId: existingSchedule?.teacher_id || '',
    });
    setIsModalOpen(true);
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCell.subjectId || !currentCell.teacherId) {
      showNotification('error', 'الرجاء اختيار المادة والمعلم');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        section_id: selectedSectionId,
        subject_id: currentCell.subjectId,
        teacher_id: currentCell.teacherId,
        day_of_week: currentCell.day,
        period: currentCell.period,
      };

      if (currentCell.scheduleId) {
        // Update
        const { error } = await supabase
          .from('schedules')
          .update(payload)
          .eq('id', currentCell.scheduleId);
          
        if (error) {
          if (error.code === '23505') { // Unique violation
            throw new Error('المعلم لديه حصة أخرى في نفس الوقت');
          }
          throw error;
        }
      } else {
        // Insert
        const { error } = await supabase
          .from('schedules')
          .insert([payload]);
          
        if (error) {
          if (error.code === '23505') { // Unique violation
            throw new Error('المعلم لديه حصة أخرى في نفس الوقت');
          }
          throw error;
        }
      }

      await fetchSchedules(selectedSectionId);
      setIsModalOpen(false);
      showNotification('success', 'تم حفظ الحصة بنجاح');
    } catch (error: any) {
      console.error('Error saving schedule:', error);
      showNotification('error', error.message || 'حدث خطأ أثناء حفظ الحصة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!scheduleToDelete) return;
    
    try {
      const { error } = await supabase.from('schedules').delete().eq('id', scheduleToDelete);
      if (error) throw error;
      await fetchSchedules(selectedSectionId);
      showNotification('success', 'تم حذف الحصة بنجاح');
    } catch (error) {
      console.error('Error deleting schedule:', error);
      showNotification('error', 'حدث خطأ أثناء حذف الحصة');
    } finally {
      setScheduleToDelete(null);
    }
  };

  const getCellData = (day: number, period: number) => {
    return schedules.find(s => s.day_of_week === day && s.period === period);
  };

  return (
    <div className="space-y-6 relative">
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 transition-all ${
          notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <div className="font-medium">{notification.message}</div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Dialog.Root open={!!scheduleToDelete} onOpenChange={(open) => !open && setScheduleToDelete(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-xl bg-white p-6 shadow-lg focus:outline-none" dir="rtl">
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-lg font-semibold text-slate-900">
                تأكيد الحذف
              </Dialog.Title>
              <Dialog.Close className="text-slate-400 hover:text-slate-500">
                <X className="h-5 w-5" />
              </Dialog.Close>
            </div>
            <p className="text-slate-600 mb-6">هل أنت متأكد من حذف هذه الحصة؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="flex justify-end gap-3">
              <Dialog.Close asChild>
                <button className="rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
                  إلغاء
                </button>
              </Dialog.Close>
              <button
                onClick={confirmDelete}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                تأكيد الحذف
              </button>
            </div>
          </Dialog.Content>
</Dialog.Portal>
	      </Dialog.Root>}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          {userRole === 'student' ? (
            <h1 className="text-2xl font-bold text-slate-900">جدولي الدراسي</h1>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-slate-900">الجدول الدراسي</h1>
              <p className="text-slate-500">إدارة الجداول الدراسية للفصول والشعب</p>
            </>
          )}
        </div>
      </div>

      {/* جدول المعلم الشخصي */}
      {isTeacher && (
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[700px] p-4">
              <div className="grid gap-2" style={{gridTemplateColumns: `120px repeat(${periods.length}, 1fr)`}}>
                {/* Header */}
                <div className="h-14 flex items-center justify-center bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-xs font-black text-slate-400">اليوم / الحصة</span>
                </div>
                {periods.map(p => (
                  <div key={p.id} className="h-14 flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-slate-100 px-2">
                    <span className="text-xs font-black text-slate-900">الحصة {p.period_number}</span>
                    <span className="text-[10px] text-slate-400 font-bold">{p.start_time?.slice(0,5)} - {p.end_time?.slice(0,5)}</span>
                  </div>
                ))}

                {/* Rows */}
                {DAYS.map(day => (
                  <>
                    <div key={`day-${day.id}`} className="font-bold text-center p-3 bg-slate-50 rounded-xl flex items-center justify-center min-h-[100px]">
                      {day.name}
                    </div>
                    {periods.map(p => {
                      const cell = teacherSchedule.find(s => s.day_of_week === day.id && s.period === p.period_number);
                      const pStatus = getPeriodStatus(day.id, p.period_number);
                      return (
                        <div key={`${day.id}-${p.period_number}`} className="relative min-h-[100px] p-1">
                          {cell ? (
                            <div className={`relative h-full flex flex-col justify-between rounded-2xl p-3 shadow-md border overflow-hidden transition-all ${
                              pStatus === 'current'
                                ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-400 shadow-emerald-200/60 scale-[1.03]'
                                : pStatus === 'next'
                                ? 'bg-gradient-to-br from-amber-400 to-amber-500 border-amber-300 shadow-amber-200/60'
                                : pStatus === 'past'
                                ? 'bg-slate-100 border-slate-200 opacity-50'
                                : 'bg-gradient-to-br from-indigo-600 to-violet-700 border-transparent shadow-indigo-200/50'
                            }`}>
                              <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -mr-8 -mt-8 blur-xl" />
                              {pStatus === 'current' && (
                                <>
                                  <div className="absolute inset-0 bg-emerald-400/20 animate-pulse pointer-events-none" />
                                  <div className="absolute -top-1 -right-1 bg-emerald-700 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border border-white z-10">⚡ الآن</div>
                                </>
                              )}
                              {pStatus === 'next' && (
                                <div className="absolute -top-1 -right-1 bg-amber-700 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border border-white z-10">استعد!</div>
                              )}
                              <div className="relative z-10">
                                <div className={`font-black text-sm leading-tight ${pStatus === 'past' ? 'text-slate-500' : 'text-white'}`}>
                                  {(cell.subjects as any)?.name}
                                </div>
                                <div className={`text-[10px] font-bold mt-1 ${pStatus === 'past' ? 'text-slate-400' : 'text-white/70'}`}>
                                  {(cell.sections as any)?.classes?.name}
                                </div>
                                <div className={`text-[10px] font-bold ${pStatus === 'past' ? 'text-slate-400' : 'text-white/60'}`}>
                                  {(cell.sections as any)?.name}
                                </div>
                                {teacherZoomLink && (
                                  <a
                                    href={teacherZoomLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className={`mt-2 flex items-center justify-center gap-1 text-[10px] font-black py-1 px-2 rounded-lg transition-all ${
                                      pStatus === 'past'
                                        ? 'bg-slate-200 text-slate-500'
                                        : 'bg-white/20 hover:bg-white/30 text-white'
                                    }`}
                                  >
                                    🎥 دخول Zoom
                                  </a>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="h-full min-h-[88px] flex items-center justify-center rounded-2xl border-2 border-dashed border-slate-100">
                              <div className="h-1 w-4 bg-slate-100 rounded-full" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {!isTeacher && <div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-slate-200">
{userRole === 'student' ? (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-700">فصلك الدراسي:</span>
              <span className="bg-indigo-50 text-indigo-700 font-black px-4 py-2 rounded-xl text-sm border border-indigo-100">
                {studentSectionName || 'جاري التحميل...'}
              </span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <label className="text-sm font-medium text-slate-700 whitespace-nowrap">
                اختر الشعبة:
              </label>
              <select
                className="block w-full sm:w-64 rounded-md border-0 py-2 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                disabled={loading && sections.length === 0}
              >
                {sections.length === 0 ? (
                  <option value="">لا توجد شعب مسجلة</option>
                ) : (
                  sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.classes?.name} - {section.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}
      </div>}

      {!isTeacher && <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : !selectedSectionId ? (
          <div className="text-center py-20">
            <Calendar className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <p className="text-slate-500">الرجاء اختيار الشعبة لعرض الجدول الدراسي</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 border-collapse table-fixed">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="py-3.5 px-4 text-center text-sm font-semibold text-slate-900 border-l border-slate-200 w-32 bg-slate-100">
                    اليوم / الحصة
                  </th>
                  {periods.map(period => (
                    <th key={period.id} scope="col" className="py-3.5 px-4 text-center text-sm font-semibold text-slate-900 border-l border-slate-200 min-w-[140px]">
                      الحصة {period.period_number}<br/>
                      <span className="text-xs font-normal text-slate-500">{period.start_time.slice(0,5)} - {period.end_time.slice(0,5)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {DAYS.map((day) => (
                  <tr key={day.id} className="hover:bg-slate-50/50">
                    <td className="whitespace-nowrap py-4 px-4 text-sm font-bold text-slate-900 border-l border-slate-200 text-center bg-slate-50">
                      {day.name}
                    </td>
                    {periods.map(period => {
                      const cellData = getCellData(day.id, period.period_number);
                      const pStatus = getPeriodStatus(day.id, period.period_number);
                      return (
                        <td 
                          key={`${day.id}-${period.period_number}`} 
className={`relative p-2 border-l border-slate-200 h-24 align-top group transition-colors ${
                            userRole === 'admin' || userRole === 'management'
                              ? 'cursor-pointer hover:bg-indigo-50/50'
                              : cellData && (cellData as any).teachers?.zoom_link
                              ? 'cursor-pointer hover:bg-indigo-50/30'
                              : 'cursor-default'
                          }`}
                          onClick={() => {
                            if (userRole === 'admin' || userRole === 'management') {
                              openCellModal(day.id, period.period_number, cellData);
                            } else if (userRole === 'student' && cellData && (cellData as any).teachers?.zoom_link) {
                              window.open((cellData as any).teachers.zoom_link, '_blank');
                            }
                          }}
                        >
                          {cellData ? (
                            <div className={`relative h-full flex flex-col justify-between rounded-md p-2 border transition-all ${
                              pStatus === 'current'
                                ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-200 scale-[1.03]'
                                : pStatus === 'next'
                                ? 'bg-gradient-to-br from-amber-400 to-amber-500 border-amber-300 text-white shadow-md shadow-amber-200'
                                : pStatus === 'past'
                                ? 'bg-slate-100 border-slate-200 opacity-50'
                                : 'bg-indigo-50 border-indigo-100'
                            }`}>
                              {pStatus === 'current' && (
                                <>
                                  <div className="absolute inset-0 rounded-md bg-emerald-400/20 animate-pulse pointer-events-none" />
                                  <div className="absolute -top-1.5 -right-1.5 bg-emerald-700 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border border-white z-10">⚡ الآن</div>
                                </>
                              )}
                              {pStatus === 'next' && (
                                <div className="absolute -top-1.5 -right-1.5 bg-amber-700 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border border-white z-10">استعد!</div>
                              )}
                              <div className="relative z-10">
                                <div className={`font-bold text-sm truncate ${pStatus === 'current' || pStatus === 'next' ? 'text-white' : pStatus === 'past' ? 'text-slate-400' : 'text-indigo-900'}`} title={cellData.subjects?.name}>
                                  {cellData.subjects?.name}
                                </div>
                                <div className={`text-xs mt-1 truncate ${pStatus === 'current' || pStatus === 'next' ? 'text-white/80' : pStatus === 'past' ? 'text-slate-400' : 'text-indigo-600'}`} title={cellData.teachers?.users?.full_name}>
                                  أ. {cellData.teachers?.users?.full_name}
                                </div>
                              </div>
                              {userRole === 'student' && (cellData as any).teachers?.zoom_link && (
                                <a
                                  href={(cellData as any).teachers.zoom_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className={`mt-1.5 flex items-center justify-center gap-1 text-[9px] font-black py-0.5 px-2 rounded-lg ${
                                    pStatus === 'current' || pStatus === 'next'
                                      ? 'bg-white/20 hover:bg-white/30 text-white'
                                      : pStatus === 'past'
                                      ? 'bg-slate-200 text-slate-400'
                                      : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700'
                                  }`}
                                >
                                  🎥 Zoom
                                </a>
                              )}
                              {(userRole === 'admin' || userRole === 'management') && (
                                <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity mt-2 relative z-10">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setScheduleToDelete(cellData.id);
                                    }}
                                    className={`p-1 rounded ${pStatus === 'current' || pStatus === 'next' ? 'text-white/70 hover:text-white hover:bg-white/20' : 'text-red-500 hover:text-red-700 hover:bg-red-50'}`}
                                    title="حذف الحصة"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className={`h-full w-full flex items-center justify-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 transition-all ${
                              userRole === 'admin' || userRole === 'management'
                                ? 'group-hover:bg-indigo-50/50 group-hover:border-indigo-200'
                                : ''
                            }`}>
                              {(userRole === 'admin' || userRole === 'management') && (
                                <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Plus className="h-3 w-3" /> إضافة
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>}

{/* Add/Edit Schedule Modal - Only for Admin/Management */}
      {(userRole === 'admin' || userRole === 'management') && <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-xl bg-white p-6 shadow-lg focus:outline-none" dir="rtl">
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-lg font-semibold text-slate-900">
                {currentCell.scheduleId ? 'تعديل الحصة' : 'إضافة حصة جديدة'}
              </Dialog.Title>
              <Dialog.Close className="text-slate-400 hover:text-slate-500">
                <X className="h-5 w-5" />
              </Dialog.Close>
            </div>
            
            <div className="mb-6 bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center gap-3 text-sm text-slate-700">
              <Clock className="h-5 w-5 text-indigo-500" />
              <div>
                <span className="font-semibold">{DAYS.find(d => d.id === currentCell.day)?.name}</span>
                <span className="mx-2">-</span>
                <span>الحصة {currentCell.period}</span>
              </div>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-4">
              <div>
                <label className="block text-sm font-medium leading-6 text-slate-900">المادة الدراسية</label>
                <select 
                  required
                  className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  value={currentCell.subjectId || ''}
                  onChange={(e) => setCurrentCell({...currentCell, subjectId: e.target.value})}
                >
                  <option value="">اختر المادة</option>
                  {subjects
                    .filter(s => {
                      if (currentCell.teacherId) {
                        return teacherAssignments.some(a => a.subject_id === s.id && a.teacher_id === currentCell.teacherId && a.section_id === selectedSectionId);
                      }
                      return teacherAssignments.some(a => a.subject_id === s.id && a.section_id === selectedSectionId);
                    })
                    .map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium leading-6 text-slate-900">المعلم</label>
                <select 
                  required
                  className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  value={currentCell.teacherId || ''}
                  onChange={(e) => setCurrentCell({...currentCell, teacherId: e.target.value})}
                >
                  <option value="">اختر المعلم</option>
                  {teachers
                    .filter(t => {
                      if (currentCell.subjectId) {
                        return teacherAssignments.some(a => a.teacher_id === t.id && a.subject_id === currentCell.subjectId && a.section_id === selectedSectionId);
                      }
                      return teacherAssignments.some(a => a.teacher_id === t.id && a.section_id === selectedSectionId);
                    })
                    .map(t => (
                    <option key={t.id} value={t.id}>{t.users?.full_name}</option>
                  ))}
                </select>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
                  >
                    إلغاء
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {isSubmitting ? 'جاري الحفظ...' : 'حفظ الحصة'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
