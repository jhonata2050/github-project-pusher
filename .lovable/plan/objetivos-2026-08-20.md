---
name: Melhoria do Seletor de Países e Tipos de Documento
description: Expandir lista de países, adicionar busca ao seletor de países e padronizar layout de documentos.
type: design
---

## Objetivos
1. **Expandir Lista de Países**: Adicionar todos os principais países ao sistema em `src/lib/countries.ts`.
2. **Seletor de Países com Busca**: Implementar um componente de seleção com busca (Combobox) usando Radix UI (Popover e Command) para facilitar a localização dos países.
3. **Padronização de Documentos**: Atualizar os rótulos dos tipos de documento para: "CPF (Pessoa Física)", "CNPJ (Empresa)", "Tax ID (Internacional)" e "Passaporte".
4. **Refinamento de Layout**: Ajustar a disposição dos campos de identificação em todas as telas relevantes (Cadastro, Perfil, Checkout e Admin) para seguir o padrão visual do sistema.

## Detalhes Técnicos
1. **Novo Componente**: Criar `src/components/app/CountrySelector.tsx` utilizando `popover.tsx` e `command.tsx`.
2. **Dados**: Atualizar `src/lib/countries.ts` com uma lista abrangente de países e seus respectivos DDIs.
3. **Integração**: Substituir os campos `select` nativos de países pelo novo `CountrySelector` em:
    - `src/routes/auth.tsx`
    - `src/routes/_authenticated/profile.tsx`
    - `src/routes/_authenticated/complete-profile.tsx`
    - `src/routes/_authenticated/admin/clients.$clientId.tsx`
4. **Formulários**: Ajustar o layout dos campos `identification_type` e `tax_id` para ficarem alinhados e visualmente harmoniosos, corrigindo o "layout feio" mencionado.
