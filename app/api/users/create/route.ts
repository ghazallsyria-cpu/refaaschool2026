import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password, full_name, national_id, phone, role, specialization, section_id } = await request.json();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 1. Create user in auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Failed to create user');

    const userId = authData.user.id;

    // 2. Insert into users table
    const { error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        full_name,
        email,
        phone,
        role,
      });

    if (userError) {
      // Rollback auth user creation
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw userError;
    }

    // 3. Insert into specific role table
    if (role === 'student') {
      const { error: studentError } = await supabaseAdmin
        .from('students')
        .insert({
          id: userId,
          national_id,
          section_id: section_id || null,
        });
      if (studentError) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        throw studentError;
      }
    } else if (role === 'teacher') {
      const { error: teacherError } = await supabaseAdmin
        .from('teachers')
        .insert({
          id: userId,
          national_id,
          specialization,
        });
      if (teacherError) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        throw teacherError;
      }
    }

    return NextResponse.json({ user: authData.user, message: 'User created successfully' });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
