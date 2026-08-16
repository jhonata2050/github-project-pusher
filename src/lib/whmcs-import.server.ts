import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type ImportStats = {
  clients: { created: number; updated: number; failed: number };
  services: { created: number; failed: number };
  invoices: { created: number; failed: number };
  errors: string[];
};

export function emptyStats(): ImportStats {
  return {
    clients: { created: 0, updated: 0, failed: 0 },
    services: { created: 0, failed: 0 },
    invoices: { created: 0, failed: 0 },
    errors: [],
  };
}

function pick(row: Record<string, string>, keys: string[]): string {
  // Normalize the row keys to handle case-insensitivity and spaces
  const normalizedRow: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    normalizedRow[k.toLowerCase().trim().replace(/[\s_]+/g, "")] = v;
  }

  for (const k of keys) {
    // Also normalize the search keys
    const normalizedKey = k.toLowerCase().trim().replace(/[\s_]+/g, "");
    const v = normalizedRow[normalizedKey];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return "";
}

export function debugRow(row: Record<string, string>): string {
  const keys = Object.keys(row).join(", ");
  return `Campos encontrados: ${keys}`;
}


function toDate(value: string): string | null {
  if (!value) return null;
  const v = value.trim();
  if (v === "0000-00-00" || v === "0000-00-00 00:00:00" || v === "0" || v === "") return null;
  // Handle DD/MM/YYYY
  const partsSlash = v.split("/");
  if (v.includes("/") && partsSlash[0] && partsSlash[0].length <= 2) {

    const parts = v.split("/");
    if (parts.length === 3) {
      const [day, month, year] = parts;
      const d = new Date(`${year}-${month}-${day}`);
      return Number.isNaN(d.getTime()) ? null : d.toISOString();
    }

  }
  const d = new Date(v.replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();

}

function toNumber(value: string): number {
  if (!value) return 0;
  const n = Number(value.replace(/[^\d,.-]/g, "").replace(",", "."));
  return Number.isNaN(n) ? 0 : n;
}

const CYCLE_MAP: Record<string, string> = {
  monthly: "monthly",
  mensal: "monthly",
  quarterly: "quarterly",
  trimestral: "quarterly",
  semiannually: "semiannually",
  semestral: "semiannually",
  annually: "annually",
  anual: "annually",
  biennially: "biennially",
  bienal: "biennially",
};

const SERVICE_STATUS_MAP: Record<string, string> = {
  active: "active",
  pending: "pending",
  suspended: "suspended",
  terminated: "terminated",
  cancelled: "cancelled",
  canceled: "cancelled",
};

const INVOICE_STATUS_MAP: Record<string, string> = {
  paid: "paid",
  unpaid: "unpaid",
  cancelled: "cancelled",
  canceled: "cancelled",
  refunded: "refunded",
  draft: "draft",
  collections: "unpaid",
};

async function resolveUserId(email: string, whmcsClientId?: string): Promise<string | null> {
  const cleanEmail = email?.trim().toLowerCase();
  const cleanWhmcsId = whmcsClientId?.toString().trim();

  if (!cleanEmail && !cleanWhmcsId) {
    console.log("[Import] Falha ao resolver usuário: e-mail e WHMCS_ID estão vazios.");
    return null;
  }

  // 1. Tenta buscar pelo whmcs_id no banco de perfis (mais preciso)
  if (cleanWhmcsId) {
    const { data: profile } = await (supabaseAdmin
      .from("profiles") as any)
      .select("id")
      .eq("whmcs_id", cleanWhmcsId)
      .maybeSingle();
    
    if (profile?.id) {
      console.log(`[Import] Resolvido via whmcs_id (${cleanWhmcsId}): ${profile.id}`);
      return profile.id;
    }

    // Se não achou no perfil, tenta ver se foi injetado no metadata do usuário
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    if (!error && users) {
      // Find the first user with this whmcs_id in metadata
      const user = users.find(u => u.user_metadata?.['whmcs_id']?.toString() === cleanWhmcsId);
      if (user) {
        console.log(`[Import] Resolvido via auth metadata whmcs_id (${cleanWhmcsId}): ${user.id}`);
        return user.id;
      }
    }
  }
  
  // 2. Tenta buscar pelo e-mail no banco de perfis
  if (cleanEmail) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("email", cleanEmail)
      .maybeSingle();
    
    if (profile?.id) {
      console.log(`[Import] Resolvido via email (${cleanEmail}): ${profile.id}`);
      return profile.id;
    }
  }

  // 3. Fallback: busca no auth.users por e-mail
  if (cleanEmail) {
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    if (!error && users) {
      const user = users.find(u => u.email?.toLowerCase() === cleanEmail);
      if (user) {
        console.log(`[Import] Resolvido via auth email fallback (${cleanEmail}): ${user.id}`);
        return user.id;
      }
    }
  }

  console.log(`[Import] Falha ao resolver usuário: Email=${cleanEmail || "n/a"}, WHMCS_ID=${cleanWhmcsId || "n/a"}`);
  return null;
}



