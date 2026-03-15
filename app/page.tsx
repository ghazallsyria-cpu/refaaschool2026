'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Users, GraduationCap, School, BookOpen, 
  CalendarCheck, FileText, Activity, ArrowUpRight,
  Plus, Settings, Bell, MessageSquare
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'motion/react';

export default function AdminDashboardHome() {
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    parents: 0,
    classes: 0,
    exams: 0,
  });
  const [recentAnnouncements, setRecentAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [
          { count: studentsCount },
          { count: teachersCount },
          { count: parentsCount },
          { count: classesCount },
          { count: examsCount },
          { data: announcements }
        ] = await Promise.all([
          supabase.from('students').select('*', { count: 'exact', head: true }),
          supabase.from('teachers').select('*', { count: 'exact', head: true }),
          supabase.from('parents').select('*', { count: 'exact', head: true }),
          supabase.from('classes').select('*', { count: 'exact', head: true }),
          supabase.from('exams').select('*', { count: 'exact', head: true }),
          supabase.from('announcements').select('id, title, created_at').order('created_at', { ascending: false }).limit(5)
        ]);

        setStats({
          students: studentsCount || 0,
          teachers: teachersCount || 0,
          parents: parentsCount || 0,
          classes: classesCount || 0,
          exams: examsCount || 0,
        });
        
        setRecentAnnouncements(announcements || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const statCards = [
    { name: 'الطلاب', value: stats.students, icon: Users, color: 'bg-blue-500', href: '/students' },
    { name: 'المعلمين', value: stats.teachers, icon: GraduationCap, color: 'bg-emerald-500', href: '/teachers' },
    { name: 'أولياء الأمور', value: stats.parents, icon: Users, color: 'bg-indigo-500', href: '/parents' },
    { name: 'الفصول', value: stats.classes, icon: School, color: 'bg-amber-500', href: '/classes' },
    { name: 'الاختبارات', value: stats.exams, icon: FileText, color: 'bg-purple-500', href: '/exams' },
  ];

  const quickActions = [
    { name: 'إضافة طالب', icon: Plus, href: '/students' },
    { name: 'إضافة معلم', icon: Plus, href: '/teachers' },
    { name: 'إرسال إعلان', icon: Bell, href: '/announcements' },
    { name: 'إعدادات المنصة', icon: Settings, href: '/settings' },
  ];

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">لوحة تحكم الإدارة</h1>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Activity className="h-4 w-4" />
          <span>محدث الآن</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
          >
            <dt>
              <div className={`absolute rounded-xl p-3 ${stat.color} bg-opacity-10`}>
                <stat.icon className={`h-6 w-6 ${stat.color.replace('bg-', 'text-')}`} aria-hidden="true" />
              </div>
              <p className="ml-16 truncate text-sm font-medium text-slate-500 pl-16">{stat.name}</p>
            </dt>
            <dd className="ml-16 flex items-baseline pb-1 sm:pb-2 pl-16">
              <p className="text-2xl font-semibold text-slate-900">{stat.value}</p>
            </dd>
            <Link href={stat.href} className="absolute inset-0 z-10" />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">إجراءات سريعة</h2>
          <div className="grid grid-cols-2 gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.name}
                href={action.href}
                className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 hover:border-indigo-600 hover:bg-indigo-50 transition-colors"
              >
                <div className="rounded-lg bg-indigo-100 p-2 text-indigo-600">
                  <action.icon className="h-5 w-5" />
                </div>
                <span className="font-medium text-slate-700">{action.name}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Announcements */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">أحدث الإعلانات</h2>
            <Link href="/announcements" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              عرض الكل
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-4">
            {recentAnnouncements.length > 0 ? (
              recentAnnouncements.map((announcement) => (
                <div key={announcement.id} className="flex items-start gap-4 rounded-xl bg-slate-50 p-4">
                  <div className="rounded-full bg-amber-100 p-2 text-amber-600 shrink-0">
                    <Bell className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-900">{announcement.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(announcement.created_at).toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500">
                لا توجد إعلانات حديثة
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
