'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  BookOpen, Calendar, CheckCircle2, Clock, 
  FileText, GraduationCap, LayoutDashboard, 
  TrendingUp, AlertCircle, Bell
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';

export default function StudentDashboard() {
  const [studentData, setStudentData] = useState<any>(null);
  const [attendanceStats, setAttendanceStats] = useState<any>(null);
  const [recentGrades, setRecentGrades] = useState<any[]>([]);
  const [upcomingExams, setUpcomingExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch student profile
      const { data: student } = await supabase
        .from('students')
        .select('*, users(*), sections(*, classes(*))')
        .eq('id', user.id)
        .single();
      
      setStudentData(student);

      if (student) {
        // Fetch attendance stats
        const { data: attendance } = await supabase
          .from('attendance')
          .select('status')
          .eq('student_id', student.id);
        
        if (attendance) {
          const total = attendance.length;
          const present = attendance.filter(a => a.status === 'present').length;
          const late = attendance.filter(a => a.status === 'late').length;
          const absent = attendance.filter(a => a.status === 'absent').length;
          
          setAttendanceStats({
            total,
            present,
            late,
            absent,
            rate: total > 0 ? Math.round((present / total) * 100) : 100
          });
        }

        // Fetch recent grades
        const { data: grades } = await supabase
          .from('exam_attempts')
          .select('*, exam:exams(title, subject:subjects(name))')
          .eq('student_id', student.id)
          .order('completed_at', { ascending: false })
          .limit(5);
        
        setRecentGrades(grades || []);

        // Fetch upcoming exams for the student's section
        const { data: exams } = await supabase
          .from('exams')
          .select('*, subject:subjects(name)')
          .eq('section_id', student.section_id)
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(3);
        
        setUpcomingExams(exams || []);
      }
    } catch (error) {
      console.error('Error fetching student dashboard data:', error);
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
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-3xl bg-indigo-600 p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold">مرحباً، {studentData?.users?.full_name} 👋</h1>
            <p className="mt-2 text-indigo-100 text-lg">
              أنت مسجل في {studentData?.sections?.classes?.name} - {studentData?.sections?.name}
            </p>
          </div>
          <div className="flex gap-4">
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-md">
              <p className="text-xs text-indigo-200 uppercase tracking-wider font-semibold">نسبة الحضور</p>
              <p className="text-2xl font-bold">{attendanceStats?.rate || 0}%</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-md">
              <p className="text-xs text-indigo-200 uppercase tracking-wider font-semibold">الامتحانات المكتملة</p>
              <p className="text-2xl font-bold">{recentGrades.length}</p>
            </div>
          </div>
        </div>
        {/* Decorative background circles */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
        <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content - Left 2 Columns */}
        <div className="lg:col-span-2 space-y-8">
          {/* Recent Grades Chart */}
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
                تطور المستوى الأكاديمي
              </h2>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={recentGrades.slice().reverse()}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="exam.title" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#64748b', fontSize: 12}}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#64748b', fontSize: 12}}
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#4f46e5" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorScore)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Activity / Grades Table */}
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              آخر النتائج
            </h2>
            <div className="space-y-4">
              {recentGrades.length > 0 ? (
                recentGrades.map((grade) => (
                  <div key={grade.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-white flex items-center justify-center shadow-sm">
                        <BookOpen className="h-6 w-6 text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{grade.exam?.title}</p>
                        <p className="text-sm text-slate-500">{grade.exam?.subject?.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${grade.score >= 50 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {grade.score}%
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(grade.completed_at).toLocaleDateString('ar-SA')}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  لا توجد نتائج اختبارات حالياً
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Content - Right 1 Column */}
        <div className="space-y-8">
          {/* Attendance Widget */}
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-600" />
              ملخص الحضور
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">حضور</p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">{attendanceStats?.present || 0}</p>
              </div>
              <div className="p-4 rounded-2xl bg-red-50 border border-red-100">
                <p className="text-xs text-red-600 font-bold uppercase tracking-wider">غياب</p>
                <p className="text-2xl font-bold text-red-700 mt-1">{attendanceStats?.absent || 0}</p>
              </div>
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">
                <p className="text-xs text-amber-600 font-bold uppercase tracking-wider">تأخير</p>
                <p className="text-2xl font-bold text-amber-700 mt-1">{attendanceStats?.late || 0}</p>
              </div>
              <div className="p-4 rounded-2xl bg-sky-50 border border-sky-100">
                <p className="text-xs text-sky-600 font-bold uppercase tracking-wider">بعذر</p>
                <p className="text-2xl font-bold text-sky-700 mt-1">{attendanceStats?.excused || 0}</p>
              </div>
            </div>
          </div>

          {/* Upcoming Exams */}
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Bell className="h-5 w-5 text-indigo-600" />
              اختبارات قادمة
            </h2>
            <div className="space-y-4">
              {upcomingExams.length > 0 ? (
                upcomingExams.map((exam) => (
                  <div key={exam.id} className="p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-colors group">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{exam.title}</p>
                        <p className="text-sm text-slate-500 mt-1">{exam.subject?.name}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                        <Clock className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(exam.created_at).toLocaleDateString('ar-SA')}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-slate-500 text-sm">
                  لا توجد اختبارات مجدولة حالياً
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
