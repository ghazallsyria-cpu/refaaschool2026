import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: 'Supabase environment variables are missing' });
  }

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
        logs.push(
          `خطأ أثناء معالجة الطالب ${student?.national_id}: ${
            innerErr?.message || innerErr
          }`
        );
      }
    }

    return res.status(200).json({ logs });
  } catch (err: any) {
    return res.status(500).json({
      error: err?.message || 'حدث خطأ غير معروف',
      details: err?.toString(),
    });
  }
}