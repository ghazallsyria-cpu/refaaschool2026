import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service role — يتجاوز RLS ويجلب البيانات بدون تسجيل دخول
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const today = new Date();
    const jsDay = today.getDay();
    const dbDay = jsDay === 0 ? 1 : jsDay === 1 ? 2 : jsDay === 2 ? 3 :
                  jsDay === 3 ? 4 : jsDay === 4 ? 5 : 0;

    const [{ data: periods }, { data: schedules }] = await Promise.all([
      supabase
        .from('class_periods')
        .select('id, period_number, start_time, end_time')
        .order('period_number'),
      supabase
        .from('schedules')
        .select(`
          id,
          period,
          day_of_week,
          teachers(zoom_link, users(full_name)),
          sections(name, classes(name)),
          subjects(name)
        `)
        .eq('day_of_week', dbDay)
    ]);

    return NextResponse.json({
      periods: periods || [],
      schedules: schedules || [],
    });

  } catch (error: any) {
    console.error('Live API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
