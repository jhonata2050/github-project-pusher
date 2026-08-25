import { supabase } from "@/integrations/supabase/client";

export async function checkDuplicates() {
  console.log("Checking for profile duplicates...");
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, created_at")
    .order("email");

  if (error) {
    console.error("Error fetching profiles:", error);
    return;
  }

  const byEmail: Record<string, any[]> = {};
  if (data) {
    for (const p of data) {
      const email = p.email;
      if (!email) continue;
      if (!byEmail[email]) byEmail[email] = [];
      byEmail[email].push(p);
    }
  }

  const duplicates = Object.entries(byEmail).filter(([_, list]) => list.length > 1);
  
  if (duplicates.length === 0) {
    console.log("No duplicate emails found in profiles table.");
  } else {
    console.warn("Found duplicate emails in profiles table:");
    duplicates.forEach(([email, list]) => {
      console.log(`- ${email}: ${list.map(p => p.id).join(', ')}`);
    });
  }
}
