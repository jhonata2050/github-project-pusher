/**
 * Parser de CSV seguro para uso no navegador.
 * Processa o texto em blocos para evitar erros de memória (RangeError)
 * ao lidar com dumps completos de tabelas do WHMCS.
 */
export function parseCsv(text: unknown): Record<string, string>[] {
  if (typeof text !== "string" || text.length === 0) return [];
  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const lines: string[][] = [];
  let currentLine: string[] = [];
  let currentField: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean.charAt(i);

    if (inQuotes) {
      if (char === '"') {
        if (clean.charAt(i + 1) === '"') {
          currentField.push('"');
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField.push(char);
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === "," || char === ";") {
      currentLine.push(currentField.join(""));
      currentField = [];
    } else if (char === "\n") {
      currentLine.push(currentField.join(""));
      currentField = [];
      lines.push(currentLine);
      currentLine = [];
    } else {
      currentField.push(char);
    }
  }

  if (currentField.length > 0 || currentLine.length > 0) {
    currentLine.push(currentField.join(""));
    lines.push(currentLine);
  }

  const nonEmpty = lines.filter((l) => l.some((v) => v.trim() !== ""));
  const firstLine = nonEmpty[0];
  if (!firstLine) return [];

  const headers = firstLine.map((h) => h.trim().toLowerCase());
  const out: Record<string, string>[] = [];
  for (let r = 1; r < nonEmpty.length; r++) {
    const row = nonEmpty[r]!;
    const obj: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]!] = (row[c] ?? "").trim();
    }
    out.push(obj);
  }
  return out;
}

/** Divide uma lista em lotes de tamanho fixo. */
export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}
