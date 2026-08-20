---
title: Substituir Texto pelo Logo no Login
description: Substituir o texto estático "Eqsam." no cabeçalho da página de autenticação pelo logo dinâmico configurado no sistema.
type: visual
---

# Plano de Trabalho - Substituição de Logo

O objetivo é substituir o texto "Eqsam." na página de login (`/auth`) pelo logo configurado nas definições de branding do sistema. Se um logo personalizado estiver disponível, ele será exibido; caso contrário, será exibida a primeira letra do nome do aplicativo com um fundo estilizado (fallback padrão do sistema).

## Alterações Técnicas

### Frontend

- **Arquivo:** `src/routes/auth.tsx`
    - Importar e utilizar o hook `useBranding()` para obter as configurações visuais atuais.
    - Substituir o elemento `<h1>` que contém o texto "Eqsam." por um bloco condicional que renderiza:
        - A imagem do logo (`branding.logo_url`) se estiver presente.
        - Um ícone de fallback com a inicial do nome do app (`branding.app_name`) caso não haja logo.
    - Ajustar os estilos (Tailwind) para garantir que o logo fique centralizado e com tamanho adequado, mantendo a harmonia visual da página de login.

## Verificação

1. Acessar a página de login (`/auth`).
2. Confirmar que o texto "Eqsam." foi substituído pelo logo.
3. Testar o comportamento quando não há logo configurado (deve mostrar a inicial estilizada).
4. Validar se o logo está responsivo e centralizado.