export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Supabase environment variables are missing' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const logs: string[] = [];
    logs.push('بدء عملية تهيئة الطلاب...');

    // جلب جميع الطلاب مع بيانات المستخدم المرتبطة
    const { data: students, error } = await supabase
      .from('students')
      .select('national_id, users(full_name)');

    if (error) throw error;

    logs.push(`تم العثور على ${students?.length || 0} طالب`);

    for (const student of students || []) {
      try {
        const email = `${student.national_id}@alrefaa.edu`;
        const name = student?.users?.[0]?.full_name || 'طالب';

        // إنشاء حساب Supabase Auth لكل طالب
        const { data: authUser, error: authError } =
          await supabase.auth.admin.createUser({
            email,
            password: '123456', // كلمة السر الافتراضية
            email_confirm: true,
          });

        if (authError) {
          logs.push(`فشل إنشاء الحساب ${email}: ${authError.message}`);
          continue;
        }

        const userId = authUser?.user?.id;
        if (!userId) {
          logs.push(`لم يتم الحصول على user id لـ ${email}`);
          continue;
        }

        // ربط الحساب بجدول users
        const { error: linkError } = await supabase
          .from('users')
          .update({ id: userId })
          .eq('email', email);

        if (linkError) {
          logs.push(`فشل ربط الحساب ${email}: ${linkError.message}`);
        } else {
          logs.push(`تم إنشاء وربط الحساب للطالب ${name}`);
        }
      } catch (innerErr: any) {
        logs.push(
          `خطأ أثناء معالجة الطالب ${student?.national_id}: ${
            innerErr?.message || innerErr
          }`
        );
      }
    }

    return NextResponse.json({ logs });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err?.message || 'حدث خطأ غير معروف',
        details: err?.toString(),
      },
      { status: 500 }
    );
  }
}