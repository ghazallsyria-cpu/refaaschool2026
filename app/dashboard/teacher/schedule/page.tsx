"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Calendar, Clock, Zap } from "lucide-react";
import { motion } from "motion/react";

const DAYS = [
  { id: 1, name: "الأحد" },
  { id: 2, name: "الاثنين" },
  { id: 3, name: "الثلاثاء" },
  { id: 4, name: "الأربعاء" },
  { id: 5, name: "الخميس" },
];

const PERIODS = [1, 2, 3, 4, 5];

function timeToMinutes(time: string): number {
  if (!time) return 0;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

type PeriodStatus = "past" | "current" | "next" | "upcoming" | "empty";

export default function TeacherSchedulePage() {
  const [schedule, setSchedule] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

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

      const [scheduleRes, periodsRes] = await Promise.all([
        supabase.from("schedules")
          .select("*, subjects(name), sections(name, classes(name))")
          .eq("teacher_id", user.id)
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

  const getTimeLabel = (period: number) => {
    const p = getPeriodTimes(period);
    if (!p) return "";
    return `${p.start_time?.slice(0,5)} - ${p.end_time?.slice(0,5)}`;
  };

  const getPeriodStatus = (day: number, period: number): PeriodStatus => {
    // JS getDay(): 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu
    // DB day_of_week: 1=Sun,2=Mon,3=Tue,4=Wed,5=Thu
    const jsDay = now.getDay();
    const dbDay = jsDay === 0 ? 1 : jsDay === 1 ? 2 : jsDay === 2 ? 3 :
                  jsDay === 3 ? 4 : jsDay === 4 ? 5 : 0;

    if (day !== dbDay) return "upcoming";

    const p = getPeriodTimes(period);
    if (!p || !p.start_time || !p.end_time) return "upcoming";

    const nowMin = now.getHours() * 60 + now.getMinutes();
    const startMin = timeToMinutes(p.start_time);
    const endMin = timeToMinutes(p.end_time);

    if (startMin === 0 && endMin === 0) return "upcoming";
    if (nowMin >= startMin && nowMin < endMin) return "current";
    if (nowMin < startMin && startMin - nowMin <= 15) return "next";
    if (nowMin >= endMin) return "past";
    return "upcoming";
  };

  const getCountdown = (period: number, status: PeriodStatus): string => {
    const p = getPeriodTimes(period);
    if (!p) return "";
    const nowMin = now.getHours() * 60 + now.getMinutes();
    if (status === "current") {
      const rem = timeToMinutes(p.end_time) - nowMin;
      return `${rem} دقيقة متبقية`;
    }
    if (status === "next") {
      const diff = timeToMinutes(p.start_time) - nowMin;
      return `تبدأ خلال ${diff} دقيقة`;
    }
    return "";
  };

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">جدولي الدراسي — {periods.length}
</h1>
          <p className="text-slate-500 mt-2 font-medium">عرض كامل للحصص الدراسية المسندة إليك خلال الأسبوع</p>
        </div>
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
          { label: "حصتك الحالية", color: "bg-emerald-500", pulse: true },
          { label: "تبدأ خلال 15 دقيقة", color: "bg-amber-400", pulse: false },
          { label: "قادمة", color: "bg-indigo-400", pulse: false },
          { label: "منتهية", color: "bg-slate-300", pulse: false },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
            <div className={`h-3 w-3 rounded-full ${item.color} ${item.pulse ? "animate-pulse" : ""}`} />
            <span className="text-xs font-bold text-slate-600">{item.label}</span>
          </div>
        ))}
      </div>

      {/* DEBUG — احذف هذا بعد التشخيص */}
      {process.env.NODE_ENV === "development" || true ? (
        <div className="bg-slate-900 text-green-400 p-4 rounded-2xl font-mono text-xs space-y-1">
          <div>🕐 الوقت الآن: {now.toLocaleTimeString("ar-EG")} ({now.getHours()}:{now.getMinutes().toString().padStart(2,"0")})</div>
          <div>📅 اليوم JS: {now.getDay()} → DB id: {now.getDay() === 0 ? 1 : now.getDay() === 1 ? 2 : now.getDay() === 2 ? 3 : now.getDay() === 3 ? 4 : now.getDay() === 4 ? 5 : 0}</div>
          <div>📋 عدد الحصص في class_periods: {periods.length}</div>
          <div>📚 عدد الحصص في الجدول: {schedule.length}</div>
          {periods.map(p => (
            <div key={p.period_number}>⏱ حصة {p.period_number}: {p.start_time} → {p.end_time}</div>
          ))}
        </div>
      ) : null}

      <div className="glass-card rounded-[2.5rem] shadow-2xl border-white/40 overflow-hidden">
        {loading ? (
          <div className="flex flex-col justify-center items-center py-32 gap-4">
            <div className="h-16 w-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 font-bold animate-pulse">جاري تحميل جدولك الدراسي...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse table-fixed">
              <thead>
                <tr className="bg-slate-50/50 backdrop-blur-md">
                  <th className="py-6 px-6 text-center text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-l border-slate-100/50 w-32 bg-slate-100/30">
                    اليوم / الحصة
                  </th>
                  {PERIODS.map(period => (
                    <th key={period} className="py-6 px-4 text-center text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-l border-slate-100/50">
                      <div className="flex flex-col gap-1">
                        <span>الحصة {period}</span>
                        <span className="text-[10px] font-bold text-slate-300 normal-case">{getTimeLabel(period)}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white/30 backdrop-blur-sm">
                {DAYS.map(day => (
                  <tr key={day.id} className="group hover:bg-white/50 transition-colors duration-300">
                    <td className="py-8 px-6 text-base font-black text-slate-700 border-l border-b border-slate-100/50 text-center bg-slate-50/30 group-hover:text-indigo-600 transition-colors">
                      {day.name}
                    </td>
                    {PERIODS.map(period => {
                      const cellData = getCellData(day.id, period);
                      const status = cellData ? getPeriodStatus(day.id, period) : "empty";
                      const countdown = getCountdown(period, status);

                      return (
                        <td key={`${day.id}-${period}`} className="p-3 border-l border-b border-slate-100/50 h-36 min-w-[160px] align-top">
                          {cellData ? (
                            <div className="relative h-full">
                              {/* النبض */}
                              {status === "current" && (
                                <motion.div
                                  className="absolute inset-0 rounded-3xl bg-emerald-400/20"
                                  animate={{ scale: [1, 1.06, 1], opacity: [0.4, 1, 0.4] }}
                                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                                />
                              )}

                              <div className={`relative h-full flex flex-col justify-between rounded-3xl p-5 shadow-xl transform group-hover:scale-[1.02] transition-all duration-300 border relative overflow-hidden ${
                                status === "current"
                                  ? "bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-400 shadow-emerald-200/60 text-white"
                                  : status === "next"
                                  ? "bg-gradient-to-br from-amber-400 to-amber-500 border-amber-300 shadow-amber-200/60 text-white"
                                  : status === "past"
                                  ? "bg-slate-100/50 border-slate-200/50 opacity-50"
                                  : "bg-gradient-to-br from-indigo-600 to-violet-700 border-white/20 shadow-indigo-200/50 text-white"
                              }`}>
                                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 blur-2xl" />

                                {/* بادج */}
                                {status === "current" && (
                                  <div className="absolute -top-2 -right-2 flex items-center gap-1 bg-emerald-700 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg border-2 border-white">
                                    <Zap className="h-2.5 w-2.5" />
                                    حصتك الآن
                                  </div>
                                )}
                                {status === "next" && (
                                  <div className="absolute -top-2 -right-2 bg-amber-700 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg border-2 border-white">
                                    استعد!
                                  </div>
                                )}

                                <div className="relative z-10">
                                  <div className={`font-black text-base leading-tight mb-1 ${status === "past" ? "text-slate-500" : "text-white"}`}>
                                    {cellData.subjects?.name}
                                  </div>
                                  <div className={`text-[11px] font-bold uppercase tracking-widest ${
                                    status === "past" ? "text-slate-400" : "text-white/70"
                                  }`}>
                                    {cellData.sections?.classes?.name}
                                  </div>
                                </div>

                                <div className="relative z-10 mt-2 pt-3 border-t border-white/20 flex items-center justify-between">
                                  <span className={`text-[11px] font-black px-3 py-1 rounded-xl backdrop-blur-sm ${
                                    status === "past" ? "bg-slate-200 text-slate-500" : "bg-white/20 text-white"
                                  }`}>
                                    {cellData.sections?.name}
                                  </span>
                                  <div className="flex flex-col items-end">
                                    <div className={`flex items-center gap-1 ${status === "past" ? "text-slate-400" : "text-white/60"}`}>
                                      <Clock className="h-3.5 w-3.5" />
                                      <span className="text-[10px] font-bold">الحصة {period}</span>
                                    </div>
                                    {countdown && (
                                      <span className="text-[9px] font-black text-white/80 mt-0.5">{countdown}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="h-full w-full flex items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-100/30 group-hover:bg-slate-100/50 transition-all duration-300">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">فارغ</span>
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
        )}
      </div>
    </div>
  );
}
