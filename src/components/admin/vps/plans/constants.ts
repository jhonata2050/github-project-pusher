export const CYCLE_LABELS: Record<string, string> = {
  monthly: "mês",
  quarterly: "trimestre",
  semiannually: "semestre",
  annually: "ano",
  biennially: "2 anos",
};

export const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const formatBRL = (val: number | string) => brl.format(Number(val));

export const getPublicOrigin = () => (typeof window !== "undefined" ? window.location.origin : "");
