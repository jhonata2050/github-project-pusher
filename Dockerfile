# Multi-stage Dockerfile para Hosting Hub Pro (TanStack Start + Nitro)
FROM node:22-alpine AS builder

WORKDIR /app

# Instalar dependências necessárias para compilação nativa se houver
RUN apk add --no-cache libc6-compat

# Copiar arquivos de dependências
COPY package.json package-lock.json* ./

# Instalar dependências
RUN npm ci || npm install

# Copiar código fonte
COPY . .

# Argumentos de ambiente para compilação Vite se necessários
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV NODE_ENV=production

# Compilar aplicação com Nitro / TanStack Start
RUN npm run build

# Stage 2: Runner de Produção
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0

# Criar usuário não-root por segurança
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

# Copiar build e assets da stage anterior
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/node_modules ./node_modules

# Criar diretório de backups com permissões
RUN mkdir -p /app/backups && chown -R appuser:nodejs /app/backups

USER appuser

EXPOSE 8080

CMD ["node", ".output/server/index.mjs"]
