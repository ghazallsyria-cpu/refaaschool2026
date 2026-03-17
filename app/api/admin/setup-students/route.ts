import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceRoleKey || !supabaseUrl) {
    return NextResponse.json({ error: 'إعدادات Supabase غير مكتملة على الخادم.' }, { status: 500 });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const results: string[] = [];

  try {
    // 1. Fetch all students with their names from users table
    results.push('جاري جلب الطلاب من قاعدة البيانات...');
    const { count, error: countError } = await supabaseAdmin
      .from('students')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      results.push(`خطأ في عد الطلاب: ${countError.message}`);
      throw countError;
    }
    results.push(`إجمالي عدد الطلاب الموجودين: ${count}`);

    const { data: students, error: studentsError } = await supabaseAdmin
      .from('students')
      .select('national_id, users(full_name)')
      .limit(50); // Limit to 50 for now to avoid timeout

    if (studentsError) {
      results.push(`خطأ في جلب الطلاب: ${studentsError.message}`);
      throw studentsError;
    }
    results.push(`سيتم معالجة أول ${students?.length || 0} طالب في هذه الدفعة.`);

    // 2. Loop and create users
    for (const student of (students as any) || []) {
      try {
        const nationalId = student.national_id?.toString().trim();
        results.push(`جاري معالجة الطالب: ${nationalId}`);
        const email = `${nationalId}@alrefaa.edu`;
        const studentName = student.users?.full_name || 'طالب غير معروف';

        // Check if user already exists in Auth using listUsers (since getUserByEmail is not available in this SDK version)
        results.push(`التحقق من وجود حساب مسبق لـ: ${email}`);
        
        let userId: string | undefined;
        
        try {
          const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
          if (listError) {
            results.push(`تنبيه أثناء التحقق من الحسابات: ${listError.message}`);
          } else {
            const existingUser = users.find(u => u.email === email);
            if (existingUser) {
              userId = existingUser.id;
              results.push(`الحساب موجود مسبقاً في Auth: ${userId}`);
            } else {
              results.push(`الحساب غير موجود، سيتم إنشاؤه.`);
            }
          }
        } catch (e: any) {
          results.push(`خطأ تقني أثناء محاولة جلب الحسابات: ${e.message || e.toString()}`);
        }

        if (!userId) {
          // Create auth user
          results.push(`جاري محاولة إنشاء حساب جديد لـ: ${email}`);
          const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: '123456',
            email_confirm: true,
            user_metadata: { full_name: studentName }
          });

          if (authError) {
            results.push(`فشل إنشاء الحساب في Auth لـ ${email}: ${authError.message}`);
            // If it's a database error checking email, it might mean the Auth service is struggling
            continue;
          }
          userId = authUser.user.id;
          results.push(`تم إنشاء الحساب بنجاح في Auth: ${userId}`);
        }

        // Link to public.users
        results.push(`جاري تحديث بيانات المستخدم في جدول users...`);
        const { error: userError } = await supabaseAdmin
          .from('users')
          .update({ id: userId })
          .eq('email', email);

        if (userError) {
          results.push(`خطأ في ربط الحساب لـ ${email}: ${userError.message}`);
        } else {
          results.push(`الطالب ${studentName}: تم إنشاء الحساب وربطه بنجاح.`);
        }
      } catch (innerErr: any) {
        results.push(`خطأ غير متوقع أثناء معالجة الطالب: ${innerErr.message || innerErr.toString()}`);
      }
    }

    return NextResponse.json({ message: 'اكتملت العملية.', logs: results });
  } catch (err: any) {
    console.error('Setup students error (full object):', err);
    
    // Attempt to extract a meaningful error message
    let errorMessage = 'حدث خطأ غير معروف أثناء التهيئة.';
    if (err instanceof Error) {
      errorMessage = err.message;
    } else if (typeof err === 'string') {
      errorMessage = err;
    } else if (err && typeof err === 'object') {
      errorMessage = err.message || err.error || JSON.stringify(err);
    }

    return NextResponse.json({ 
      error: errorMessage,
      details: err?.toString() || JSON.stringify(err),
      logs: results // Include logs here
    }, { status: 500 });
  }
}
