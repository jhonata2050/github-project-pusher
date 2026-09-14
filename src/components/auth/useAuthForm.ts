import { useState } from "react";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { logPublicAuthEvent, logSessionEvent } from "@/lib/audit.functions";
import { emailSchema, passwordSchema, signupSchema, type AuthMode } from "./types";

interface UseAuthFormOptions {
  initialMode: AuthMode;
  redirect?: string | undefined;
}

export function useAuthForm({ initialMode, redirect }: UseAuthFormOptions) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [tax_id, setTaxId] = useState("");
  const [identificationType, setIdentificationType] = useState("cpf");
  const [country, setCountry] = useState("BR");
  const [leadSource, setLeadSource] = useState("");
  const [leadSourceOther, setLeadSourceOther] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleGoogle() {
    setBusy(true);
    const searchParams = new URLSearchParams();
    if (redirect) searchParams.set("redirect", redirect);

    const callbackUrl = `${window.location.origin}/auth?${searchParams.toString()}`;

    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: callbackUrl,
    });
    if (result.error) {
      void logPublicAuthEvent({
        data: {
          action: "login.failed",
          description: "Falha ao entrar com Google",
        },
      });
      setBusy(false);
      toast.error("Não foi possível entrar com o Google.");
      return;
    }
    if (result.redirected) return;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (mode === "signup") {
      const result = signupSchema.safeParse({
        fullName,
        phone,
        tax_id,
        identification_type: identificationType,
        country,
        email,
        password,
        leadSource,
        leadSourceOther: leadSource === "Outro" ? leadSourceOther : undefined,
      });
      if (!result.success) {
        toast.error(result.error.issues[0]!.message);
        return;
      }
    } else {
      const parsedEmail = emailSchema.safeParse(email);
      if (!parsedEmail.success) {
        toast.error(parsedEmail.error.issues[0]!.message);
        return;
      }
      const parsedPassword = passwordSchema.safeParse(password);
      if (!parsedPassword.success) {
        toast.error(parsedPassword.error.issues[0]!.message);
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              full_name: fullName.trim().slice(0, 120),
              phone: phone.trim(),
              tax_id: tax_id.trim(),
              identification_type: identificationType,
              country: country,
              lead_source: leadSource,
              lead_source_other: leadSource === "Outro" ? leadSourceOther : null,
              registration_completed: true,
            },
          },
        });
        if (error) throw error;
        if (data.session && data.user) {
          try {
            await supabase.from("profiles").update({
              phone: phone.trim() || null,
              tax_id: tax_id.trim() || null,
              country: country || "BR",
              full_name: fullName.trim().slice(0, 120),
            }).eq("id", data.user.id);
          } catch (pErr) {
            console.warn("[SignUp] Aviso ao atualizar dados complementares do perfil:", pErr);
          }
          void logSessionEvent({
            data: { action: "signup.succeeded", description: "Conta criada com sucesso" },
          });
          trackEvent("sign_up", { method: "email", lead_source: leadSource });
        }

        if (!data.session) {
          setCheckEmail(true);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
    } catch (error) {
      void logPublicAuthEvent({
        data: {
          action: mode === "signup" ? "signup.failed" : "login.failed",
          email: email.trim(),
          description:
            mode === "signup"
              ? "Falha ao criar conta"
              : "Tentativa de acesso recusada",
        },
      });
      toast.error(
        error instanceof Error ? error.message : "Não foi possível continuar."
      );
    } finally {
      setBusy(false);
    }
  }

  return {
    mode,
    setMode,
    email,
    setEmail,
    password,
    setPassword,
    fullName,
    setFullName,
    phone,
    setPhone,
    tax_id,
    setTaxId,
    identificationType,
    setIdentificationType,
    country,
    setCountry,
    leadSource,
    setLeadSource,
    leadSourceOther,
    setLeadSourceOther,
    busy,
    checkEmail,
    setCheckEmail,
    handleGoogle,
    handleSubmit,
  };
}
