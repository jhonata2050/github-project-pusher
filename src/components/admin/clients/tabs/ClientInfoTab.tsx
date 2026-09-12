import { User, MapPin, Save, Key, Send, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CountrySelector } from "@/components/app/CountrySelector";
import { countries } from "@/lib/countries";

interface ClientInfoTabProps {
  client: any;
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isUpdatingProfile: boolean;
  onOpenChangePasswordModal: () => void;
  onSendPasswordReset: () => void;
  isSendingReset: boolean;
}

export function ClientInfoTab({
  client,
  isEditing,
  setIsEditing,
  onSubmit,
  isUpdatingProfile,
  onOpenChangePasswordModal,
  onSendPasswordReset,
  isSendingReset,
}: ClientInfoTabProps) {
  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border-none bg-card shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <div>
            <CardTitle className="text-lg">Informações do Cliente</CardTitle>
            <CardDescription className="text-xs">Dados pessoais e de contato</CardDescription>
          </div>
          {!isEditing && (
            <Button variant="outline" onClick={() => setIsEditing(true)} className="rounded-xl h-9 text-xs">
              Editar Dados
            </Button>
          )}
        </CardHeader>
        <CardContent className="pb-6">
          <form 
            onSubmit={onSubmit} 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome Completo</Label>
              <Input id="full_name" name="full_name" defaultValue={client.full_name || ""} disabled={!isEditing} className="rounded-xl h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail de Acesso e Contato</Label>
              <Input 
                id="email" 
                name="email" 
                type="email"
                defaultValue={client.email || ""} 
                disabled={!isEditing} 
                className={cn("rounded-xl h-11", !isEditing && "bg-muted/30")} 
              />
              <p className="text-[10px] text-muted-foreground">
                {isEditing 
                  ? "Alterar o e-mail atualizará simultaneamente o login e as notificações do cliente." 
                  : "E-mail de acesso e notificações."}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_name">Empresa</Label>
              <Input id="company_name" name="company_name" defaultValue={client.company_name || ""} disabled={!isEditing} className="rounded-xl h-11" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="identification_type">Tipo de Documento</Label>
                <Select 
                  defaultValue={(client as any).identification_type || "cpf"} 
                  disabled={!isEditing}
                  onValueChange={(val) => {
                    const el = document.getElementById('identification_type_hidden') as HTMLInputElement;
                    if (el) el.value = val;
                  }}
                >
                  <SelectTrigger className="h-11 rounded-xl border-input bg-background shadow-sm">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/40 shadow-xl">
                    <SelectItem value="cpf">CPF (Pessoa Física)</SelectItem>
                    <SelectItem value="cnpj">CNPJ (Empresa)</SelectItem>
                    <SelectItem value="tax_id">Tax ID (Internacional)</SelectItem>
                    <SelectItem value="passport">Passaporte</SelectItem>
                  </SelectContent>
                </Select>
                <input type="hidden" id="identification_type_hidden" name="identification_type" defaultValue={(client as any).identification_type || "cpf"} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax_id">Documento (ID)</Label>
                <Input id="tax_id" name="tax_id" defaultValue={client.tax_id || ""} disabled={!isEditing} className="rounded-xl h-11" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone / WhatsApp</Label>
              <div className="relative">
                <Input 
                  id="phone" 
                  name="phone" 
                  defaultValue={client.phone || ""} 
                  disabled={!isEditing} 
                  className="rounded-xl h-11 pl-12" 
                  placeholder="Número (Ex: 11988887777)"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground bg-muted/50 px-1 py-0.5 rounded">
                  {countries.find(c => c.code === ((client as any).country || "BR"))?.ddi}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                defaultValue={client.status} 
                disabled={!isEditing}
                onValueChange={(val) => {
                  const el = document.getElementById('status_hidden') as HTMLInputElement;
                  if (el) el.value = val;
                }}
              >
                <SelectTrigger className="h-11 rounded-xl border-input bg-background shadow-sm">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/40 shadow-xl">
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
              <input type="hidden" id="status_hidden" name="status" defaultValue={client.status} />
            </div>

            <div className="col-span-full border-t pt-4 mt-2">
              <h3 className="text-base font-bold mb-2 flex items-center gap-2">
                <MapPin className="size-4" /> Endereço
              </h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_line">Logradouro</Label>
              <Input id="address_line" name="address_line" defaultValue={client.address_line || ""} disabled={!isEditing} className="rounded-xl h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address_line2">Complemento / Bairro</Label>
              <Input id="address_line2" name="address_line2" defaultValue={(client as any).address_line2 || ""} disabled={!isEditing} className="rounded-xl h-11" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input id="city" name="city" defaultValue={client.city || ""} disabled={!isEditing} className="rounded-xl h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">Estado / Província</Label>
                <Input id="state" name="state" defaultValue={client.state || ""} disabled={!isEditing} className="rounded-xl h-11" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">País</Label>
              <CountrySelector
                value={(client as any).country || "BR"}
                onChange={(val) => {
                  const el = document.getElementById('country_hidden') as HTMLInputElement;
                  if (el) el.value = val;
                }}
                disabled={!isEditing}
                className="h-11"
              />
              <input type="hidden" id="country_hidden" name="country" defaultValue={(client as any).country || "BR"} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postal_code">CEP / Zip Code</Label>
              <Input id="postal_code" name="postal_code" defaultValue={client.postal_code || ""} disabled={!isEditing} className="rounded-xl h-11" />
            </div>

            {isEditing && (
              <div className="col-span-full flex justify-end gap-3 mt-4">
                <Button type="button" variant="ghost" onClick={() => setIsEditing(false)} className="rounded-xl h-11">
                  Cancelar
                </Button>
                <Button type="submit" disabled={isUpdatingProfile} className="rounded-xl h-11 bg-brand text-brand-foreground hover:bg-brand/90 flex gap-2">
                  <Save className="size-4" /> Salvar Alterações
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Card de Segurança e Credenciais do Cliente */}
      <Card className="rounded-3xl border-none bg-card shadow-sm">
        <CardHeader className="py-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Key className="size-5 text-brand" /> Segurança & Acesso do Cliente
          </CardTitle>
          <CardDescription className="text-xs">
            Gerencie as credenciais de acesso, redefina senhas ou gere links de recuperação imediata para suporte.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-muted/20 border border-border/60 space-y-3 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                  <Key className="size-4 text-brand" />
                  <span>Alterar Senha do Cliente</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Defina uma nova senha imediatamente para o cliente sem necessidade de confirmação por e-mail.
                </p>
              </div>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onOpenChangePasswordModal}
                className="rounded-xl w-full gap-2 border-brand/40 text-brand hover:bg-brand/10"
              >
                <Key className="size-4" /> Alterar Senha Diretamente
              </Button>
            </div>

            <div className="p-4 rounded-2xl bg-muted/20 border border-border/60 space-y-3 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                  <Send className="size-4 text-blue-500" />
                  <span>Link de Redefinição de Senha</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Gera um link seguro de recuperação para enviar ao cliente pelo WhatsApp ou ticket de suporte.
                </p>
              </div>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onSendPasswordReset}
                disabled={isSendingReset}
                className="rounded-xl w-full gap-2 border-blue-500/40 text-blue-600 hover:bg-blue-500/10"
              >
                <ExternalLink className="size-4" /> {isSendingReset ? "Gerando link..." : "Gerar Link de Redefinição"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
