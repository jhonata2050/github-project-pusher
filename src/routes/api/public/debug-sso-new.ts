import { createFileRoute } from '@tanstack/react-router'
import { callDA } from '@/lib/directadmin.server'
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute('/api/public/debug-sso-new')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const serverId = url.searchParams.get('serverId')
        const targetUser = url.searchParams.get('targetUser')

        if (!serverId || !targetUser) return new Response('Missing params', { status: 400 })

        const { data: server } = await supabaseAdmin.from("servers").select("*").eq("id", serverId).single();
        if (!server) return new Response('Server not found', { status: 404 })

        try {
          // Testando o endpoint moderno /api/login/url
          const result = await callDA({
            hostname: server.hostname,
            apiUser: server.api_user ?? "",
            apiToken: server.api_token ?? "",
            command: 'api/login/url', // Removendo o CMD_ inicial para usar o endpoint moderno
            method: 'POST',
            params: {
              user: targetUser,
              expiry: '10m'
            }
          });
          
          return new Response(JSON.stringify({ result }), {
            headers: { 'Content-Type': 'application/json' }
          })
        } catch (e: any) {
          return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          })
        }
      }
    }
  }
})
