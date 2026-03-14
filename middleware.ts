import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // إنشاء نسخة أولية للرد
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // جلب الجلسة الحالية
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    console.error('Error fetching session:', sessionError);
  }

  const pathname = request.nextUrl.pathname;

  // إذا لم يكن هناك جلسة، وأنت لست في صفحة تسجيل الدخول
  if (!session && !pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // إذا هناك جلسة وأنت في صفحة تسجيل الدخول، أعد التوجيه حسب الدور
  if (session && pathname.startsWith('/login')) {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (error || !user) {
        console.error('Error querying users table:', JSON.stringify(error, null, 2));
        return NextResponse.redirect(new URL('/login', request.url));
      }

      const role = user.role;
      switch (role) {
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