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

    // 2. Fetch ALL auth users once to avoid repeated calls in the loop
    results.push('جاري جلب قائمة الحسابات الموجودة مسبقاً من Auth...');
    let allAuthUsers: any[] = [];
    try {
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        perPage: 1000 // Get as many as possible
      });
      if (listError) {
        results.push(`تنبيه: فشل جلب قائمة الحسابات (${listError.message}). سيتم المحاولة بشكل فردي.`);
      } else {
        allAuthUsers = users;
        results.push(`تم العثور على ${allAuthUsers.length} حساب في Auth.`);
      }
    } catch (e: any) {
      results.push(`خطأ تقني أثناء جلب قائمة الحسابات: ${e.message}`);
    }

    // 3. Loop and create users
    for (const student of (students as any) || []) {
      try {
        const nationalId = student.national_id?.toString().trim();
        const email = `${nationalId}@alrefaa.edu`;
        const studentName = student.users?.full_name || 'طالب غير معروف';
        
        results.push(`--- معالجة: ${studentName} (${nationalId}) ---`);

        // Check if user already exists in our pre-fetched list
        const existingUser = allAuthUsers.find(u => u.email === email);
        let userId = existingUser?.id;

        if (!userId) {
          // If not in list, try a direct check just in case (or if list failed)
          if (allAuthUsers.length === 0) {
            try {
              const { data: { users }, error: singleCheckError } = await supabaseAdmin.auth.admin.listUsers();
              const found = users.find(u => u.email === email);
              if (found) userId = found.id;
            } catch (e) {}
          }
        }

        if (!userId) {
          // FIX FOR TRIGGER ERROR:
          // 1. Find existing public.users row
          const { data: existingPublicUser } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('email', email)
            .maybeSingle();

          const oldId = existingPublicUser?.id;

          // 2. If exists, temporarily change its email to avoid unique constraint violation in trigger
          if (oldId) {
            await supabaseAdmin
              .from('users')
              .update({ email: `temp_${Date.now()}_${email}` })
              .eq('id', oldId);
          }

          // 3. Create auth user
          results.push(`جاري إنشاء حساب جديد...`);
          const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: '123456',
            email_confirm: true,
            user_metadata: { full_name: studentName }
          });

          if (authError) {
            results.push(`❌ فشل إنشاء الحساب: ${authError.message}`);
            // Revert the email change if creation failed
            if (oldId) {
              await supabaseAdmin.from('users').update({ email }).eq('id', oldId);
            }
            continue;
          }
          userId = authUser.user.id;
          results.push(`✅ تم إنشاء الحساب: ${userId}`);
          
          // 4. If we had an old user, update the students table to point to the new ID, then delete old user
          if (oldId && oldId !== userId) {
            const { error: updateStudentError } = await supabaseAdmin
              .from('students')
              .update({ id: userId })
              .eq('id', oldId);

            if (updateStudentError) {
              results.push(`⚠️ خطأ في تحديث معرف الطالب: ${updateStudentError.message}`);
            } else {
              // Now safe to delete the old user row
              await supabaseAdmin.from('users').delete().eq('id', oldId);
              results.push(`✨ تم تحديث المعرفات بنجاح.`);
            }
          }
          
          // Add a small delay to prevent hitting Auth rate limits/DB locks
          await new Promise(resolve => setTimeout(resolve, 300));
        } else {
          results.push(`ℹ️ الحساب موجود مسبقاً: ${userId}`);
          // Link to public.users just in case
          const { error: userError } = await supabaseAdmin
            .from('users')
            .update({ id: userId })
            .eq('email', email);

          if (userError) {
            results.push(`⚠️ خطأ في ربط الحساب بجدول users: ${userError.message}`);
          } else {
            results.push(`✨ تم الربط بنجاح.`);
          }
        }
      } catch (innerErr: any) {
        results.push(`💥 خطأ غير متوقع: ${innerErr.message || innerErr.toString()}`);
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
