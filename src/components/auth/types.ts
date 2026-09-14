import { z } from "zod";

export const emailSchema = z.string().trim().email("Informe um e-mail válido").max(255);

export const passwordSchema = z
  .string()
  .min(8, "A senha deve ter pelo menos 8 caracteres")
  .regex(/[A-Z]/, "Deve conter pelo menos uma letra maiúscula")
  .regex(/[a-z]/, "Deve conter pelo menos uma letra minúscula")
  .regex(/[0-9]/, "Deve conter pelo menos um número")
  .regex(/[^A-Za-z0-9]/, "Deve conter pelo menos um caractere especial")
  .max(72, "A senha deve ter no máximo 72 caracteres");

export const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Informe seu nome").max(120),
  phone: z.string().trim().min(5, "Telefone inválido").max(20),
  tax_id: z.string().trim().min(5, "Documento de identificação é obrigatório").max(30),
  identification_type: z.string().min(1, "Selecione o tipo de identificação"),
  country: z.string().min(2, "Selecione o país"),
  email: emailSchema,
  password: passwordSchema,
  leadSource: z.string().min(1, "Selecione como nos conheceu"),
  leadSourceOther: z.string().optional(),
});

export type SignupFormData = z.infer<typeof signupSchema>;
export type AuthMode = "signin" | "signup";
