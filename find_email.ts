import { supabase } from './lib/supabase';

async function findEmail() {
  const civilId = '284061009073';
  
  // Check students
  const { data: studentData } = await supabase
    .from('students')
    .select('id, users!inner(email)')
    .eq('national_id', civilId)
    .single();
    
  if (studentData && studentData.users) {
    console.log('Found student email:', (studentData.users as any).email);
    return;
  }

  // Check teachers
  const { data: teacherData } = await supabase
    .from('teachers')
    .select('id, users!inner(email)')
    .eq('national_id', civilId)
    .single();
    
  if (teacherData && teacherData.users) {
    console.log('Found teacher email:', (teacherData.users as any).email);
    return;
  }

  // Check parents
  const { data: parentData } = await supabase
    .from('parents')
    .select('id, users!inner(email)')
    .eq('national_id', civilId)
    .single();
    
  if (parentData && parentData.users) {
    console.log('Found parent email:', (parentData.users as any).email);
    return;
  }

  console.log('Email not found for Civil ID:', civilId);
}

findEmail();
