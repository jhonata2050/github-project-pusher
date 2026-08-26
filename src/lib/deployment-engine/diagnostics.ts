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

    // 6. Falha de Autenticação em Banco de Dados
    if (
      text.includes("password authentication failed") ||
      text.includes("Access denied for user") ||
      text.includes("NOAUTH Authentication required") ||
      text.includes("auth failed")
    ) {
      return {
        code: "ERR_DB_AUTH_FAILED",
        title: "Falha de autenticação com o banco de dados",
        description: "O usuário ou a senha informada foram recusados pelo servidor de banco de dados.",
        possibleCause: "As credenciais inseridas na connection string ou nas variáveis POSTGRES_PASSWORD/MYSQL_PASSWORD/REDIS_PASSWORD estão incorretas.",
        action: {
          label: "Verificar Credenciais de Conexão",
          type: "configure_env",
        },
        technicalError: text.slice(0, 300),
        timestamp: new Date().toISOString(),
      };
    }

    // 7. Falha de Disco / Storage Cheio
    if (
      text.includes("No space left on device") ||
      text.includes("disk quota exceeded") ||
      text.includes("could not extend file")
    ) {
      return {
        code: "ERR_DISK_FULL",
        title: "Armazenamento do volume de dados esgotado",
        description: "O banco de dados não conseguiu gravar dados porque o volume atingiu a capacidade máxima.",
        possibleCause: "A quota de armazenamento do serviço foi atingida ou o disco do servidor hospedeiro está lotado.",
        action: {
          label: "Aumentar Limite de Storage",
          type: "view_database",
        },
        technicalError: text.slice(0, 300),
        timestamp: new Date().toISOString(),
      };
    }

    // 8. Falha de Memória (OOM / Out of Memory)
    if (
      text.includes("Cannot allocate memory") ||
      text.includes("Out of memory") ||
      text.includes("OOMKilled") ||
      text.includes("JavaScript heap out of memory")
    ) {
      return {
        code: "ERR_OUT_OF_MEMORY",
        title: "Limite de memória RAM excedido",
        description: "O container foi encerrado pelo sistema operacional por ultrapassar a memória alocada.",
        possibleCause: "O consumo de memória da aplicação ou banco de dados ultrapassou o limite configurado no plano.",
        action: {
          label: "Aumentar Limite de RAM",
          type: "view_logs",
        },
        technicalError: text.slice(0, 300),
        timestamp: new Date().toISOString(),
      };
    }

    // 9. Falha Genérica de Healthcheck
    if (text.includes("healthcheck") || text.includes("Healthcheck")) {
      return {
        code: "ERR_HEALTHCHECK_FAILED",
        title: "Aplicação não respondeu às sondas de saúde",
        description: "O container foi iniciado, mas falhou repetidamente nas verificações automáticas de integridade.",
        possibleCause: "O processo pode ter entrado em deadlock, demorado mais tempo para inicializar do que o tempo limite (startPeriod) ou a rota de status não retornou HTTP 200.",
        action: {
          label: "Inspecionar Logs do Container",
          type: "view_logs",
        },
        technicalError: text.slice(0, 300),
        timestamp: new Date().toISOString(),
      };
    }

    // 10. Diagnóstico Padrão
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
