import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check as CheckIcon, Info, Globe } from "lucide-react";
import { checkEmailExists } from "@/lib/checkout.functions";
import { useServerFn } from "@tanstack/react-start";
import { useProfile } from "@/hooks/use-auth";

export function StepAuth({ onComplete }: any) {
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailChecked, setEmailChecked] = useState(false);
  
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

  // Pre-fill country code based on browser locale
  useState(() => {
    const locale = navigator.language;
    if (locale.includes("BR")) setPhone("+55 ");
    else if (locale.includes("US")) setPhone("+1 ");
    else if (locale.includes("PT")) setPhone("+351 ");
  });

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
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, phone: phone } }
        });
        if (error) throw error;
        if (!data.session) toast.info("Verifique seu e-mail para continuar.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      onComplete?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-md mx-auto">
      <h2 className="text-lg font-semibold text-center">{mode === "signup" ? "Criar conta" : "Entrar"}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
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
          <div className="space-y-2">
            <Label>WhatsApp / Celular</Label>
            <div className="relative">
              <Input 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                required 
                placeholder="+55 (00) 00000-0000"
                className="h-12 rounded-xl pl-10" 
              />
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            </div>
            <p className="text-[10px] text-muted-foreground">Inclua o código do país (ex: +55)</p>
          </div>
        )}
        <div className="space-y-2">
          <Label>Senha</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-12 rounded-xl" />
        </div>
        <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl">
          {loading ? "Processando..." : (mode === "signup" ? "Criar conta" : "Entrar")}
        </Button>
        <button type="button" onClick={() => setMode(mode === "signup" ? "signin" : "signup")} className="w-full text-xs text-brand hover:underline">
          {mode === "signup" ? "Já tem conta? Entre aqui" : "Novo por aqui? Crie uma conta"}
        </button>
      </form>
    </div>
  );
}
