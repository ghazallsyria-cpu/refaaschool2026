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
    // 1. Fetch all students
    const { data: students, error: studentsError } = await supabaseAdmin
      .from('students')
      .select('national_id, name');

    if (studentsError) throw studentsError;

    const results = [];

    // 2. Loop and create users
    for (const student of students || []) {
      const email = `${student.national_id}@alrefaa.edu`;

      // Create auth user
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: '123456',
        email_confirm: true,
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          results.push(`الطالب ${student.name}: الحساب موجود مسبقاً.`);
        } else {
          results.push(`الطالب ${student.name}: خطأ في إنشاء الحساب: ${authError.message}`);
        }
        continue;
      }

      // Link to public.users
      const { error: userError } = await supabaseAdmin
        .from('users')
        .update({ id: authUser.user.id })
        .eq('email', email);

      if (userError) {
        results.push(`الطالب ${student.name}: خطأ في ربط الحساب: ${userError.message}`);
      } else {
        results.push(`الطالب ${student.name}: تم إنشاء الحساب وربطه بنجاح.`);
      }
    }

    return NextResponse.json({ message: 'اكتملت العملية.', logs: results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
