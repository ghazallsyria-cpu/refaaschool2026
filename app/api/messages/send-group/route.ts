import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

// Service role client for inserting group messages
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    // التحقق من هوية المستخدم أولاً
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: (s) => s.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // التحقق أن المرسل معلم أو إدارة
    const { data: userData } = await adminSupabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || !['teacher', 'admin', 'management'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { sectionId, subject, content } = await req.json();

    if (!sectionId || !subject || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // إذا كان معلماً — تحقق أن الصف مسند إليه
    if (userData.role === 'teacher') {
      const { data: teacherSection } = await adminSupabase
        .from('teacher_sections')
        .select('id')
        .eq('teacher_id', user.id)
        .eq('section_id', sectionId)
        .single();

      if (!teacherSection) {
        return NextResponse.json({ error: 'لا تملك صلاحية المراسلة لهذا الصف' }, { status: 403 });
      }
    }

    // جلب طلاب الصف
    const { data: students, error: studentsError } = await adminSupabase
      .from('students')
      .select('id')
      .eq('section_id', sectionId);

    if (studentsError) throw studentsError;
    if (!students || students.length === 0) {
      return NextResponse.json({ error: 'لا يوجد طلاب في هذا الصف' }, { status: 400 });
    }

    // إدراج الرسائل
    const messagesToInsert = students.map(student => ({
      sender_id: user.id,   // ✅ من السيرفر وليس من الـ client
      receiver_id: student.id,
      section_id: sectionId,
      subject,
      content,
      is_read: false,
    }));

    const { error: insertError } = await adminSupabase
      .from('messages')
      .insert(messagesToInsert);

    if (insertError) throw insertError;

    // إرسال إشعارات
    await adminSupabase.from('notifications').insert(
      students.map(student => ({
        user_id: student.id,
        type: 'message',
        title: 'رسالة جماعية جديدة',
        content: `رسالة جماعية: ${subject}`,
        link: '/messages',
        is_read: false,
      }))
    );

    return NextResponse.json({ success: true, count: students.length });
  } catch (error: any) {
    console.error('Error in send-group API:', error);
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}
