'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    console.log('Attempting login for:', email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Login error:', error);
      setError(error.message);
    } else {
      console.log('Login successful, session:', data.session);
      router.push('/dashboard');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-stone-100">
      <form onSubmit={handleLogin} className="p-8 bg-white rounded-xl shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">تسجيل الدخول</h1>
        {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
        <input
          type="email"
          placeholder="البريد الإلكتروني"
          className="w-full p-2 mb-4 border rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="كلمة المرور"
          className="w-full p-2 mb-6 border rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" className="w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          دخول
        </button>
      </form>
    </div>
  );
}
