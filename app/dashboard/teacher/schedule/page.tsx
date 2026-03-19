'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar, Clock } from 'lucide-react';

const DAYS = [
  { id: 0, name: 'الأحد' },
  { id: 1, name: 'الإثنين' },
  { id: 2, name: 'الثلاثاء' },
  { id: 3, name: 'الأربعاء' },
  { id: 4, name: 'الخميس' },
];

const PERIODS = [1, 2, 3, 4, 5, 6, 7];

export default function TeacherSchedulePage() {
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeacherSchedule();
  }, []);

  const fetchTeacherSchedule = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('schedules')
        .select('*, subjects(name), sections(name, classes(name))')
        .eq('teacher_id', user.id)
        .order('day_of_week')
        .order('period');

      if (error) throw error;
      setSchedule(data || []);
    } catch (error) {
      console.error('Error fetching teacher schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCellData = (day: number, period: number) => {
    return schedule.find(s => s.day_of_week === day && s.period === period);
  };

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">جدولي الدراسي الأسبوعي</h1>
        <p className="text-slate-500 mt-1">عرض كامل للحصص الدراسية المسندة إليك</p>
      </div>

      <div className="bg-white rounded-3xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 border-collapse">
              <thead className="bg-slate-50">
                <tr>
                  <th className="py-4 px-4 text-center text-sm font-semibold text-slate-900 border-l border-slate-200 w-32 bg-slate-100">اليوم / الحصة</th>
                  {PERIODS.map(period => (
                    <th key={period} className="py-4 px-4 text-center text-sm font-semibold text-slate-900 border-l border-slate-200">الحصة {period}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {DAYS.map((day) => (
                  <tr key={day.id}>
                    <td className="py-4 px-4 text-sm font-bold text-slate-900 border-l border-slate-200 text-center bg-slate-50">{day.name}</td>
                    {PERIODS.map(period => {
                      const cellData = getCellData(day.id, period);
                      return (
                        <td key={`${day.id}-${period}`} className="p-2 border-l border-slate-200 h-24 align-top">
                          {cellData ? (
                            <div className="h-full flex flex-col justify-center bg-indigo-50 rounded-md p-2 border border-indigo-100">
                              <div className="font-bold text-indigo-900 text-sm truncate">{cellData.subjects?.name}</div>
                              <div className="text-xs text-indigo-600 mt-1 truncate">{cellData.sections?.classes?.name} - {cellData.sections?.name}</div>
                            </div>
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-slate-300">-</div>
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
      </div>
    </div>
  );
}
