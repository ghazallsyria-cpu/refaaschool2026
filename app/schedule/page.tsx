'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Printer, User, Users, Info } from 'lucide-react';

const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
const PERIODS = [1, 2, 3, 4, 5];

export default function SchedulePage() {
  const [viewType, setViewType] = useState<'teacher' | 'section'>('teacher');
  const [teachers, setTeachers] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVirtual, setIsVirtual] = useState(false);

  const fetchFilters = useCallback(async () => {
    try {
      const [teachersRes, sectionsRes] = await Promise.all([
        supabase.from('teachers').select('id, users(full_name)'),
        supabase.from('sections').select('id, name, classes(name)')
      ]);

      if (teachersRes.data) setTeachers(teachersRes.data);
      if (sectionsRes.data) setSections(sectionsRes.data);

      if (teachersRes.data?.[0]) setSelectedId(teachersRes.data[0].id);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  const generateVirtualSchedule = useCallback(async () => {
    setIsVirtual(true);
    try {
      let query = supabase.from('teacher_sections').select(`
        teacher_id, section_id, subject_id,
        teachers(id, users(full_name)),
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

      const virtualData: any[] = [];
      
      // Distribute classes evenly across the week
      if (data && data.length > 0) {
        const repeatedData: any[] = [];
        // Repeat to fill a typical week (e.g., 3-4 times a week per subject/section)
        data.forEach(item => {
           for(let i=0; i<4; i++) repeatedData.push(item);
        });
        
        // We have N items. We need to place them in 25 slots.
        const availableSlots = Array.from({length: 25}, (_, i) => i);
        
        // Simple deterministic shuffle based on selectedId so it doesn't jump around on every render
        let seed = selectedId.charCodeAt(0) || 1;
        const random = () => {
          const x = Math.sin(seed++) * 10000;
          return x - Math.floor(x);
        };
        
        availableSlots.sort(() => random() - 0.5);

        repeatedData.forEach((item, index) => {
          if (index >= 25) return;
          
          const slotIndex = availableSlots[index];
          const day_of_week = Math.floor(slotIndex / 5);
          const period = (slotIndex % 5) + 1;
          
          virtualData.push({
            id: `virtual-${slotIndex}`,
            day_of_week,
            period,
            teachers: item.teachers,
            sections: item.sections,
            subjects: item.subjects
          });
        });
      }

      setScheduleData(virtualData);
    } catch (err) {
      console.error('Error generating virtual schedule:', err);
      setScheduleData([]);
    }
  }, [selectedId, viewType]);

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    setIsVirtual(false);
    try {
      // Attempt to fetch from real schedules table
      let query = supabase.from('schedules').select(`
        id, day_of_week, period,
        teachers(id, users(full_name)),
        sections(id, name, classes(name)),
        subjects(id, name)
      `);

      if (viewType === 'teacher') {
        query = query.eq('teacher_id', selectedId);
      } else {
        query = query.eq('section_id', selectedId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        setScheduleData(data);
      } else {
        // Fallback to virtual schedule if empty
        generateVirtualSchedule();
      }
    } catch (err: any) {
      console.log('Schedules table might not exist or is empty, generating virtual schedule...');
      generateVirtualSchedule();
    } finally {
      setLoading(false);
    }
  }, [selectedId, viewType, generateVirtualSchedule]);

  useEffect(() => {
    if (!selectedId) return;
    fetchSchedule();
  }, [selectedId, viewType, fetchSchedule]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print:m-0 print:p-0">
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

      {isVirtual && (
        <div className="rounded-md bg-blue-50 p-4 print:hidden">
          <div className="flex">
            <div className="flex-shrink-0">
              <Info className="h-5 w-5 text-blue-400" aria-hidden="true" />
            </div>
            <div className="mr-3 flex-1 md:flex md:justify-between">
              <p className="text-sm text-blue-700">
                هذا الجدول تم إنشاؤه افتراضياً (للعرض فقط) بناءً على توزيع الحصص والمواد. لم يتم حفظ جدول نهائي في قاعدة البيانات بعد.
              </p>
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
                        <div key={`${day}-${period}`} className="p-3 border border-slate-200 rounded-lg bg-white min-h-[100px] flex flex-col items-center justify-center text-center print:border-black print:min-h-[80px]">
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
