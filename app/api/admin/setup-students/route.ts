// app/api/admin/setup-students/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge'; // ⚠️ هذا مهم

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const logs: string[] = [];
    logs.push('بدء عملية تهيئة الطلاب...');

    const { data: students, error } = await supabase
      .from('students')
      .select('national_id, users(full_name)');

    if (error) throw error;
    logs.push(`تم العثور على ${students?.length || 0} طالب`);

    for (const student of students || []) {
      try {
        const cleanId = String(student.national_id).replace(/[^a-zA-Z0-9]/g, '');
        const email = `${cleanId}@alrefaa.edu`;
        const name = student?.users?.[0]?.full_name || 'طالب';

        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email,
          password: '123456',
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
        logs.push(`خطأ أثناء معالجة الطالب ${student?.national_id}: ${innerErr?.message || innerErr}`);
      }
    }

    return NextResponse.json({ logs });
  } catch (err: any) {
    return NextResponse.json({
      error: err?.message || 'حدث خطأ غير معروف',
      details: err?.toString(),
    }, { status: 500 });
  }
}