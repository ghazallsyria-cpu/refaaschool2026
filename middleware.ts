import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// قائمة المسارات التي تتطلب جلسة
const protectedPaths = ['/dashboard', '/profile', '/settings'];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // تجاهل الملفات الثابتة والصور والfavicon
  if (
    pathname.startsWith('/_next/') ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp)$/) ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  // فقط نفّذ Supabase إذا المسار يتطلب جلسة
  if (protectedPaths.some((path) => pathname.startsWith(path)) || pathname.startsWith('/login')) {
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

      // إعادة التوجيه إذا لم يكن هناك جلسة
      if (!session && !pathname.startsWith('/login')) {
        return NextResponse.redirect(new URL('/login', request.url));
      }

      // إعادة التوجيه حسب الدور إذا هناك جلسة وأنت في صفحة تسجيل الدخول
      if (session && pathname.startsWith('/login')) {
        const { data: user, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (error || !user) {
          console.error('Error querying users table:', error);
          return NextResponse.redirect(new URL('/login', request.url));
        }

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