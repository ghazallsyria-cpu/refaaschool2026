import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )

          response = NextResponse.next({ request })

          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const pathname = request.nextUrl.pathname

  // السماح بصفحات المصادقة
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/reset-password')
  ) {
    if (!session) return response
  }

  // إذا لم يكن المستخدم مسجل دخول
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // جلب بيانات المستخدم
  const { data: user, error } = await supabase
    .from('users')
    .select('role, must_reset_password')
    .eq('id', session.user.id)
    .single()

  if (error || !user) {
    console.error('Error fetching user:', error)
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // إجبار تغيير كلمة السر
  if (user.must_reset_password && pathname !== '/reset-password') {
    return NextResponse.redirect(new URL('/reset-password', request.url))
  }

  // منع الدخول لصفحة login إذا كان المستخدم مسجل
  if (session && pathname.startsWith('/login')) {

    if (user.role === 'admin')
      return NextResponse.redirect(new URL('/dashboard/admin', request.url))

    if (user.role === 'teacher')
      return NextResponse.redirect(new URL('/dashboard/teacher', request.url))

    if (user.role === 'student')
      return NextResponse.redirect(new URL('/dashboard/student', request.url))

    if (user.role === 'parent')
      return NextResponse.redirect(new URL('/dashboard/parent', request.url))

    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // إعادة التوجيه من الصفحة الرئيسية
  if (pathname === '/') {

    if (user.role === 'admin')
      return NextResponse.redirect(new URL('/dashboard/admin', request.url))

    if (user.role === 'teacher')
      return NextResponse.redirect(new URL('/dashboard/teacher', request.url))

    if (user.role === 'student')
      return NextResponse.redirect(new URL('/dashboard/student', request.url))

    if (user.role === 'parent')
      return NextResponse.redirect(new URL('/dashboard/parent', request.url))

    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}