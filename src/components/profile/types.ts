import { z } from "zod";

export const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Informe seu nome").max(120),
  company_name: z.string().trim().max(120).optional(),
  tax_id: z.string().trim().min(5, "Documento obrigatório").max(30),
  identification_type: z.string().min(1, "Selecione o tipo de identificação"),
  country: z.string().min(2, "Selecione o país"),
  phone: z.string().trim().min(5, "Telefone inválido").max(20),
  address_line: z.string().trim().min(2, "Endereço obrigatório").max(160),
  address_line2: z.string().trim().max(160).optional(),
  city: z.string().trim().min(2, "Cidade obrigatória").max(80),
  state: z.string().trim().max(40).optional(),
  postal_code: z.string().trim().max(20).optional(),
});

export type ProfileFormState = z.infer<typeof profileSchema>;

export const EMPTY_PROFILE_FORM: ProfileFormState = {
  full_name: "",
  company_name: "",
  tax_id: "",
  identification_type: "cpf",
  country: "BR",
  phone: "",
  address_line: "",
  address_line2: "",
  city: "",
  state: "",
  postal_code: "",
};
