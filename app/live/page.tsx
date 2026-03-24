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

// توحيد اليوم بين JS و DB (قابل للتعديل حسب نظامك)
function getDbDay(jsDay: number): number {
  // 0 = Sunday
  // هنا نفترض:
  // الأحد=1 ... الخميس=5 | الجمعة/السبت = null (لا دوام)
  if (jsDay >= 0 && jsDay <= 4) return jsDay + 1;
  return -1; // يوم غير دراسي
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

  // cache مرتبط (يوم + رقم حصة)
  const cache = useRef<Record<string, LiveClass[]>>({});
  const lastKey = useRef<string | null>(null);

  // للتحكم بالـ race condition
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

  /* ================= Clock ================= */

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  /* ================= Derived State ================= */

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

  // مفتاح الكاش
  const cacheKey = currentPeriod
    ? `${dbDay}-${currentPeriod.period_number}`
    : null;

  /* ================= Data Fetch ================= */

  useEffect(() => {
    // لا يوجد حصة أو يوم غير دراسي
    if (!currentPeriod || dbDay === -1) {
      setLiveClasses([]); // تنظيف الحالة
      lastKey.current = null;
      return;
    }

    // منع إعادة الطلب لنفس الحالة
    if (lastKey.current === cacheKey) return;
    lastKey.current = cacheKey;

    // cache hit
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

      // تجاهل أي response قديم
      if (requestId !== requestIdRef.current) return;

      if (error) {
        setError("فشل تحميل الحصص المباشرة");
        setLiveClasses([]);
        return;
      }

      const classes: LiveClass[] = (data || []).map((s: any) => ({
        id: s.id,
        teacherName:
          s.teachers?.users?.full_name ?? "غير محدد",
        sectionName:
          s.sections?.name ?? "غير محدد",
        className:
          s.sections?.classes?.name ?? "غير محدد",
        subjectName:
          s.subjects?.name ?? "غير محدد",
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
            second: "2-digit",
          })}
        </div>
      </div>

      <div className="mb-6 p-4 bg-white/10 rounded-xl">
        {currentPeriod
          ? `الحصة ${currentPeriod.period_number} جارية`
          : "لا توجد حصة الآن"}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/20 rounded">
          {error}
        </div>
      )}

      {currentPeriod && liveClasses.length === 0 && (
        <div className="p-4 bg-white/10 rounded-xl">
          لا توجد حصص مسجلة لهذه الفترة
        </div>
      )}

      {currentPeriod && liveClasses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {liveClasses.map((c) => (
            <div key={c.id} className="p-4 bg-white/10 rounded-xl">
              <div className="font-bold">{c.subjectName}</div>
              <div className="text-sm">{c.teacherName}</div>
              <div className="text-sm">{c.className}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
