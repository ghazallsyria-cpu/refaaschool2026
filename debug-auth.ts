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

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    db: { schema: 'auth' }
  });

  const { data: users, error: usersError } = await supabaseAdmin.from('users').select('id, email').limit(2);
  console.log('Users:', users, usersError);

  const { data: identities, error: identitiesError } = await supabaseAdmin.from('identities').select('*').limit(2);
  console.log('Identities:', identities, identitiesError);
}

run();
