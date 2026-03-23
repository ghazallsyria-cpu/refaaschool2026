"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "motion/react";
import { Clock, BookOpen, Users, GraduationCap, School, Zap, ChevronLeft, ChevronRight } from "lucide-react";

const DAY_MAP: Record<number, string> = {
  0: "الأحد", 1: "الاثنين", 2: "الثلاثاء",
  3: "الأربعاء", 4: "الخميس", 5: "الجمعة", 6: "السبت"
};

const MONTH_MAP: Record<number, string> = {
  0: "يناير", 1: "فبراير", 2: "مارس", 3: "أبريل",
  4: "مايو", 5: "يونيو", 6: "يوليو", 7: "أغسطس",
  8: "سبتمبر", 9: "أكتوبر", 10: "نوفمبر", 11: "ديسمبر"
};

function timeToMinutes(time: string): number {
  if (!time) return 0;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

interface LiveClass {
  id: string;
  teacherName: string;
  sectionName: string;
  className: string;
  subjectName: string;
  periodNumber: number;
  zoomLink: string | null;
}

interface Period {
  id: string;
  period_number: number;
  start_time: string;
  end_time: string;
}

export default function LiveMonitorPage() {
  const [now, setNow] = useState(new Date());
  const [periods, setPeriods] = useState<Period[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<Period | null>(null);
  const [nextPeriod, setNextPeriod] = useState<Period | null>(null);
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState("");

  // تحديث الوقت كل ثانية
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // جلب البيانات عند التحميل
  useEffect(() => {
    fetchData();
  }, []);

  // تحديث الحصة الحالية عند تغير الوقت
  useEffect(() => {
    updateCurrentPeriod();
  }, [now, periods]);

  const fetchData = async () => {
    try {
      const { data: periodsData } = await supabase
        .from("class_periods")
        .select("*")
        .order("period_number");
      setPeriods(periodsData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateCurrentPeriod = () => {
    if (periods.length === 0) return;
    const nowMin = now.getHours() * 60 + now.getMinutes();
    
    const current = periods.find(p =>
      nowMin >= timeToMinutes(p.start_time) && nowMin < timeToMinutes(p.end_time)
    ) || null;

    const next = periods.find(p => timeToMinutes(p.start_time) > nowMin) || null;

    setCurrentPeriod(current);
    setNextPeriod(next);

    // حساب العد التنازلي
    if (current) {
      const endMin = timeToMinutes(current.end_time);
      const rem = endMin - nowMin;
      const secs = 60 - now.getSeconds();
      setCountdown(`${rem > 0 ? rem - 1 : 0}:${secs.toString().padStart(2, "0")}`);
    } else if (next) {
      const startMin = timeToMinutes(next.start_time);
      const rem = startMin - nowMin;
      const secs = 60 - now.getSeconds();
      setCountdown(`${rem > 0 ? rem - 1 : 0}:${secs.toString().padStart(2, "0")}`);
    }

    // جلب الحصص الحالية
    if (current) {
      fetchLiveClasses(current.period_number);
    } else {
      setLiveClasses([]);
    }
  };

  const fetchLiveClasses = async (periodNum: number) => {
    try {
      const jsDay = new Date().getDay();
      const dbDay = jsDay === 0 ? 1 : jsDay === 1 ? 2 : jsDay === 2 ? 3 :
                    jsDay === 3 ? 4 : jsDay === 4 ? 5 : 0;

      const { data } = await supabase
        .from("schedules")
        .select(`
          id,
          teachers(users(full_name), zoom_link),
          sections(name, classes(name)),
          subjects(name)
        `)
        .eq("day_of_week", dbDay)
        .eq("period", periodNum);

      const classes: LiveClass[] = (data || []).map((s: any) => ({
        id: s.id,
        teacherName: s.teachers?.users?.full_name || "غير محدد",
        sectionName: s.sections?.name || "غير محدد",
        className: s.sections?.classes?.name || "غير محدد",
        subjectName: s.subjects?.name || "غير محدد",
        periodNumber: periodNum,
        zoomLink: s.teachers?.zoom_link || null,
      }));

      setLiveClasses(classes);
    } catch (e) {
      console.error(e);
    }
  };

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const dayName = DAY_MAP[now.getDay()];
  const dateStr = `${now.getDate()} ${MONTH_MAP[now.getMonth()]} ${now.getFullYear()}`;
  const timeStr = now.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const isWorkDay = now.getDay() >= 0 && now.getDay() <= 4;
  const beforeSchool = nowMin < timeToMinutes(periods[0]?.start_time || "09:00");
  const afterSchool = nowMin >= timeToMinutes(periods[periods.length - 1]?.end_time || "12:35");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white" dir="rtl">
      
      {/* Header */}
      <div className="border-b border-white/10 bg-white/5 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* School name */}
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-xl shadow-indigo-500/30">
              <School className="h-7 w-7 text-white" />
            </div>
            <div>
              <div className="font-black text-xl text-white">مدرسة الرفعة النموذجية</div>
              <div className="text-[11px] text-indigo-300 font-bold uppercase tracking-widest">لوحة المراقبة الحية</div>
            </div>
          </div>

          {/* Clock */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-3xl font-black text-white tabular-nums">{timeStr}</div>
              <div className="text-xs text-indigo-300 font-bold mt-0.5">{dayName} — {dateStr}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">

        {/* Period Status Bar */}
        <div className={`rounded-3xl p-5 border flex flex-col sm:flex-row items-center justify-between gap-4 ${
          currentPeriod
            ? "bg-emerald-500/20 border-emerald-500/30"
            : nextPeriod
            ? "bg-amber-500/20 border-amber-500/30"
            : "bg-slate-500/20 border-slate-500/30"
        }`}>
          <div className="flex items-center gap-4">
            {currentPeriod ? (
              <>
                <div className="h-12 w-12 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="font-black text-xl text-emerald-300">
                    الحصة {currentPeriod.period_number} — جارية الآن
                  </div>
                  <div className="text-sm text-emerald-400/80 font-bold">
                    {currentPeriod.start_time?.slice(0,5)} — {currentPeriod.end_time?.slice(0,5)}
                  </div>
                </div>
              </>
            ) : nextPeriod && isWorkDay ? (
              <>
                <div className="h-12 w-12 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="font-black text-xl text-amber-300">
                    استراحة — الحصة {nextPeriod.period_number} قادمة
                  </div>
                  <div className="text-sm text-amber-400/80 font-bold">
                    تبدأ الساعة {nextPeriod.start_time?.slice(0,5)}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="h-12 w-12 rounded-2xl bg-slate-500 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="font-black text-xl text-slate-300">
                    {!isWorkDay ? "يوم إجازة" : afterSchool ? "انتهى الدوام" : "قبل بدء الدوام"}
                  </div>
                  <div className="text-sm text-slate-400 font-bold">لا توجد حصص جارية</div>
                </div>
              </>
            )}
          </div>

          {/* Countdown */}
          {(currentPeriod || nextPeriod) && isWorkDay && (
            <div className="text-center bg-white/10 rounded-2xl px-6 py-3">
              <div className="text-3xl font-black tabular-nums text-white">{countdown}</div>
              <div className="text-[10px] font-bold text-white/60 uppercase tracking-widest mt-1">
                {currentPeriod ? "متبقي" : "لبدء الحصة"}
              </div>
            </div>
          )}
        </div>

        {/* Periods Timeline */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {periods.map(p => {
            const isNow = currentPeriod?.period_number === p.period_number;
            const isPast = nowMin >= timeToMinutes(p.end_time);
            return (
              <div key={p.id} className={`flex-shrink-0 px-4 py-3 rounded-2xl border text-center min-w-[100px] transition-all ${
                isNow
                  ? "bg-emerald-500 border-emerald-400 shadow-lg shadow-emerald-500/30"
                  : isPast
                  ? "bg-white/5 border-white/10 opacity-50"
                  : "bg-white/10 border-white/20"
              }`}>
                <div className={`text-xs font-black ${isNow ? "text-white" : "text-slate-300"}`}>
                  الحصة {p.period_number}
                  {isNow && <span className="mr-1">⚡</span>}
                </div>
                <div className={`text-[10px] font-bold mt-0.5 ${isNow ? "text-emerald-100" : "text-slate-400"}`}>
                  {p.start_time?.slice(0,5)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Classes Grid */}
        {currentPeriod ? (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                الحصص الجارية الآن
                <span className="text-sm font-bold text-emerald-400">({liveClasses.length} حصة)</span>
              </h2>
            </div>

            <AnimatePresence mode="wait">
              {liveClasses.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20 text-slate-400"
                >
                  <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-bold">لا توجد حصص مسجلة لهذه الحصة</p>
                </motion.div>
              ) : (
                <motion.div
                  key={currentPeriod.period_number}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                >
                  {liveClasses.map((cls, idx) => (
                    <motion.div
                      key={cls.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-5 hover:bg-white/15 transition-all hover:scale-[1.02] relative overflow-hidden"
                    >
                      {/* Glow */}
                      <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/20 rounded-full -mr-10 -mt-10 blur-xl" />

                      {/* Subject */}
                      <div className="relative z-10 mb-4">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-8 w-8 rounded-xl bg-indigo-500/30 flex items-center justify-center">
                            <BookOpen className="h-4 w-4 text-indigo-300" />
                          </div>
                          <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">المادة</span>
                        </div>
                        <div className="font-black text-xl text-white leading-tight">
                          {cls.subjectName}
                        </div>
                      </div>

                      <div className="relative z-10 space-y-3">
                        {/* Teacher */}
                        <div className="flex items-center gap-3 bg-white/10 rounded-2xl px-3 py-2.5">
                          <div className="h-8 w-8 rounded-xl bg-emerald-500/30 flex items-center justify-center flex-shrink-0">
                            <GraduationCap className="h-4 w-4 text-emerald-300" />
                          </div>
                          <div>
                            <div className="text-[9px] font-black text-emerald-300 uppercase tracking-widest">المعلم</div>
                            <div className="font-bold text-sm text-white leading-tight">{cls.teacherName}</div>
                          </div>
                        </div>

                        {/* Class */}
                        <div className="flex items-center gap-3 bg-white/10 rounded-2xl px-3 py-2.5">
                          <div className="h-8 w-8 rounded-xl bg-amber-500/30 flex items-center justify-center flex-shrink-0">
                            <Users className="h-4 w-4 text-amber-300" />
                          </div>
                          <div>
                            <div className="text-[9px] font-black text-amber-300 uppercase tracking-widest">الفصل</div>
                            <div className="font-bold text-sm text-white leading-tight">
                              {cls.className} — {cls.sectionName}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Zoom Link */}
                      {cls.zoomLink && (
                        <a
                          href={cls.zoomLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-indigo-500 hover:bg-indigo-400 transition-all text-white text-sm font-black shadow-lg shadow-indigo-500/30 active:scale-95"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M15 10l4.553-2.277A1 1 0 0 1 21 8.624v6.752a1 1 0 0 1-1.447.899L15 14v-4zM3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/>
                          </svg>
                          دخول الحصة عبر Zoom
                        </a>
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <div className="text-center py-24">
            <div className="h-24 w-24 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
              <Clock className="h-12 w-12 text-slate-400" />
            </div>
            <h3 className="text-2xl font-black text-slate-300 mb-2">
              {!isWorkDay ? "يوم إجازة" : afterSchool ? "انتهى الدوام اليومي" : "لم يبدأ الدوام بعد"}
            </h3>
            {nextPeriod && isWorkDay && (
              <p className="text-slate-400 font-bold">
                الحصة {nextPeriod.period_number} تبدأ الساعة {nextPeriod.start_time?.slice(0,5)}
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-white/10 pt-4 text-center">
          <p className="text-[11px] text-slate-500 font-bold">
            مدرسة الرفعة النموذجية — لوحة المراقبة الحية
            <span className="mx-2">·</span>
            يتحدث تلقائياً
          </p>
        </div>
      </div>
    </div>
  );
}
