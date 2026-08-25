
import { supabaseAdmin } from "./src/integrations/supabase/client.server.js";

async function checkMetadata() {
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
  const counts = new Map();
  users.forEach(u => {
    const metaWhmcs = u.user_metadata?.whmcs_id;
    if (metaWhmcs) {
      const id = String(metaWhmcs);
      if (!counts.has(id)) counts.set(id, []);
      counts.get(id).push(u.email);
    }
  });

  for (const [id, emails] of counts.entries()) {
    if (emails.length > 1) {
      console.log(`WHMCS_ID ${id} is shared by:`, emails);
    }
  }
}
checkMetadata();
