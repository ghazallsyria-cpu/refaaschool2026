import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // خفيف وسريع — بدون ضرب السيرفر
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user;
  const role = user?.app_metadata?.role;
  const mustReset = user?.app_metadata?.must_reset_password;

  const path = request.nextUrl.pathname;

  // ===== Public routes =====
  if (
    !user &&
    !path.startsWith('/login') &&
    !path.startsWith('/reset-password') &&
    !path.startsWith('/live')
  ) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user) {
    // ===== Force password reset =====
    if (mustReset && !path.startsWith('/reset-password')) {
      return NextResponse.redirect(new URL('/reset-password', request.url));
    }

    // ===== Redirect authenticated user away from auth pages =====
    if (
      path.startsWith('/login') ||
      (path.startsWith('/reset-password') && !mustReset)
    ) {
      if (role === 'admin') return NextResponse.redirect(new URL('/dashboard', request.url));
      if (role === 'management') return NextResponse.redirect(new URL('/dashboard/management', request.url));
      if (role === 'teacher') return NextResponse.redirect(new URL('/dashboard/teacher', request.url));
      if (role === 'student') return NextResponse.redirect(new URL('/dashboard/student', request.url));
      if (role === 'parent') return NextResponse.redirect(new URL('/dashboard/parent', request.url));
    }

    // ===== Role حماية الداشبورد =====
    if (path.startsWith('/dashboard')) {
      if (role === 'admin' && path === '/dashboard') return response;
      if (role === 'management' && path.startsWith('/dashboard/management')) return response;
      if (role === 'teacher' && path.startsWith('/dashboard/teacher')) return response;
      if (role === 'student' && path.startsWith('/dashboard/student')) return response;
      if (role === 'parent' && path.startsWith('/dashboard/parent')) return response;

      // إعادة توجيه حسب الدور
      if (role === 'admin') return NextResponse.redirect(new URL('/dashboard', request.url));
      if (role === 'management') return NextResponse.redirect(new URL('/dashboard/management', request.url));
      if (role === 'teacher') return NextResponse.redirect(new URL('/dashboard/teacher', request.url));
      if (role === 'student') return NextResponse.redirect(new URL('/dashboard/student', request.url));
      if (role === 'parent') return NextResponse.redirect(new URL('/dashboard/parent', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
