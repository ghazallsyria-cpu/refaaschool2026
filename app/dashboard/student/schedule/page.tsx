"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Calendar, Clock, BookOpen, User, Zap } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const DAYS = [
  { id: 1, name: "الأحد" },
  { id: 2, name: "الاثنين" },
  { id: 3, name: "الثلاثاء" },
  { id: 4, name: "الأربعاء" },
  { id: 5, name: "الخميس" },
];

const PERIODS = [1, 2, 3, 4, 5];

// تحويل "HH:MM:SS" إلى دقائق من منتصف الليل
function timeToMinutes(time: string): number {
  if (!time) return 0;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

type PeriodStatus = "past" | "current" | "next" | "upcoming" | "empty";

export default function StudentSchedulePage() {
  const [schedule, setSchedule] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [now, setNow] = useState(new Date());

  // تحديث الوقت كل دقيقة
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: student } = await supabase
        .from("students")
        .select("section_id, sections(name, classes(name))")
        .eq("id", user.id)
        .single();

      setStudentInfo(student);

      const [scheduleRes, periodsRes] = await Promise.all([
        supabase.from("schedules")
          .select("*, subjects(name), teachers(zoom_link, users:teacher_id(full_name))")
          .eq("section_id", student?.section_id)
          .order("day_of_week").order("period"),
        supabase.from("class_periods")
          .select("period_number, start_time, end_time")
          .order("period_number"),
      ]);

      setSchedule(scheduleRes.data || []);
      setPeriods(periodsRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getCellData = (day: number, period: number) =>
    schedule.find(s => s.day_of_week === day && s.period === period);

  const getPeriodTimes = (periodNum: number) =>
    periods.find(p => p.period_number === periodNum);

  const getPeriodStatus = (day: number, period: number): PeriodStatus => {
    const todayDay = now.getDay(); // 0=Sunday
    // DAYS uses id 1=Sunday...5=Thursday
    // day_of_week in schedules: need to check mapping
    // In the DB, day_of_week seems to map: 1=Sunday based on DAYS array
    const todayId = todayDay === 0 ? 1 : todayDay === 1 ? 2 : todayDay === 2 ? 3 :
                    todayDay === 3 ? 4 : todayDay === 4 ? 5 : 0;

    if (day !== todayId) return "upcoming";

    const periodData = getPeriodTimes(period);
    if (!periodData) return "upcoming";

    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const startMin = timeToMinutes(periodData.start_time);
    const endMin = timeToMinutes(periodData.end_time);

    // الحصة الحالية
    if (nowMinutes >= startMin && nowMinutes < endMin) return "current";
    // الحصة التالية (الحصة التي ستبدأ خلال 15 دقيقة)
    if (nowMinutes < startMin && startMin - nowMinutes <= 15) return "next";
    // حصة انتهت
    if (nowMinutes >= endMin) return "past";

    return "upcoming";
  };

  const getTimeLabel = (period: number) => {
    const p = getPeriodTimes(period);
    if (!p) return "";
    const fmt = (t: string) => t?.slice(0, 5) || "";
    return `${fmt(p.start_time)} - ${fmt(p.end_time)}`;
  };

  const getCurrentPeriodCountdown = (period: number): string => {
    const p = getPeriodTimes(period);
    if (!p) return "";
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const endMin = timeToMinutes(p.end_time);
    const remaining = endMin - nowMinutes;
    if (remaining <= 0) return "";
    return `${remaining} دقيقة متبقية`;
  };

  const getNextCountdown = (period: number): string => {
    const p = getPeriodTimes(period);
    if (!p) return "";
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const startMin = timeToMinutes(p.start_time);
    const diff = startMin - nowMinutes;
    if (diff <= 0) return "";
    return `تبدأ خلال ${diff} دقيقة`;
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-8 max-w-7xl mx-auto"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-xl">
              <Calendar className="h-8 w-8 text-indigo-600" />
            </div>
            جدولي الدراسي الأسبوعي
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            صفك: <span className="text-indigo-600 font-bold">{studentInfo?.sections?.classes?.name} - {studentInfo?.sections?.name}</span>
          </p>
        </div>
        {/* الوقت الحالي */}
        <div className="flex items-center gap-3 bg-indigo-600 text-white px-5 py-3 rounded-2xl shadow-lg shadow-indigo-200">
          <Clock className="h-5 w-5" />
          <span className="font-black text-lg">
            {now.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>

      {/* مفتاح الألوان */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: "الحصة الحالية", color: "bg-emerald-500", pulse: true },
          { label: "تبدأ خلال 15 دقيقة", color: "bg-amber-400", pulse: false },
          { label: "قادمة", color: "bg-indigo-100", pulse: false },
          { label: "منتهية", color: "bg-slate-200", pulse: false },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
            <div className={`h-3 w-3 rounded-full ${item.color} ${item.pulse ? "animate-pulse" : ""}`} />
            <span className="text-xs font-bold text-slate-600">{item.label}</span>
          </div>
        ))}
      </div>

      {/* الجدول */}
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 border-collapse table-fixed">
            <thead className="bg-slate-50">
              <tr>
                <th className="py-5 px-4 text-center text-sm font-black text-slate-900 border-l border-slate-200 w-32 bg-slate-100/50">
                  اليوم / الحصة
                </th>
                {PERIODS.map(period => (
                  <th key={period} className="py-5 px-4 text-center text-sm font-black text-slate-900 border-l border-slate-200">
                    <div className="flex flex-col items-center gap-1">
                      <Clock className="h-4 w-4 text-indigo-500" />
                      <span>الحصة {period}</span>
                      <span className="text-[10px] font-bold text-slate-400">{getTimeLabel(period)}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {DAYS.map(day => (
                <tr key={day.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-6 px-4 text-sm font-black text-slate-900 border-l border-slate-200 text-center bg-slate-50/80">
                    {day.name}
                  </td>
                  {PERIODS.map(period => {
                    const cellData = getCellData(day.id, period);
                    const status = cellData ? getPeriodStatus(day.id, period) : "empty";

                    return (
                      <td key={`${day.id}-${period}`} className="p-3 border-l border-slate-200 h-36 align-top min-w-[150px]">
                        {cellData ? (
                          <div className="relative h-full">
                            {/* النبض للحصة الحالية */}
                            {status === "current" && (
                              <motion.div
                                className="absolute inset-0 rounded-2xl bg-emerald-400/20"
                                animate={{ scale: [1, 1.05, 1], opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                              />
                            )}

                            <motion.div
                              whileHover={{ scale: 1.02 }}
                              className={`relative h-full flex flex-col justify-between rounded-2xl p-3 border shadow-sm transition-all ${
                                status === "current"
                                  ? "bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-400 shadow-emerald-200 text-white"
                                  : status === "next"
                                  ? "bg-gradient-to-br from-amber-400 to-amber-500 border-amber-300 shadow-amber-200 text-white"
                                  : status === "past"
                                  ? "bg-slate-50 border-slate-100 opacity-60"
                                  : "bg-gradient-to-br from-indigo-50 to-white border-indigo-100"
                              }`}
                            >
                              {/* بادج الحالة */}
                              {status === "current" && (
                                <div className="absolute -top-2 -right-2 flex items-center gap-1 bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg border border-white">
                                  <Zap className="h-2.5 w-2.5" />
                                  الآن
                                </div>
                              )}
                              {status === "next" && (
                                <div className="absolute -top-2 -right-2 bg-amber-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg border border-white">
                                  قريباً
                                </div>
                              )}

                              <div className="space-y-1">
                                <div className={`flex items-center gap-1.5 mb-1 ${
                                  status === "current" || status === "next" ? "text-white/80" : "text-indigo-600"
                                }`}>
                                  <BookOpen className="h-3.5 w-3.5" />
                                  <span className="text-[10px] font-black uppercase tracking-wider">مادة</span>
                                </div>
                                <div className={`font-black text-sm leading-tight ${
                                  status === "current" || status === "next" ? "text-white" : "text-slate-900"
                                }`}>
                                  {cellData.subjects?.name}
                                </div>
                              </div>

                              <div className={`mt-2 pt-2 border-t flex flex-col gap-1.5 ${
                                status === "current" || status === "next" ? "border-white/20" : "border-indigo-100/50"
                              }`}>
                                <div className="flex items-center gap-1.5">
                                  <User className="h-3 w-3 opacity-60" />
                                  <span className={`text-[11px] font-bold truncate ${
                                    status === "current" || status === "next" ? "text-white/90" : "text-slate-600"
                                  }`}>
                                    {cellData.teachers?.users?.full_name}
                                  </span>
                                </div>

                                {/* الوقت المتبقي */}
                                {status === "current" && (
                                  <div className="text-[10px] font-black text-emerald-100">
                                    ⏱ {getCurrentPeriodCountdown(period)}
                                  </div>
                                )}
                                {status === "next" && (
                                  <div className="text-[10px] font-black text-amber-100">
                                    ⏰ {getNextCountdown(period)}
                                  </div>
                                )}

                                {cellData.teachers?.zoom_link && (
                                  <a
                                    href={cellData.teachers.zoom_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-[10px] font-bold transition-colors ${
                                      status === "current"
                                        ? "bg-white text-emerald-600 hover:bg-emerald-50"
                                        : "bg-indigo-600 text-white hover:bg-indigo-700"
                                    }`}
                                  >
                                    دخول الحصة (Zoom)
                                  </a>
                                )}
                              </div>
                            </motion.div>
                          </div>
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-slate-200">
                            <div className="h-1 w-4 bg-slate-100 rounded-full" />
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
