"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { School } from "lucide-react";

/* ================= Helpers ================= */

function timeToMinutes(time: string): number {
  if (!time) return 0;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function getDbDay(jsDay: number): number {
  if (jsDay >= 0 && jsDay <= 4) return jsDay + 1;
  return -1;
}

/* ================= Types ================= */

interface LiveClass {
  id: string;
  teacherName: string;
  className: string;
  subjectName: string;
}

interface Period {
  id: string;
  period_number: number;
  start_time: string;
  end_time: string;
}

/* ================= Component ================= */

export default function LiveMonitorPage() {
  const [now, setNow] = useState(new Date());
  const [periods, setPeriods] = useState<Period[]>([]);
  const [classes, setClasses] = useState<LiveClass[]>([]);
  const [error, setError] = useState<string | null>(null);

  const lastKey = useRef<string | null>(null);

  /* ================= Load Periods ================= */

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("class_periods")
        .select("id, period_number, start_time, end_time")
        .order("period_number");

      if (error) {
        setError("فشل تحميل الحصص");
        return;
      }

      setPeriods(data || []);
    };

    load();
  }, []);

  /* ================= Time ================= */

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const dbDay = getDbDay(now.getDay());

  const currentPeriod = useMemo(() => {
    return (
      periods.find(
        (p) =>
          nowMin >= timeToMinutes(p.start_time) &&
          nowMin < timeToMinutes(p.end_time)
      ) || null
    );
  }, [nowMin, periods]);

  const isWorkingHours =
    periods.length > 0 &&
    nowMin >= timeToMinutes(periods[0].start_time) &&
    nowMin < timeToMinutes(periods[periods.length - 1].end_time);

  const isBreak = !currentPeriod && isWorkingHours;

  const progress = currentPeriod
    ? (nowMin - timeToMinutes(currentPeriod.start_time)) /
      (timeToMinutes(currentPeriod.end_time) -
        timeToMinutes(currentPeriod.start_time))
    : 0;

  /* ================= Fetch ================= */

  useEffect(() => {
    if (!currentPeriod || dbDay === -1) return;

    const key = `${dbDay}-${currentPeriod.period_number}`;
    if (lastKey.current === key) return;

    lastKey.current = key;

    const load = async () => {
      const { data, error } = await supabase
        .from("schedules")
        .select(`
          id,
          teachers(users(full_name)),
          sections(name),
          subjects(name)
        `)
        .eq("day_of_week", dbDay)
        .eq("period", currentPeriod.period_number);

      if (error) {
        setError("فشل تحميل البيانات");
        return;
      }

      const mapped: LiveClass[] = (data || []).map((s: any) => ({
        id: s.id,
        teacherName: s.teachers?.users?.full_name || "—",
        className: s.sections?.name || "—",
        subjectName: s.subjects?.name || "—",
      }));

      setClasses(mapped);
    };

    load();
  }, [currentPeriod, dbDay]);

  /* ================= Timer ================= */

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  /* ================= UI ================= */

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white p-6">

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-xl">
            <School size={20} />
          </div>
          <div className="text-lg font-bold">مدرسة الرفعة</div>
        </div>

        <div className="text-sm opacity-70">
          {now.toLocaleTimeString("ar-KW", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>

      {/* Status */}
      <div className="mb-8 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-xl">

        {currentPeriod && (
          <div className="text-center space-y-3">
            <div className="text-3xl font-bold text-green-400">
              الحصة {currentPeriod.period_number}
            </div>

            <div className="text-sm opacity-70">
              {currentPeriod.start_time} → {currentPeriod.end_time}
            </div>

            {/* Progress */}
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mt-4">
              <div
                className="h-full bg-green-400 transition-all duration-500"
                style={{ width: `${Math.min(progress * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        {!currentPeriod && isBreak && (
          <div className="text-center space-y-2">
            <div className="text-2xl font-bold text-yellow-400">
              استراحة
            </div>
            <div className="text-sm opacity-70">
              سيتم الانتقال للحصة القادمة قريبًا
            </div>
          </div>
        )}

        {!currentPeriod && !isBreak && (
          <div className="text-center space-y-2">
            <div className="text-2xl font-bold text-red-400">
              انتهى الدوام
            </div>
            <div className="text-sm opacity-70">
              لا توجد حصص حالياً
            </div>
          </div>
        )}

      </div>

      {/* Classes */}
      {currentPeriod && (
        <div className="grid gap-4 md:grid-cols-3">
          {classes.map((c) => (
            <div
              key={c.id}
              className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
            >
              <div className="font-bold text-lg mb-2">
                {c.subjectName}
              </div>
              <div className="text-sm opacity-70">
                {c.teacherName}
              </div>
              <div className="text-sm opacity-70">
                {c.className}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-6 text-red-400 text-sm">
          {error}
        </div>
      )}

    </div>
  );
}
