'use client';

import { Bell, Search, User, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export function Header() {
  const [user, setUser] = useState<any>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
      <div className="flex flex-1 items-center">
        <div className="w-full max-w-md relative">
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
          </div>
          <input
            type="search"
            name="search"
            id="search"
            className="block w-full rounded-md border-0 py-1.5 pr-10 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            placeholder="بحث في النظام..."
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="relative rounded-full bg-white p-1 text-slate-400 hover:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <span className="absolute -inset-1.5" />
          <span className="sr-only">عرض الإشعارات</span>
          <Bell className="h-6 w-6" aria-hidden="true" />
          <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>

        {/* Profile dropdown */}
        <div className="relative ml-3">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium text-slate-700">{user ? user.email : 'تسجيل الدخول'}</span>
              <span className="text-xs text-slate-500">{user ? 'مستخدم' : 'زائر'}</span>
            </div>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="relative flex rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <span className="absolute -inset-1.5" />
              <span className="sr-only">فتح قائمة المستخدم</span>
              <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                <User className="h-5 w-5 text-slate-500" />
              </div>
            </button>
          </div>
          
          {isDropdownOpen && user && (
            <div className="absolute left-0 z-10 mt-2 w-48 origin-top-left rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <button
                onClick={handleSignOut}
                className="flex w-full items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
              >
                <LogOut className="ml-2 h-4 w-4" />
                تسجيل الخروج
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
