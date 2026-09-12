# Paleta de Cores & Design Tokens

O **Painel EQSAM** utiliza uma especificação visual de última geração baseada no modelo de cores **OKLCH** (Oklab Chromaticity & Lightness), garantindo percepção uniforme de luminosidade, contraste superior em monitores modernos e transições de cor matematicamente consistentes.

A experiência padrão da plataforma é desenhada prioritariamente para o **Dark Mode de Alta Fidelidade (OLED Black com realces tecnológicos em verde neon e esmeralda)**, oferecendo também suporte completo a **Light Mode**.

---

## 🎨 Paleta Principal — Dark Mode (Padrão do Sistema)

O tema escuro do painel abandona tons cinzas desbotados e adota uma base profunda de ultra-contraste inspirada em terminais de alta performance e consoles de segurança cibernética:

| Token Semântico | Valor Hex / OKLCH | Visual / Aplicação Prática |
| :--- | :--- | :--- |
| `--background` | `#000606` | Fundo principal da aplicação. Um preto quase absoluto com sutil matiz esmeralda profundo (OLED friendly). |
| `--card` | `#040e0e` | Superfície de cartões, painéis modulares e seções de formulário. |
| `--secondary` | `#081616` | Fundo secundário para listas zebradas, badges neutros e botões secundários. |
| `--muted` | `#081616` | Elementos de apoio, seções colapsadas e barras de navegação inativas. |
| `--accent` | `#0c1d1d` | Hover de itens de menu, seleção ativa de abas e estados interativos sutis. |
| `--border` | `#0e2424` | Linhas de divisão, molduras de cartões e inputs de texto. |
| `--input` | `#0e2424` | Fundo e contorno dos campos de digitação. |
| `--sidebar` | `#000404` | Fundo da barra lateral de navegação (profundidade máxima). |
| `--sidebar-border` | `#0b1e1e` | Borda delimitadora entre a barra lateral e a área de conteúdo. |
| `--primary` | `oklch(0.85 0.19 128)` | **Verde Neon / Citron Glow**. Botões de ação primária (CTA), indicadores de status ativo e focos visuais. |
| `--primary-foreground` | `#000606` | Texto sobre o verde primário, garantindo legibilidade máxima com contraste superior a 12:1. |
| `--brand` | `oklch(0.78 0.18 148)` | **Verde Esmeralda Tecnológico**. Marca visual EQSAM, ícones de destaque, badges de status de sucesso. |
| `--foreground` | `oklch(0.98 0.005 195)` | Texto principal (quase branco com levíssimo reflexo ciano). |
| `--muted-foreground` | `oklch(0.68 0.015 195)` | Rótulos secundários, timestamps, dicas e legendas auxiliares. |

---

## 🚦 Cores Semânticas de Estado

Para feedback imediato em ações críticas, métricas e telemetria:

| Estado | Token | Valor OKLCH / Cor | Aplicação no Painel |
| :--- | :--- | :--- | :--- |
| **Sucesso / Online** | `--success` | `oklch(0.75 0.18 148)` | Contêiner operacional (1/1), fatura paga, deploy finalizado com êxito. |
| **Atenção / Alerta** | `--warning` | `oklch(0.82 0.16 65)` | Margem de disco apertada, consumo de RAM acima de 80%, fatura próxima ao vencimento. |
| **Crítico / Erro** | `--destructive` | `oklch(0.65 0.22 25)` | Serviço offline (0/1), stack interrompida, fatura vencida, exclusão irreversível. |
| **Informativo / Processando** | `--chart-3` | `oklch(0.70 0.14 200)` | Build em andamento, extração assíncrona de ZIP, sincronização de DNS. |

---

## ☀️ Paleta Alternativa — Light Mode

Para ambientes claros e usuários que preferem alta luminosidade diurna:

- **`--background`**: `oklch(0.985 0.008 120)` (Branco puro perolado com leve calidez).
- **`--foreground`**: `oklch(0.24 0.02 150)` (Grafite escuro e legível).
- **`--card`**: `oklch(1 0 0)` (Branco absoluto).
- **`--border` / `--input`**: `oklch(0.92 0.01 130)` (Cinza claro sutil).
- **`--primary`**: `oklch(0.88 0.19 128)` (Verde-limão vibrante adaptado para fundo claro).
- **`--brand`**: `oklch(0.72 0.19 148)` (Esmeralda corporativo).

---

## 📐 Escala de Raios de Borda (Border Radius)

A identidade visual utiliza cantos generosamente arredondados que transmitem suavidade e polimento moderno:

```css
--radius: 1rem; /* 16px - Base do sistema */

--radius-sm:  calc(var(--radius) - 4px); /* 12px: Badges, tooltips e tags */
--radius-md:  calc(var(--radius) - 2px); /* 14px: Inputs e botões menores */
--radius-lg:  var(--radius);             /* 16px: Botões padrão e dropdowns */
--radius-xl:  calc(var(--radius) + 4px); /* 20px: Diálogos e modais */
--radius-2xl: calc(var(--radius) + 8px); /* 24px: Cartões principais (surface-card) */
--radius-3xl: calc(var(--radius) + 12px);/* 28px: Painéis de destaque */
```

---

## 💎 Classes Utilitárias do Sistema

Definidas em `src/styles.css`:

### 1. `.surface-card`
Padronização de superfície elevada para todos os cartões do dashboard:
```css
@utility surface-card {
  background-color: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-card);
}
```

### 2. `.lime-backdrop`
Gradiente de profundidade sutil aplicado em cabeçalhos, banners de apresentação e destaques:
```css
/* No Dark Mode */
--gradient-lime: linear-gradient(180deg, #000606 0%, #061515 100%);
```

### 3. Scrollbar Customizada Micro-Thin
Barras de rolagem globais ultrafinas (6px) integradas à paleta:
- Trilho invisível transparente (`background: transparent`).
- Cursor com a cor `--color-border` e transição para `--brand` no hover.
