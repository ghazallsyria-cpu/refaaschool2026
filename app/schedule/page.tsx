'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar, Clock, Plus, Trash2, X, AlertCircle } from 'lucide-react';
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
  teachers?: { zoom_link?: string, users?: { full_name: string } };
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
  const [isTeacher, setIsTeacher] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
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

  const [currentCell, setCurrentCell] = useState<{
    day: number;
    period: number;
    scheduleId?: string;
    subjectId?: string;
    teacherId?: string;
  }>({ day: 0, period: 1 });

  const fetchSchedules = useCallback(async (sectionId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
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

      if (error) throw error;
      setSchedules((data as unknown) as Schedule[] || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        const [sectionsRes, subjectsRes, teachersRes, periodsRes] = await Promise.all([
          supabase.from('sections').select('id, name, classes(name)').order('name'),
          supabase.from('subjects').select('id, name').order('name'),
          supabase.from('teachers').select('id, users(full_name)'),
          supabase.from('class_periods').select('*').order('period_number')
        ]);

        if (sectionsRes.data) setSections((sectionsRes.data as unknown) as Section[]);
        if (subjectsRes.data) setSubjects((subjectsRes.data as unknown) as Subject[]);
        if (teachersRes.data) setTeachers((teachersRes.data as unknown) as Teacher[]);
        if (periodsRes.data) setPeriods(periodsRes.data);

        if (user) {
          const { data: userData } = await supabase
            .from('users').select('role').eq('id', user.id).single();
          
          setUserRole(userData?.role || null);

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

          if (userData?.role === 'teacher') {
            setIsTeacher(true);
            return;
          }
        }

        if (sectionsRes.data && sectionsRes.data.length > 0) {
          setSelectedSectionId(sectionsRes.data[0].id);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedSectionId) {
      fetchSchedules(selectedSectionId);
    } else {
      setSchedules([]);
    }
  }, [selectedSectionId, fetchSchedules]);

  const openCellModal = (day: number, period: number, existingSchedule?: Schedule) => {
    if (userRole === 'student') return;
    
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
    if (userRole === 'student') return;

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
        const { error } = await supabase
          .from('schedules')
          .update(payload)
          .eq('id', currentCell.scheduleId);
          
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('schedules')
          .insert([payload]);
          
        if (error) throw error;
      }

      await fetchSchedules(selectedSectionId);
      setIsModalOpen(false);
      showNotification('success', 'تم حفظ الحصة بنجاح');
    } catch (error: any) {
      console.error('Error saving schedule:', error);
      showNotification('error', 'حدث خطأ أثناء حفظ الحصة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (userRole === 'student' || !scheduleToDelete) return;
    
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

  const isAdmin = userRole === 'admin' || userRole === 'management';

  return (
    <div className="space-y-6 relative">
      {notification && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 transition-all ${
          notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <AlertCircle className="h-5 w-5" />
          <p className="font-bold text-sm">{notification.message}</p>
        </div>
      )}

      {scheduleToDelete && isAdmin && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl" dir="rtl">
            <h3 className="text-lg font-bold text-slate-900 mb-2">تأكيد الحذف</h3>
            <p className="text-slate-500 text-sm mb-6">هل أنت متأكد من حذف هذه الحصة؟</p>
            <div className="flex gap-3">
              <button onClick={() => setScheduleToDelete(null)} className="flex-1 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm">إلغاء</button>
              <button onClick={confirmDelete} className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white font-bold text-sm">حذف</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">
          {userRole === 'student' ? 'جدولي الدراسي' : 'الجدول الدراسي'}
        </h1>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-slate-200">
        {userRole === 'student' ? (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-700">فصلك الدراسي:</span>
            <span className="bg-indigo-50 text-indigo-700 font-black px-4 py-2 rounded-xl text-sm border border-indigo-100">
              {studentSectionName || 'جاري التحميل...'}
            </span>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <label className="text-sm font-medium text-slate-700">اختر الشعبة:</label>
            <select
              className="block w-full sm:w-64 rounded-md border-0 py-2 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
            >
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.classes?.name} - {section.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 border-collapse table-fixed">
            <thead className="bg-slate-50">
              <tr>
                <th className="py-3.5 px-4 text-center text-sm font-semibold text-slate-900 border-l border-slate-200 w-32 bg-slate-100">اليوم / الحصة</th>
                {periods.map(period => (
                  <th key={period.id} className="py-3.5 px-4 text-center text-sm font-semibold text-slate-900 border-l border-slate-200 min-w-[140px]">
                    الحصة {period.period_number}<br/>
                    <span className="text-xs font-normal text-slate-500">{period.start_time.slice(0,5)} - {period.end_time.slice(0,5)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {DAYS.map((day) => (
                <tr key={day.id} className="hover:bg-slate-50/50">
                  <td className="whitespace-nowrap py-4 px-4 text-sm font-bold text-slate-900 border-l border-slate-200 text-center bg-slate-50">{day.name}</td>
                  {periods.map(period => {
                    const cellData = getCellData(day.id, period.period_number);
                    const pStatus = getPeriodStatus(day.id, period.period_number);
                    return (
                      <td 
                        key={`${day.id}-${period.period_number}`} 
                        className={`relative p-2 border-l border-slate-200 h-24 align-top group transition-colors ${
                          isAdmin ? 'cursor-pointer hover:bg-indigo-50/50' : 
                          userRole === 'student' && cellData?.teachers?.zoom_link ? 'cursor-pointer hover:bg-emerald-50/30' : 'cursor-default'
                        }`}
                        onClick={() => {
                          if (isAdmin) openCellModal(day.id, period.period_number, cellData);
                          else if (userRole === 'student' && cellData?.teachers?.zoom_link) window.open(cellData.teachers.zoom_link, '_blank');
                        }}
                      >
                        {cellData ? (
                          <div className={`relative h-full flex flex-col justify-between rounded-md p-2 border transition-all ${
                            pStatus === 'current' ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg' :
                            pStatus === 'next' ? 'bg-amber-400 border-amber-300 text-white' :
                            pStatus === 'past' ? 'bg-slate-100 border-slate-200 opacity-50' : 'bg-indigo-50 border-indigo-100'
                          }`}>
                            <div className="relative z-10">
                              <div className="font-bold text-sm truncate">{cellData.subjects?.name}</div>
                              <div className="text-xs mt-1 truncate">أ. {cellData.teachers?.users?.full_name}</div>
                            </div>
                            {userRole === 'student' && cellData.teachers?.zoom_link && (
                              <div className="mt-1 flex items-center justify-center gap-1 bg-white/20 text-white text-[9px] font-black py-0.5 rounded-lg">🎥 Zoom</div>
                            )}
                            {isAdmin && (
                              <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity mt-2">
                                <button onClick={(e) => { e.stopPropagation(); setScheduleToDelete(cellData.id); }} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="h-3.5 w-3.5" /></button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                            {isAdmin && <div className="text-[10px] font-black text-slate-400 opacity-0 group-hover:opacity-100">+ إضافة</div>}
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
      </div>

      {isAdmin && <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-xl bg-white p-6 shadow-lg" dir="rtl">
            <Dialog.Title className="text-lg font-semibold mb-4">{currentCell.scheduleId ? 'تعديل الحصة' : 'إضافة حصة جديدة'}</Dialog.Title>
            <form onSubmit={handleSaveSchedule} className="space-y-4">
              <div>
                <label className="block text-sm font-medium">المادة</label>
                <select required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" value={currentCell.subjectId} onChange={(e) => setCurrentCell({...currentCell, subjectId: e.target.value})}>
                  <option value="">اختر المادة</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">المعلم</label>
                <select required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" value={currentCell.teacherId} onChange={(e) => setCurrentCell({...currentCell, teacherId: e.target.value})}>
                  <option value="">اختر المعلم</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.users.full_name}</option>)}
                </select>
              </div>
              <div className="mt-6 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 rounded-xl bg-slate-100 py-2.5 font-bold text-slate-700">إلغاء</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 rounded-xl bg-indigo-600 py-2.5 font-bold text-white disabled:opacity-50">{isSubmitting ? 'جاري الحفظ...' : 'حفظ'}</button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>}
    </div>
  );
}