/** Importa clientes do WHMCS (tblclients export). */
async function importClients(rows: Record<string, string>[], stats: ImportStats) {
  for (const row of rows) {
    const email = pick(row, ["email", "e-mail", "emailaddress", "mail", "clientemail", "email_address", "username", "login", "user", "email_address"]).toLowerCase();
    const whmcsId = pick(row, ["id", "userid", "clientid", "uid", "cid", "whmcsid", "client_id", "userid", "id_whmcs"]);
    
    if (!email && !whmcsId) {
      stats.clients.failed++;
      stats.errors.push("Linha ignorada: e-mail e ID WHMCS ausentes.");
      continue;
    }


    const fullName =
      pick(row, ["full_name", "name", "nome", "firstname", "first_name", "lastname", "last_name"]) ||
      `${pick(row, ["firstname", "first_name"])} ${pick(row, ["lastname", "last_name"])}`.trim() ||
      email.split("@")[0] || "Cliente Importado";


    const profile = {
      full_name: fullName || null,
      email,
      whmcs_id: whmcsId || null,
      company_name: pick(row, ["companyname", "company_name", "empresa"]) || null,
      tax_id: pick(row, ["tax_id", "taxid", "cpf", "cnpj", "documento"]) || null,
      phone: pick(row, ["phonenumber", "phone", "telefone"]) || null,
      address_line: pick(row, ["address1", "address_line", "endereco"]) || null,
      address_line2: pick(row, ["address2", "address_line2"]) || null,
      city: pick(row, ["city", "cidade"]) || null,
      state: pick(row, ["state", "estado"]) || null,
      postal_code: pick(row, ["postcode", "postal_code", "cep"]) || null,
      country: pick(row, ["country", "pais"]) || "BR",
      notes: "Importado do WHMCS" + (whmcsId ? ` (ID WHMCS: ${whmcsId})` : ""),
    };

    try {
      const existing = await resolveUserId(email, whmcsId);
      
      if (existing) {
        console.log(`[Import] Atualizando perfil existente ID: ${existing}`);
        // We only update if it's the SAME email or if it's explicitly linked by whmcs_id
        const { error } = await supabaseAdmin
          .from("profiles")
          .update(profile)
          .eq("id", existing);
        if (error) throw new Error(error.message);
        
        // Also ensure user_metadata in auth is updated if linked
        await supabaseAdmin.auth.admin.updateUserById(existing, {
          user_metadata: { full_name: fullName, whmcs_id: whmcsId }
        });

        stats.clients.updated++;
        continue;
      }

      // Double check in Auth by email to be absolutely sure before creating
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      const existingAuthUser = users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

      let userId = existingAuthUser?.id;

      if (!userId) {
        const { data: created, error: authError } =
          await supabaseAdmin.auth.admin.createUser({
            email,
            email_confirm: true,
            password: crypto.randomUUID() + "Aa1!",
            user_metadata: { full_name: fullName, imported_from: "whmcs", whmcs_id: whmcsId },
          });

        if (authError || !created.user) {
          throw new Error(authError?.message ?? "Falha ao criar usuário no Auth");
        }
        userId = created.user.id;
        stats.clients.created++;
      } else {
        console.log(`[Import] Usuário Auth já existe (${userId}), vinculando/atualizando perfil.`);
        stats.clients.updated++;
      }

      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .upsert({ id: userId, ...profile }, { onConflict: "id" });
      
      if (profileError) throw new Error(profileError.message);

      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: userId, role: "client" }, { onConflict: "user_id,role" });
    } catch (e) {
      stats.clients.failed++;
      if (stats.errors.length < 50) {
        stats.errors.push(`Cliente ${email}: ${(e as Error).message}`);
      }
    }
  }
}

