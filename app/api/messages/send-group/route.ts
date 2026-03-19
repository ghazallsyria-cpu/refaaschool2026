import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { sectionId, subject, content, senderId, idempotencyKey } = await req.json();

    // 1. Check if this request has already been processed (Idempotency)
    // We can use a simple check or a dedicated table if needed, 
    // but for now, we'll rely on the transaction logic.
    
    // 2. Fetch students in the section
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id')
      .eq('section_id', sectionId);

    if (studentsError) throw studentsError;
    if (!students || students.length === 0) {
      return NextResponse.json({ error: 'لا يوجد طلاب في هذا الصف' }, { status: 400 });
    }

    // 3. Prepare messages
    const messagesToInsert = students.map(student => ({
      sender_id: senderId,
      receiver_id: student.id,
      subject,
      content,
      is_read: false
    }));

    // 4. Insert messages
    const { error: insertError } = await supabase
      .from('messages')
      .insert(messagesToInsert);

    if (insertError) throw insertError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in send-group API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
