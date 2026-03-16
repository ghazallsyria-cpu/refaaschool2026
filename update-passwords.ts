import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  console.log('Updating passwords...');
  
  // We can't run raw SQL directly via the JS client easily without an RPC function.
  // But wait, we can update users one by one using the admin API.
  
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('Error listing users:', listError);
    return;
  }
  
  console.log(`Found ${users.length} users. Updating passwords to 123456...`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const user of users) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: '123456'
    });
    
    if (updateError) {
      console.error(`Error updating user ${user.id}:`, updateError);
      errorCount++;
    } else {
      successCount++;
    }
  }
  
  console.log(`Password update complete. Success: ${successCount}, Errors: ${errorCount}`);
  
  console.log('Setting must_reset_password to true for all users...');
  const { error: resetError } = await supabase
    .from('users')
    .update({ must_reset_password: true })
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all
    
  if (resetError) {
    console.error('Error setting must_reset_password:', resetError);
  } else {
    console.log('must_reset_password updated successfully.');
  }
}

main();
