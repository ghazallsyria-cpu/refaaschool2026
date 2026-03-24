"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Clock, BookOpen, Users, GraduationCap, School } from "lucide-react";

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
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);

  const cache = useRef<Record<number, LiveClass[]>>({});
  const lastFetched = useRef<number | null>(null);

  // ===== الدوال =====

  const fetchPeriods = useCallback(async () => {
    const { data } = await supabase
      .from("class_periods")
      .select("*")
      .order("period_number");

    setPeriods(data || []);
  }, []);

  const fetchLiveClasses = useCallback(async (periodNum: number) => {
    if (cache.current[periodNum]) {
      setLiveClasses(cache.current[periodNum]);
      return;
    }

    const jsDay = new Date().getDay();
    const dbDay =
      jsDay === 0 ? 1 :
      jsDay === 1 ? 2 :
      jsDay === 2 ? 3 :
      jsDay === 3 ? 4 :
      jsDay === 4 ? 5 : 0;

    const { data } = await supabase
      .from("schedules")
      .select(`
        id,
        teachers(users(full_name)),
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
    }));

    cache.current[periodNum] = classes;
    setLiveClasses(classes);
  }, []);

  const calculateCurrentPeriod = useCallback(() => {
    if (periods.length === 0) return;

    const nowMin = now.getHours() * 60 + now.getMinutes();

    const current =
      periods.find(p =>
        nowMin >= timeToMinutes(p.start_time) &&
        nowMin < timeToMinutes(p.end_time)
      ) || null;

    setCurrentPeriod(current);

    if (current && lastFetched.current !== current.period_number) {
      lastFetched.current = current.period_number;
      fetchLiveClasses(current.period_number);
    }

    if (!current) setLiveClasses([]);
  }, [now, periods, fetchLiveClasses]);

  // ===== Effects =====

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  useEffect(() => {
    calculateCurrentPeriod();
  }, [calculateCurrentPeriod]);

  // ===== UI =====

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6" dir="rtl">

      <div className="flex justify-between mb-6">
        <div className="flex gap-2 items-center">
          <School />
          <span>مدرسة الرفعة</span>
        </div>
        <div>{now.toLocaleTimeString()}</div>
      </div>

      <div className="mb-6 p-4 bg-white/10 rounded-xl">
        {currentPeriod
          ? `الحصة ${currentPeriod.period_number} جارية`
          : "لا توجد حصة الآن"}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {liveClasses.map(c => (
          <div key={c.id} className="p-4 bg-white/10 rounded-xl">
            <div className="font-bold">{c.subjectName}</div>
            <div className="text-sm">{c.teacherName}</div>
            <div className="text-sm">{c.className}</div>
          </div>
        ))}
      </div>

    </div>
  );
}
