# Personalização & White-Label Branding

O módulo de identidade visual (`/admin/branding`) permite transformar o **Painel EQSAM** em uma solução **100% White-Label**, adaptando nomes, logotipos, cores e links institucionais para refletir a marca de qualquer empresa de hospedagem ou integrador de tecnologia.

---

## 🎨 Parâmetros de Customização Dinâmica

As configurações são persistidas na tabela `public.system_settings` e gerenciadas através de `src/lib/branding.ts`:

```mermaid
graph TD
    subgraph "Módulo de Branding (/admin/branding)"
        B1[Nome Corporativo: Ex. Sua Marca Cloud]
        B2[Logotipo Dark Mode: SVG / PNG Transparente]
        B3[Logotipo Light Mode: SVG / PNG para Fundo Claro]
        B4[Favicon do Sistema: .ico / .png 32x32]
        B5[Dados de Contato: WhatsApp de Atendimento, E-mail de Suporte]
        B6[Links Institucionais: Termos de Uso, Política de Privacidade]
        B7[Texto de Rodapé e Direitos Autorais Copyright]
    end

    subgraph "Injeção Dinâmica em Tempo de Execução"
        AppHead[Meta Tags HTML, Favicon e Título da Aba]
        SidebarUI[Logo no Topo da Barra Lateral do Cliente e Admin]
        EmailTemplates[Cabeçalho e Rodapé dos E-mails do Resend]
        PDFInvoices[Cabeçalho Oficial das Faturas em PDF Baixáveis]
    end

    B1 --> AppHead
    B1 --> EmailTemplates
    B1 --> PDFInvoices
    B2 --> SidebarUI
    B3 --> SidebarUI
    B4 --> AppHead
    B5 --> EmailTemplates
    B6 --> EmailTemplates
    B7 --> PDFInvoices
```

---

## ⚙️ Injeção Dinâmica sem Rebuild do Código

Diferente de sistemas engessados que exigem recompilação do frontend para alterar um logotipo:
1. **Zero Downtime:** Qualquer upload de nova logomarca ou alteração no nome corporativo é persistido no banco e propagado instantaneamente para todos os navegadores conectados através de revalidação de cache do TanStack Query.
2. **Documentos Oficiais Atualizados:** Faturas em PDF geradas em tempo real incorporam a logomarca e a razão social imediatamente após o salvamento.
3. **E-mails Transacionais com Assinatura da Empresa:** Notificações de cobrança e avisos de suporte utilizam o nome e logotipo salvos nas variáveis de branding, mantendo consistência visual total para o cliente final.
