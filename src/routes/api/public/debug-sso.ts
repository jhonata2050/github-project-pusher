import { createFileRoute } from '@tanstack/react-router'
import { getDASession } from '@/lib/directadmin.server'

export const Route = createFileRoute('/api/public/debug-sso')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const serverId = url.searchParams.get('serverId')
        const targetUser = url.searchParams.get('targetUser')

        if (!serverId || !targetUser) {
          return new Response('Missing serverId or targetUser', { status: 400 })
        }

        try {
          const ssoUrl = await getDASession(serverId, targetUser)
          return new Response(JSON.stringify({ ssoUrl }), {
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
