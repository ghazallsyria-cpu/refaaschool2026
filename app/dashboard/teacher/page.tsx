'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Users, BookOpen, Calendar, CheckCircle2, 
  Clock, FileText, Plus, Search, 
  TrendingUp, BarChart2, UserCheck, MessageSquare
} from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';

export default function TeacherDashboard() {
  const [teacherData, setTeacherData] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [recentExams, setRecentExams] = useState<any[]>([]);
  const [recentAssignments, setRecentAssignments] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalExams: 0,
    totalAssignments: 0,
    avgAttendance: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch teacher profile
      const { data: teacher } = await supabase
        .from('teachers')
        .select('*, users(*)')
        .eq('id', user.id)
        .single();
      
      setTeacherData(teacher);

      if (teacher) {
        // Fetch teacher's sections assigned to this teacher
        const { data: teacherSections } = await supabase
          .from('teacher_sections')
          .select('section_id, section:sections(*, classes(*), students(count))')
          .eq('teacher_id', user.id);
        
        const sectionsData = (teacherSections?.map(ts => ts.section) || []) as any[];
        setSections(sectionsData);

        // Fetch exams for the teacher's sections
        const sectionIds = sectionsData.map((s: any) => s.id);
        
        const [examsRes, assignmentsRes, scheduleRes, messagesRes] = await Promise.all([
          supabase
            .from('exams')
            .select('*, subject:subjects(name), section:sections(name)')
            .in('section_id', sectionIds)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('assignments')
            .select('*, subjects(name), sections(name, classes(name))')
            .in('section_id', sectionIds)
            .order('due_date', { ascending: true })
            .limit(5),
          supabase
            .from('schedules')
            .select('*, subjects(name), sections(name, classes(name))')
            .eq('teacher_id', user.id)
            .order('day_of_week')
            .order('period'),
          supabase
            .from('messages')
            .select('*, sender:sender_id(full_name)')
            .eq('receiver_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5)
        ]);
        
        setRecentExams(examsRes.data || []);
        setRecentAssignments(assignmentsRes.data || []);
        setSchedule(scheduleRes.data || []);
        setMessages(messagesRes.data || []);

        // Calculate stats
        const totalStudents = sectionsData?.reduce((acc, s) => acc + (s.students?.[0]?.count || 0), 0) || 0;
        setStats({
          totalStudents,
          totalExams: examsRes.data?.length || 0,
          totalAssignments: assignmentsRes.data?.length || 0,
          avgAttendance: 94 // Mock for now
        });
      }
    } catch (error) {
      console.error('Error fetching teacher dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header with Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">مرحباً، أ. {teacherData?.users?.full_name}</h1>
          <p className="text-slate-500 mt-1">إليك نظرة سريعة على فصولك الدراسية وطلابك.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link 
            href="/attendance"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 transition-all"
          >
            <UserCheck className="h-4 w-4 text-emerald-600" />
            رصد الحضور
          </Link>
          <Link 
            href="/exams/builder"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 transition-all"
          >
            <Plus className="h-4 w-4" />
            إنشاء اختبار
          </Link>
        </div>
      </div>      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
        <div className="bg-white p-6 rounded-3xl shadow-sm ring-1 ring-slate-200 flex items-center gap-6">
          <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Users className="h-7 w-7" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">إجمالي الطلاب</p>
            <p className="text-2xl font-bold text-slate-900">{stats.totalStudents}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm ring-1 ring-slate-200 flex items-center gap-6">
          <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <FileText className="h-7 w-7" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">الاختبارات</p>
            <p className="text-2xl font-bold text-slate-900">{stats.totalExams}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm ring-1 ring-slate-200 flex items-center gap-6">
          <div className="h-14 w-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
            <BookOpen className="h-7 w-7" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">الواجبات</p>
            <p className="text-2xl font-bold text-slate-900">{stats.totalAssignments}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm ring-1 ring-slate-200 flex items-center gap-6">
          <div className="h-14 w-14 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-600">
            <BarChart2 className="h-7 w-7" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">متوسط الحضور</p>
            <p className="text-2xl font-bold text-slate-900">{stats.avgAttendance}%</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content - Left 2 Columns */}
        <div className="lg:col-span-2 space-y-8">
          {/* My Sections */}
          <div className="bg-white rounded-3xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-indigo-600" />
                فصولي الدراسية
              </h2>
              <Link href="/classes" className="text-sm font-bold text-indigo-600 hover:underline">عرض الكل</Link>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sections.length > 0 ? (
                  sections.map((section) => (
                    <div key={section.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-200 transition-all group">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{section.classes?.name}</h3>
                          <p className="text-sm text-slate-500">{section.name}</p>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-slate-400 group-hover:text-indigo-600 transition-colors">
                          <Users className="h-5 w-5" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{section.students?.[0]?.count || 0} طالب</span>
                        <div className="flex items-center gap-1 text-emerald-600 font-bold">
                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-600"></div>
                          نشط حالياً
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 p-8 text-center text-slate-500">
                    لا توجد فصول مسجلة حالياً
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Assignments */}
          <div className="bg-white rounded-3xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Plus className="h-5 w-5 text-amber-600" />
                آخر الواجبات
              </h2>
              <Link href="/assignments" className="text-sm font-bold text-indigo-600 hover:underline">إدارة الواجبات</Link>
            </div>
            <div className="divide-y divide-slate-100">
              {recentAssignments.length > 0 ? (
                recentAssignments.map((assignment) => (
                  <div key={assignment.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                        <BookOpen className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{assignment.title}</p>
                        <p className="text-sm text-slate-500">{assignment.subjects?.name} • {assignment.sections?.classes?.name} - {assignment.sections?.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">موعد التسليم</p>
                      <p className="text-xs text-slate-400">{new Date(assignment.due_date).toLocaleDateString('ar-SA')}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-slate-500">
                  لا توجد واجبات منشورة حالياً
                </div>
              )}
            </div>
          </div>

          {/* Recent Exams */}
          <div className="bg-white rounded-3xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                آخر الاختبارات
              </h2>
              <Link href="/exams" className="text-sm font-bold text-indigo-600 hover:underline">إدارة الاختبارات</Link>
            </div>
            <div className="divide-y divide-slate-100">
              {recentExams.length > 0 ? (
                recentExams.map((exam) => (
                  <div key={exam.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{exam.title}</p>
                        <p className="text-sm text-slate-500">{exam.subject?.name} • {exam.section?.name || 'جميع الشعب'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-slate-900">24/30</p>
                        <p className="text-xs text-slate-400">تم التسليم</p>
                      </div>
                      <Link 
                        href={`/exams/results/${exam.id}`}
                        className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-indigo-600 hover:text-white transition-all"
                      >
                        <BarChart2 className="h-5 w-5" />
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-slate-500">
                  لم تقم بإنشاء أي اختبارات بعد
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-8">
          {/* Calendar / Schedule Widget */}
          <div className="bg-white rounded-3xl shadow-sm ring-1 ring-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-600" />
              الجدول اليومي
            </h2>
            <div className="space-y-4">
              {schedule.length > 0 ? (
                schedule.map((item, i) => (
                  <div key={i} className="p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 bg-slate-50/50 transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-slate-900">{item.subjects?.name}</p>
                        <p className="text-xs text-slate-500 mt-1">{item.sections?.classes?.name} - {item.sections?.name}</p>
                      </div>
                      <span className="text-xs font-bold px-2 py-1 rounded-lg bg-indigo-600 text-white">
                        {item.period} - {['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'][item.day_of_week]}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-slate-500">لا توجد حصص مجدولة</p>
              )}
            </div>
          </div>

          {/* Recent Messages / Notifications */}
          <div className="bg-white rounded-3xl shadow-sm ring-1 ring-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-indigo-600" />
              تواصل أولياء الأمور
            </h2>
            <div className="space-y-4">
              {messages.length > 0 ? (
                messages.map((item, i) => (
                  <div key={i} className="flex gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer">
                    <div className="h-10 w-10 rounded-full bg-slate-100 flex-shrink-0 flex items-center justify-center font-bold text-slate-500">
                      {item.sender?.full_name?.charAt(0) || 'م'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{item.sender?.full_name}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{item.subject}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{new Date(item.created_at).toLocaleDateString('ar-SA')}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-slate-500">لا توجد رسائل جديدة</p>
              )}
            </div>
            <button className="w-full mt-4 py-2 text-sm font-bold text-indigo-600 border border-indigo-100 rounded-xl hover:bg-indigo-50 transition-all">
              فتح صندوق الرسائل
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
