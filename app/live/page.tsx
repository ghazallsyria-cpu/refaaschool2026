"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";

export default function LivePage() {
  const [periods, setPeriods] = useState<any[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<any>(null);
  const [liveClasses, setLiveClasses] = useState<any[]>([]);

  const cache = useRef<any>({});
  const lastFetchedPeriod = useRef<number | null>(null);

  // ===== الدوال =====

  async function fetchPeriods() {
    const { data } = await supabase
      .from("class_periods")
      .select("*")
      .order("period_number");

    setPeriods(data || []);
  }

  async function fetchLiveClasses(periodNum: number) {
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
        teachers(users(full_name), zoom_link),
        sections(name, classes(name)),
        subjects(name)
      `)
      .eq("day_of_week", dbDay)
      .eq("period", periodNum);

    const classes = (data || []).map((s: any) => ({
      id: s.id,
      teacherName: s.teachers?.users?.full_name || "",
      sectionName: s.sections?.name || "",
      className: s.sections?.classes?.name || "",
      subjectName: s.subjects?.name || "",
      periodNumber: periodNum,
      zoomLink: s.teachers?.zoom_link || null,
    }));

    cache.current[periodNum] = classes;
    setLiveClasses(classes);
  }

  // ===== تحديد الحصة الحالية =====

  function calculateCurrentPeriod() {
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();

    return periods.find((p) => {
      const start = p.start_minutes;
      const end = p.end_minutes;
      return minutes >= start && minutes < end;
    });
  }

  // ===== effects =====

  useEffect(() => {
    fetchPeriods();
  }, []);

  useEffect(() => {
    if (periods.length === 0) return;

    const interval = setInterval(() => {
      const current = calculateCurrentPeriod();

      if (!current) return;

      if (
        lastFetchedPeriod.current === current.period_number
      ) return;

      lastFetchedPeriod.current = current.period_number;
      setCurrentPeriod(current);

      fetchLiveClasses(current.period_number);
    }, 30000); // تحديث كل 30 ثانية

    return () => clearInterval(interval);
  }, [periods]);

  // ===== UI =====

  return (
    <div style={{ padding: 20 }}>
      <h1>Live Classes</h1>

      {!currentPeriod && <p>لا توجد حصة حالياً</p>}

      {liveClasses.map((cls) => (
        <div key={cls.id} style={{ marginBottom: 10 }}>
          <div><strong>{cls.subjectName}</strong></div>
          <div>{cls.teacherName}</div>
          <div>{cls.sectionName}</div>
          <div>{cls.className}</div>

          {cls.zoomLink && (
            <a href={cls.zoomLink} target="_blank">
              دخول
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
