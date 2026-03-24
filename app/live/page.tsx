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
  sectionName: string;
  className: string;
  subjectName: string;
  periodNumber: number;
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
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
  const [error, setError] = useState<string | null>(null);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cache = useRef<Record<string, LiveClass[]>>({});
  const lastKey = useRef<string | null>(null);
  const requestIdRef = useRef(0);

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

  /* ================= Time Calculation ================= */

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const jsDay = now.getDay();
  const dbDay = getDbDay(jsDay);

  const currentPeriod = useMemo(() => {
    return (
      periods.find(
        (p) =>
          nowMin >= timeToMinutes(p.start_time) &&
          nowMin < timeToMinutes(p.end_time)
      ) || null
    );
  }, [nowMin, periods]);

  const nextPeriod = useMemo(() => {
    return (
      periods.find(
        (p) => timeToMinutes(p.start_time) > nowMin
      ) || null
    );
  }, [nowMin, periods]);

  const isWorkingHours =
    periods.length > 0 &&
    nowMin >= timeToMinutes(periods[0].start_time) &&
    nowMin < timeToMinutes(periods[periods.length - 1].end_time);

  const isBreak = !currentPeriod && isWorkingHours;

  const cacheKey = currentPeriod
    ? `${dbDay}-${currentPeriod.period_number}`
    : null;

  /* ================= Smart Timer ================= */

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (!currentPeriod) return;

    const nowMs = Date.now();
    const endMs =
      timeToMinutes(currentPeriod.end_time) * 60 * 1000;

    const delay = endMs - nowMs;

    if (delay <= 0) return;

    timeoutRef.current = setTimeout(() => {
      setNow(new Date());
    }, delay);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [currentPeriod]);

  /* ================= Data Fetch ================= */

  useEffect(() => {
    if (!currentPeriod || dbDay === -1) return;

    if (lastKey.current === cacheKey) return;
    lastKey.current = cacheKey;

    if (cache.current[cacheKey!]) {
      setLiveClasses(cache.current[cacheKey!]);
      return;
    }

    const load = async () => {
      const requestId = ++requestIdRef.current;

      const { data, error } = await supabase
        .from("schedules")
        .select(`
          id,
          teachers:teachers(users:users(full_name)),
          sections:sections(name, classes:classes(name)),
          subjects:subjects(name)
        `)
        .eq("day_of_week", dbDay)
        .eq("period", currentPeriod.period_number);

      if (requestId !== requestIdRef.current) return;

      if (error) {
        setError("فشل تحميل الحصص المباشرة");
        return;
      }

      const classes: LiveClass[] = (data || []).map((s: any) => ({
        id: s.id,
        teacherName: s.teachers?.users?.full_name ?? "غير محدد",
        sectionName: s.sections?.name ?? "غير محدد",
        className: s.sections?.classes?.name ?? "غير محدد",
        subjectName: s.subjects?.name ?? "غير محدد",
        periodNumber: currentPeriod.period_number,
      }));

      cache.current[cacheKey!] = classes;
      setLiveClasses(classes);
    };

    load();
  }, [cacheKey, currentPeriod, dbDay]);

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6" dir="rtl">
      <div className="flex justify-between mb-6">
        <div className="flex gap-2 items-center">
          <School />
          <span>مدرسة الرفعة</span>
        </div>

        <div>
          {now.toLocaleTimeString("ar-KW", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>

      {/* الحالة */}
      <div className="mb-6 p-4 bg-white/10 rounded-xl">
        {currentPeriod && `الحصة ${currentPeriod.period_number} جارية`}
        {!currentPeriod && isBreak && "استراحة"}
        {!currentPeriod && !isBreak && "انتهى الدوام"}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/20 rounded">
          {error}
        </div>
      )}

      {/* عرض الحصص */}
      {currentPeriod && dbDay !== -1 && (
        <>
          {liveClasses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {liveClasses.map((c) => (
                <div key={c.id} className="p-4 bg-white/10 rounded-xl">
                  <div className="font-bold">{c.subjectName}</div>
                  <div className="text-sm">{c.teacherName}</div>
                  <div className="text-sm">{c.className}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-white/10 rounded-xl">
              لا توجد حصص في هذه الفترة
            </div>
          )}
        </>
      )}
    </div>
  );
}
