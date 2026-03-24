

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  BookOpen, Calendar, CheckCircle2, Clock,
  FileText, GraduationCap, TrendingUp, AlertCircle,
  Bell, ChevronLeft, Award, Target, BarChart2,
  Zap, AlertTriangle, Star, XCircle
} from "lucide-react";
import { motion } from "motion/react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts";
import Link from "next/link";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import AnnouncementsWidget from "@/components/AnnouncementsWidget";

const DAY_MAP: Record<number,string> = {0:"الأحد",1:"الاثنين",2:"الثلاثاء",3:"الأربعاء",4:"الخميس",5:"الجمعة",6:"السبت"};

function timeToMinutes(t: string): number {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export default function StudentDashboard() {
  const [studentData, setStudentData]         = useState<any>(null);
  const [attendanceStats, setAttendanceStats] = useState<any>(null);
  const [recentGrades, setRecentGrades]       = useState<any[]>([]);
  const [upcomingExams, setUpcomingExams]     = useState<any[]>([]);
  const [upcomingAssignments, setUpcomingAssignments] = useState<any[]>([]);
  const [submittedIds, setSubmittedIds]       = useState<Set<string>>(new Set());
  const [currentLesson, setCurrentLesson]     = useState<any>(null);
  const [nextLesson, setNextLesson]           = useState<any>(null);
  const [classAvg, setClassAvg]               = useState<number>(0);
  const [loading, setLoading]                 = useState(true);
  const [now, setNow]                         = useState(new Date());

  // تحديث الوقت كل دقيقة
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: student } = await supabase
        .from("students")
        .select("*, users(*), sections(*, classes(*))")
        .eq("id", user.id)
        .single();
      setStudentData(student);
      if (!student) return;

      const today      = now.toISOString().split("T")[0];
      const jsDay      = now.getDay();
      const dbDay      = jsDay === 0 ? 1 : jsDay === 1 ? 2 : jsDay === 2 ? 3 :
                         jsDay === 3 ? 4 : jsDay === 4 ? 5 : 0;
      const nowMin     = now.getHours() * 60 + now.getMinutes();

      const [
        { data: attendance },
        { data: grades },
        { data: exams },
        { data: assignments },
        { data: mySubmissions },
        { data: periodsData },
        { data: scheduleData },
        { data: classAttempts },
      ] = await Promise.all([
        // الحضور
        supabase.from("attendance").select("status").eq("student_id", student.id),
        // آخر الدرجات — كلها للمتوسط الحقيقي
        supabase.from("exam_attempts")
          .select("*, exam:exams(title, subject:subjects(name))")
          .eq("student_id", student.id)
          .in("status", ["completed", "graded"])
          .order("completed_at", { ascending: false }),
        // الاختبارات القادمة — باستخدام exam_date الصحيح
        supabase.from("exams")
          .select("*, subject:subjects(name)")
          .eq("section_id", student.section_id)
          .eq("status", "published")
          .gte("exam_date", today)
          .order("exam_date", { ascending: true })
          .limit(3),
        // الواجبات القادمة
        supabase.from("assignments")
          .select("*, subject:subjects(name)")
          .eq("section_id", student.section_id)
          .gte("due_date", now.toISOString())
          .order("due_date", { ascending: true })
          .limit(5),
        // الواجبات المسلّمة
        supabase.from("assignment_submissions")
          .select("assignment_id")
          .eq("student_id", student.id),
        // أوقات الحصص
        supabase.from("class_periods")
          .select("period_number, start_time, end_time")
          .order("period_number"),
        // جدول الطالب اليوم
        supabase.from("schedules")
          .select("period, subjects(name), teachers(users(full_name), zoom_link)")
          .eq("section_id", student.section_id)
          .eq("day_of_week", dbDay)
          .order("period"),
        // محاولات الفصل لحساب المتوسط
        supabase.from("exam_attempts")
          .select("score, exams!inner(section_id)")
          .eq("exams.section_id", student.section_id)
          .in("status", ["completed", "graded"]),
      ]);

      // حساب الحضور (present + late)
      if (attendance) {
        const total   = attendance.length;
        const present = attendance.filter(a => a.status === "present").length;
        const late    = attendance.filter(a => a.status === "late").length;
        const absent  = attendance.filter(a => a.status === "absent").length;
        setAttendanceStats({
          total, present, late, absent,
          rate: total > 0 ? Math.round(((present + late) / total) * 100) : 100
        });
      }

      setRecentGrades(grades || []);

      // الواجبات المسلمة
      setSubmittedIds(new Set((mySubmissions || []).map(s => s.assignment_id)));

      setUpcomingExams(exams || []);
      setUpcomingAssignments(assignments || []);

      // الحصة الحالية والتالية
      if (scheduleData && periodsData) {
        let current = null;
        let next    = null;
        for (const slot of scheduleData) {
          const p = periodsData.find(per => per.period_number === slot.period);
          if (!p) continue;
          const start = timeToMinutes(p.start_time);
          const end   = timeToMinutes(p.end_time);
          if (nowMin >= start && nowMin < end) {
            current = { ...slot, start_time: p.start_time, end_time: p.end_time, remaining: end - nowMin };
          } else if (nowMin < start && !next) {
            next = { ...slot, start_time: p.start_time, end_time: p.end_time };
          }
        }
        setCurrentLesson(current);
        setNextLesson(next);
      }

      // متوسط الفصل
      if (classAttempts && classAttempts.length > 0) {
        const avg = Math.round(classAttempts.reduce((a, c) => a + (c.score || 0), 0) / classAttempts.length);
        setClassAvg(avg);
      }

    } catch (error) {
      console.error("Student dashboard error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="text-slate-500 font-medium animate-pulse">جاري تحميل بياناتك...</p>
        </div>
      </div>
    );
  }

  const allGrades  = recentGrades.filter(g => g.score !== null);
  const avgScore   = allGrades.length > 0
    ? Math.round(allGrades.reduce((a, c) => a + c.score, 0) / allGrades.length)
    : 0;

  const unsubmittedCount = upcomingAssignments.filter(a => !submittedIds.has(a.id)).length;
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const dueTomorrow = upcomingAssignments.filter(a =>
    !submittedIds.has(a.id) && a.due_date.startsWith(tomorrowStr)
  );

  // شارة الحضور المثالي
  const perfectAttendance = attendanceStats && attendanceStats.absent === 0 && attendanceStats.total > 0;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-8 max-w-7xl mx-auto">

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-700 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black mb-1">
              مرحباً، {studentData?.users?.full_name} 👋
            </h1>
            <p className="text-indigo-200 flex items-center gap-2 text-sm font-bold">
              <GraduationCap className="h-4 w-4" />
              {studentData?.sections?.classes?.name} — {studentData?.sections?.name}
            </p>
            <p className="text-indigo-300 text-xs mt-1 font-bold">
              {DAY_MAP[now.getDay()]}، {now.getDate()} {["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"][now.getMonth()]}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="rounded-2xl bg-white/15 backdrop-blur p-4 border border-white/20 text-center min-w-[100px]">
              <p className="text-[10px] text-indigo-200 font-black uppercase tracking-widest mb-1">نسبة الحضور</p>
              <p className="text-3xl font-black">{attendanceStats?.rate || 0}%</p>
              {perfectAttendance && <p className="text-[10px] text-amber-300 font-black mt-1">⭐ مثالي</p>}
            </div>
            <div className="rounded-2xl bg-white/15 backdrop-blur p-4 border border-white/20 text-center min-w-[100px]">
              <p className="text-[10px] text-indigo-200 font-black uppercase tracking-widest mb-1">متوسطك</p>
              <p className={`text-3xl font-black ${avgScore >= classAvg ? "text-white" : "text-red-300"}`}>{avgScore}%</p>
              {classAvg > 0 && (
                <p className={`text-[10px] font-black mt-1 ${avgScore >= classAvg ? "text-emerald-300" : "text-red-300"}`}>
                  {avgScore >= classAvg ? `↑ +${avgScore - classAvg}% عن الفصل` : `↓ ${avgScore - classAvg}% عن الفصل`}
                </p>
              )}
            </div>
            {unsubmittedCount > 0 && (
              <div className="rounded-2xl bg-amber-500/30 backdrop-blur p-4 border border-amber-300/30 text-center min-w-[100px]">
                <p className="text-[10px] text-amber-200 font-black uppercase tracking-widest mb-1">واجبات باقية</p>
                <p className="text-3xl font-black text-amber-200">{unsubmittedCount}</p>
              </div>
            )}
          </div>
        </div>
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
      </div>

      {/* تنبيه واجبات غداً */}
      {dueTomorrow.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3"
        >
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-black text-amber-800 text-sm">⚠️ واجبات تنتهي غداً!</p>
            {dueTomorrow.map(a => (
              <Link key={a.id} href={`/assignments/${a.id}`}
                className="block text-xs text-amber-700 font-bold mt-1 hover:underline"
              >
                • {a.title} — {a.subject?.name} — {format(new Date(a.due_date), "h:mm a", { locale: arSA })}
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* الحصة الحالية */}
      {(currentLesson || nextLesson) && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
          className={`rounded-2xl p-4 border flex items-center justify-between gap-4 ${
            currentLesson
              ? "bg-emerald-50 border-emerald-200"
              : "bg-slate-50 border-slate-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-2xl flex items-center justify-center ${
              currentLesson ? "bg-emerald-500" : "bg-slate-300"
            }`}>
              {currentLesson ? <Zap className="h-5 w-5 text-white" /> : <Clock className="h-5 w-5 text-white" />}
            </div>
            <div>
              <p className={`font-black text-sm ${currentLesson ? "text-emerald-800" : "text-slate-700"}`}>
                {currentLesson ? "⚡ الحصة الحالية" : `التالية — ${(currentLesson || nextLesson)?.start_time?.slice(0,5)}`}
              </p>
              <p className={`text-xs font-bold ${currentLesson ? "text-emerald-600" : "text-slate-500"}`}>
                {(currentLesson || nextLesson)?.subjects?.name}
                {" — "}
                أ. {(currentLesson || nextLesson)?.teachers?.users?.full_name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {currentLesson && (
              <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-xl">
                {currentLesson.remaining} دقيقة متبقية
              </span>
            )}
            {(currentLesson || nextLesson)?.teachers?.zoom_link && (
              <a href={(currentLesson || nextLesson).teachers.zoom_link} target="_blank" rel="noopener noreferrer"
                className="text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-1.5 rounded-xl transition-all"
              >
                دخول Zoom
              </a>
            )}
          </div>
        </motion.div>
      )}

      {/* روابط سريعة */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "الجدول",      icon: Calendar, href: "/dashboard/student/schedule",  color: "text-indigo-600",  bg: "bg-indigo-50"  },
          { label: "الاختبارات", icon: FileText,  href: "/exams",      color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "الواجبات",   icon: BookOpen,  href: "/assignments", color: "text-amber-600",   bg: "bg-amber-50"   },
          { label: "التنبيهات",  icon: Bell,      href: "/messages",   color: "text-sky-600",     bg: "bg-sky-50"     },
        ].map(a => (
          <Link key={a.label} href={a.href} className="group">
            <div className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all flex flex-col sm:flex-row items-center gap-2">
              <div className={`p-2 rounded-xl ${a.bg} group-hover:scale-110 transition-transform`}>
                <a.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${a.color}`} />
              </div>
              <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors text-xs sm:text-sm">{a.label}</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* العمود الرئيسي */}
        <div className="lg:col-span-2 space-y-6">

          {/* الرسم البياني */}
          <div className="rounded-3xl bg-white/80 backdrop-blur-xl p-6 shadow-sm ring-1 ring-slate-200/50">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <div className="p-2 bg-indigo-50 rounded-xl">
                  <TrendingUp className="h-5 w-5 text-indigo-600" />
                </div>
                تطور المستوى الأكاديمي
              </h2>
              {classAvg > 0 && (
                <div className={`text-xs font-black px-3 py-1.5 rounded-xl ${
                  avgScore >= classAvg ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                }`}>
                  معدل الفصل: {classAvg}%
                </div>
              )}
            </div>
            <div className="h-[250px] w-full">
              {allGrades.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={allGrades.slice(0, 8).reverse()}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#4f46e5" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="exam.title" axisLine={false} tickLine={false}
                      tick={{ fill: "#94a3b8", fontSize: 10 }} dy={8}
                      tickFormatter={(v: string) => v?.slice(0, 10) || ""}
                    />
                    <YAxis axisLine={false} tickLine={false}
                      tick={{ fill: "#94a3b8", fontSize: 11 }} domain={[0, 100]}
                    />
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 25px -5px rgb(0 0 0/0.1)" }} />
                    {classAvg > 0 && (
                      <Area type="monotone" dataKey={() => classAvg}
                        stroke="#e2e8f0" strokeWidth={1.5} strokeDasharray="4 4"
                        fill="transparent" name="معدل الفصل"
                      />
                    )}
                    <Area type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={3}
                      fillOpacity={1} fill="url(#colorScore)" name="درجتك"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <BarChart2 className="h-10 w-10 text-slate-200 mb-3" />
                  <p className="font-bold text-sm">لا توجد بيانات كافية بعد</p>
                </div>
              )}
            </div>
          </div>

          {/* آخر النتائج */}
          <div className="rounded-3xl bg-white/80 backdrop-blur-xl p-6 shadow-sm ring-1 ring-slate-200/50">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <div className="p-2 bg-emerald-50 rounded-xl">
                  <Award className="h-5 w-5 text-emerald-600" />
                </div>
                آخر النتائج
              </h2>
              <Link href="/exams"
                className="text-sm font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-1"
              >
                كل الاختبارات <ChevronLeft className="h-4 w-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {allGrades.slice(0, 5).length > 0 ? allGrades.slice(0, 5).map(grade => (
                <div key={grade.id}
                  className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shadow-sm ${
                      grade.score >= 80 ? "bg-emerald-50 text-emerald-600"
                      : grade.score >= 60 ? "bg-amber-50 text-amber-600"
                      : "bg-red-50 text-red-600"
                    }`}>
                      {grade.score >= 60 ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{grade.exam?.title}</p>
                      <p className="text-xs text-slate-400">{grade.exam?.subject?.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-black ${
                      grade.score >= 80 ? "text-emerald-600"
                      : grade.score >= 60 ? "text-amber-600" : "text-red-600"
                    }`}>{grade.score}%</p>
                    {classAvg > 0 && (
                      <p className={`text-[10px] font-bold ${grade.score >= classAvg ? "text-emerald-500" : "text-red-400"}`}>
                        {grade.score >= classAvg ? `↑ +${grade.score - classAvg}` : `↓ ${grade.score - classAvg}`} عن الفصل
                      </p>
                    )}
                  </div>
                </div>
              )) : (
                <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 font-bold text-sm">
                  لا توجد نتائج اختبارات حالياً
                </div>
              )}
            </div>
          </div>
        </div>

        {/* الشريط الجانبي */}
        <div className="space-y-6">
          <AnnouncementsWidget role="student" />

          {/* ملخص الحضور */}
          <div className="rounded-3xl bg-white/80 backdrop-blur-xl p-6 shadow-sm ring-1 ring-slate-200/50">
            <h2 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
              <div className="p-2 bg-indigo-50 rounded-xl">
                <Calendar className="h-5 w-5 text-indigo-600" />
              </div>
              ملخص الحضور
              {perfectAttendance && (
                <span className="text-xs font-black text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Star className="h-3 w-3" /> مثالي
                </span>
              )}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "حضور",  val: attendanceStats?.present || 0, color: "emerald" },
                { label: "غياب",  val: attendanceStats?.absent  || 0, color: "red"     },
                { label: "تأخير", val: attendanceStats?.late    || 0, color: "amber"   },
                { label: "إجمالي",val: attendanceStats?.total   || 0, color: "sky"     },
              ].map(item => (
                <div key={item.label} className={`p-4 rounded-2xl bg-${item.color}-50 border border-${item.color}-100 flex flex-col items-center`}>
                  <p className={`text-[10px] text-${item.color}-600 font-black uppercase tracking-wider`}>{item.label}</p>
                  <p className={`text-3xl font-black text-${item.color}-700 mt-1`}>{item.val}</p>
                </div>
              ))}
            </div>
          </div>

          {/* الواجبات القادمة */}
          <div className="rounded-3xl bg-white/80 backdrop-blur-xl p-6 shadow-sm ring-1 ring-slate-200/50">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <div className="p-2 bg-amber-50 rounded-xl">
                  <Target className="h-5 w-5 text-amber-500" />
                </div>
                الواجبات
              </h2>
              {unsubmittedCount > 0 && (
                <span className="text-xs font-black text-red-600 bg-red-50 border border-red-100 px-2 py-1 rounded-xl">
                  {unsubmittedCount} غير مسلّم
                </span>
              )}
            </div>
            <div className="space-y-3">
              {upcomingAssignments.length > 0 ? upcomingAssignments.map(a => {
                const submitted = submittedIds.has(a.id);
                const overdue   = new Date(a.due_date) < now;
                return (
                  <Link href={`/assignments/${a.id}`} key={a.id} className="block group">
                    <div className={`p-3 rounded-2xl border transition-all hover:shadow-sm ${
                      submitted ? "bg-emerald-50/50 border-emerald-100" :
                      overdue   ? "bg-red-50/50 border-red-100"         :
                                  "bg-white border-slate-100 hover:border-amber-200"
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors text-sm line-clamp-1">{a.title}</p>
                        {submitted ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        ) : (
                          <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg whitespace-nowrap">
                            {format(new Date(a.due_date), "d MMM", { locale: arSA })}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{a.subject?.name}</p>
                    </div>
                  </Link>
                );
              }) : (
                <div className="text-center py-6 text-slate-400 text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200 font-bold">
                  لا توجد واجبات قادمة
                </div>
              )}
            </div>
          </div>

          {/* الاختبارات القادمة */}
          <div className="rounded-3xl bg-white/80 backdrop-blur-xl p-6 shadow-sm ring-1 ring-slate-200/50">
            <h2 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
              <div className="p-2 bg-indigo-50 rounded-xl">
                <FileText className="h-5 w-5 text-indigo-600" />
              </div>
              اختبارات قادمة
            </h2>
            <div className="space-y-3">
              {upcomingExams.length > 0 ? upcomingExams.map(exam => (
                <Link href={`/exams`} key={exam.id} className="block group">
                  <div className="p-3 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:shadow-sm transition-all bg-white">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors text-sm line-clamp-1">{exam.title}</p>
                      <Clock className="h-4 w-4 text-indigo-400 shrink-0" />
                    </div>
                    <p className="text-xs text-slate-400 mb-2">{exam.subject?.name}</p>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1.5 rounded-lg">
                      <Calendar className="h-3 w-3 text-indigo-400" />
                      {format(new Date(exam.exam_date), "EEEE، d MMMM", { locale: arSA })}
                      {exam.start_time && ` — ${exam.start_time.slice(0,5)}`}
                    </div>
                  </div>
                </Link>
              )) : (
                <div className="text-center py-6 text-slate-400 text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200 font-bold">
                  لا توجد اختبارات مجدولة
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
