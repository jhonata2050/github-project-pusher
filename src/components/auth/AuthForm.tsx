import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleAuthButton } from "./GoogleAuthButton";
import { SignupFields } from "./SignupFields";
import { ForgotPasswordTrigger } from "./ForgotPasswordTrigger";
import type { AuthMode } from "./types";

interface AuthFormProps {
  mode: AuthMode;
  setMode: (mode: AuthMode) => void;
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  fullName: string;
  setFullName: (name: string) => void;
  phone: string;
  setPhone: (phone: string) => void;
  tax_id: string;
  setTaxId: (taxId: string) => void;
  identificationType: string;
  setIdentificationType: (type: string) => void;
  country: string;
  setCountry: (country: string) => void;
  leadSource: string;
  setLeadSource: (source: string) => void;
  leadSourceOther: string;
  setLeadSourceOther: (other: string) => void;
  busy: boolean;
  onGoogleAuth: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export function AuthForm({
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
  onGoogleAuth,
  onSubmit,
}: AuthFormProps) {
  return (
    <>
      <p className="-mt-2 mb-6 text-center text-xs text-muted-foreground">
        {mode === "signup"
          ? "Crie sua conta para começar agora"
          : "O seu Data Center de serviços Cloud"}
      </p>

      <GoogleAuthButton onClick={onGoogleAuth} disabled={busy} />

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 border-t border-dashed border-border" />
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
          ou com seu e-mail
        </span>
        <span className="h-px flex-1 border-t border-dashed border-border" />
      </div>

      <form className="space-y-3.5" onSubmit={onSubmit}>
        {mode === "signup" && (
          <SignupFields
            fullName={fullName}
            setFullName={setFullName}
            country={country}
            setCountry={setCountry}
            phone={phone}
            setPhone={setPhone}
            identificationType={identificationType}
            setIdentificationType={setIdentificationType}
            tax_id={tax_id}
            setTaxId={setTaxId}
            leadSource={leadSource}
            setLeadSource={setLeadSource}
            leadSourceOther={leadSourceOther}
            setLeadSourceOther={setLeadSourceOther}
          />
        )}

        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs">
            E-mail de acesso
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@exemplo.com"
            className="h-11 rounded-xl text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs">
            Senha
          </Label>
          <Input
            id="password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="h-11 rounded-xl text-xs"
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center pt-1">
          <button
            type="button"
            className="text-left text-xs font-semibold text-brand hover:underline"
            onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
          >
            {mode === "signup" ? "Já tem conta? Entrar" : "Criar uma conta gratuita"}
          </button>
          <ForgotPasswordTrigger email={email} />
        </div>

        <Button
          type="submit"
          disabled={busy}
          className="h-11 w-full rounded-xl bg-foreground text-sm font-semibold text-background hover:bg-foreground/90 mt-2"
        >
          {mode === "signup" ? "Criar minha conta" : "Entrar no Painel"}
        </Button>
      </form>
    </>
  );
}
