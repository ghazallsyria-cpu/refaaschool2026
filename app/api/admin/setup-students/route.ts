export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Supabase environment variables are missing' },
      { status: 500 }
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    const logs: string[] = []

    logs.push('بدء عملية تهيئة الطلاب')

    const { data: students, error } = await supabase
      .from('students')
      .select('national_id')

    if (error) throw error

    for (const student of students || []) {
      const email = `${student.national_id}@alrefaa.edu`

      const { data: authUser, error: authError } =
        await supabase.auth.admin.createUser({
          email,
          password: '123456',
          email_confirm: true
        })

      if (authError) {
        logs.push(`فشل إنشاء ${email}: ${authError.message}`)
        continue
      }

      const userId = authUser?.user?.id

      if (!userId) {
        logs.push(`لم يتم الحصول على user id لـ ${email}`)
        continue
      }

      await supabase
        .from('users')
        .update({ id: userId })
        .eq('email', email)

      logs.push(`تم إنشاء الحساب ${email}`)
    }

    return NextResponse.json({ logs })

  } catch (err: any) {
    return NextResponse.json(
      {
        error: err?.message || 'Unknown error',
        details: err?.toString()
      },
      { status: 500 }
    )
  }
}