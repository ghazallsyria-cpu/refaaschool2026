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

        // Check if user already exists in Auth
        results.push(`التحقق من وجود حساب مسبق لـ: ${email}`);
        const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (listError) {
          results.push(`خطأ في التحقق من الحسابات الموجودة: ${listError.message}`);
          // If we can't list users, we might still try to create, but let's be careful
        }

        const existingUser = existingUsers?.users.find(u => u.email === email);
        let userId = existingUser?.id;

        if (!userId) {
          // Create auth user
          results.push(`جاري إنشاء حساب جديد لـ: ${email}`);
          const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: '123456',
            email_confirm: true,
          });

          if (authError) {
            results.push(`خطأ في إنشاء الحساب لـ ${email}: ${authError.message}`);
            continue;
          }
          userId = authUser.user.id;
          results.push(`تم إنشاء الحساب بنجاح: ${userId}`);
        } else {
          results.push(`الحساب موجود مسبقاً: ${userId}`);
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
