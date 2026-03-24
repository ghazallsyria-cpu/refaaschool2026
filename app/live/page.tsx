"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { School } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

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
    <div className="min-h-screen bg-slate-900 text-white p-6" dir="rtl">

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <School />
          <span className="font-bold">مدرسة الرفعة</span>
        </div>

        <div className="text-sm opacity-80">
          {now.toLocaleTimeString("ar")}
        </div>
      </div>

      {/* Status Card */}
      <Card className="mb-6">
        <CardContent className="p-6 text-center">

          {currentPeriod && (
            <>
              <Badge className="mb-2">
                الحصة {currentPeriod.period_number}
              </Badge>

              <div className="text-lg font-bold">
                {currentPeriod.start_time} → {currentPeriod.end_time}
              </div>

              <Progress value={progress * 100} className="mt-4" />
            </>
          )}

          {!currentPeriod && isBreak && (
            <>
              <Badge variant="secondary" className="mb-2">
                استراحة
              </Badge>
            </>
          )}

          {!currentPeriod && !isBreak && (
            <>
              <Badge variant="destructive" className="mb-2">
                انتهى الدوام
              </Badge>
            </>
          )}

        </CardContent>
      </Card>

      {/* Classes */}
      {currentPeriod && (
        <div className="grid md:grid-cols-3 gap-4">
          {classes.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4 space-y-1">
                <div className="font-bold">{c.subjectName}</div>
                <div className="text-sm opacity-70">
                  {c.teacherName}
                </div>
                <div className="text-sm opacity-70">
                  {c.className}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && (
        <div className="mt-4 text-red-400 text-sm">
          {error}
        </div>
      )}

    </div>
  );
}
