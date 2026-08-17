export async function handleGatewayError(res: Response, gatewayName: string) {
  let detail = "";
  try {
    const text = await res.text();
    detail = text.slice(0, 200);
    // Tenta parsear JSON para extrair mensagens de erro específicas se houver
    const json = JSON.parse(text);
    if (json.error?.message) detail = json.error.message;
    else if (json.message) detail = json.message;
    else if (json.error_description) detail = json.error_description;
  } catch (e) {
    // Se não for JSON ou falhar, mantém o text.slice
  }

  if (res.status === 401 || res.status === 403) {
    return `${gatewayName}: Credenciais inválidas ou sem permissão (HTTP ${res.status}).`;
  }
  if (res.status === 404) {
    return `${gatewayName}: Endpoint da API não encontrado (HTTP 404).`;
  }
  if (res.status >= 500) {
    return `${gatewayName}: O servidor do gateway está instável (HTTP ${res.status}).`;
  }

  return `${gatewayName}: Erro na validação (HTTP ${res.status})${detail ? ` - ${detail}` : ""}`;
}
