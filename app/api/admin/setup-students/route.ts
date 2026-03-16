export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceRoleKey || !supabaseUrl) {
    return NextResponse.json(
      { error: 'إعدادات Supabase غير مكتملة على الخادم.' },
      { status: 500 }
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const results: string[] = [];

    // 1️⃣ جلب الطلاب
    results.push('جاري جلب الطلاب...');
    const { data: students, error: studentsError } = await supabaseAdmin
      .from('students')
      .select('national_id, users(full_name)');

    if (studentsError) {
      results.push(`خطأ في جلب الطلاب: ${studentsError.message}`);
      throw studentsError;
    }

    results.push(`تم جلب ${students?.length || 0} طالب.`);

    // 2️⃣ إنشاء الحسابات
    for (const student of (students as any) || []) {
      try {
        results.push(`جاري معالجة الطالب: ${student.national_id}`);

        const email = `${student.national_id}@alrefaa.edu`;
        const studentName = student?.users?.full_name || 'طالب غير معروف';

        // إنشاء مستخدم في Auth
        results.push(`جاري إنشاء حساب: ${email}`);

        const { data: authUser, error: authError } =
          await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: '123456',
            email_confirm: true,
          });

        if (authError) {
          results.push(`فشل إنشاء الحساب ${email}: ${authError.message}`);
          continue;
        }

        const userId = authUser?.user?.id;

        if (!userId) {
          results.push(`لم يتم الحصول على user id للحساب ${email}`);
          continue;
        }

        results.push(`تم إنشاء الحساب بنجاح: ${userId}`);

        // ربط الحساب بجدول users
        const { error: userError } = await supabaseAdmin
          .from('users')
          .update({ id: userId })
          .eq('email', email);

        if (userError) {
          results.push(`فشل ربط الحساب ${email}: ${userError.message}`);
        } else {
          results.push(`الطالب ${studentName}: تم إنشاء الحساب وربطه بنجاح.`);
        }

      } catch (innerErr: any) {
        results.push(
          `خطأ أثناء معالجة الطالب ${student?.national_id}: ${
            innerErr?.message || innerErr?.toString()
          }`
        );
      }
    }

    return NextResponse.json({
      message: 'اكتملت العملية.',
      logs: results,
    });

  } catch (err: any) {
    console.error('SETUP STUDENTS ERROR:', err);

    return NextResponse.json(
      {
        error: err?.message || 'حدث خطأ غير معروف',
        details: err?.toString() || JSON.stringify(err),
      },
      { status: 500 }
    );
  }
}