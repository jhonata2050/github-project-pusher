import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface InvoicePDFData {
  invoice: {
    id: string;
    total_amount: number;
    status: string;
    due_date: string;
    paid_at?: string | null;
    payment_method?: string | null;
    created_at?: string | null;
    items?: Array<{
      id?: string;
      description?: string;
      amount?: number;
    }>;
  };
  client?: {
    full_name?: string | null;
    email?: string | null;
    document?: string | null;
    phone?: string | null;
    address?: string | null;
  } | null;
  branding?: {
    app_name?: string;
    company_name?: string;
    company_document?: string;
    support_email?: string;
    website?: string;
    logo_url?: string | null;
    primary_color?: string;
    brand_color?: string;
  };
  financialSummary?: {
    originalAmount?: number;
    lateFee?: number;
    interest?: number;
    discount?: number;
    finalAmount?: number;
  };
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

// Helper to convert color strings (hex, rgb, oklch) to RGB array
function parseColorToRGB(colorStr?: string, defaultRGB: [number, number, number] = [30, 41, 59]): [number, number, number] {
  if (!colorStr) return defaultRGB;
  
  // Hex format #RRGGBB
  if (colorStr.startsWith("#")) {
    const hex = colorStr.replace("#", "");
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return [r, g, b];
    }
  }
  
  // RGB format rgb(r, g, b)
  if (colorStr.startsWith("rgb")) {
    const parts = colorStr.replace(/rgba?\(|\)/g, "").split(",");
    if (parts.length >= 3) {
      const r = parseInt(parts[0].trim(), 10);
      const g = parseInt(parts[1].trim(), 10);
      const b = parseInt(parts[2].trim(), 10);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return [r, g, b];
    }
  }

  // Se for o verde característico Eqsam / Tailwind Lime/Emerald
  if (colorStr.includes("148") || colorStr.includes("128") || colorStr.includes("lime") || colorStr.includes("brand")) {
    return [101, 163, 13]; // lime-600 #65a30d
  }

  return defaultRGB;
}

// Load image helper
async function loadImageAsBase64(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => resolve(null);
      img.src = url;
    } catch {
      resolve(null);
    }
  });
}

