"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { School } from "lucide-react";

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
  const [countdown, setCountdown] = useState("");

  const cache = useRef<Record<number, LiveClass[]>>({});
  const lastFetchedPeriod = useRef<number | null>(null);

  // الساعة فقط
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // جلب الحصص مرة واحدة
  useEffect(() => {
    fetchPeriods();
  }, []);

  // حساب الحصة
  useEffect(() => {
    if (periods.length === 0) return;

    const nowMin = now.getHours() * 60 + now.getMinutes();

    const current =
      periods.find(p =>
        nowMin >= timeToMinutes(p.start_time) &&
        nowMin < timeToMinutes(p.end_time)
      ) || null;

    const next =
      periods.find(p => timeToMinutes(p.start_time) > nowMin) || null;

    setCurrentPeriod(current);
    setNextPeriod(next);

    if (current) {
      const endMin = timeToMinutes(current.end_time);
      const rem = endMin - nowMin;
      const secs = 60 - now.getSeconds();

      setCountdown(`${Math.max(rem - 1, 0)}:${secs.toString().padStart(2, "0")}`);
    } else if (next) {
      const startMin = timeToMinutes(next.start_time);
      const rem = startMin - nowMin;
      const secs = 60 - now.getSeconds();

      setCountdown(`${Math.max(rem - 1, 0)}:${secs.toString().padStart(2, "0")}`);
    }

  }, [now, periods]);

  // جلب عند تغيير الحصة
  useEffect(() => {
    if (!currentPeriod) return;

    if (lastFetchedPeriod.current === currentPeriod.period_number) return;

    lastFetchedPeriod.current = currentPeriod.period_number;
    fetchLiveClasses(currentPeriod.period_number);

  }, [currentPeriod]);

  // ===== الدوال (مهم: فوق الاستدعاء) =====

  const fetchPeriods = async () => {
    const { data } = await supabase
      .from("class_periods")
      .select("*")
      .order("period_number");

    setPeriods(data || []);
  };

  const fetchLiveClasses = async (periodNum: number) => {
    if (cache.current[periodNum]) {
      setLiveClasses(cache.current[periodNum]);
      return;
    }

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
      sectionName: s.sections?.name || "",
      className: s.sections?.classes?.name || "",
      subjectName: s.subjects?.name || "",
      periodNumber: periodNum,
      zoomLink: s.teachers?.zoom_link || null,
    }));

    cache.current[periodNum] = classes;
    setLiveClasses(classes);
  };

  const nowStr = now.toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  const dayName = DAY_MAP[now.getDay()];
  const dateStr = `${now.getDate()} ${MONTH_MAP[now.getMonth()]} ${now.getFullYear()}`;

  return (
    <div className="min-h-screen bg-slate-900 text-white" dir="rtl">
      
      <div className="p-4 border-b border-white/10 flex justify-between">
        <div className="flex items-center gap-3">
          <School />
          <div>
            <div>مدرسة الرفعة النموذجية</div>
            <div className="text-xs text-indigo-300">لوحة المراقبة</div>
          </div>
        </div>

        <div className="text-center">
          <div>{nowStr}</div>
          <div className="text-xs text-indigo-300">{dayName} — {dateStr}</div>
        </div>
      </div>

      <div className="p-6 space-y-6">

        <div className="p-4 rounded-2xl bg-white/10">
          {currentPeriod ? (
            <div>
              الحصة {currentPeriod.period_number} جارية
              <div>{countdown}</div>
            </div>
          ) : (
            <div>لا توجد حصة حالياً</div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {liveClasses.map(cls => (
            <div key={cls.id} className="p-4 bg-white/10 rounded-2xl">
              <div>{cls.subjectName}</div>
              <div>{cls.teacherName}</div>
              <div>{cls.className}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
