import { toast } from "sonner";

interface ForgotPasswordTriggerProps {
  email: string;
}

export function ForgotPasswordTrigger({ email }: ForgotPasswordTriggerProps) {
  const handleForgotPassword = () => {
    if (!email) {
      toast.error("Informe seu e-mail para recuperar a senha");
      return;
    }
    const promise = fetch("/api/public/password-reset", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    toast.promise(promise, {
      loading: "Enviando link de recuperação...",
      success: "Se o e-mail estiver cadastrado, você receberá um link em breve.",
      error: "Erro ao solicitar recuperação",
    });
  };

  return (
    <button
      type="button"
      className="text-left sm:text-right text-xs text-muted-foreground hover:text-brand hover:underline transition-colors"
      onClick={handleForgotPassword}
    >
      Esqueci minha senha
    </button>
  );
}
