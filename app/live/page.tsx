"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Video, 
  Clock, 
  User, 
  BookOpen, 
  ExternalLink, 
  Calendar,
  AlertCircle,
  Zap,
  CheckCircle2,
  School
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const DAY_MAP: Record<number, string> = {
  0: "الأحد", 1: "الاثنين", 2: "الثلاثاء",
  3: "الأربعاء", 4: "الخميس", 5: "الجمعة", 6: "السبت"
};

const MONTH_MAP: Record<number, string> = {
  0: "يناير", 1: "فبراير", 2: "مارس", 3: "أبريل",
  4: "مايو", 5: "يونيو", 6: "يوليو", 7: "أغسطس",
  8: "سبتمبر", 9: "أكتوبر", 10: "نوفمبر", 11: "ديسمبر"
};

// Helper function to convert time string to minutes
const timeToMinutes = (time: string): number => {
  if (!time) return 0;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

export default function LiveClassesPage() {
  const [liveClasses, setLiveClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [periods, setPeriods] = useState<any[]>([]);

  // Update `now` state every second for accurate countdown
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch initial data once on component mount
  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // 1. Fetch student's section_id
      const { data: student } = await supabase
        .from("students")
        .select("section_id, sections(name, classes(name))")
        .eq("id", user.id)
        .single();

      setStudentInfo(student);

      if (!student?.section_id) {
        setLoading(false);
        return;
      }

      // 2. Determine current day (1=Sun ... 5=Thu)
      const jsDay = now.getDay();
      const dbDay = jsDay === 0 ? 1 : jsDay === 1 ? 2 : jsDay === 2 ? 3 :
                    jsDay === 3 ? 4 : jsDay === 4 ? 5 : 0;

      if (dbDay === 0) { // No classes on weekends (assuming Sat/Sun are 6/0)
        setLiveClasses([]);
        setLoading(false);
        return;
      }

      // 3. Fetch all schedules for today for this student's section
      const { data: scheduleData } = await supabase
        .from("schedules")
        .select(`
          id,
          period,
          day_of_week,
          subjects(name),
          teachers(zoom_link, users:teacher_id(full_name))
        `)
        .eq("section_id", student.section_id)
        .eq("day_of_week", dbDay);

      // 4. Fetch class periods (start/end times)
      const { data: periodsData } = await supabase
        .from("class_periods")
        .select("period_number, start_time, end_time")
        .order("period_number");

      if (!scheduleData || !periodsData) {
        setLiveClasses([]);
        setPeriods([]);
        setLoading(false);
        return;
      }
      setPeriods(periodsData);

      // 5. Combine data and determine class status (live, upcoming, past)
      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      const processedClasses = scheduleData.map(item => {
        const periodInfo = periodsData.find(p => p.period_number === item.period);
        if (!periodInfo) return null;

        const startTotal = timeToMinutes(periodInfo.start_time);
        const endTotal = timeToMinutes(periodInfo.end_time);

        let status: 'live' | 'upcoming' | 'past' = 'past';
        if (nowMinutes >= startTotal && nowMinutes < endTotal) status = 'live';
        else if (nowMinutes < startTotal) status = 'upcoming';

        return {
          ...item,
          start_time: periodInfo.start_time.slice(0, 5),
          end_time: periodInfo.end_time.slice(0, 5),
          startTotal,
          endTotal,
          status
        };
      }).filter(Boolean) as any[];

      processedClasses.sort((a, b) => a.startTotal - b.startTotal);
      setLiveClasses(processedClasses);

    } catch (error) {
      console.error("Error fetching live classes:", error);
    } finally {
      setLoading(false);
    }
  }, [now]); // Re-run if `now` changes significantly (e.g., new day)

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Calculate countdown for live classes
  const getCountdown = (endTotal: number) => {
    const nowTotalSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const endTotalSeconds = endTotal * 60;
    const diffSeconds = endTotalSeconds - nowTotalSeconds;

    if (diffSeconds <= 0) return "انتهت";

    const minutes = Math.floor(diffSeconds / 60);
    const seconds = diffSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  const activeClasses = liveClasses.filter(c => c.status === 'live');
  const upcomingClasses = liveClasses.filter(c => c.status === 'upcoming');
  const dayName = DAY_MAP[now.getDay()];
  const dateStr = `${now.getDate()} ${MONTH_MAP[now.getMonth()]} ${now.getFullYear()}`;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto space-y-8 pb-12"
      dir="rtl"
    >
      {/* Header Section */}
      <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-xl shadow-indigo-500/20">
            <School className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">الحصص الحية</h1>
            <p className="text-slate-500 font-bold text-sm">{dayName} — {dateStr}</p>
          </div>
        </div>
        
        <div className="flex flex-col items-center bg-slate-50 px-8 py-4 rounded-[2rem] border border-slate-100 min-w-[180px]">
          <div className="flex items-center gap-2 text-indigo-600 mb-1">
            <Clock className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">الوقت الحالي</span>
          </div>
          <span className="text-2xl font-black text-slate-900 tabular-nums">
            {now.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        </div>
      </div>

      {/* Live Now Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-lg font-black text-slate-800">جارية الآن</h2>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence mode="popLayout">
            {activeClasses.length > 0 ? (
              activeClasses.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="group relative bg-white border-2 border-emerald-100 rounded-[2rem] p-6 shadow-xl shadow-emerald-50 hover:border-emerald-500 transition-all duration-500"
                >
                  <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-6">
                      <div className="h-20 w-20 bg-emerald-50 rounded-[1.5rem] flex items-center justify-center group-hover:bg-emerald-500 transition-colors duration-500">
                        <Zap className="h-10 w-10 text-emerald-600 group-hover:text-white transition-colors duration-500" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-emerald-600 text-xs font-black uppercase">
                          <BookOpen className="h-3 w-3" />
                          <span>الحصة {item.period}</span>
                        </div>
                        <h3 className="text-2xl font-black text-slate-900">{item.subjects?.name}</h3>
                        <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
                          <User className="h-4 w-4" />
                          <span>أ. {item.teachers?.users?.full_name}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center md:items-end gap-4">
                      <div className="text-center md:text-right">
                        <div className="text-emerald-600 font-black text-lg tabular-nums mb-1">
                          {getCountdown(item.endTotal)}
                        </div>
                        <div className="text-slate-400 text-xs font-bold">
                          ينتهي {item.end_time}
                        </div>
                      </div>
                      
                      {item.teachers?.zoom_link ? (
                        <a
                          href={item.teachers.zoom_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-emerald-200 hover:bg-emerald-700 hover:-translate-y-1 transition-all active:scale-95"
                        >
                          <Video className="h-5 w-5" />
                          دخول الحصة (Zoom)
                        </a>
                      ) : (
                        <div className="text-amber-600 bg-amber-50 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          رابط Zoom غير متوفر
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] p-12 text-center"
              >
                <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Calendar className="h-8 w-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-black text-slate-400">لا توجد حصص جارية حالياً</h3>
                <p className="text-slate-400 text-sm font-medium mt-1">تأكد من الجدول الدراسي لمواعيد حصصك</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Upcoming Classes Section */}
      {upcomingClasses.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <div className="h-2 w-2 rounded-full bg-indigo-400" />
            <h2 className="text-lg font-black text-slate-800">الحصص القادمة اليوم</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingClasses.map((item) => (
              <div 
                key={item.id}
                className="bg-white border border-slate-100 rounded-[1.5rem] p-5 flex items-center justify-between group hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900">{item.subjects?.name}</h4>
                    <p className="text-xs font-bold text-slate-400">أ. {item.teachers?.users?.full_name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-indigo-600 font-black text-xs">الحصة {item.period}</div>
                  <div className="text-slate-400 text-[10px] font-bold">تبدأ {item.start_time}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Info Card */}
      <div className="bg-indigo-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-200">
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
          <div className="h-16 w-16 bg-white/10 rounded-2xl backdrop-blur-md flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-indigo-300" />
          </div>
          <div className="text-center md:text-right flex-1">
            <h3 className="text-xl font-black mb-1">تنبيه الطالب</h3>
            <p className="text-indigo-100 text-sm font-medium leading-relaxed">
              يُرجى التواجد قبل بدء الحصة بـ 5 دقائق. في حال واجهت مشكلة في الدخول، تواصل مع الدعم الفني للمدرسة.
            </p>
          </div>
        </div>
        <div className="absolute -right-20 -bottom-20 h-64 w-64 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -left-20 -top-20 h-64 w-64 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>
    </motion.div>
  );
}
