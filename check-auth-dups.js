
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkEmails() {
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) {
    console.error('Error listing users:', error);
    return;
  }

  console.log(`Total users in auth.users: ${users.length}`);

  const emailCounts = {};
  users.forEach(user => {
    emailCounts[user.email] = (emailCounts[user.email] || 0) + 1;
  });

  const duplicates = Object.entries(emailCounts).filter(([email, count]) => count > 1);
  console.log('Duplicate emails in auth.users:', duplicates);
  
  if (duplicates.length > 0) {
    duplicates.forEach(([email, count]) => {
      const usersWithEmail = users.filter(u => u.email === email);
      console.log(`Email ${email} has ${count} users:`);
      usersWithEmail.forEach(u => {
        console.log(`  - ID: ${u.id}, Created At: ${u.created_at}, Last Sign In: ${u.last_sign_in_at}, Meta: ${JSON.stringify(u.user_metadata)}`);
      });
    });
  } else {
    console.log('No duplicate emails found in auth.users.');
  }
}

checkEmails();
