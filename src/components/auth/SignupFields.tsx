import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CountrySelector } from "@/components/app/CountrySelector";
import { countries } from "@/lib/countries";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface SignupFieldsProps {
  fullName: string;
  setFullName: (val: string) => void;
  country: string;
  setCountry: (val: string) => void;
  phone: string;
  setPhone: (val: string) => void;
  identificationType: string;
  setIdentificationType: (val: string) => void;
  tax_id: string;
  setTaxId: (val: string) => void;
  leadSource: string;
  setLeadSource: (val: string) => void;
  leadSourceOther: string;
  setLeadSourceOther: (val: string) => void;
}

export function SignupFields({
  fullName,
  setFullName,
  country,
  setCountry,
  phone,
  setPhone,
  identificationType,
  setIdentificationType,
  tax_id,
  setTaxId,
  leadSource,
  setLeadSource,
  leadSourceOther,
  setLeadSourceOther,
}: SignupFieldsProps) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="fullName" className="text-xs">
          Nome completo
        </Label>
        <Input
          id="fullName"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Seu nome"
          maxLength={120}
          className="h-11 rounded-xl text-xs"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="country" className="text-xs">
            País
          </Label>
          <CountrySelector
            value={country}
            onChange={(val) => {
              setCountry(val);
              const selectedCountry = countries.find((c) => c.code === val);
              if (selectedCountry && !phone.startsWith("+")) {
                setPhone(selectedCountry.ddi + " ");
              }
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone" className="text-xs">
            Telefone / WhatsApp
          </Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+55 (00) 00000-0000"
            className="h-11 rounded-xl text-xs"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="identificationType" className="text-xs">
            Tipo de Documento
          </Label>
          <Select
            value={identificationType}
            onValueChange={(val) => setIdentificationType(val)}
          >
            <SelectTrigger
              id="identificationType"
              className="h-11 rounded-xl border-input bg-background text-xs"
            >
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border/40 shadow-xl">
              <SelectItem value="cpf">CPF (Pessoa Física)</SelectItem>
              <SelectItem value="cnpj">CNPJ (Empresa)</SelectItem>
              <SelectItem value="tax_id">Tax ID (Internacional)</SelectItem>
              <SelectItem value="passport">Passaporte</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tax_id" className="text-xs">
            Documento (ID)
          </Label>
          <Input
            id="tax_id"
            value={tax_id}
            onChange={(e) => setTaxId(e.target.value)}
            placeholder={
              identificationType === "cpf"
                ? "000.000.000-00"
                : "Número do documento"
            }
            className="h-11 rounded-xl text-xs"
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="leadSource" className="text-xs">
          Como nos conheceu?
        </Label>
        <Select
          value={leadSource}
          onValueChange={(val) => setLeadSource(val)}
        >
          <SelectTrigger
            id="leadSource"
            className="h-11 rounded-xl border-input bg-background text-xs"
          >
            <SelectValue placeholder="Selecione uma opção" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-border/40 shadow-xl">
            <SelectItem value="Google">Google</SelectItem>
            <SelectItem value="Facebook">Facebook</SelectItem>
            <SelectItem value="Instagram">Instagram</SelectItem>
            <SelectItem value="TikTok">TikTok</SelectItem>
            <SelectItem value="Indicação">Indicação</SelectItem>
            <SelectItem value="Outro">Outro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {leadSource === "Outro" && (
        <div className="space-y-1.5">
          <Label htmlFor="leadSourceOther" className="text-xs">
            Especifique
          </Label>
          <Input
            id="leadSourceOther"
            value={leadSourceOther}
            onChange={(e) => setLeadSourceOther(e.target.value)}
            placeholder="Ex: Blog, Podcast..."
            className="h-11 rounded-xl text-xs"
            required
          />
        </div>
      )}
    </>
  );
}
