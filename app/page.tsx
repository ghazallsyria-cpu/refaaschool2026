'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, GraduationCap, School, Percent, AlertCircle } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    classes: 0,
    attendanceRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(true);
  const [attendanceChartData, setAttendanceChartData] = useState<any[]>([]);
  const [distributionData, setDistributionData] = useState<any[]>([]);

  useEffect(() => {
    const checkConfigAndFetchData = async () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!url || !key || url === 'YOUR_SUPABASE_URL' || key === 'YOUR_SUPABASE_ANON_KEY') {
        setIsConfigured(false);
        setLoading(false);
        return;
      }

      try {
        // Fetch real data from Supabase
        const [
          { count: studentsCount },
          { count: teachersCount },
          { count: classesCount },
          { data: attendanceData },
          { data: classDistributionData }
        ] = await Promise.all([
          supabase.from('students').select('*', { count: 'exact', head: true }),
          supabase.from('teachers').select('*', { count: 'exact', head: true }),
          supabase.from('classes').select('*', { count: 'exact', head: true }),
          supabase.from('attendance').select('status, date').gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
          supabase.from('classes').select('level, sections(students(id))')
        ]);

        // Process attendance for today
        const todayStr = new Date().toISOString().split('T')[0];
        const todayAttendance = attendanceData?.filter(a => a.date === todayStr) || [];
        let attendanceRate = 0;
        if (todayAttendance.length > 0) {
          const presentCount = todayAttendance.filter(a => a.status === 'present').length;
          attendanceRate = Math.round((presentCount / todayAttendance.length) * 100);
        }

        // Process attendance chart data (last 7 days)
        const last7Days = Array.from({length: 7}, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - i);
          return d.toISOString().split('T')[0];
        }).reverse();

        const chartData = last7Days.map(date => {
          const dayData = attendanceData?.filter(a => a.date === date) || [];
          const present = dayData.filter(a => a.status === 'present').length;
          const absent = dayData.filter(a => a.status === 'absent').length;
          const dayName = new Date(date).toLocaleDateString('ar-SA', { weekday: 'short' });
          return { name: dayName, present, absent };
        }).filter(d => d.present > 0 || d.absent > 0);

        setAttendanceChartData(chartData);

        // Process distribution data
        if (classDistributionData) {
          const levelCounts: Record<number, number> = {};
          classDistributionData.forEach(cls => {
            const studentCount = cls.sections?.reduce((acc: number, sec: any) => acc + (sec.students?.length || 0), 0) || 0;
            levelCounts[cls.level] = (levelCounts[cls.level] || 0) + studentCount;
          });

          const colors = ['#4f46e5', '#10b981', '#f59e0b', '#f43f5e', '#0ea5e9'];
          const distData = Object.entries(levelCounts).map(([level, count], index) => ({
            name: `الصف ${level}`,
            value: count,
            color: colors[index % colors.length]
          })).filter(d => d.value > 0);
          
          setDistributionData(distData);
        }

        setStats({
          students: studentsCount || 0,
          teachers: teachersCount || 0,
          classes: classesCount || 0,
          attendanceRate,
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    checkConfigAndFetchData();
  }, []);

  if (!isConfigured) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <AlertCircle className="h-16 w-16 text-amber-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">إعداد قاعدة البيانات مطلوب</h2>
        <p className="text-slate-600 max-w-md mb-6">
          يرجى إعداد متغيرات البيئة الخاصة بـ Supabase في ملف .env.example وتشغيل ملف supabase_schema.sql في قاعدة البيانات الخاصة بك.
        </p>
        <div className="bg-slate-100 p-4 rounded-lg text-left w-full max-w-2xl overflow-auto text-sm font-mono text-slate-800">
          NEXT_PUBLIC_SUPABASE_URL=&quot;your-url&quot;<br/>
          NEXT_PUBLIC_SUPABASE_ANON_KEY=&quot;your-key&quot;
        </div>
      </div>
    );
  }

  const statCards = [
    { name: 'إجمالي الطلاب', value: stats.students, icon: Users, color: 'bg-blue-500' },
    { name: 'إجمالي المعلمين', value: stats.teachers, icon: GraduationCap, color: 'bg-indigo-500' },
    { name: 'إجمالي الفصول', value: stats.classes, icon: School, color: 'bg-purple-500' },
    { name: 'نسبة الحضور اليوم', value: `${stats.attendanceRate}%`, icon: Percent, color: 'bg-emerald-500' },
  ];

  // The data is now fetched from the database

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">لوحة التحكم</h1>
        <p className="text-slate-500">نظرة عامة على إحصائيات مدرسة الرفعة النموذجية</p>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => (
              <div key={stat.name} className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                <div className="p-4 sm:p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-md ${stat.color}`}>
                        <stat.icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" aria-hidden="true" />
                      </div>
                    </div>
                    <div className="ml-4 sm:ml-5 w-0 flex-1 mr-3 sm:mr-4">
                      <dl>
                        <dt className="truncate text-xs sm:text-sm font-medium text-slate-500">{stat.name}</dt>
                        <dd>
                          <div className="text-xl sm:text-2xl font-bold text-slate-900">{stat.value}</div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl bg-white p-4 sm:p-6 shadow-sm ring-1 ring-slate-200">
              <h3 className="text-base sm:text-lg font-medium text-slate-900 mb-4">إحصائيات الحضور (الأسبوع الحالي)</h3>
              <div className="h-64 sm:h-72 w-full flex items-center justify-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                {attendanceChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={attendanceChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{fontSize: 12}} />
                      <YAxis tick={{fontSize: 12}} />
                      <Tooltip />
                      <Bar dataKey="present" name="حاضر" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="absent" name="غائب" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <span className="text-sm text-slate-400">لا توجد بيانات كافية لعرض الرسم البياني</span>
                )}
              </div>
            </div>

            <div className="rounded-xl bg-white p-4 sm:p-6 shadow-sm ring-1 ring-slate-200">
              <h3 className="text-base sm:text-lg font-medium text-slate-900 mb-4">توزيع الطلاب حسب المرحلة</h3>
              <div className="h-64 sm:h-72 w-full flex items-center justify-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                {distributionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={distributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {distributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <span className="text-sm text-slate-400">لا توجد بيانات كافية لعرض الرسم البياني</span>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