async function resolveProductId(name: string): Promise<string | null> {
  if (!name) return null;
  const cleanName = name.trim();
  
  const { data: existing } = await supabaseAdmin
    .from("products")
    .select("id")
    .ilike("name", cleanName)
    .maybeSingle();
  if (existing) return existing.id;

  const slug =
    cleanName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || `whmcs-${Date.now()}`;

  const { data: created, error } = await supabaseAdmin
    .from("products")
    .insert({
      name: cleanName,
      slug,
      description: "Produto importado automaticamente do WHMCS",
      is_visible: false,
      auto_provision: false,
    })
    .select("id")
    .single();

  if (error) return null;
  return created.id;
}

/** Importa serviços/hospedagens do WHMCS (tblhosting export). */
async function importServices(rows: Record<string, string>[], stats: ImportStats) {
  for (const row of rows) {
    const email = pick(row, ["email", "client_email", "e-mail", "user_email", "mail", "clientemail", "email_address", "username", "login", "user", "email_address"]).toLowerCase();
    const whmcsClientId = pick(row, ["userid", "clientid", "uid", "client_id", "user_id", "cid", "whmcsid", "client_id", "id_whmcs"]);
    const serviceWhmcsId = pick(row, ["id", "serviceid", "hostingid", "whmcsid", "service_id", "id_whmcs"]);



    try {
      const userId = await resolveUserId(email, whmcsClientId);
      if (!userId) {
        const fields = Object.keys(row).join(", ");
        throw new Error(`não foi possível associar o serviço ao cliente (e-mail: ${email || "vazio"}, ID WHMCS: ${whmcsClientId || "vazio"}). Campos disponíveis no CSV: ${fields}. Verifique se o cliente foi importado primeiro.`);

      }

      const productName = pick(row, ["product", "produto", "packagename", "productname", "package"]);
      const productId = await resolveProductId(productName || "Plano Importado");
      if (!productId) throw new Error("não foi possível resolver o produto");

      const cycleRaw = pick(row, ["billingcycle", "billingcycle", "ciclo"]).toLowerCase();
      const cycle = CYCLE_MAP[cycleRaw] ?? "monthly";
      
      const statusRaw = pick(row, ["status", "domainstatus", "state"]).toLowerCase();
      const status = SERVICE_STATUS_MAP[statusRaw] ?? "active";

      const domain = pick(row, ["domain", "dominio", "host", "hostname"]);
      const username = pick(row, ["username", "usuario", "login", "user", "username"]);
      const serverId = pick(row, ["server", "server_id", "serverid", "id_servidor"]);
      const nextDue = toDate(pick(row, ["nextduedate", "nextduedate", "vencimento", "nextdue"]));

      const { error } = await (supabaseAdmin.from("services") as any).insert({
        user_id: userId,
        product_id: productId,
        whmcs_id: serviceWhmcsId || null,
        domain: domain || null,
        username: username || null,
        server_id: serverId || null,
        billing_cycle: cycle as any,
        status: status as any,
        next_due_date: nextDue,
      });

      if (error) throw new Error(error.message);
      stats.services.created++;

    } catch (e) {
      stats.services.failed++;
      if (stats.errors.length < 50) {
        stats.errors.push(`Serviço ${serviceWhmcsId || email}: ${(e as Error).message}`);
      }
    }
  }
}

