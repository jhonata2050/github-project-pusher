import { DeploymentDiagnostic } from "./types";

export class DeploymentDiagnosticsService {
  /**
   * Analisa logs de build, logs de runtime ou erros de rede e produz um diagnóstico amigável
   */
  public static diagnose(rawErrorOrLogs: string, context?: { appId?: string; appName?: string; port?: number }): DeploymentDiagnostic {
    const text = String(rawErrorOrLogs || "");

    // 1. Erro de Conexão Recusada (Banco de dados ou Microsserviço)
    if (text.includes("ECONNREFUSED") || text.includes("connection refused") || text.includes("Connection refused")) {
      let serviceName = "banco de dados ou serviço externo";
      if (text.includes("5432")) serviceName = "PostgreSQL (porta 5432)";
      else if (text.includes("3306")) serviceName = "MySQL / MariaDB (porta 3306)";
      else if (text.includes("6379")) serviceName = "Redis (porta 6379)";
      else if (text.includes("27017")) serviceName = "MongoDB (porta 27017)";

      return {
        code: "ERR_CONN_REFUSED",
        title: "Aplicação não conseguiu conectar ao serviço dependente",
        description: `O container iniciou, mas o processo foi encerrado ao tentar se conectar em ${serviceName}.`,
        possibleCause: `A variável de conexão (ex: DATABASE_URL, DB_HOST) pode estar incorreta, apontando para 127.0.0.1 em vez do IP/host do cluster, ou o banco ainda não está pronto.`,
        action: {
          label: "Configurar Variáveis de Conexão",
          type: "configure_env",
        },
        technicalError: text.slice(0, 300),
        timestamp: new Date().toISOString(),
      };
    }

    // 2. Erro 502 Bad Gateway no Proxy Traefik
    if (text.includes("502") || text.includes("Bad Gateway") || text.includes("isProxyError")) {
      return {
        code: "ERR_BAD_GATEWAY_502",
        title: "Proxy reverso não conseguiu alcançar a aplicação",
        description: "O container está rodando, mas o proxy Traefik não obteve resposta na porta configurada.",
        possibleCause: "A aplicação pode estar escutando apenas em 'localhost' (127.0.0.1) em vez de '0.0.0.0', ou a porta configurada no painel não corresponde à porta real do servidor.",
        action: {
          label: "Garantir Host 0.0.0.0 e Verificar Porta",
          type: "fix_port",
          payload: { port: context?.port },
        },
        technicalError: text.slice(0, 300),
        timestamp: new Date().toISOString(),
      };
    }

    // 3. Módulo ou Dependência Não Encontrada
    if (text.includes("MODULE_NOT_FOUND") || text.includes("Cannot find module") || text.includes("Module not found")) {
      return {
        code: "ERR_MODULE_NOT_FOUND",
        title: "Dependência ausente no projeto",
        description: "O runtime tentou carregar uma biblioteca que não está instalada no ambiente.",
        possibleCause: "O pacote pode não estar listado na seção 'dependencies' do package.json ou o comando de build não executou a instalação correta.",
        action: {
          label: "Verificar package.json e Logs de Build",
          type: "view_logs",
        },
        technicalError: text.slice(0, 300),
        timestamp: new Date().toISOString(),
      };
    }

    // 4. Falha de Variável Obrigatória Ausente
    if (text.includes("missing required") || text.includes("DATABASE_URL") || text.includes("is required") || text.includes("DISCORD_TOKEN")) {
      return {
        code: "ERR_MISSING_ENV",
        title: "Variável de ambiente obrigatória não configurada",
        description: "A aplicação foi encerrada porque uma variável essencial não foi informada.",
        possibleCause: "Chaves de API, tokens de bots ou URLs de banco de dados precisam ser inseridos na aba de Variáveis.",
        action: {
          label: "Configurar Variáveis Agora",
          type: "configure_env",
        },
        technicalError: text.slice(0, 300),
        timestamp: new Date().toISOString(),
      };
    }

    // 5. Porta já em uso
    if (text.includes("EADDRINUSE") || text.includes("address already in use")) {
      return {
        code: "ERR_ADDR_IN_USE",
        title: "Porta em conflito ou já em uso",
        description: "O processo tentou escutar em uma porta que já está ocupada dentro do container.",
        possibleCause: "Existem múltiplos processos tentando escutar na mesma porta ou o comando de start iniciou o servidor duas vezes.",
        action: {
          label: "Verificar Script de Inicialização",
          type: "fix_port",
        },
        technicalError: text.slice(0, 300),
        timestamp: new Date().toISOString(),
      };
    }

    // 6. Falha Genérica de Healthcheck
    if (text.includes("healthcheck") || text.includes("Healthcheck")) {
      return {
        code: "ERR_HEALTHCHECK_FAILED",
        title: "Validação de integridade da aplicação falhou",
        description: "O container foi iniciado, mas o teste de resposta interna não retornou status de sucesso.",
        possibleCause: "A rota testada (ex: '/') pode estar retornando erro 500 ou demorando mais tempo para carregar do que o timeout configurado.",
        action: {
          label: "Consultar Logs do Container",
          type: "view_logs",
        },
        technicalError: text.slice(0, 300),
        timestamp: new Date().toISOString(),
      };
    }

    // 7. Diagnóstico Padrão
    return {
      code: "ERR_GENERIC_DEPLOY",
      title: "Falha durante a execução do deploy",
      description: "O processo foi interrompido antes de atingir o estado de operação saudável.",
      possibleCause: "Verifique os logs detalhados do build e do container para mais informações técnicas.",
      action: {
        label: "Ver Logs Técnicos",
        type: "view_logs",
      },
      technicalError: text.slice(0, 300),
      timestamp: new Date().toISOString(),
    };
  }
}
