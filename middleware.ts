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

  console.log('Middleware - Session:', session ? 'Active' : 'None');

  if (!session && !request.nextUrl.pathname.startsWith('/login')) {
    console.log('Middleware - Redirecting to login');
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (session && request.nextUrl.pathname.startsWith('/login')) {
  if (session && request.nextUrl.pathname.startsWith('/login')) {
    // توجيه بسيط للتأكد من أن المشكلة ليست في استعلام الدور
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
