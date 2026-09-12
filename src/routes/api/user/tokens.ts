import { createFileRoute } from '@tanstack/react-router';
import { extractAndVerifyUser } from '@/lib/file-manager/security';
import { listUserApiTokens, createApiToken, revokeApiToken } from '@/lib/api-tokens.server';

export const Route = createFileRoute('/api/user/tokens')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const userId = await extractAndVerifyUser(request);
          const tokens = await listUserApiTokens(userId);
          return new Response(JSON.stringify({ success: true, tokens }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (error: any) {
          return new Response(JSON.stringify({ error: error.message || 'Não autorizado' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      },
      POST: async ({ request }) => {
        try {
          const userId = await extractAndVerifyUser(request);
          const body = await request.json().catch(() => ({}));
          const { name, expiresInDays } = body;

          if (!name || typeof name !== 'string') {
            return new Response(JSON.stringify({ error: 'Nome do token é obrigatório.' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            });
          }

          const result = await createApiToken(userId, name, expiresInDays);
          return new Response(
            JSON.stringify({
              success: true,
              token: result.token,
              info: result.info,
              message: 'Token gerado com sucesso! Guarde este token agora, ele não será exibido novamente.',
            }),
            {
              status: 201,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        } catch (error: any) {
          return new Response(JSON.stringify({ error: error.message || 'Erro ao gerar token' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      },
      DELETE: async ({ request }) => {
        try {
          const userId = await extractAndVerifyUser(request);
          const url = new URL(request.url);
          const tokenId = url.searchParams.get('id');

          if (!tokenId) {
            return new Response(JSON.stringify({ error: 'Parâmetro ?id é obrigatório.' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            });
          }

          const revoked = await revokeApiToken(userId, tokenId);
          return new Response(JSON.stringify({ success: revoked }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (error: any) {
          return new Response(JSON.stringify({ error: error.message || 'Erro ao revogar token' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      },
    },
  },
});
