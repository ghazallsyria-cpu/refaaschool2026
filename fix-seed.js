const fs = require('fs');

const content = fs.readFileSync('seed_students.sql', 'utf8');

// We need to replace:
// INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) VALUES ('...', '...', 'authenticated', 'authenticated', '...', crypt('12345', gen_salt('bf')), now(), now());
// with:
// INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('...', '...', 'authenticated', 'authenticated', '...', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());

const newContent = content.replace(
  /INSERT INTO auth\.users \(id, instance_id, aud, role, email, encrypted_password, created_at, updated_at\) VALUES \('([^']+)', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '([^']+)', crypt\('12345', gen_salt\('bf'\)\), now\(\), now\(\)\);/g,
  "INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('$1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '$2', crypt('12345', gen_salt('bf')), now(), '{\"provider\":\"email\",\"providers\":[\"email\"]}', '{\"full_name\":\"student\"}', now(), now());"
);

fs.writeFileSync('seed_students.sql', newContent);
console.log('Fixed seed_students.sql');
