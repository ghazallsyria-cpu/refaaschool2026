'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export default function SetupStudentsPage() {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => setLogs((prev) => [...prev, msg]);

  const setupStudents = async () => {
    setLoading(true);
    setLogs([]);
    addLog('بدء عملية تهيئة الطلاب...');

    const serviceRoleKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      addLog('خطأ: مفتاح SUPABASE_SERVICE_ROLE_KEY غير موجود في إعدادات البيئة.');
      setLoading(false);
      return;
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      serviceRoleKey
    );

    try {
      // 1. Fetch all students
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('national_id, name');

      if (studentsError) throw studentsError;
      addLog(`تم العثور على ${students?.length} طالب.`);

      // 2. Loop and create users
      for (const student of students || []) {
        const email = `${student.national_id}@alrefaa.edu`;
        addLog(`معالجة الطالب: ${student.name} (${student.national_id})...`);

        // Create auth user
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: email,
          password: '123456',
          email_confirm: true,
        });

        if (authError) {
          if (authError.message.includes('already registered')) {
            addLog(`- الحساب موجود مسبقاً.`);
          } else {
            addLog(`- خطأ في إنشاء الحساب: ${authError.message}`);
          }
          continue;
        }

        // Link to public.users
        const { error: userError } = await supabaseAdmin
          .from('users')
          .update({ id: authUser.user.id })
          .eq('email', email); // Assuming email is unique in users table

        if (userError) {
          addLog(`- خطأ في ربط الحساب: ${userError.message}`);
        } else {
          addLog(`- تم إنشاء الحساب وربطه بنجاح.`);
        }
      }

      addLog('اكتملت العملية بنجاح.');
    } catch (err: any) {
      addLog(`خطأ عام: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8" dir="rtl">
      <h1 className="text-2xl font-bold mb-4">تهيئة حسابات الطلاب</h1>
      <button
        onClick={setupStudents}
        disabled={loading}
        className="bg-indigo-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? 'جاري المعالجة...' : 'بدء تهيئة الطلاب'}
      </button>

      <div className="mt-6 bg-slate-900 text-slate-100 p-4 rounded h-96 overflow-y-auto font-mono text-sm">
        {logs.map((log, i) => (
          <div key={i}>{log}</div>
        ))}
      </div>
    </div>
  );
}