/** Importa faturas do WHMCS (tblinvoices export). */
async function importInvoices(rows: Record<string, string>[], stats: ImportStats) {
  for (const row of rows) {
    const email = pick(row, ["email", "client_email", "e-mail", "user_email", "mail", "clientemail", "email_address", "username", "login", "user", "email_address"]).toLowerCase();
    const whmcsClientId = pick(row, ["userid", "clientid", "uid", "client_id", "user_id", "cid", "whmcsid", "client_id", "id_whmcs"]);
    const invoiceWhmcsId = pick(row, ["id", "invoiceid", "invoicenum", "number", "whmcsid", "invoice_id", "id_whmcs"]);


    
    try {
      const userId = await resolveUserId(email, whmcsClientId);
      if (!userId) {
        // Log better error for debugging why linking failed
        const fields = Object.keys(row).join(", ");
        throw new Error(`não foi possível associar a fatura ao cliente (e-mail: ${email || "vazio"}, ID WHMCS: ${whmcsClientId || "vazio"}). Campos disponíveis no CSV: ${fields}. Verifique se o cliente foi importado primeiro.`);

      }

      const total = toNumber(pick(row, ["total", "valor", "amount", "totalamount"]));
      const subtotal = toNumber(pick(row, ["subtotal"])) || total;
      const statusRaw = pick(row, ["status", "invoicestatus"]).toLowerCase();
      const status = INVOICE_STATUS_MAP[statusRaw] ?? "unpaid";
      
      const dueDate = toDate(pick(row, ["duedate", "duedate", "vencimento", "date"])) ?? new Date().toISOString();
      const paidAt = toDate(pick(row, ["datepaid", "paidat", "datapagamento", "datepaid"]));
      const method = pick(row, ["paymentmethod", "paymentmethod", "metodo", "gateway"]);

      const { error } = await (supabaseAdmin.from("invoices") as any).insert({
        user_id: userId,
        whmcs_id: invoiceWhmcsId || null,
        subtotal,
        total_amount: total,
        tax_amount: toNumber(pick(row, ["tax", "taxa", "taxamount"])),
        discount_amount: toNumber(pick(row, ["credit", "desconto", "discount", "discountamount"])),
        status: status as any,
        due_date: dueDate,
        paid_at: paidAt,
        payment_method: method || null,
        notes: `Importado do WHMCS (ID: ${invoiceWhmcsId || "?"})`,
      });

      if (error) throw new Error(error.message);
      stats.invoices.created++;

    } catch (e) {
      stats.invoices.failed++;
      if (stats.errors.length < 50) {
        stats.errors.push(`Fatura ${invoiceWhmcsId || email}: ${(e as Error).message}`);
      }
    }
  }
}

export async function startImportJob(): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("whmcs_imports")
    .insert({ status: "running" })
    .select("id")
    .single();
  return data?.id ?? null;
}

export async function importBatch(
  kind: "clients" | "services" | "invoices",
  rows: Record<string, string>[],
): Promise<ImportStats> {
  const stats = emptyStats();
  if (kind === "clients") await importClients(rows, stats);
  else if (kind === "services") await importServices(rows, stats);
  else await importInvoices(rows, stats);
  return stats;
}

export async function finishImportJob(
  jobId: string,
  stats: ImportStats,
  errorMessage?: string,
) {
  await supabaseAdmin
    .from("whmcs_imports")
    .update({
      status: errorMessage ? "failed" : "completed",
      error_message: errorMessage ?? null,
      stats: stats as never,
    })
    .eq("id", jobId);
}

