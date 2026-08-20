import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check as CheckIcon, Info, Globe, AlertCircle, XCircle } from "lucide-react";
import { checkEmailExists } from "@/lib/checkout.functions";
import { useServerFn } from "@tanstack/react-start";
import { useProfile } from "@/hooks/use-auth";
import { countries } from "@/lib/countries";
import { CountrySelector } from "@/components/app/CountrySelector";

function translateAuthError(message: string): string {
  if (!message) return "Ocorreu um erro. Tente novamente.";
  const lower = message.toLowerCase();
  if (lower.includes("weak") || lower.includes("easy to guess")) {
    return "Senha muito fraca. Use pelo menos 8 caracteres, incluindo letras, números e símbolos.";
  }
  if (lower.includes("invalid login credentials")) {
    return "E-mail ou senha incorretos.";
  }
  if (lower.includes("email not confirmed") || lower.includes("email address is not confirmed")) {
    return "E-mail ainda não confirmado. Verifique sua caixa de entrada.";
  }
  if (lower.includes("user already registered")) {
    return "Este e-mail já está cadastrado. Faça login.";
  }
  if (lower.includes("password should be")) {
    return "A senha não atende aos requisitos mínimos de segurança.";
  }
  if (lower.includes("unable to validate email")) {
    return "E-mail inválido. Verifique o endereço digitado.";
  }
  return message;
}

export function StepAuth({ onComplete }: any) {
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("BR");
  const [loading, setLoading] = useState(false);
  const [emailChecked, setEmailChecked] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  const checkEmail = useServerFn(checkEmailExists);

  const handleEmailBlur = async () => {
    if (!email || !email.includes("@")) return;
    try {
      const { exists } = await checkEmail({ data: { email } });
      if (exists && mode === "signup") {
        setMode("signin");
        toast.info("Este e-mail já está cadastrado. Por favor, faça login.");
      }
      setEmailChecked(true);
    } catch (err) {
      console.error(err);
    }
  };

  // Pre-fill country based on browser locale
  useState(() => {
    const locale = navigator.language.toUpperCase();
    const found = countries.find(c => locale.includes(c.code));
    if (found) setCountryCode(found.code);
  });

  const selectedCountry = countries.find(c => c.code === countryCode);

  const formatPhone = (val: string) => {
    // Se o valor já começa com +, mantemos
    if (val.startsWith('+')) return val;
    // Se não começa com +, adicionamos o DDI do país selecionado
    if (selectedCountry && val.length > 0) {
      return `${selectedCountry.ddi}${val}`;
    }
    return val;
  };

  const getPhoneForSubmit = () => {
    if (phone.startsWith('+')) return phone;
    return selectedCountry ? `${selectedCountry.ddi}${phone.replace(/\D/g, '')}` : phone;
  };

  if (user) return (
    <div className="p-12 text-center space-y-4">
      <div className="flex justify-center">
        <div className="size-16 rounded-full bg-brand/10 flex items-center justify-center">
          <CheckIcon className="size-8 text-brand" />
        </div>
      </div>
      <h3 className="text-xl font-semibold">Autenticado com sucesso!</h3>
      <p className="text-muted-foreground">Você está logado como <span className="font-medium text-foreground">{user.email}</span></p>
      <Button onClick={onComplete} className="rounded-xl px-8">Continuar para o resumo</Button>
    </div>
  );

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setFormError(null);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { 
            data: { 
              full_name: fullName, 
              phone: getPhoneForSubmit(),
              country: countryCode 
            } 
          }
        });
        if (error) throw error;
        if (!data.session) {
          setFormError("Conta criada! Confirme seu e-mail e depois faça login aqui para concluir o pedido.");
          setMode("signin");
          setLoading(false);
          return;
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!data.session) throw new Error("Não foi possível iniciar a sessão. Tente novamente.");
      }
      onComplete?.();
    } catch (err: any) {
      const pt = translateAuthError(err.message);
      setFormError(pt);
      toast.error(pt);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-md mx-auto">
      <h2 className="text-lg font-semibold text-center">{mode === "signup" ? "Criar conta" : "Entrar"}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2">
            <XCircle className="size-4 mt-0.5 shrink-0" />
            <span>{formError}</span>
          </div>
        )}
        {mode === "signup" && (
          <div className="space-y-2">
            <Label>Nome Completo</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required className="h-12 rounded-xl" />
          </div>
        )}
        <div className="space-y-2">
          <Label>E-mail</Label>
          <Input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            onBlur={handleEmailBlur}
            required 
            className="h-12 rounded-xl" 
          />
        </div>
        {mode === "signup" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>País</Label>
              <CountrySelector 
                value={countryCode} 
                onChange={setCountryCode} 
                className="h-12 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp / Celular</Label>
              <div className="relative">
                <Input 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  required 
                  placeholder="Número (Ex: 11988887777)"
                  className="h-12 rounded-xl pl-12" 
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                  {selectedCountry?.ddi}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground italic">O código do país é adicionado automaticamente.</p>
            </div>
          </div>
        )}
        <div className="space-y-2">
          <Label>Senha</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-12 rounded-xl" />
        </div>
        <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl">
          {loading ? "Processando..." : (mode === "signup" ? "Criar conta" : "Entrar")}
        </Button>
        <button type="button" onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setFormError(null); }} className="w-full text-xs text-brand hover:underline">
          {mode === "signup" ? "Já tem conta? Entre aqui" : "Novo por aqui? Crie uma conta"}
        </button>
      </form>
    </div>
  );
}