export async function generateInvoicePDF(data: InvoicePDFData, isReceipt = false) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const { invoice, client, branding, financialSummary } = data;
  const appName = branding?.app_name || "EQSAM";
  const companyName = branding?.company_name || appName;
  const supportEmail = branding?.support_email || "suporte@eqsam.com";
  const isPaid = invoice.status === "paid" || isReceipt;

  // System Palette
  const brandColor = parseColorToRGB(branding?.brand_color, [101, 163, 13]); // Eqsam Lime #65a30d
  const headerDarkBg = [15, 23, 42]; // Slate-900 #0f172a
  const darkTextColor = [15, 23, 42];
  const mutedTextColor = [100, 116, 139];
  const paidColor = [22, 163, 74]; // Emerald-600 #16a34a
  const pendingColor = [217, 119, 6]; // Amber-600 #d97706

  // 1. Top Header Banner com Fundo Escuro Moderno
  doc.setFillColor(headerDarkBg[0], headerDarkBg[1], headerDarkBg[2]);
  doc.rect(0, 0, 210, 38, "F");

  // Linha de Destaque da Cor da Marca no topo
  doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
  doc.rect(0, 0, 210, 2.5, "F");

  let hasImageLogo = false;
  if (branding?.logo_url) {
    try {
      const base64Logo = await loadImageAsBase64(branding.logo_url);
      if (base64Logo) {
        doc.addImage(base64Logo, "PNG", 15, 8, 38, 22, undefined, "FAST");
        hasImageLogo = true;
      }
    } catch (e) {
      console.warn("Falha ao embutir logo no PDF:", e);
    }
  }

  // Se não houver logo em imagem, renderiza logotipo tipográfico com badge da marca
  if (!hasImageLogo) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text(appName, 15, 18);

    doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.roundedRect(15, 22, 32, 6, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text("CLOUD HOSTING", 17, 26);
  }

  // Título e Status no Header (Lado Direito)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  const docTitle = isPaid ? "RECIBO DE QUITAÇÃO" : "FATURA DE SERVIÇOS";
  doc.text(docTitle, 195, 16, { align: "right" });

  // Badge de Status Colorido no Header
  const statusBadgeBg = isPaid ? [22, 163, 74] : [217, 119, 6];
  const statusText = isPaid ? "PAGO / QUITADO" : "AGUARDANDO PAGAMENTO";
  doc.setFillColor(statusBadgeBg[0], statusBadgeBg[1], statusBadgeBg[2]);
  doc.roundedRect(145, 21, 50, 6.5, 1.5, 1.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(statusText, 170, 25.5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`Fatura #${invoice.id.slice(0, 8).toUpperCase()}`, 195, 33, { align: "right" });

  let y = 46;

  // 2. Boxes de Dados do Cliente e Cobrança
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, y, 88, 38, 3, 3, "FD");
  doc.roundedRect(107, y, 88, 38, 3, 3, "FD");

  // Faixa de destaque lateral nos cards
  doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
  doc.roundedRect(15, y, 2, 38, 1, 1, "F");
  doc.roundedRect(107, y, 2, 38, 1, 1, "F");

  // Left: Cliente
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text("DADOS DO CLIENTE", 21, y + 7.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text(`Nome: ${client?.full_name || "Cliente"}`, 21, y + 15);
  doc.text(`E-mail: ${client?.email || "-"}`, 21, y + 21);
  if (client?.document) {
    doc.text(`Documento: ${client.document}`, 21, y + 27);
  }
  if (client?.phone) {
    doc.text(`Telefone: ${client.phone}`, 21, y + 33);
  }

  // Right: Datas e Meio de Pagamento
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text("DETALHES DA FATURA", 113, y + 7.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);

  const createdDate = invoice.created_at ? format(new Date(invoice.created_at), "dd/MM/yyyy", { locale: ptBR }) : "-";
  const dueDate = invoice.due_date ? format(new Date(invoice.due_date), "dd/MM/yyyy", { locale: ptBR }) : "-";
  const paidDate = invoice.paid_at ? format(new Date(invoice.paid_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : null;

  doc.text(`Data de Emissão: ${createdDate}`, 113, y + 15);
  doc.text(`Vencimento: ${dueDate}`, 113, y + 21);
  if (paidDate) {
    doc.text(`Liquidado em: ${paidDate}`, 113, y + 27);
  }
  if (invoice.payment_method) {
    doc.text(`Forma de Pagamento: ${invoice.payment_method.toUpperCase()}`, 113, y + (paidDate ? 33 : 27));
  }

  y += 46;

  // 3. Tabela de Itens da Fatura
  doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
  doc.roundedRect(15, y, 180, 8, 1.5, 1.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text("DISCRIMINAÇÃO DO SERVIÇO / PRODUTO", 20, y + 5.5);
  doc.text("TOTAL", 190, y + 5.5, { align: "right" });

  y += 8;

  const items = invoice.items && invoice.items.length > 0
    ? invoice.items
    : [{ description: "Assinatura de Serviços Hospedagem / Cloud", amount: invoice.total_amount }];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  items.forEach((item, index) => {
    const isEven = index % 2 === 0;
    if (isEven) {
      doc.setFillColor(248, 250, 252);
      doc.rect(15, y, 180, 8.5, "F");
    }

    doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
    doc.text(item.description || "Item de Serviço", 20, y + 5.5);
    doc.setFont("helvetica", "bold");
    doc.text(brl.format(Number(item.amount || 0)), 190, y + 5.5, { align: "right" });
    doc.setFont("helvetica", "normal");

    y += 8.5;
  });

  doc.setDrawColor(226, 232, 240);
  doc.line(15, y, 195, y);
  y += 6;

  // 4. Resumo Financeiro
  const summaryX = 115;
  const summaryWidth = 80;

  const originalAmt = financialSummary?.originalAmount ?? invoice.total_amount;
  const lateFee = financialSummary?.lateFee ?? 0;
  const interest = financialSummary?.interest ?? 0;
  const discount = financialSummary?.discount ?? 0;
  const finalAmt = financialSummary?.finalAmount ?? invoice.total_amount;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);

  doc.text("Subtotal:", summaryX, y);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text(brl.format(originalAmt), 190, y, { align: "right" });
  y += 6;

  if (lateFee > 0) {
    doc.setTextColor(220, 38, 38);
    doc.text("Multa por Atraso:", summaryX, y);
    doc.text(`+ ${brl.format(lateFee)}`, 190, y, { align: "right" });
    y += 6;
  }

  if (interest > 0) {
    doc.setTextColor(220, 38, 38);
    doc.text("Juros de Mora:", summaryX, y);
    doc.text(`+ ${brl.format(interest)}`, 190, y, { align: "right" });
    y += 6;
  }

  if (discount > 0) {
    doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.text("Desconto Aplicado:", summaryX, y);
    doc.text(`- ${brl.format(discount)}`, 190, y, { align: "right" });
    y += 6;
  }

  // Caixa de Total com Fundo de Destaque
  doc.setFillColor(headerDarkBg[0], headerDarkBg[1], headerDarkBg[2]);
  doc.roundedRect(summaryX - 5, y, summaryWidth + 5, 11, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("VALOR TOTAL:", summaryX, y + 7);

  doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
  doc.setFontSize(11);
  doc.text(brl.format(finalAmt), 190, y + 7, { align: "right" });

  y += 24;

  // 5. Carimbo de Quitação ou Instruções
  if (isPaid) {
    doc.setDrawColor(22, 163, 74);
    doc.setFillColor(240, 253, 244); // green-50
    doc.setLineWidth(1.2);
    doc.roundedRect(15, y, 180, 26, 3, 3, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(22, 163, 74);
    doc.text("✓ COMPROVANTE DE QUITAÇÃO ELETRÔNICA", 22, y + 9);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor( darkTextColor[0], darkTextColor[1], darkTextColor[2] );
    doc.text(`Identificador da Transação: ${invoice.id}`, 22, y + 16);
    doc.text(`Serviço liberado e ativo em conformidade com os termos da ${companyName}.`, 22, y + 21);
  } else {
    doc.setFillColor(254, 243, 199); // amber-100
    doc.setDrawColor(245, 158, 11);
    doc.roundedRect(15, y, 180, 24, 3, 3, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(180, 83, 9);
    doc.text("INSTRUÇÕES DE PAGAMENTO", 22, y + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(146, 64, 14);
    doc.text("Efetue o pagamento por Pix ou Cartão diretamente pelo painel do cliente.", 22, y + 13);
    doc.text("A baixa é realizada instantaneamente e o seu serviço é ativado ou renovado de forma automática.", 22, y + 18);
  }

  // 6. Rodapé com Informações da Empresa e Horário
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
  doc.text(
    `${companyName} • Suporte: ${supportEmail} • Emitido em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm:ss")}`,
    105,
    285,
    { align: "center" }
  );

  const filename = isReceipt ? `Recibo-${invoice.id.slice(0, 8)}.pdf` : `Fatura-${invoice.id.slice(0, 8)}.pdf`;
  doc.save(filename);
}
