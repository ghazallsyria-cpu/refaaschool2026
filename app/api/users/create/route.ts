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

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authCheckError } = await supabaseAdmin.auth.getUser(token);
    
    if (authCheckError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single();
    if (userData?.role !== 'admin' && userData?.role !== 'management') {
      return NextResponse.json({ error: 'Forbidden: Only admins can create users' }, { status: 403 });
    }

    // Generate a random password if not provided
    const generatedPassword = password || Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);

    // 1. Create user in auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: generatedPassword,
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
        must_reset_password: true,
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

    return NextResponse.json({ user: authData.user, password: generatedPassword, message: 'User created successfully' });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
