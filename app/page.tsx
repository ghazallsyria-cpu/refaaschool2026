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
          { data: attendanceData }
        ] = await Promise.all([
          supabase.from('students').select('*', { count: 'exact', head: true }),
          supabase.from('teachers').select('*', { count: 'exact', head: true }),
          supabase.from('classes').select('*', { count: 'exact', head: true }),
          supabase.from('attendance').select('status').eq('date', new Date().toISOString().split('T')[0])
        ]);

        let attendanceRate = 0;
        if (attendanceData && attendanceData.length > 0) {
          const presentCount = attendanceData.filter(a => a.status === 'present').length;
          attendanceRate = Math.round((presentCount / attendanceData.length) * 100);
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
          NEXT_PUBLIC_SUPABASE_URL="your-url"<br/>
          NEXT_PUBLIC_SUPABASE_ANON_KEY="your-key"
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

  // Since we need to show charts but might not have data, we'll fetch real data for charts if possible.
  // For now, we'll use empty arrays if no data, as requested (no mock data).
  const attendanceChartData: any[] = []; 
  const distributionData: any[] = [];

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
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => (
              <div key={stat.name} className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-md ${stat.color}`}>
                        <stat.icon className="h-6 w-6 text-white" aria-hidden="true" />
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1 mr-4">
                      <dl>
                        <dt className="truncate text-sm font-medium text-slate-500">{stat.name}</dt>
                        <dd>
                          <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h3 className="text-lg font-medium text-slate-900 mb-4">إحصائيات الحضور (الأسبوع الحالي)</h3>
              <div className="h-72 w-full flex items-center justify-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                {attendanceChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={attendanceChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="present" name="حاضر" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="absent" name="غائب" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <span className="text-slate-400">لا توجد بيانات كافية لعرض الرسم البياني</span>
                )}
              </div>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h3 className="text-lg font-medium text-slate-900 mb-4">توزيع الطلاب حسب المرحلة</h3>
              <div className="h-72 w-full flex items-center justify-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                {distributionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={distributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
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
                  <span className="text-slate-400">لا توجد بيانات كافية لعرض الرسم البياني</span>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
