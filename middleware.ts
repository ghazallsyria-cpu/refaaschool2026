import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// فقط الصفحات المحمية تحتاج جلسة
const protectedPaths = ['/dashboard', '/profile', '/settings'];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // تجاهل الملفات الثابتة والوسائط
  if (
    pathname.startsWith('/_next/') ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp)$/) ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  // التحقق من الجلسة فقط للصفحات المحمية
  if (protectedPaths.some((path) => pathname.startsWith(path))) {
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

      // إذا لا توجد جلسة للصفحات المحمية، إعادة التوجيه إلى login
      if (!session) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    } catch (err) {
      console.error('Unexpected error in middleware:', err);
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // السماح لأي صفحة أخرى بالتحميل كما هي، بما فيها /login و /
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};