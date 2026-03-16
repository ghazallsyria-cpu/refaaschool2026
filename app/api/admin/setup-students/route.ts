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
    const logs: string[] = [];

    logs.push('بدء عملية تهيئة الطلاب...');

    const { data: students, error: studentsError } = await supabaseAdmin
      .from('students')
      .select('national_id, users(full_name)');

    if (studentsError) {
      throw studentsError;
    }

    logs.push(`تم العثور على ${students?.length || 0} طالب`);

    for (const student of students || []) {
      try {
        const nationalId = student.national_id;
        const email = `${nationalId}@alrefaa.edu`;
        const name = student?.users?.full_name || 'طالب';

        logs.push(`معالجة الطالب ${nationalId}`);

        const { data: authUser, error: authError } =
          await supabaseAdmin.auth.admin.createUser({
            email,
            password: '123456',
            email_confirm: true
          });

        if (authError) {
          logs.push(`فشل إنشاء الحساب ${email}: ${authError.message}`);
          continue;
        }

        const userId = authUser?.user?.id;

        if (!userId) {
          logs.push(`لم يتم الحصول على user id للحساب ${email}`);
          continue;
        }

        const { error: linkError } = await supabaseAdmin
          .from('users')
          .update({ id: userId })
          .eq('email', email);

        if (linkError) {
          logs.push(`فشل ربط الحساب ${email}: ${linkError.message}`);
        } else {
          logs.push(`تم إنشاء وربط الحساب للطالب ${name}`);
        }

      } catch (innerError: any) {
        logs.push(
          `خطأ أثناء معالجة الطالب ${
            student?.national_id
          }: ${innerError?.message || innerError}`
        );
      }
    }

    return NextResponse.json({
      message: 'اكتملت العملية',
      logs
    });

  } catch (error: any) {
    console.error('SETUP STUDENTS ERROR:', error);

    return NextResponse.json(
      {
        error: error?.message || 'حدث خطأ غير معروف',
        details: error?.toString()
      },
      { status: 500 }
    );
  }
}