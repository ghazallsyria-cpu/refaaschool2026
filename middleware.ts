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

  // Use getSession() instead of getUser() for performance in middleware
  const { data: { session } } = await supabase.auth.getSession();
  const path = request.nextUrl.pathname;

  // Define public routes that do not require authentication
  const PUBLIC_ROUTES = [
    '/login',
    '/reset-password',
    '/live',
    '/_next',
    '/api/',
    'favicon.ico',
  ];

  const isPublicRoute = PUBLIC_ROUTES.some(route => path.startsWith(route) || path.includes(route));

  // If no session and trying to access a protected route, redirect to login
  if (!session && !isPublicRoute) {
    const redirectUrl = new URL('/login', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // If session exists and user is on login page, redirect to home (or dashboard)
  if (session && path.startsWith('/login')) {
    // In a real app, you might redirect based on user role here
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Exclude files in /public (like images, favicon) and /_next (Next.js internals)
    // Also exclude API routes unless specifically needed for middleware logic
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
