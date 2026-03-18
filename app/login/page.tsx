'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { School, Lock, User } from 'lucide-react';

export default function LoginPage() {
  const [civilId, setCivilId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let authEmail = civilId;
      
      if (!civilId.includes('@')) {
        const { data: studentData } = await supabase
          .from('students')
          .select('id, users!inner(email)')
          .eq('national_id', civilId)
          .maybeSingle();
          
        if (studentData && studentData.users) {
          authEmail = (studentData.users as any).email;
        } else {
          const { data: teacherData } = await supabase
            .from('teachers')
            .select('id, users!inner(email)')
            .eq('national_id', civilId)
            .maybeSingle();
            
          if (teacherData && teacherData.users) {
            authEmail = (teacherData.users as any).email;
          } else {
            const { data: parentData } = await supabase
              .from('parents')
              .select('id, users!inner(email)')
              .eq('national_id', civilId)
              .maybeSingle();
              
            if (parentData && parentData.users) {
              authEmail = (parentData.users as any).email;
            } else {
              authEmail = `${civilId}@alrefaa.edu`;
            }
          }
        }
      }

      console.log('Attempting login with email:', authEmail);

      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password,
      });

      if (signInError) throw signInError;
      
      if (authData.user) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role, must_reset_password')
          .eq('id', authData.user.id)
          .maybeSingle();

        if (userError) {
          console.error('Database lookup error:', userError);
          throw new Error(`خطأ في الاتصال بقاعدة البيانات: ${userError.message}`);
        }

        if (!userData) {
          const uid = authData.user.id;
          console.error('User UID not found in public.users:', uid);
          throw new Error(`تم تسجيل الدخول، ولكن لم نجد بياناتك في جدول public.users. 
          تأكد من تشغيل استعلام SQL لتحديث المعرّف: ${uid}`);
        }

        if (userData.must_reset_password) {
          router.push('/reset-password');
          return;
        }
      }
      
      router.push('/');
      router.refresh();
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'حدث خطأ أثناء تسجيل الدخول. تأكد من البيانات وحاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role: 'admin' | 'teacher' | 'student') => {
    setLoading(true);
    setError(null);
    
    const demoUsers = {
      admin: { id: '123456789012', pass: 'admin123' },
      teacher: { id: '290123456789', pass: 'teacher123' },
      student: { id: '305123456789', pass: 'student123' }
    };

    const user = demoUsers[role];
    setCivilId(user.id);
    setPassword(user.pass);
    
    setTimeout(() => {
      const form = document.querySelector('form');
      if (form) form.requestSubmit();
    }, 100);
  };

  return (
    <div className="flex min-h-screen flex-1 flex-col justify-center px-6 py-12 lg:px-8 bg-slate-50" dir="rtl">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-indigo-600 shadow-lg">
            <School className="h-10 w-10 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-slate-900">
          مدرسة الرفعة النموذجية
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          تسجيل الدخول للنظام
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <form className="space-y-6 bg-white p-8 rounded-xl shadow-sm ring-1 ring-slate-200" onSubmit={handleLogin}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          {/* inputs unchanged */}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
            >
              {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
            </button>
          </div>
        </form>
      </div>

      {/* Premium Footer */}
      <div className="mt-12 flex justify-center">
        <div className="relative group">
          
          {/* Glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-xl blur opacity-40 group-hover:opacity-70 transition duration-500"></div>
          
          {/* Content */}
          <div className="relative px-8 py-5 bg-slate-900 rounded-xl text-center shadow-2xl">
            <p className="text-sm font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-pulse">
              برمجة وتنفيذ الأستاذ إيهاب جمال غزال
            </p>
            <p className="text-xs text-slate-400 mt-2 tracking-wide">
              © جميع الحقوق محفوظة
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}