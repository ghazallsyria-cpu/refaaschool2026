'use client';
 
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Calendar, CheckCircle2, Clock, FileText,
  TrendingUp, BarChart2, MessageSquare,
  Bell, Award, ShieldCheck, AlertTriangle,
  Users, BookOpen, ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import AnnouncementsWidget from '@/components/AnnouncementsWidget';
 
export default function ParentDashboard() {
  const [parentData, setParentData] = useState<any>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
 
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
 
      const { data: parent } = await supabase
        .from('parents')
        .select('*, users(*)')
        .eq('id', user.id)
        .single();
      setParentData(parent);
      if (!parent) return;
 
      // جلب الأبناء مع بياناتهم الحقيقية
      const { data: childrenData } = await supabase
        .from('students')
        .select('*, users(*), sections(*, classes(*))')
        .eq('parent_id', user.id);
 
      const children = childrenData || [];
 
      // جلب إحصائيات الحضور الحقيقية لكل ابن
      const today = new Date().toISOString().split('T')[0];
      const enriched = await Promise.all(children.map(async (child) => {
        const [{ data: att }, { data: grades }, { data: assignments }, { data: submissions }] = await Promise.all([
          supabase.from('attendance').select('status').eq('student_id', child.id),
          supabase.from('exam_attempts')
            .select('score').eq('student_id', child.id)
            .in('status', ['completed', 'graded']),
          supabase.from('assignments')
            .select('id').eq('section_id', child.section_id)
            .gte('due_date', new Date().toISOString()),
          supabase.from('assignment_submissions')
            .select('assignment_id').eq('student_id', child.id),
        ]);
 
        const total = att?.length || 0;
        const present = att?.filter(a => a.status === 'present' || a.status === 'late').length || 0;
        const absent = att?.filter(a => a.status === 'absent').length || 0;
        const rate = total > 0 ? Math.round((present / total) * 100) : 100;
 
        const scores = grades?.map(g => g.score).filter(s => s !== null) || [];
        const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
 
        const submittedIds = new Set((submissions || []).map(s => s.assignment_id));
        const pending = (assignments || []).filter(a => !submittedIds.has(a.id)).length;
 
        return { ...child, stats: { rate, absent, avg, pending, exams: scores.length } };
      }));
 
      setChildren(enriched);
 
      // التنبيهات الحقيقية من جدول notifications
      const childIds = children.map(c => c.id);
      if (childIds.length > 0) {
        const { data: notifData } = await supabase
          .from('notifications')
          .select('*, student:user_id(full_name)')
          .in('user_id', childIds)
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .limit(10);
        setNotifications(notifData || []);
      }
 
    } catch (error) {
      console.error('Parent dashboard error:', error);
    } finally {
      setLoading(false);
    }
  }, []);
 
  useEffect(() => { fetchData(); }, [fetchData]);
 
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }
 
  return (
    <div className="space-y-8 pb-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900">مرحباً، {parentData?.users?.full_name} 👨‍👩‍👧</h1>
          <p className="text-slate-500 mt-1 font-medium">تابع تقدم أبنائك الدراسي وحضورهم اليومي</p>
        </div>
        <Link href="/messages"
          className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-indigo-700 transition-all self-start"
        >
          <MessageSquare className="h-4 w-4" />
          تواصل مع المدرسة
        </Link>
      </div>
 
      {/* بطاقات الأبناء */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {children.length === 0 ? (
          <div className="col-span-2 text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200">
            <Users className="h-12 w-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-bold">لا يوجد أبناء مسجلون في حسابك</p>
          </div>
        ) : children.map((child) => (
          <motion.div key={child.id} whileHover={{ y: -3 }}
            className="bg-white rounded-3xl shadow-sm ring-1 ring-slate-200/50 overflow-hidden"
          >
            {/* رأس البطاقة */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-indigo-700 font-black text-xl">
                  {child.users?.full_name?.[0]}
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">{child.users?.full_name}</h2>
                  <p className="text-sm text-slate-500 font-bold">{child.sections?.classes?.name} — {child.sections?.name}</p>
                </div>
              </div>
              <Link href="/exams"
                className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all border border-slate-100"
                title="الاختبارات"
              >
                <TrendingUp className="h-5 w-5" />
              </Link>
            </div>
 
            {/* الإحصائيات الحقيقية */}
            <div className="p-5 grid grid-cols-3 gap-3">
              <div className={`p-3 rounded-2xl text-center ${child.stats.rate >= 90 ? 'bg-emerald-50 border border-emerald-100' : child.stats.rate >= 75 ? 'bg-amber-50 border border-amber-100' : 'bg-red-50 border border-red-100'}`}>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">الحضور</p>
                <p className={`text-xl font-black ${child.stats.rate >= 90 ? 'text-emerald-700' : child.stats.rate >= 75 ? 'text-amber-700' : 'text-red-700'}`}>
                  {child.stats.rate}%
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-100 text-center">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">المتوسط</p>
                <p className={`text-xl font-black ${child.stats.avg >= 75 ? 'text-indigo-700' : 'text-red-600'}`}>
                  {child.stats.avg > 0 ? `${child.stats.avg}%` : '—'}
                </p>
              </div>
              <div className={`p-3 rounded-2xl text-center ${child.stats.pending > 0 ? 'bg-amber-50 border border-amber-100' : 'bg-slate-50 border border-slate-100'}`}>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">واجبات</p>
                <p className={`text-xl font-black ${child.stats.pending > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                  {child.stats.pending > 0 ? `${child.stats.pending} ⏳` : '✓'}
                </p>
              </div>
            </div>
 
            {/* تنبيهات الابن */}
            {child.stats.absent > 0 && (
              <div className="mx-5 mb-5 p-3 rounded-2xl bg-red-50 border border-red-100 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                <p className="text-xs font-black text-red-700">{child.stats.absent} يوم غياب مسجل</p>
              </div>
            )}
 
            <div className="px-5 pb-5 flex gap-2">
              <Link href="/attendance"
                className="flex-1 text-center py-2.5 text-xs font-black text-slate-600 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-slate-100 transition-all"
              >
                سجل الحضور
              </Link>
              <Link href="/exams"
                className="flex-1 text-center py-2.5 text-xs font-black text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-2xl hover:bg-indigo-100 transition-all"
              >
                النتائج
              </Link>
              <Link href="/assignments"
                className="flex-1 text-center py-2.5 text-xs font-black text-amber-600 bg-amber-50 border border-amber-100 rounded-2xl hover:bg-amber-100 transition-all"
              >
                الواجبات
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
 
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* التنبيهات الحقيقية */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm ring-1 ring-slate-200/50 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <div className="p-2 bg-indigo-50 rounded-xl">
                <Bell className="h-5 w-5 text-indigo-600" />
              </div>
              تنبيهات الأبناء
            </h2>
            {notifications.length > 0 && (
              <span className="h-6 w-6 rounded-full bg-red-500 text-white text-xs font-black flex items-center justify-center">
                {notifications.length}
              </span>
            )}
          </div>
          <div className="divide-y divide-slate-50">
            {notifications.length === 0 ? (
              <div className="py-16 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-200 mx-auto mb-3" />
                <p className="font-bold text-slate-500">لا توجد تنبيهات جديدة</p>
                <p className="text-sm text-slate-400 mt-1">جميع الأبناء بخير!</p>
              </div>
            ) : notifications.map((note) => (
              <div key={note.id} className="p-5 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                <div className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  note.type === 'assignment' ? 'bg-amber-50 text-amber-600' :
                  note.type === 'exam'       ? 'bg-indigo-50 text-indigo-600' :
                  note.type === 'attendance' ? 'bg-red-50 text-red-600' :
                  'bg-slate-50 text-slate-600'
                }`}>
                  {note.type === 'attendance' ? <ShieldCheck className="h-5 w-5" /> :
                   note.type === 'exam'       ? <Award className="h-5 w-5" /> :
                   <Bell className="h-5 w-5" />}
                </div>
                <div className="flex-1">
                  <p className="font-black text-slate-900 text-sm">{note.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{note.content}</p>
                </div>
                <p className="text-[10px] text-slate-400 whitespace-nowrap">
                  {new Date(note.created_at).toLocaleDateString('ar-EG')}
                </p>
              </div>
            ))}
          </div>
        </div>
 
        <div className="space-y-6">
          <AnnouncementsWidget role="parent" />
 
          <div className="bg-white rounded-3xl shadow-sm ring-1 ring-slate-200/50 p-6">
            <h2 className="text-lg font-black text-slate-900 mb-4">روابط سريعة</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'سجل الحضور', icon: Calendar, href: '/attendance', color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { label: 'الواجبات', icon: BookOpen, href: '/assignments', color: 'text-amber-600', bg: 'bg-amber-50' },
                { label: 'الاختبارات', icon: FileText, href: '/exams', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'الإعدادات', icon: ShieldCheck, href: '/settings', color: 'text-slate-600', bg: 'bg-slate-50' },
              ].map(a => (
                <Link key={a.label} href={a.href}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-200 text-center transition-all group"
                >
                  <a.icon className={`h-6 w-6 mx-auto mb-2 ${a.color} group-hover:scale-110 transition-transform`} />
                  <span className="text-xs font-bold text-slate-700">{a.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
