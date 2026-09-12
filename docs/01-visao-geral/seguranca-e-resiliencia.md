# Segurança, Resiliência e Isolamento

A segurança e a integridade operacional do **Painel EQSAM** são regidas pelo princípio do **Fail-Closed (Bloqueio por Padrão)** e pela defesa em profundidade em todas as camadas de software, rede e armazenamento.

---

## 🛡️ Princípios Fundamentais de Segurança

1. **Fail-Closed:** Na ausência de permissões explícitas ou na ocorrência de qualquer anomalia de rede ou autenticação, a ação é abortada com erro e o acesso é negado.
2. **Menor Privilégio (Least Privilege):** Contêineres de clientes rodam sem privilégios de `root` sempre que possível, as portas de bancos de dados internos nunca são expostas na rede pública e o acesso ao filesystem é estritamente enclausurado em diretórios chroot.
3. **Isolamento Multi-Tenant:** Um cliente não pode, sob nenhuma hipótese, listar contêineres de outros usuários, inspecionar volumes alheios ou emitir comandos contra serviços de terceiros.

---

## 👥 Controle de Acesso Baseado em Papéis (RBAC) & RLS

A segurança de dados é garantida na raiz do banco de dados através de **Row Level Security (RLS)** no PostgreSQL.

### Papéis Definidos no Sistema:
```sql
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'client');
```

- **`client` (Cliente):** Acesso restrito aos próprios serviços (`services`), aplicações (`applications`), faturas (`invoices`), domínios (`domains`) e tickets de suporte (`tickets`). O token JWT assinado pela auth do Supabase valida o `auth.uid() = user_id`.
- **`staff` (Suporte / Operador):** Permissão de leitura e atendimento em todos os chamados de suporte, visualização de logs operacionais e verificação de métricas globais sem autorização para manipular credenciais sensíveis de cluster ou faturas.
- **`admin` (Super Administrador):** Controle irrestrito sobre servidores SSH, grupos de produtos, configurações de gateway, cupons, personalização de marca e auditoria completa.

### Funções de Verificação Seguras (Security Definer):
```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','staff')
  )
$$;
```

---

## 🗄️ Blindagem do Gerenciador de Arquivos (Chroot Sandbox)

O módulo do **Web File Manager** (`src/lib/file-manager/security.ts`) implementa uma das mais rigorosas barreiras de segurança contra ataques de **Path Traversal**, **Symlink Escape** e **Poison Null Byte**:

### Camadas de Validação do Caminho:
1. **Sanitização de Null Bytes:** Rejeição imediata de caracteres nulos (`\0`) e de controle (`[\x00-\x1f\x7f]`).
2. **Decodificação Dupla de URL:** Protege contra bypass de codificação múltipla (ex: `%252e%252e%252f` -> `../`).
3. **Resolução Canônica de Limite:** O caminho requisitado é resolvido em conjunto com a raiz isolada do cliente (`storage/apps/<appId>/public_html`):
   ```typescript
   const relCheck = path.relative(clientRoot, resolved);
   if (relCheck.startsWith("..") || path.isAbsolute(relCheck)) {
     throw new Error(`Acesso negado: Tentativa de path traversal bloqueada (${requestedRelativePath}).`);
   }
   ```
4. **Symlink Escape Check:** Se o arquivo ou diretório existir, `fs.realpath()` é executado para verificar se o link simbólico não aponta para diretórios críticos do servidor host (como `/etc/passwd` ou `C:\Windows`). Se o caminho real não começar estritamente com `clientRoot`, a requisição é interceptada.

---

## 🔒 Sanitização Automática de Logs e Segredos

Para evitar vazamento acidental de dados confidenciais em logs de auditoria, console de depuração ou saídas de erro, o painel utiliza o filtro `src/lib/secret-sanitizer.ts`:

- **Padrões Mascarados:**
  - Senhas de banco de dados (`POSTGRES_PASSWORD`, `MYSQL_PASSWORD`, `REDIS_PASSWORD`).
  - Chaves de API e tokens (`RESEND_API_KEY`, `EVOLUTION_API_KEY`, `JWT_SECRET`, Bearer Tokens).
  - Certificados e chaves privadas SSH (`-----BEGIN OPENSSH PRIVATE KEY-----`).
  - Strings de conexão URI (`postgres://user:password@host:port/db`).

Qualquer ocorrência desses formatos em comandos remotos é substituída em memória pela string `[REDACTED_SECRET]` antes da escrita em log ou transmissão para o frontend.

---

## 🌐 Isolamento de Redes no Docker Swarm

O Painel EQSAM isola rigorosamente as redes de contêineres:

```mermaid
graph LR
    subgraph Internet
        User((Usuário Final))
    end

    subgraph "Nó Swarm"
        Traefik[Traefik Ingress: Porta 80 / 443]
        
        subgraph Overlay: traefik-public
            WebFront[Aplicação Web / Nginx / Next.js]
        end
        
        subgraph "Rede Privada Interna (App Network)"
            WebBack[Backend / Node / PHP]
            InternalDB[(Postgres / MySQL / Redis)]
        end
    end

    User -->|HTTPS Público| Traefik
    Traefik -->|Roteamento Seguro| WebFront
    WebFront -->|Chamada de API Interna| WebBack
    WebBack -->|Acesso Exclusivo à Rede Interna| InternalDB
    
    InternalDB -. Porta Bloqueada para o Host .-> Traefik
```

- A rede overlay `traefik-public` conecta apenas a porta web dos contêineres públicos ao Traefik.
- Bancos de dados de suporte (Postgres, MySQL, Redis) residem em redes internas virtuais ou são limitados ao escopo do serviço, impossibilitando que clientes vizinhos ou usuários externos façam varreduras de porta ou ataques de força bruta contra portas internas como `5432` ou `6379`.
