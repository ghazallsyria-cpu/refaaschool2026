'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const isLoginPage = pathname === '/login';

  useEffect(() => {
    const checkAuth = async () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      // If not configured, don't block the UI, let them see the dashboard warning
      if (!url || !key || url === 'YOUR_SUPABASE_URL' || key === 'YOUR_SUPABASE_ANON_KEY') {
        setIsChecking(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        // Temporarily disabled strict auth redirect for demo purposes
        // if (!session && !isLoginPage) {
        //   router.push('/login');
        // } else if (session && isLoginPage) {
        //   router.push('/');
        // }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Temporarily disabled strict auth redirect for demo purposes
      // if (event === 'SIGNED_OUT' && !isLoginPage) {
      //   router.push('/login');
      // } else if (event === 'SIGNED_IN' && isLoginPage) {
      //   router.push('/');
      // }
    });

    return () => subscription.unsubscribe();
  }, [isLoginPage, router]);

  if (isChecking) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  if (isLoginPage) {
    return <main className="flex-1 h-full">{children}</main>;
  }

  return (
    <div className="flex h-full">
      <div className="print:hidden">
        <Sidebar />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden print:overflow-visible">
        <div className="print:hidden">
          <Header />
        </div>
        <main className="flex-1 overflow-y-auto p-6 print:p-0 print:overflow-visible">
          {children}
        </main>
      </div>
    </div>
  );
}
