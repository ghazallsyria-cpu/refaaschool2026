'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { School, AlertTriangle } from 'lucide-react';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [platformClosed, setPlatformClosed] = useState(false);
  const [closeMessage, setCloseMessage] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);
  
  const isLoginPage = pathname === '/login';
  const isResetPasswordPage = pathname === '/reset-password';
  const isPublicPage = isLoginPage || isResetPasswordPage;

  useEffect(() => {
    const checkAuth = async () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!url || !key || url === 'YOUR_SUPABASE_URL' || key === 'YOUR_SUPABASE_ANON_KEY') {
        setIsChecking(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session && !isPublicPage) {
          router.push('/login');
          return;
        } else if (session && isLoginPage) {
          router.push('/');
          return;
        }

        let role = null;
        if (session?.user) {
          const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single();
          
          role = userData?.role;
          setUserRole(role);
        }

        // Role-based routing
        if (session && !isPublicPage) {
          if (role === 'student' && !pathname.startsWith('/dashboard/student')) {
            router.push('/dashboard/student');
          } else if (role === 'teacher' && !pathname.startsWith('/dashboard/teacher')) {
            router.push('/dashboard/teacher');
          } else if (role === 'parent' && !pathname.startsWith('/dashboard/parent')) {
            router.push('/dashboard/parent');
          } else if ((role === 'admin' || role === 'management') && pathname.startsWith('/dashboard/')) {
            // Admins don't need to be in /dashboard/admin, they use the root pages
            if (pathname === '/dashboard/admin') {
              router.push('/');
            }
          }
        }

        const isAdminByEmail = session?.user?.email === 'ghazallsyria@gmail.com';

        // Check platform settings
        try {
          const { data: settings, error: settingsError } = await supabase
            .from('platform_settings')
            .select('*')
            .limit(1)
            .maybeSingle();

          if (!settingsError && settings) {
            let isOpen = settings.is_open;
            const now = new Date();
            
            if (settings.open_date && new Date(settings.open_date) > now) {
              isOpen = false;
            }
            if (settings.close_date && new Date(settings.close_date) < now) {
              isOpen = false;
            }

            if (!isOpen && role !== 'admin' && role !== 'management' && !isAdminByEmail) {
              setPlatformClosed(true);
              setCloseMessage(settings.message || 'المنصة مغلقة حاليا للصيانة');
            }
          }
        } catch (settingsErr) {
          console.warn('Platform settings table might be missing:', settingsErr);
          // If table is missing, assume platform is open
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' && !isPublicPage) {
        router.push('/login');
      } else if (event === 'SIGNED_IN' && isLoginPage) {
        router.push('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [pathname, router, isPublicPage, isLoginPage]);

  if (isChecking) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  if (platformClosed && !isPublicPage) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 text-center" dir="rtl">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-600 shadow-xl mb-8">
          <School className="h-12 w-12 text-white" />
        </div>
        <div className="bg-white p-8 rounded-2xl shadow-sm ring-1 ring-slate-200 max-w-md w-full">
          <div className="flex justify-center mb-6">
            <div className="bg-amber-100 p-3 rounded-full">
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-4">المنصة مغلقة</h1>
          <p className="text-slate-600 mb-8 leading-relaxed">
            {closeMessage}
          </p>
          <button
            onClick={() => {
              supabase.auth.signOut();
              router.push('/login');
            }}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            العودة لتسجيل الدخول
          </button>
        </div>
      </div>
    );
  }

  if (isPublicPage) {
    return <main className="flex-1 h-full">{children}</main>;
  }

  // If user is not admin/management, don't show the admin sidebar
  const showAdminSidebar = userRole === 'admin' || userRole === 'management';

  return (
    <div className="flex h-full">
      {/* Mobile sidebar backdrop */}
      {isSidebarOpen && showAdminSidebar && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/80 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {showAdminSidebar && (
        <div className={`fixed inset-y-0 right-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 print:hidden ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <Sidebar onClose={() => setIsSidebarOpen(false)} />
        </div>
      )}
      
      <div className="flex flex-1 flex-col overflow-hidden print:overflow-visible w-full">
        <div className="print:hidden">
          <Header onMenuClick={() => setIsSidebarOpen(true)} showMenuButton={showAdminSidebar} />
        </div>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 print:p-0 print:overflow-visible">
          {children}
        </main>
      </div>
    </div>
  );
}
