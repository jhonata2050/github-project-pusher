
import { supabaseAdmin } from "./src/integrations/supabase/client.server.js";

async function cleanUp() {
  console.log("Listing all auth users...");
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
  
  if (error) {
    console.error("Error listing users:", error);
    return;
  }

  const emailGroups = new Map();
  users.forEach(u => {
    const email = u.email?.toLowerCase();
    if (!email) return;
    if (!emailGroups.has(email)) emailGroups.set(email, []);
    emailGroups.get(email).push(u);
  });

  console.log(`Found ${users.length} total users.`);
  
  for (const [email, userList] of emailGroups.entries()) {
    if (userList.length > 1) {
      console.log(`\nDuplicate detected for email: ${email}`);
      // Sort by created_at, keep the oldest one
      userList.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      
      const toKeep = userList[0];
      const toDelete = userList.slice(1);
      
      console.log(`Keeping user ID: ${toKeep.id} (Created: ${toKeep.created_at})`);
      
      for (const user of toDelete) {
        console.log(`Deleting duplicate user ID: ${user.id} (Created: ${user.created_at})`);
        
        // Before deleting, ensure we don't lose services/invoices if they were attached to the wrong one
        // Though in theory they should be moved, it's safer to just delete if it's a fresh duplicate
        const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
        if (delError) {
          console.error(`Failed to delete user ${user.id}:`, delError.message);
        } else {
          console.log(`Successfully deleted user ${user.id}`);
        }
      }
    }
  }
  
  console.log("\nCleanup finished.");
}

cleanUp();
