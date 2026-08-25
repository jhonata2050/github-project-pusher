
import { supabaseAdmin } from "./src/integrations/supabase/client.server.js";

async function checkOrphans() {
  const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
  const { data: profiles, error: profError } = await supabaseAdmin.from("profiles").select("id, email");

  const authIds = new Set(users.map(u => u.id));
  const profIds = new Set(profiles.map(p => p.id));

  console.log(`Auth users: ${authIds.size}`);
  console.log(`Profiles: ${profIds.size}`);

  const orphans = profiles.filter(p => !authIds.has(p.id));
  if (orphans.length > 0) {
    console.log("Profiles without Auth User:", orphans);
  } else {
    console.log("No profile orphans found.");
  }

  const missingProfiles = users.filter(u => !profIds.has(u.id));
  if (missingProfiles.length > 0) {
    console.log("Auth users without Profile:", missingProfiles.map(u => ({ id: u.id, email: u.email })));
  } else {
    console.log("No missing profiles found.");
  }
}
checkOrphans();
