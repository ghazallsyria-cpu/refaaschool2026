import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const path = request.nextUrl.pathname;

  // Public routes
  if (!session && !path.startsWith('/login') && !path.startsWith('/reset-password')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (session) {
    const { data: user } = await supabase
      .from('users')
      .select('role, must_reset_password')
      .eq('id', session.user.id)
      .single();

    // Redirect to login if user not found
    if (!user) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Force password reset
    if (user.must_reset_password && !path.startsWith('/reset-password')) {
      return NextResponse.redirect(new URL('/reset-password', request.url));
    }

    // Redirect authenticated users away from login/reset-password
    if (path.startsWith('/login') || (path.startsWith('/reset-password') && !user.must_reset_password)) {
      if (user.role === 'admin') return NextResponse.redirect(new URL('/dashboard', request.url));
      if (user.role === 'teacher') return NextResponse.redirect(new URL('/dashboard/teacher', request.url));
      if (user.role === 'student') return NextResponse.redirect(new URL('/dashboard/student', request.url));
      if (user.role === 'parent') return NextResponse.redirect(new URL('/dashboard/parent', request.url));
    }

    // Role-based access control
    if (path.startsWith('/dashboard')) {
      if (user.role === 'admin' && path === '/dashboard') return response;
      if (user.role === 'teacher' && path.startsWith('/dashboard/teacher')) return response;
      if (user.role === 'student' && path.startsWith('/dashboard/student')) return response;
      if (user.role === 'parent' && path.startsWith('/dashboard/parent')) return response;
      
      // Redirect unauthorized dashboard access
      if (user.role === 'admin') return NextResponse.redirect(new URL('/dashboard', request.url));
      if (user.role === 'teacher') return NextResponse.redirect(new URL('/dashboard/teacher', request.url));
      if (user.role === 'student') return NextResponse.redirect(new URL('/dashboard/student', request.url));
      if (user.role === 'parent') return NextResponse.redirect(new URL('/dashboard/parent', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
