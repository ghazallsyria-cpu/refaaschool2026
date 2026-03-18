import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password, full_name, national_id, phone, role, specialization, section_id, address, job_title, zoom_link } = await request.json();

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

    // Generate a default password based on national_id
    const generatedPassword = password || `${national_id}123`;
    const generatedEmail = email || `${national_id}@alrefaa.edu`;

    // Check if national_id already exists in teachers table
    if (role === 'teacher') {
      const { data: existingTeacher } = await supabaseAdmin
        .from('teachers')
        .select('id')
        .eq('national_id', national_id)
        .maybeSingle();

      if (existingTeacher) {
        return NextResponse.json({ error: 'الرقم المدني مسجل مسبقاً لمعلم آخر' }, { status: 400 });
      }
    }

    // 1. Create user in auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: generatedEmail,
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
        email: generatedEmail,
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
          zoom_link,
        });
      if (teacherError) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        throw teacherError;
      }
    } else if (role === 'parent') {
      const { error: parentError } = await supabaseAdmin
        .from('parents')
        .insert({
          id: userId,
          national_id,
          address,
          job_title,
        });
      if (parentError) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        throw parentError;
      }
    }

    return NextResponse.json({ user: authData.user, password: generatedPassword, message: 'User created successfully' });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
