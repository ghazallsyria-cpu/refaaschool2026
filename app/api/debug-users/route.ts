import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Query auth.users directly using SQL via RPC if possible, or just standard select
    const { data, error } = await supabaseAdmin.from('auth.users').select('*').limit(5);
    
    // Actually, we can't query auth.users directly via the client unless we use rpc or if service role has access.
    // Service role DOES have access to auth.users if we specify the schema, but supabase-js defaults to public.
    // Let's try to get users via admin API
    const { data: users, error: adminError } = await supabaseAdmin.auth.admin.listUsers();

    return NextResponse.json({ 
      users: users,
      error: adminError
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
