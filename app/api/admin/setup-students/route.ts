export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceRoleKey || !supabaseUrl) {
    return NextResponse.json({ error: 'إعدادات Supabase غير مكتملة على الخادم.' }, { status: 500 });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const results: string[] = [];
    // 1. Fetch all students with their names from users table
    results.push('جاري جلب الطلاب...');
    const { data: students, error: studentsError } = await supabaseAdmin
      .from('students')
      .select('national_id, users(full_name)');

    if (studentsError) {
      results.push(`خطأ في جلب الطلاب: ${studentsError.message}`);
      throw studentsError;
    }
    results.push(`تم جلب ${students?.length || 0} طالب.`);

    // 2. Loop and create users
    for (const student of (students as any) || []) {
      try {
        results.push(`جاري معالجة الطالب: ${student.national_id}`);
        const email = `${student.national_id}@alrefaa.edu`;
        const studentName = student.users?.full_name || 'طالب غير معروف';

        // Create auth user
        results.push(`جاري إنشاء حساب لـ: ${email}`);
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: email,
          password: '123456',
          email_confirm: true,
        });

        if (authError) {
          results.push(`خطأ في إنشاء الحساب لـ ${email}: ${authError.message}`);
          continue;
        }
        
        results.push(`تم إنشاء الحساب: ${authUser.user.id}`);

        // Link to public.users
        results.push(`جاري ربط المستخدم ${authUser.user.id} بالبريد ${email}`);
        const { error: userError } = await supabaseAdmin
          .from('users')
          .update({ id: authUser.user.id })
          .eq('email', email);

        if (userError) {
          results.push(`خطأ في ربط الحساب لـ ${email}: ${userError.message}`);
        } else {
          results.push(`الطالب ${studentName}: تم إنشاء الحساب وربطه بنجاح.`);
        }
      } catch (innerErr: any) {
        results.push(`خطأ غير متوقع أثناء معالجة الطالب ${student.national_id}: ${innerErr.message || innerErr.toString()}`);
      }
    }

    return NextResponse.json({ message: 'اكتملت العملية.', logs: results });
  } catch (err: any) {
  console.error(err)

  return NextResponse.json({
    error: err?.message || 'حدث خطأ غير معروف',
    details: err?.toString() || JSON.stringify(err)
  }, { status: 500 })
}
}
    return NextResponse.json({ 
      error: errorMessage,
      details: err?.toString() || JSON.stringify(err)
    }, { status: 500 });
  }
}
