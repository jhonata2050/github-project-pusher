# Tipografia & Componentes de Interface

A arquitetura de componentes do **Painel EQSAM** é orientada pelo design acessível, modularidade estrita e previsibilidade visual em todas as telas da aplicação.

---

## 🔤 Tipografia Oficial

A tipografia central é a **Plus Jakarta Sans**, uma fonte geométrica humanista contemporânea que combina excelente legibilidade em tamanhos pequenos (tabelas de métricas e consoles) com forte personalidade em títulos e números de destaque:

```css
--font-sans-stack: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;
--font-display-stack: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;
```

### Escala Tipográfica Padronizada:
- **Display / Títulos de Módulo (H1):** `text-2xl` a `text-3xl` (24px - 30px), peso `font-bold` ou `font-extrabold`, `tracking-tight`. Utilizado para nomes de aplicações e títulos principais de página.
- **Subtítulos de Seção (H2):** `text-lg` a `text-xl` (18px - 20px), peso `font-semibold`. Utilizado para segmentar abas e grupos de configurações.
- **Rótulos de Cartões & Cabeçalhos de Tabela (H3 / Header):** `text-sm` (14px), peso `font-medium`, `text-muted-foreground`.
- **Corpo de Texto (Body):** `text-sm` (14px), peso `font-normal`, `leading-relaxed`.
- **Micro-cópia & Metadados (Caption):** `text-xs` (12px), peso `font-normal` ou `font-medium`, `text-muted-foreground`. Utilizado em timestamps, tags de templates e descrições de inputs.
- **Códigos, Envs & Hashes (Mono):** `font-mono text-xs` (12px), com fundo escuro e espaçamento entre caracteres calibrado para evitar ambiguidade entre `0` e `O`, `1` e `l`.

---

## 🧩 Biblioteca de Componentes & Primitivas

A interface é construída a partir da composição de **Radix UI Primitives**, **Tailwind CSS v4** e ícones **Lucide React**:

### 1. Cartões de Métricas e KPIs (Metric Cards)
Projetados para consumo rápido de informações críticas:
- Exibição de valor numérico em destaque (`text-2xl font-bold`).
- Ícone temático no canto superior direito envolto em um container com borda sutil e fundo `--accent`.
- Indicador de variação temporal ou comparativo (`+12.4% este mês` em verde esmeralda ou `-3.2%` em vermelho).
- Suporte a mini-gráficos de tendência (sparklines) integrados.

### 2. Status Pills & Badges Pulsantes
Indicadores visuais de saúde operacional instantânea:
- **Online / Saudável:** Pílula com fundo translúcido esmeralda (`bg-emerald-500/10 text-emerald-400 border border-emerald-500/20`), acompanhada por um ponto luminoso com efeito CSS pulse (`animate-ping`).
- **Atenção / Underpowered:** Pílula âmbar (`bg-amber-500/10 text-amber-400 border border-amber-500/20`).
- **Offline / Falha:** Pílula vermelha (`bg-rose-500/10 text-rose-400 border border-rose-500/20`).
- **Provisionando / Deploy:** Pílula azul com ícone rotativo (`animate-spin`).

### 3. Gavetas de Ação Lateral (Slide-Over Sheets)
Utilizadas para operações secundárias sem perda de contexto da tela principal:
- Visualização de logs ao vivo em tela cheia ou lateral.
- Editor de variáveis de ambiente.
- Dossiê detalhado do cliente no módulo administrativo.
- Fechamento suave com tecla `Escape` ou clique na máscara de fundo (backdrop com `backdrop-blur-sm`).

### 4. Tabelas de Alta Densidade (Data Tables)
Construídas para operadores técnicos e gestores que precisam visualizar centenas de registros:
- Linhas compactas com padding vertical otimizado (`py-3`).
- Efeito hover sutil em cada linha (`hover:bg-accent/40 transition-colors`).
- Células com suporte a truncamento com tooltip, cópia em 1-clique (Clipboard API) e menus contextuais (`DropdownMenu`).
- Filtros em tempo real por texto, status, categoria e intervalo de datas.

### 5. Formulários com Feedback Imediato
- Validação no lado do cliente com feedback em tempo real.
- Suporte a geração de senhas e chaves criptográficas com 1-clique diretamente no campo.
- Alternância de visibilidade de senhas (`Eye` / `EyeOff`).
- Tratamento explícito de estados de carregamento em botões (`disabled` com spinner `Loader2`).
