'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, GraduationCap, BookOpen, CalendarDays, Plus, Bell } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const [stats, setStats] = useState([
    { name: 'إجمالي الطلاب', value: '...', icon: Users, color: 'text-indigo-600' },
    { name: 'إجمالي المعلمين', value: '...', icon: GraduationCap, color: 'text-emerald-600' },
    { name: 'إجمالي الفصول', value: '...', icon: BookOpen, color: 'text-amber-600' },
    { name: 'حضور اليوم', value: '...', icon: CalendarDays, color: 'text-sky-600' },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [
          { count: studentsCount },
          { count: teachersCount },
          { count: sectionsCount }
        ] = await Promise.all([
          supabase.from('students').select('*', { count: 'exact', head: true }),
          supabase.from('teachers').select('*', { count: 'exact', head: true }),
          supabase.from('sections').select('*', { count: 'exact', head: true })
        ]);

        setStats([
          { name: 'إجمالي الطلاب', value: (studentsCount || 0).toString(), icon: Users, color: 'text-indigo-600' },
          { name: 'إجمالي المعلمين', value: (teachersCount || 0).toString(), icon: GraduationCap, color: 'text-emerald-600' },
          { name: 'إجمالي الفصول', value: (sectionsCount || 0).toString(), icon: BookOpen, color: 'text-amber-600' },
          { name: 'حضور اليوم', value: '92%', icon: CalendarDays, color: 'text-sky-600' },
        ]);
      } catch (error) {
        console.error('Error fetching admin stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">لوحة تحكم المدير العام</h1>
          <p className="text-slate-500">مرحباً بك، إليك نظرة عامة على أداء المنصة اليوم.</p>
        </div>
        <div className="flex gap-3">
          <button className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50">
            <Bell className="h-4 w-4" />
            التنبيهات
          </button>
          <Link href="/admin/teacher-assignments" className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
            <Plus className="h-4 w-4" />
            إدارة تعيينات المعلمين
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.name}</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-xl bg-slate-50 ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Placeholder for future charts/tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">آخر النشاطات</h2>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                  {i}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">تم تحديث جدول الامتحانات</p>
                  <p className="text-xs text-slate-500">منذ {i * 10} دقائق</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">تنبيهات هامة</h2>
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <Bell className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-slate-500">لا توجد تنبيهات عاجلة تتطلب اتخاذ إجراء حالياً.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
