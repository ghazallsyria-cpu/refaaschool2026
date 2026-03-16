import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

async function run() {
  const envPath = path.resolve(process.cwd(), '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  let supabaseUrl = '';
  let supabaseServiceRoleKey = '';
  
  envContent.split('\n').forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].replace(/"/g, '');
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseServiceRoleKey = line.split('=')[1].replace(/"/g, '');
  });

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

  // Get a few users from public.users
  const { data: publicUsers, error: puError } = await supabaseAdmin.from('users').select('id, email, national_id, role').limit(3);
  console.log('Public Users:', publicUsers);

  if (publicUsers && publicUsers.length > 0) {
    for (const pu of publicUsers) {
      // Try to get the user from auth.admin
      const { data: authUser, error: auError } = await supabaseAdmin.auth.admin.getUserById(pu.id);
      console.log(`Auth User for ${pu.national_id}:`, authUser?.user?.email, auError?.message);
      
      // Try to sign in with 123456
      if (authUser?.user?.email) {
        const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
          email: authUser.user.email,
          password: '123456'
        });
        console.log(`Sign in test for ${pu.national_id} (${authUser.user.email}):`, signInError ? signInError.message : 'SUCCESS');
      }
    }
  }
}

run();
