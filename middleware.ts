import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// المسارات التي تتطلب جلسة للمستخدم
const protectedPaths = ['/dashboard', '/profile', '/settings'];

// المسارات الخاصة بالصفحة الرئيسية أو صفحة الدخول
const loginPaths = ['/', '/login'];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // تجاهل الملفات الثابتة والصور وfavicon
  if (
    pathname.startsWith('/_next/') ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp)$/) ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  // إنشاء Supabase client فقط للصفحات التي تحتاج جلسة أو login
  if (protectedPaths.some((path) => pathname.startsWith(path)) || loginPaths.includes(pathname)) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookiesToSet: { name: string; value: string; options?: any }[]) => {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // إذا الصفحة login أو الصفحة الرئيسية
      if (loginPaths.includes(pathname)) {
        if (session) {
          // استعلام الدور من جدول users
          const { data: user, error } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single();

          if (!error && user) {
            switch (user.role) {
              case 'admin':
                return NextResponse.redirect(new URL('/dashboard/admin', request.url));
              case 'teacher':
                return NextResponse.redirect(new URL('/dashboard/teacher', request.url));
              case 'student':
                return NextResponse.redirect(new URL('/dashboard/student', request.url));
              case 'parent':
                return NextResponse.redirect(new URL('/dashboard/parent', request.url));
              default:
                return NextResponse.redirect(new URL('/dashboard', request.url));
            }
          } else {
            console.error('Error fetching user role:', error);
          }
        }
        // إذا لا توجد جلسة، السماح بعرض صفحة login
        return response;
      }

      // إذا الصفحة محمية (dashboard/profile/settings)
      if (protectedPaths.some((path) => pathname.startsWith(path))) {
        if (!session) {
          return NextResponse.redirect(new URL('/login', request.url));
        }
      }
    } catch (err) {
      console.error('Unexpected error in middleware:', err);
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};