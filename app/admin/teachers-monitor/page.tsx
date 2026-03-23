"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "motion/react";
import {
  CheckCircle2, XCircle, AlertTriangle, Bell,
  BookOpen, FileText, Users, TrendingUp, TrendingDown,
  Minus, Search, Filter
} from "lucide-react";

interface TeacherStat {
  id: string;
  name: string;
  specialization: string;
  sections: number;
  attendance: {
    recorded: number;
    total: number;
    percent: number;
    lastRecorded: string | null;
  };
  assignments: {
    count: number;
    thisWeek: number;
  };
  exams: {
    count: number;
    thisWeek: number;
  };
  status: "excellent" | "good" | "warning" | "critical";
}

export default function TeachersMonitorPage() {
  const [teachers, setTeachers] = useState<TeacherStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sendingAlert, setSendingAlert] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    fetchTeachersStats();
  }, []);

  const fetchTeachersStats = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split("T")[0];
      const todayStr = now.toISOString().split("T")[0];

      const { data: teachersData } = await supabase
        .from("teachers")
        .select("id, national_id, specialization, users(full_name), teacher_sections(section_id)");

      if (!teachersData) return;

      const stats: TeacherStat[] = await Promise.all(
        teachersData.map(async (teacher: any) => {
          const sectionIds = teacher.teacher_sections?.map((ts: any) => ts.section_id) || [];

          // جلب سجلات الحضور التي سجّلها هذا المعلم هذا الأسبوع
          const { data: attendanceData } = await supabase
            .from("attendance")
            .select("date, section_id")
            .eq("recorded_by", teacher.id)
            .gte("date", weekAgoStr);

          // احسب أيام العمل هذا الأسبوع (5 أيام)
          const workDays = 5;
          const expectedRecords = sectionIds.length * workDays;
          const uniqueDays = new Set(attendanceData?.map((a: any) => a.date + a.section_id) || []).size;
          const attendancePercent = expectedRecords > 0
            ? Math.round((uniqueDays / expectedRecords) * 100)
            : 0;

          const lastRecorded = attendanceData && attendanceData.length > 0
            ? attendanceData.sort((a: any, b: any) => b.date.localeCompare(a.date))[0].date
            : null;

          // جلب الواجبات
          const { data: assignmentsData } = await supabase
            .from("assignments")
            .select("id, created_at")
            .eq("teacher_id", teacher.id);

          const weeklyAssignments = assignmentsData?.filter((a: any) =>
            new Date(a.created_at) >= weekAgo
          ).length || 0;

          // جلب الاختبارات
          const { data: examsData } = await supabase
            .from("exams")
            .select("id, created_at")
            .eq("teacher_id", teacher.id);

          const weeklyExams = examsData?.filter((e: any) =>
            new Date(e.created_at) >= weekAgo
          ).length || 0;

          // تحديد الحالة
          let status: TeacherStat["status"] = "excellent";
          if (attendancePercent < 50 || (weeklyAssignments === 0 && weeklyExams === 0)) {
            status = "critical";
          } else if (attendancePercent < 80 || weeklyAssignments === 0) {
            status = "warning";
          } else if (attendancePercent < 95) {
            status = "good";
          }

          return {
            id: teacher.id,
            name: teacher.users?.full_name || "غير محدد",
            specialization: teacher.specialization || "غير محدد",
            sections: sectionIds.length,
            attendance: {
              recorded: uniqueDays,
              total: expectedRecords,
              percent: attendancePercent,
              lastRecorded,
            },
            assignments: {
              count: assignmentsData?.length || 0,
              thisWeek: weeklyAssignments,
            },
            exams: {
              count: examsData?.length || 0,
              thisWeek: weeklyExams,
            },
            status,
          };
        })
      );

      setTeachers(stats);
    } catch (error) {
      console.error("Error fetching teacher stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendAlert = async (teacher: TeacherStat) => {
    setSendingAlert(teacher.id);
    try {
      const issues = [];
      if (teacher.attendance.percent < 80) issues.push("تسجيل الغياب اليومي");
      if (teacher.assignments.thisWeek === 0) issues.push("إضافة واجب أسبوعي");
      if (teacher.exams.thisWeek === 0) issues.push("إضافة اختبار أسبوعي");

      const message = `تنبيه: يرجى الالتزام بـ ${issues.join(" و")} هذا الأسبوع`;

      await supabase.from("notifications").insert({
        user_id: teacher.id,
        title: "تنبيه من الإدارة",
        content: message,
        type: "warning",
        link: "/attendance",
      });

      showNotification("success", `تم إرسال إنذار للمعلم ${teacher.name} بنجاح`);
    } catch (error) {
      showNotification("error", "فشل إرسال الإنذار");
    } finally {
      setSendingAlert(null);
    }
  };

  const sendAlertAll = async () => {
    const criticalTeachers = teachers.filter(t => t.status === "critical" || t.status === "warning");
    for (const teacher of criticalTeachers) {
      await sendAlert(teacher);
    }
    showNotification("success", `تم إرسال إنذار لـ ${criticalTeachers.length} معلم مقصر`);
  };

  const getStatusConfig = (status: TeacherStat["status"]) => {
    switch (status) {
      case "excellent":
        return { label: "ممتاز", color: "bg-emerald-50 text-emerald-700 border-emerald-100", icon: <CheckCircle2 className="h-3.5 w-3.5" />, row: "" };
      case "good":
        return { label: "جيد", color: "bg-blue-50 text-blue-700 border-blue-100", icon: <TrendingUp className="h-3.5 w-3.5" />, row: "" };
      case "warning":
        return { label: "تحذير", color: "bg-amber-50 text-amber-700 border-amber-100", icon: <AlertTriangle className="h-3.5 w-3.5" />, row: "bg-amber-50/30" };
      case "critical":
        return { label: "حرج", color: "bg-red-50 text-red-700 border-red-100", icon: <XCircle className="h-3.5 w-3.5" />, row: "bg-red-50/30" };
    }
  };

  const getPercentColor = (percent: number) => {
    if (percent >= 90) return "text-emerald-600";
    if (percent >= 70) return "text-amber-600";
    return "text-red-600";
  };

  const filtered = teachers.filter(t => {
    const matchSearch = t.name.includes(search) || t.specialization.includes(search);
    const matchFilter = filter === "all" || t.status === filter;
    return matchSearch && matchFilter;
  });

  const stats = {
    excellent: teachers.filter(t => t.status === "excellent").length,
    good: teachers.filter(t => t.status === "good").length,
    warning: teachers.filter(t => t.status === "warning").length,
    critical: teachers.filter(t => t.status === "critical").length,
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Notification */}
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: -20, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0 }}
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 text-red-600 border border-red-100 mb-3">
            <TrendingUp className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">متابعة الأداء</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">لوحة متابعة المعلمين</h1>
          <p className="text-slate-500 mt-1 font-medium">متابعة التزام المعلمين بتسجيل الغياب والواجبات والاختبارات</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchTeachersStats}
            className="px-6 py-3 rounded-2xl bg-white border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-all"
          >
            تحديث
          </button>
          <button
            onClick={sendAlertAll}
            disabled={stats.warning + stats.critical === 0}
            className="px-6 py-3 rounded-2xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-red-200"
          >
            <Bell className="h-4 w-4" />
            إنذار جماعي للمقصرين ({stats.warning + stats.critical})
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "ممتاز", count: stats.excellent, color: "emerald", icon: <CheckCircle2 className="h-6 w-6" /> },
          { label: "جيد", count: stats.good, color: "blue", icon: <TrendingUp className="h-6 w-6" /> },
          { label: "تحذير", count: stats.warning, color: "amber", icon: <AlertTriangle className="h-6 w-6" /> },
          { label: "حرج", count: stats.critical, color: "red", icon: <XCircle className="h-6 w-6" /> },
        ].map((item, idx) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => setFilter(filter === ["all","all","warning","critical"][idx] ? "all" : ["excellent","good","warning","critical"][idx])}
            className={`glass-card p-6 rounded-3xl cursor-pointer hover:scale-105 transition-all border-2 ${
              filter === ["excellent","good","warning","critical"][idx] ? `border-${item.color}-300` : "border-transparent"
            }`}
          >
            <div className={`h-12 w-12 rounded-2xl bg-${item.color}-50 text-${item.color}-600 flex items-center justify-center mb-3`}>
              {item.icon}
            </div>
            <div className={`text-3xl font-black text-${item.color}-600`}>{item.count}</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{item.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="glass-card p-6 rounded-3xl flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="ابحث باسم المعلم أو التخصص..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-2xl bg-slate-50 border-0 py-3 pr-12 pl-4 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="rounded-2xl bg-slate-50 border-0 py-3 px-4 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700"
        >
          <option value="all">جميع المعلمين</option>
          <option value="excellent">ممتاز فقط</option>
          <option value="good">جيد فقط</option>
          <option value="warning">تحذير فقط</option>
          <option value="critical">حرج فقط</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass-card rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="py-5 pr-8 pl-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">المعلم</th>
                <th className="px-4 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">الحالة</th>
                <th className="px-4 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">تسجيل الغياب</th>
                <th className="px-4 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">واجبات الأسبوع</th>
                <th className="px-4 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">اختبارات الأسبوع</th>
                <th className="px-4 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">آخر تسجيل</th>
                <th className="px-4 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">إنذار</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-slate-400 font-bold text-sm">جاري تحليل بيانات المعلمين...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-slate-400 font-bold">لا يوجد نتائج</td>
                </tr>
              ) : (
                filtered.map((teacher, idx) => {
                  const statusConfig = getStatusConfig(teacher.status);
                  return (
                    <motion.tr
                      key={teacher.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`hover:bg-white/60 transition-all ${statusConfig.row}`}
                    >
                      {/* المعلم */}
                      <td className="py-5 pr-8 pl-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-sm shadow-lg">
                            {teacher.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-black text-slate-900 text-sm">{teacher.name}</div>
                            <div className="text-[10px] text-slate-400 font-bold mt-0.5">
                              {teacher.specialization} • {teacher.sections} فصول
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* الحالة */}
                      <td className="px-4 py-5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black border ${statusConfig.color}`}>
                          {statusConfig.icon}
                          {statusConfig.label}
                        </span>
                      </td>

                      {/* تسجيل الغياب */}
                      <td className="px-4 py-5 text-center">
                        <div className={`text-xl font-black ${getPercentColor(teacher.attendance.percent)}`}>
                          {teacher.attendance.percent}%
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold mt-0.5">
                          {teacher.attendance.recorded}/{teacher.attendance.total} حصة
                        </div>
                        <div className="mt-2 h-1.5 w-20 mx-auto bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              teacher.attendance.percent >= 90 ? "bg-emerald-500" :
                              teacher.attendance.percent >= 70 ? "bg-amber-500" : "bg-red-500"
                            }`}
                            style={{ width: `${teacher.attendance.percent}%` }}
                          />
                        </div>
                      </td>

                      {/* الواجبات */}
                      <td className="px-4 py-5 text-center">
                        <div className={`text-xl font-black ${teacher.assignments.thisWeek > 0 ? "text-emerald-600" : "text-red-500"}`}>
                          {teacher.assignments.thisWeek}
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold mt-0.5">
                          إجمالي: {teacher.assignments.count}
                        </div>
                        {teacher.assignments.thisWeek === 0 && (
                          <span className="text-[9px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded-lg mt-1 inline-block">
                            لم يضف
                          </span>
                        )}
                      </td>

                      {/* الاختبارات */}
                      <td className="px-4 py-5 text-center">
                        <div className={`text-xl font-black ${teacher.exams.thisWeek > 0 ? "text-emerald-600" : "text-amber-500"}`}>
                          {teacher.exams.thisWeek}
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold mt-0.5">
                          إجمالي: {teacher.exams.count}
                        </div>
                        {teacher.exams.thisWeek === 0 && (
                          <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg mt-1 inline-block">
                            لم يضف
                          </span>
                        )}
                      </td>

                      {/* آخر تسجيل */}
                      <td className="px-4 py-5 text-center">
                        {teacher.attendance.lastRecorded ? (
                          <div className="text-sm font-bold text-slate-700">
                            {new Date(teacher.attendance.lastRecorded).toLocaleDateString("ar-EG", {
                              day: "numeric", month: "short"
                            })}
                          </div>
                        ) : (
                          <span className="text-xs font-black text-red-500">لم يسجّل</span>
                        )}
                      </td>

                      {/* إنذار */}
                      <td className="px-4 py-5 text-center">
                        {teacher.status !== "excellent" ? (
                          <button
                            onClick={() => sendAlert(teacher)}
                            disabled={sendingAlert === teacher.id}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-black hover:bg-red-700 transition-all disabled:opacity-50 shadow-sm"
                          >
                            {sendingAlert === teacher.id ? (
                              <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <Bell className="h-3.5 w-3.5" />
                            )}
                            إنذار
                          </button>
                        ) : (
                          <span className="text-emerald-500">
                            <CheckCircle2 className="h-5 w-5 mx-auto" />
                          </span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
