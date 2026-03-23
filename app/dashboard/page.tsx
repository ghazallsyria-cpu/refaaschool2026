"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  Users, GraduationCap, BookOpen, CalendarDays,
  Plus, Bell, School, ArrowUpRight, Activity,
  AlertTriangle, FileText, Clock, CheckCircle2,
  TrendingUp, TrendingDown, Minus, Radio
} from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";
import AnnouncementsWidget from "@/components/AnnouncementsWidget";

type Stage = "all" | "middle" | "high";

function getTeacherStage(levels: number[]): "middle" | "high" | "shared" | "none" {
  const hasMiddle = levels.some(l => l >= 6 && l <= 9);
  const hasHigh   = levels.some(l => l >= 10 && l <= 12);
  if (hasMiddle && hasHigh) return "shared";
  if (hasMiddle) return "middle";
  if (hasHigh)   return "high";
  return "none";
}

const containerVariants: any = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};
const itemVariants: any = {
  hidden:  { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
};

const MONTH_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const DAY_AR   = ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];

export default function AdminDashboard() {
  const [stage, setStage] = useState<Stage>("all");
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<{title: string; desc: string; color: string; href: string}[]>([]);

  const [allStats, setAllStats] = useState({
    middle: { students: 0, teachers: 0, sections: 0, attendance: 0, absent: 0 },
    high:   { students: 0, teachers: 0, sections: 0, attendance: 0, absent: 0 },
    all:    { students: 0, teachers: 0, sections: 0, attendance: 0, absent: 0, activeExams: 0, pendingAssignments: 0 },
  });

  const now = new Date();
  const todayStr = `${DAY_AR[now.getDay()]}، ${now.getDate()} ${MONTH_AR[now.getMonth()]} ${now.getFullYear()}`;

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      const today = now.toISOString().split("T")[0];

      const { data: classesData } = await supabase.from("classes").select("id, level");
      const { data: sectionsData } = await supabase.from("sections").select("id, class_id");

      const middleSectionIds = sectionsData?.filter(s => {
        const cls = classesData?.find(c => c.id === s.class_id);
        return cls && cls.level <= 9;
      }).map(s => s.id) || [];
      const highSectionIds = sectionsData?.filter(s => {
        const cls = classesData?.find(c => c.id === s.class_id);
        return cls && cls.level >= 10;
      }).map(s => s.id) || [];

      const { data: studentsData } = await supabase.from("students").select("id, section_id");
      const { data: attendanceData } = await supabase.from("attendance").select("status, section_id").eq("date", today);

      const calcStats = (sectionIds: string[]) => {
        const students = studentsData?.filter(s => sectionIds.includes(s.section_id)).length || 0;
        const att = attendanceData?.filter(a => sectionIds.includes(a.section_id)) || [];
        const present = att.filter(a => a.status === "present" || a.status === "late").length;
        const absent = att.filter(a => a.status === "absent").length;
        const rate = att.length > 0 ? Math.round((present / att.length) * 100) : 0;
        return { students, attendance: rate, absent };
      };

      // تحديد مرحلة المعلمين
      const { data: tsData } = await supabase
        .from("teacher_sections")
        .select("teacher_id, sections(class_id, classes(level))");
      const teacherIds = [...new Set(tsData?.map(ts => ts.teacher_id) || [])];
      let middleTeachers = 0, highTeachers = 0;
      teacherIds.forEach(tid => {
        const levels = (tsData?.filter(ts => ts.teacher_id === tid) || [])
          .map((ts: any) => ts.sections?.classes?.level)
          .filter(Boolean);
        const s = getTeacherStage(levels);
        if (s === "middle" || s === "shared") middleTeachers++;
        if (s === "high"   || s === "shared") highTeachers++;
      });

      const middleStats = calcStats(middleSectionIds);
      const highStats   = calcStats(highSectionIds);
      const allAtt      = calcStats([...middleSectionIds, ...highSectionIds]);

      // اختبارات نشطة اليوم
      const { count: activeExams } = await supabase
        .from("exams")
        .select("id", { count: "exact", head: true })
        .eq("status", "published")
        .eq("exam_date", today);

      // واجبات منتهية بدون تقييم
      const { count: pendingGrading } = await supabase
        .from("assignment_submissions")
        .select("id", { count: "exact", head: true })
        .is("grade", null)
        .lt("submitted_at", now.toISOString());

      setAllStats({
        middle: { ...middleStats, teachers: middleTeachers, sections: middleSectionIds.length },
        high:   { ...highStats,   teachers: highTeachers,   sections: highSectionIds.length },
        all:    { ...allAtt, teachers: teacherIds.length, sections: sectionsData?.length || 0, students: studentsData?.length || 0, activeExams: activeExams || 0, pendingAssignments: pendingGrading || 0 },
      });

      // التنبيهات الذكية
      const newAlerts: typeof alerts = [];

      if (allAtt.absent > 0) {
        newAlerts.push({
          title: `${allAtt.absent} طالب غائب اليوم`,
          desc: "تم تسجيل الغياب — يمكن مراجعة التفاصيل",
          color: "bg-amber-50 border-amber-200 text-amber-800",
          href: "/attendance"
        });
      }
      if ((pendingGrading || 0) > 0) {
        newAlerts.push({
          title: `${pendingGrading} تسليم واجب بانتظار التقييم`,
          desc: "طلاب سلّموا واجباتهم ولم تُقيَّم بعد",
          color: "bg-indigo-50 border-indigo-200 text-indigo-800",
          href: "/assignments"
        });
      }
      if ((activeExams || 0) > 0) {
        newAlerts.push({
          title: `${activeExams} اختبار نشط اليوم`,
          desc: "اختبارات منشورة متاحة للطلاب الآن",
          color: "bg-emerald-50 border-emerald-200 text-emerald-800",
          href: "/exams"
        });
      }
      setAlerts(newAlerts);

      // آخر النشاطات — جلب صحيح
      const [{ data: recentStudents }, { data: recentExams }, { data: recentNotifs }, { data: recentDocs }] = await Promise.all([
        supabase.from("students").select("users(full_name), created_at").order("created_at", { ascending: false }).limit(3),
        supabase.from("exams").select("title, created_at").order("created_at", { ascending: false }).limit(2),
        supabase.from("notifications").select("title, created_at").eq("type", "announcement").order("created_at", { ascending: false }).limit(2),
        supabase.from("documents").select("title, created_at").order("created_at", { ascending: false }).limit(2),
      ]);

      const activities = [
        ...(recentStudents || []).map((s: any) => ({ title: `طالب جديد: ${s.users?.full_name || "—"}`, time: s.created_at, color: "bg-indigo-100 text-indigo-600", href: "/students" })),
        ...(recentExams    || []).map((e: any) => ({ title: `اختبار جديد: ${e.title}`, time: e.created_at, color: "bg-amber-100 text-amber-600", href: "/exams" })),
        ...(recentNotifs   || []).map((n: any) => ({ title: `إعلان: ${n.title}`, time: n.created_at, color: "bg-sky-100 text-sky-600", href: "/announcements" })),
        ...(recentDocs     || []).map((d: any) => ({ title: `مستند: ${d.title}`, time: d.created_at, color: "bg-emerald-100 text-emerald-600", href: "/documents" })),
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 6);

      setRecentActivities(activities);
    } catch (error) {
      console.error("Dashboard error:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (t: string) => {
    const diff = (Date.now() - new Date(t).getTime()) / 60000;
    if (diff < 1)    return "الآن";
    if (diff < 60)   return `منذ ${Math.floor(diff)} دقيقة`;
    if (diff < 1440) return `منذ ${Math.floor(diff / 60)} ساعة`;
    return `منذ ${Math.floor(diff / 1440)} يوم`;
  };

  const currentStats = allStats[stage];

  const stageConfig = {
    all:    { label: "الإجمالي",  grad: "from-indigo-600 to-violet-700",   badge: "bg-indigo-100 text-indigo-700" },
    middle: { label: "المتوسطة", grad: "from-emerald-600 to-teal-700",     badge: "bg-emerald-100 text-emerald-700" },
    high:   { label: "الثانوية", grad: "from-amber-500 to-orange-600",     badge: "bg-amber-100 text-amber-700" },
  };

  const mainStats = [
    { name: "الطلاب",        value: currentStats.students.toString(),   icon: Users,         color: "text-indigo-600",  bg: "bg-indigo-50"  },
    { name: "المعلمين",      value: currentStats.teachers.toString(),   icon: GraduationCap, color: "text-emerald-600", bg: "bg-emerald-50" },
    { name: "الفصول",        value: currentStats.sections.toString(),   icon: BookOpen,      color: "text-amber-600",   bg: "bg-amber-50"   },
    { name: "حضور اليوم",    value: `${currentStats.attendance}%`,      icon: CalendarDays,  color: "text-sky-600",     bg: "bg-sky-50"     },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-indigo-100 rounded-full" />
          <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-8 pb-12">

      {/* Hero */}
      <motion.div variants={itemVariants}
        className={`relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br ${stageConfig[stage].grad} p-6 sm:p-10 text-white shadow-2xl transition-all duration-500`}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="text-white/60 text-sm font-bold">{todayStr}</div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
              {stage === "all" && <>لوحة التحكم<br /><span className="opacity-70 text-2xl sm:text-3xl">مدرسة الرفعة النموذجية</span></>}
              {stage === "middle" && <>المرحلة المتوسطة<br /><span className="opacity-70 text-2xl">الصف السادس — التاسع</span></>}
              {stage === "high"   && <>المرحلة الثانوية<br /><span className="opacity-70 text-2xl">الصف العاشر — الثاني عشر</span></>}
            </h1>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link href="/admin/teachers-monitor"
                className="bg-white text-indigo-600 px-5 py-2.5 rounded-2xl font-black text-sm hover:bg-indigo-50 transition-all shadow-lg flex items-center gap-2">
                <Activity className="h-4 w-4" /> متابعة المعلمين
              </Link>
              <Link href="/admin/teacher-assignments"
                className="bg-white/15 text-white border border-white/20 px-5 py-2.5 rounded-2xl font-black text-sm hover:bg-white/25 transition-all flex items-center gap-2">
                <Plus className="h-4 w-4" /> إدارة التعيينات
              </Link>
              <Link href="/live" target="_blank"
                className="bg-white/15 text-white border border-white/20 px-5 py-2.5 rounded-2xl font-black text-sm hover:bg-white/25 transition-all flex items-center gap-2">
                <Radio className="h-4 w-4" /> الحصص الحية
              </Link>
            </div>
          </div>
          <div className="hidden lg:flex flex-col items-center gap-2">
            <div className="h-36 w-36 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center relative">
              <School className="h-20 w-20 text-white/30" />
              <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-ping opacity-10" />
            </div>
          </div>
        </div>
        <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-0 right-0 translate-x-1/3 translate-y-1/3 h-64 w-64 rounded-full bg-black/10 blur-3xl" />
      </motion.div>

      {/* Stage Filter */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-3">
        {(["all", "middle", "high"] as Stage[]).map(s => (
          <button key={s} onClick={() => setStage(s)}
            className={`px-4 py-2 sm:px-6 sm:py-3 rounded-2xl font-black text-xs sm:text-sm transition-all ${
              stage === s
                ? s === "all" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                  : s === "middle" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200"
                  : "bg-amber-500 text-white shadow-lg shadow-amber-200"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}>
            {s === "all" ? "🏫 الإجمالي" : s === "middle" ? "📚 المتوسطة (6-9)" : "🎓 الثانوية (10-12)"}
          </button>
        ))}
        {stage === "all" && allStats.all.absent > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold">
            <AlertTriangle className="h-4 w-4" />
            {allStats.all.absent} غائب اليوم
          </div>
        )}
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {mainStats.map(stat => (
          <motion.div key={stat.name} whileHover={{ y: -4 }}
            className="bg-white/70 backdrop-blur-xl rounded-[2rem] p-4 sm:p-6 shadow-sm ring-1 ring-slate-200/50 flex flex-col justify-between group relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3 relative z-10">
              <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform shadow-sm`}>
                <stat.icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <span className={`text-[9px] sm:text-[10px] font-black px-2 py-1 rounded-full ${stageConfig[stage].badge}`}>
                {stageConfig[stage].label}
              </span>
            </div>
            <div className="relative z-10">
              <p className="text-xs sm:text-sm font-bold text-slate-500">{stat.name}</p>
              <motion.p key={`${stage}-${stat.name}`}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 tracking-tight"
              >
                {stat.value}
              </motion.p>
            </div>
            <div className={`absolute -bottom-4 -right-4 h-24 w-24 rounded-full ${stat.bg} opacity-0 group-hover:opacity-20 transition-opacity blur-2xl`} />
          </motion.div>
        ))}
      </motion.div>

      {/* مقارنة المرحلتين */}
      {stage === "all" && (
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: "middle", label: "المتوسطة", sub: "الصف السادس — التاسع",  color: "emerald", char: "م", data: allStats.middle },
            { key: "high",   label: "الثانوية", sub: "الصف العاشر — الثاني عشر", color: "amber",   char: "ث", data: allStats.high   },
          ].map(item => (
            <div key={item.key} className="bg-white rounded-[2rem] p-5 ring-1 ring-slate-200/50 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-2xl bg-${item.color}-50 flex items-center justify-center text-${item.color}-600 font-black text-lg`}>
                    {item.char}
                  </div>
                  <div>
                    <div className="font-black text-slate-900">{item.label}</div>
                    <div className="text-xs text-slate-400 font-bold">{item.sub}</div>
                  </div>
                </div>
                <button onClick={() => setStage(item.key as Stage)}
                  className={`text-xs font-black text-${item.color}-600 bg-${item.color}-50 px-3 py-1.5 rounded-xl hover:bg-${item.color}-100 transition-all`}>
                  التفاصيل
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "طلاب",  value: item.data.students,              color: `text-${item.color}-600` },
                  { label: "معلمين", value: item.data.teachers,              color: `text-${item.color}-600` },
                  { label: "حضور",  value: `${item.data.attendance}%`,       color: item.data.attendance >= 85 ? "text-emerald-600" : "text-red-500" },
                ].map(d => (
                  <div key={d.label} className="text-center bg-slate-50 rounded-2xl p-3">
                    <div className={`text-2xl font-black ${d.color}`}>{d.value}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{d.label}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* التنبيهات الذكية */}
      {alerts.length > 0 && (
        <motion.div variants={itemVariants} className="space-y-3">
          <h2 className="text-lg font-black text-slate-700 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            تنبيهات اليوم
          </h2>
          {alerts.map((alert, i) => (
            <Link key={i} href={alert.href}
              className={`flex items-center justify-between p-4 rounded-2xl border ${alert.color} hover:opacity-90 transition-all`}>
              <div>
                <div className="font-black text-sm">{alert.title}</div>
                <div className="text-xs font-medium opacity-70 mt-0.5">{alert.desc}</div>
              </div>
              <ArrowUpRight className="h-4 w-4 shrink-0 opacity-60" />
            </Link>
          ))}
        </motion.div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* آخر النشاطات */}
        <motion.div variants={itemVariants}
          className="lg:col-span-2 bg-white/70 backdrop-blur-xl rounded-[2.5rem] p-6 sm:p-8 shadow-sm ring-1 ring-slate-200/50"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                <Activity className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-black text-slate-900">آخر النشاطات</h2>
            </div>
          </div>
          <div className="space-y-3">
            {recentActivities.length === 0 ? (
              <div className="text-center py-10 text-slate-400 font-bold">لا توجد نشاطات حديثة</div>
            ) : recentActivities.map((activity, i) => (
              <Link key={i} href={activity.href}>
                <motion.div whileHover={{ x: -4 }}
                  className="flex items-center gap-4 p-3 sm:p-4 rounded-3xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group cursor-pointer"
                >
                  <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-2xl flex items-center justify-center font-black shrink-0 ${activity.color} group-hover:scale-105 transition-transform shadow-sm`}>
                    {activity.title[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">{activity.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatTime(activity.time)}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 shrink-0" />
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* الجانب الأيمن */}
        <div className="space-y-6">
          <AnnouncementsWidget role="admin" />

          {/* الحصص الحية */}
          <motion.div variants={itemVariants}
            className="bg-gradient-to-br from-red-600 to-rose-700 rounded-[2.5rem] p-5 shadow-xl shadow-red-200 text-white relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Radio className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="font-black text-base">الحصص الحية</div>
                  <div className="text-red-200 text-xs font-bold">للمراقبين التربويين</div>
                </div>
              </div>
              <div className="bg-white/15 rounded-2xl px-3 py-2 mb-3 text-xs font-black text-white/90 truncate">
                {typeof window !== "undefined" ? window.location.origin : "ehab2026.netlify.app"}/live
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { if (typeof window !== "undefined") navigator.clipboard.writeText(window.location.origin + "/live"); }}
                  className="flex-1 py-2.5 rounded-2xl bg-white text-red-600 text-xs font-black hover:bg-red-50 transition-all"
                >
                  📋 نسخ الرابط
                </button>
                <a href="/live" target="_blank"
                  className="flex-1 py-2.5 rounded-2xl bg-white/20 text-white text-xs font-black hover:bg-white/30 transition-all text-center"
                >
                  🔗 فتح
                </a>
              </div>
            </div>
          </motion.div>

          {/* إجراءات سريعة */}
          <motion.div variants={itemVariants}
            className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] p-6 shadow-sm ring-1 ring-slate-200/50"
          >
            <h2 className="text-lg font-black text-slate-900 mb-4">إجراءات سريعة</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: "إضافة طالب",     icon: Users,         href: "/students",      color: "text-indigo-600",  bg: "bg-indigo-50"  },
                { name: "إضافة معلم",     icon: GraduationCap, href: "/teachers",      color: "text-emerald-600", bg: "bg-emerald-50" },
                { name: "تقرير المعلمين", icon: FileText,      href: "/admin/teachers-report",  color: "text-amber-600",   bg: "bg-amber-50"   },
                { name: "إرسال إعلان",    icon: Bell,          href: "/announcements", color: "text-sky-600",     bg: "bg-sky-50"     },
              ].map(action => (
                <Link key={action.name} href={action.href}
                  className="flex flex-col items-center justify-center p-4 rounded-3xl bg-slate-50/50 hover:bg-white hover:shadow-md hover:ring-1 hover:ring-slate-200 transition-all group"
                >
                  <div className={`p-3 rounded-2xl ${action.bg} ${action.color} mb-2 group-hover:scale-110 transition-transform`}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700 group-hover:text-indigo-600 transition-colors text-center leading-tight">{action.name}</span>
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
