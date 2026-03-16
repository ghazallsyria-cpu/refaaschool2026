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

  // Create a test user
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: 'test_user_12345@example.com',
    password: 'password123',
    email_confirm: true
  });

  console.log('Create user:', data, error);

  if (data.user) {
    // Delete the test user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(data.user.id);
    console.log('Delete user:', deleteError);
  }
}

run();
