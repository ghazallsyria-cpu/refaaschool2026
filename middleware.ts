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

  if (!session && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (session && request.nextUrl.pathname.startsWith('/login')) {
    console.log('Login successful, checking user role for ID:', session.user.id);
    const { data: user, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (error) {
      console.error('Error querying users table (details):', JSON.stringify(error, null, 2));
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    if (!user) {
      console.error('User found in Auth but not in public.users table for ID:', session.user.id);
      return NextResponse.redirect(new URL('/login', request.url));
    }

    console.log('User role found:', user.role);
    const role = user.role;
    
    if (role === 'admin') return NextResponse.redirect(new URL('/dashboard/admin', request.url));
    if (role === 'teacher') return NextResponse.redirect(new URL('/dashboard/teacher', request.url));
    if (role === 'student') return NextResponse.redirect(new URL('/dashboard/student', request.url));
    if (role === 'parent') return NextResponse.redirect(new URL('/dashboard/parent', request.url));
    
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
