"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "motion/react";
import {
  CheckCircle2, XCircle, AlertTriangle, Bell,
  Clock, TrendingUp, Search
} from "lucide-react";

interface TeacherStat {
  id: string;
  name: string;
  specialization: string;
  todaySchedule: {
    total: number;
    recorded: number;
    missing: number;
    dayEnded: boolean;
  };
  weekSchedule: {
    total: number;
    recorded: number;
    percent: number;
  };
  assignments: { thisWeek: number };
  exams: { thisWeek: number };
  lastRecorded: string | null;
  status: "excellent" | "good" | "warning" | "critical";
}

const DAY_MAP: Record<number, string> = {
  0: "الأحد", 1: "الاثنين", 2: "الثلاثاء",
  3: "الأربعاء", 4: "الخميس", 5: "الجمعة", 6: "السبت"
};

// نهاية الدوام 12:35
const END_OF_DAY = "12:35";

export default function TeachersMonitorPage() {
  const [teachers, setTeachers] = useState<TeacherStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState<"all" | "middle" | "high" | "shared">("all");
  const [teacherLevels, setTeacherLevels] = useState<Record<string, number[]>>({});

  const getTeacherStage = (levels: number[]): "middle" | "high" | "shared" | "none" => {
    const hasMiddle = levels.some(l => l >= 6 && l <= 9);
    const hasHigh   = levels.some(l => l >= 10 && l <= 12);
    if (hasMiddle && hasHigh) return "shared";
    if (hasMiddle) return "middle";
    if (hasHigh)   return "high";
    return "none";
  };
  const [sendingAlert, setSendingAlert] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => { fetchTeachersStats(); }, []);

  const fetchTeachersStats = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const todayDay = now.getDay();
      const todayStr = now.toISOString().split("T")[0];
      const currentTimeStr = now.toTimeString().slice(0, 5);
      const dayHasEnded = currentTimeStr >= END_OF_DAY;

      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split("T")[0];

      const { data: teachersData } = await supabase
        .from("teachers")
        .select("id, specialization, users(full_name)");

      if (!teachersData) return;

      const stats: TeacherStat[] = await Promise.all(
        teachersData.map(async (teacher: any) => {

          // جدول المعلم لليوم الحالي
          const { data: todaySchedule } = await supabase
            .from("schedules")
            .select("period, section_id")
            .eq("teacher_id", teacher.id)
            .eq("day_of_week", todayDay);

          // جدول المعلم للأسبوع كاملاً (أيام 0-4 = أحد-خميس)
          const { data: weekSchedule } = await supabase
            .from("schedules")
            .select("period, section_id, day_of_week")
            .eq("teacher_id", teacher.id)
            .in("day_of_week", [0, 1, 2, 3, 4]);

          // سجلات الحضور هذا الأسبوع
          const { data: attendanceData } = await supabase
            .from("attendance")
            .select("date, section_id")
            .eq("recorded_by", teacher.id)
            .gte("date", weekAgoStr);

          // حصص اليوم
          const todayTotal = todaySchedule?.length || 0;
          const todayRecorded = todaySchedule?.filter((slot: any) =>
            attendanceData?.some(
              a => a.date === todayStr && a.section_id === slot.section_id
            )
          ).length || 0;
          const todayMissing = todayTotal - todayRecorded;

          // حصص الأسبوع
          // نحسب الحصص المتوقعة لكل يوم مضى هذا الأسبوع
          const weekTotal = weekSchedule?.length || 0;
          const weekRecorded = weekSchedule?.filter((slot: any) => {
            return attendanceData?.some(
              a => a.section_id === slot.section_id
            );
          }).length || 0;
          const weekPercent = weekTotal > 0
            ? Math.round((weekRecorded / weekTotal) * 100)
            : 100;

          // آخر تسجيل
          const lastRecorded = attendanceData && attendanceData.length > 0
            ? [...attendanceData].sort((a, b) => b.date.localeCompare(a.date))[0].date
            : null;

          // الواجبات
          const { data: assignmentsData } = await supabase
            .from("assignments")
            .select("id, created_at")
            .eq("teacher_id", teacher.id)
            .gte("created_at", weekAgoStr);

          // الاختبارات
          const { data: examsData } = await supabase
            .from("exams")
            .select("id, created_at")
            .eq("teacher_id", teacher.id)
            .gte("created_at", weekAgoStr);

          // تحديد الحالة
          // المعلم مقصر فقط إذا انتهى اليوم ولم يسجّل
          let status: TeacherStat["status"] = "excellent";
          const missedAfterDayEnd = dayHasEnded && todayMissing > 0;

          if (missedAfterDayEnd || weekPercent < 60) {
            status = "critical";
          } else if (weekPercent < 85 || (assignmentsData?.length || 0) === 0) {
            status = "warning";
          } else if (weekPercent < 95) {
            status = "good";
          }

          return {
            id: teacher.id,
            name: teacher.users?.full_name || "غير محدد",
            specialization: teacher.specialization || "غير محدد",
            todaySchedule: {
              total: todayTotal,
              recorded: todayRecorded,
              missing: todayMissing,
              dayEnded: dayHasEnded,
            },
            weekSchedule: { total: weekTotal, recorded: weekRecorded, percent: weekPercent },
            assignments: { thisWeek: assignmentsData?.length || 0 },
            exams: { thisWeek: examsData?.length || 0 },
            lastRecorded,
            status,
          };
        })
      );

      setTeachers(stats);

      // جلب مستويات الصفوف لكل معلم
      const { data: tsData } = await supabase
        .from("teacher_sections")
        .select("teacher_id, sections(class_id, classes(level))");

      const levelsMap: Record<string, number[]> = {};
      tsData?.forEach((ts: any) => {
        const level = ts.sections?.classes?.level;
        if (level && ts.teacher_id) {
          if (!levelsMap[ts.teacher_id]) levelsMap[ts.teacher_id] = [];
          if (!levelsMap[ts.teacher_id].includes(level)) levelsMap[ts.teacher_id].push(level);
        }
      });
      setTeacherLevels(levelsMap);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendAlert = async (teacher: TeacherStat) => {
    setSendingAlert(teacher.id);
    try {
      const issues = [];
      if (teacher.todaySchedule.dayEnded && teacher.todaySchedule.missing > 0)
        issues.push(`لم يسجّل غياب ${teacher.todaySchedule.missing} حصة اليوم`);
      if (teacher.weekSchedule.percent < 85)
        issues.push(`نسبة التسجيل الأسبوعية ${teacher.weekSchedule.percent}% فقط`);
      if (teacher.assignments.thisWeek === 0)
        issues.push("لم يضف أي واجب هذا الأسبوع");
      if (teacher.exams.thisWeek === 0)
        issues.push("لم يضف أي اختبار هذا الأسبوع");

      await supabase.from("notifications").insert({
        user_id: teacher.id,
        title: "⚠️ تنبيه من الإدارة",
        content: issues.join(" | "),
        type: "warning",
        link: "/attendance",
      });

      showNotification("success", `تم إرسال إنذار للمعلم ${teacher.name}`);
    } catch {
      showNotification("error", "فشل إرسال الإنذار");
    } finally {
      setSendingAlert(null);
    }
  };

  const sendAlertAll = async () => {
    const problematic = teachers.filter(t => t.status === "critical" || t.status === "warning");
    for (const t of problematic) await sendAlert(t);
    showNotification("success", `تم إرسال إنذار لـ ${problematic.length} معلم`);
  };

  const statusConfig = {
    excellent: { label: "ممتاز", color: "bg-emerald-50 text-emerald-700 border-emerald-100", row: "" },
    good:      { label: "جيد",   color: "bg-blue-50 text-blue-700 border-blue-100",         row: "" },
    warning:   { label: "تحذير", color: "bg-amber-50 text-amber-700 border-amber-100",       row: "bg-amber-50/20" },
    critical:  { label: "حرج",   color: "bg-red-50 text-red-700 border-red-100",             row: "bg-red-50/20" },
  };

  const filtered = teachers.filter(t => {
    const matchSearch = t.name.includes(search) || t.specialization.includes(search);
    const matchFilter = filter === "all" || t.status === filter;
    const teacherStage = getTeacherStage(teacherLevels[t.id] || []);
    const matchStage = stageFilter === "all" || teacherStage === stageFilter;
    return matchSearch && matchFilter && matchStage;
  });

  const counts = {
    excellent: teachers.filter(t => t.status === "excellent").length,
    good:      teachers.filter(t => t.status === "good").length,
    warning:   teachers.filter(t => t.status === "warning").length,
    critical:  teachers.filter(t => t.status === "critical").length,
  };

  const todayName = DAY_MAP[currentTime.getDay()];
  const timeStr = currentTime.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  const dayEnded = currentTime.toTimeString().slice(0, 5) >= END_OF_DAY;

  return (
    <div className="space-y-8 pb-20">

      {notification && (
        <motion.div
          initial={{ opacity: 0, y: -20, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          className={`fixed top-8 left-1/2 z-50 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 text-white text-sm font-bold ${
            notification.type === "success" ? "bg-emerald-500" : "bg-red-500"
          }`}
        >
          {notification.type === "success" ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          {notification.message}
        </motion.div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-3 ${
            dayEnded ? "bg-slate-100 text-slate-600 border-slate-200" : "bg-emerald-50 text-emerald-600 border-emerald-100"
          }`}>
            <Clock className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">
              {todayName} — {timeStr} {dayEnded ? "| انتهى الدوام" : "| جارٍ الدوام"}
            </span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">لوحة متابعة المعلمين</h1>
          <p className="text-slate-500 mt-1 font-medium">
            التقصير يُحسب بعد نهاية الدوام الساعة {END_OF_DAY}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchTeachersStats}
            className="px-6 py-3 rounded-2xl bg-white border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-all">
            تحديث
          </button>
          <button onClick={sendAlertAll}
            disabled={counts.warning + counts.critical === 0}
            className="px-6 py-3 rounded-2xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-red-200">
            <Bell className="h-4 w-4" />
            إنذار جماعي ({counts.warning + counts.critical})
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(["excellent","good","warning","critical"] as const).map((key, idx) => (
          <motion.div key={key}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
            onClick={() => setFilter(filter === key ? "all" : key)}
            className={`glass-card p-6 rounded-3xl cursor-pointer hover:scale-105 transition-all border-2 ${
              filter === key ? "border-slate-400" : "border-transparent"
            }`}>
            <div className={`text-3xl font-black mb-1 ${
              key === "excellent" ? "text-emerald-600" : key === "good" ? "text-blue-600" :
              key === "warning" ? "text-amber-600" : "text-red-600"
            }`}>{counts[key]}</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {statusConfig[key].label}
            </div>
          </motion.div>
        ))}
      </div>

      {/* فلتر المرحلة */}
      <div className="flex flex-wrap gap-3">
        {([
          { key: "all",    label: "🏫 الكل",       active: "bg-slate-700" },
          { key: "middle", label: "📚 المتوسطة",    active: "bg-emerald-600" },
          { key: "high",   label: "🎓 الثانوية",    active: "bg-amber-500" },
          { key: "shared", label: "🔄 مشترك",       active: "bg-violet-600" },
        ] as const).map(s => (
          <button key={s.key} onClick={() => setStageFilter(s.key)}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all ${
              stageFilter === s.key
                ? `${s.active} text-white shadow-lg`
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}>
            {s.label}
            <span className="mr-1 opacity-70">
              ({teachers.filter(t => s.key === "all" || getTeacherStage(teacherLevels[t.id] || []) === s.key).length})
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="glass-card p-5 rounded-3xl flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input type="text" placeholder="ابحث باسم المعلم أو التخصص..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full rounded-2xl bg-slate-50 border-0 py-3 pr-12 pl-4 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)}
          className="rounded-2xl bg-slate-50 border-0 py-3 px-4 text-sm ring-1 ring-slate-200 font-bold text-slate-700 outline-none">
          <option value="all">الكل</option>
          <option value="excellent">ممتاز</option>
          <option value="good">جيد</option>
          <option value="warning">تحذير</option>
          <option value="critical">حرج</option>
        </select>
      </div>

      {/* Table - Desktop */}
      <div className="glass-card rounded-3xl overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="py-5 pr-8 pl-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">المعلم</th>
                <th className="px-4 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">الحالة</th>
                <th className="px-4 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">اليوم ({todayName})</th>
                <th className="px-4 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">الأسبوع</th>
                <th className="px-4 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">واجبات الأسبوع</th>
                <th className="px-4 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">اختبارات الأسبوع</th>
                <th className="px-4 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">إنذار</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="py-20 text-center">
                  <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-slate-400 font-bold text-sm">جاري تحليل الجداول والحضور...</p>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-20 text-center text-slate-400 font-bold">لا يوجد نتائج</td></tr>
              ) : filtered.map((teacher, idx) => {
                const cfg = statusConfig[teacher.status];
                return (
                  <motion.tr key={teacher.id}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                    className={`hover:bg-white/60 transition-all ${cfg.row}`}>

                    <td className="py-5 pr-8 pl-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-sm shadow-lg">
                          {teacher.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-black text-slate-900 text-sm">{teacher.name}</div>
                          <div className="text-[10px] text-slate-400 font-bold">{teacher.specialization}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-5 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black border ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </td>

                    {/* اليوم */}
                    <td className="px-4 py-5 text-center">
                      {teacher.todaySchedule.total === 0 ? (
                        <span className="text-xs text-slate-400 font-bold">لا حصص اليوم</span>
                      ) : (
                        <div>
                          <div className="flex items-center justify-center gap-2 text-sm font-black">
                            <span className="text-emerald-600">{teacher.todaySchedule.recorded} ✓</span>
                            {teacher.todaySchedule.missing > 0 && (
                              <span className={teacher.todaySchedule.dayEnded ? "text-red-600" : "text-amber-500"}>
                                {teacher.todaySchedule.missing} {teacher.todaySchedule.dayEnded ? "✗" : "⏳"}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            من {teacher.todaySchedule.total} حصة
                            {!teacher.todaySchedule.dayEnded && teacher.todaySchedule.missing > 0 && (
                              <span className="text-amber-500"> (لم ينته الدوام)</span>
                            )}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* الأسبوع */}
                    <td className="px-4 py-5 text-center">
                      <div className={`text-xl font-black ${
                        teacher.weekSchedule.percent >= 90 ? "text-emerald-600" :
                        teacher.weekSchedule.percent >= 75 ? "text-amber-600" : "text-red-600"
                      }`}>{teacher.weekSchedule.percent}%</div>
                      <div className="mt-1.5 h-1.5 w-16 mx-auto bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${
                          teacher.weekSchedule.percent >= 90 ? "bg-emerald-500" :
                          teacher.weekSchedule.percent >= 75 ? "bg-amber-500" : "bg-red-500"
                        }`} style={{ width: `${teacher.weekSchedule.percent}%` }} />
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {teacher.weekSchedule.recorded}/{teacher.weekSchedule.total}
                      </div>
                    </td>

                    {/* الواجبات */}
                    <td className="px-4 py-5 text-center">
                      <div className={`text-xl font-black ${teacher.assignments.thisWeek > 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {teacher.assignments.thisWeek}
                      </div>
                      {teacher.assignments.thisWeek === 0 && (
                        <span className="text-[9px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded-lg mt-1 inline-block">لم يضف</span>
                      )}
                    </td>

                    {/* الاختبارات */}
                    <td className="px-4 py-5 text-center">
                      <div className={`text-xl font-black ${teacher.exams.thisWeek > 0 ? "text-emerald-600" : "text-amber-500"}`}>
                        {teacher.exams.thisWeek}
                      </div>
                      {teacher.exams.thisWeek === 0 && (
                        <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg mt-1 inline-block">لم يضف</span>
                      )}
                    </td>

                    {/* إنذار */}
                    <td className="px-4 py-5 text-center">
                      {teacher.status !== "excellent" ? (
                        <button onClick={() => sendAlert(teacher)} disabled={sendingAlert === teacher.id}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-black hover:bg-red-700 transition-all disabled:opacity-50 shadow-sm">
                          {sendingAlert === teacher.id ? (
                            <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : <Bell className="h-3.5 w-3.5" />}
                          إنذار
                        </button>
                      ) : (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto" />
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {loading ? (
          <div className="py-20 text-center">
            <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-400 font-bold text-sm">جاري التحليل...</p>
          </div>
        ) : filtered.map((teacher, idx) => {
          const cfg = statusConfig[teacher.status];
          return (
            <motion.div key={teacher.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className={`glass-card rounded-3xl p-5 ${cfg.row}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-sm shadow-lg">
                    {teacher.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-black text-slate-900 text-sm">{teacher.name}</div>
                    <div className="text-[10px] text-slate-400 font-bold">{teacher.specialization}</div>
                  </div>
                </div>
                <span className={`inline-flex px-3 py-1.5 rounded-xl text-[10px] font-black border ${cfg.color}`}>
                  {cfg.label}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-slate-50 rounded-2xl p-3 text-center">
                  <div className={`text-lg font-black ${teacher.weekSchedule.percent >= 90 ? "text-emerald-600" : teacher.weekSchedule.percent >= 75 ? "text-amber-600" : "text-red-600"}`}>
                    {teacher.weekSchedule.percent}%
                  </div>
                  <div className="text-[9px] text-slate-400 font-bold mt-0.5">تسجيل الأسبوع</div>
                </div>
                <div className="bg-slate-50 rounded-2xl p-3 text-center">
                  <div className={`text-lg font-black ${teacher.assignments.thisWeek > 0 ? "text-emerald-600" : "text-red-500"}`}>{teacher.assignments.thisWeek}</div>
                  <div className="text-[9px] text-slate-400 font-bold mt-0.5">واجبات</div>
                </div>
                <div className="bg-slate-50 rounded-2xl p-3 text-center">
                  <div className={`text-lg font-black ${teacher.exams.thisWeek > 0 ? "text-emerald-600" : "text-amber-500"}`}>{teacher.exams.thisWeek}</div>
                  <div className="text-[9px] text-slate-400 font-bold mt-0.5">اختبارات</div>
                </div>
              </div>

              {teacher.todaySchedule.total > 0 && (
                <div className="bg-slate-50 rounded-2xl p-3 mb-4 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">حصص اليوم</span>
                  <div className="flex items-center gap-2 text-sm font-black">
                    <span className="text-emerald-600">{teacher.todaySchedule.recorded}✓</span>
                    {teacher.todaySchedule.missing > 0 && (
                      <span className={teacher.todaySchedule.dayEnded ? "text-red-600" : "text-amber-500"}>
                        {teacher.todaySchedule.missing}{teacher.todaySchedule.dayEnded ? "✗" : "⏳"}
                      </span>
                    )}
                    <span className="text-slate-400 text-[10px]">من {teacher.todaySchedule.total}</span>
                  </div>
                </div>
              )}

              {teacher.status !== "excellent" && (
                <button onClick={() => sendAlert(teacher)} disabled={sendingAlert === teacher.id}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-600 text-white text-xs font-black hover:bg-red-700 transition-all">
                  {sendingAlert === teacher.id ? (
                    <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : <Bell className="h-3.5 w-3.5" />}
                  إرسال إنذار
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
