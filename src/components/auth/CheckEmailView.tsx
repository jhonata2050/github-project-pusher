import { Button } from "@/components/ui/button";

interface CheckEmailViewProps {
  email: string;
  onBack: () => void;
}

export function CheckEmailView({ email, onBack }: CheckEmailViewProps) {
  return (
    <div className="space-y-4 text-center py-6">
      <h1 className="text-2xl font-semibold">Confirme seu e-mail</h1>
      <p className="text-sm text-muted-foreground">
        Enviamos um link de confirmação para <strong>{email}</strong>. Clique nele para ativar sua conta
        e acessar o painel.
      </p>
      <Button variant="outline" className="w-full rounded-xl" onClick={onBack}>
        Voltar
      </Button>
    </div>
  );
}
