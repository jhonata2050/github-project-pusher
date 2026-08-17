import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function StepAuth({ onComplete }: any) {
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <div className="p-6 text-center">Logado como {user.email}</div>;

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } }
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
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12 rounded-xl" />
        </div>
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
