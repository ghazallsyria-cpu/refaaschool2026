import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Re-insert into public.users
    const { error: insertUsersError } = await supabaseAdmin
      .from('users')
      .upsert([
        { id: '16ddf122-6cef-421f-90e7-aea976b7db49', email: '310112401793@alrefaa.edu', full_name: 'وليد بدر مناور فالح العنزي', role: 'student' },
        { id: 'c259cd07-7dec-4f4c-8d38-421b3c3a9aa9', email: '310121202235@alrefaa.edu', full_name: 'يوسف حمود منيف المطيري', role: 'student' }
      ]);

    // Re-insert into public.students
    const { error: insertStudentsError } = await supabaseAdmin
      .from('students')
      .upsert([
        { id: '16ddf122-6cef-421f-90e7-aea976b7db49', national_id: '310112401793', section_id: '4fe9fa4c-60cd-40a0-a58e-fc5814485090' },
        { id: 'c259cd07-7dec-4f4c-8d38-421b3c3a9aa9', national_id: '310121202235', section_id: '4fe9fa4c-60cd-40a0-a58e-fc5814485090' }
      ]);

    return NextResponse.json({ 
      insertUsersError: insertUsersError?.message,
      insertStudentsError: insertStudentsError?.message
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
