import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 500 });
    }

    // We need to use postgres connection to query auth schema directly, 
    // but supabaseAdmin with service_role can query auth schema if we specify it.
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: 'test_user_12345@example.com',
      password: 'password123',
      email_confirm: true
    });

    let deleteError = null;
    if (createData.user) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(createData.user.id);
      deleteError = error;
    }

    return NextResponse.json({ 
      createData,
      createError,
      deleteError
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
