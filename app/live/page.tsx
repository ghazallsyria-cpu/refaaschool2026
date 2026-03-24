"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";

export default function LivePage() {
  const [periods, setPeriods] = useState<any[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<any>(null);
  const [liveClasses, setLiveClasses] = useState<any[]>([]);

  const cache = useRef<any>({});
  const lastFetchedPeriod = useRef<number | null>(null);

  // ===== دوال =====

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

  // ===== effects =====

  useEffect(() => {
    const load = async () => {
      await fetchPeriods();
    };
    load();
  }, []);

  useEffect(() => {
    if (!currentPeriod) return;

    if (lastFetchedPeriod.current === currentPeriod.period_number) return;

    lastFetchedPeriod.current = currentPeriod.period_number;

    const load = async () => {
      await fetchLiveClasses(currentPeriod.period_number);
    };
    load();
  }, [currentPeriod]);

  return null;
}
