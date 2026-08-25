
import { supabaseAdmin } from "./src/integrations/supabase/client.server.js";

async function checkDuplicates() {
  console.log("Checking for duplicate emails in profiles...");
  const { data: duplicates, error: dupError } = await supabaseAdmin
    .from("profiles")
    .select("email")
    .csv();

  if (dupError) {
    console.error("Error reading profiles:", dupError);
    return;
  }

  const lines = duplicates.split("\n").slice(1).filter(l => l.trim());
  const emailCounts = new Map();
  lines.forEach(email => {
    const cleanEmail = email.trim().toLowerCase();
    emailCounts.set(cleanEmail, (emailCounts.get(cleanEmail) || 0) + 1);
  });

  const repeated = Array.from(emailCounts.entries()).filter(([_, count]) => count > 1);
  
  if (repeated.length === 0) {
    console.log("No duplicate emails found in profiles.");
  } else {
    console.log("Found duplicates:", repeated);
    for (const [email, count] of repeated) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, email, full_name, whmcs_id")
        .ilike("email", email);
      console.log(`Profiles for ${email}:`, profiles);
    }
  }

  console.log("\nChecking auth.users for multiple users with same email...");
  const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
  if (authError) {
    console.error("Error listing users:", authError);
    return;
  }

  const authCounts = new Map();
  users.forEach(u => {
    const cleanEmail = u.email?.toLowerCase();
    if (cleanEmail) {
      authCounts.set(cleanEmail, (authCounts.get(cleanEmail) || 0) + 1);
    }
  });

  const repeatedAuth = Array.from(authCounts.entries()).filter(([_, count]) => count > 1);
  if (repeatedAuth.length === 0) {
    console.log("No duplicate emails found in auth.users.");
  } else {
    console.log("Found duplicate auth users:", repeatedAuth);
    for (const [email, count] of repeatedAuth) {
      const uDetails = users.filter(u => u.email?.toLowerCase() === email).map(u => ({ id: u.id, email: u.email, created_at: u.created_at }));
      console.log(`Auth users for ${email}:`, uDetails);
    }
  }
}

checkDuplicates();
