import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { supabaseAdmin } from '@/integrations/supabase/client.server'

export const Route = createFileRoute('/api/public/password-reset')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { email } = await request.json()
          
          if (!email || !z.string().email().safeParse(email).success) {
            return new Response(JSON.stringify({ error: 'E-mail inválido' }), { 
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            })
          }

          const forwarded = request.headers.get('x-forwarded-for')
          const ipAddress = forwarded?.split(',')[0]?.trim() || request.headers.get('cf-connecting-ip')
          await supabaseAdmin.from('audit_logs').insert({
            category: 'auth',
            action: 'password_reset.requested',
            status: 'success',
            actor_email: email,
            description: 'Recuperação de senha solicitada',
            ip_address: ipAddress,
            user_agent: request.headers.get('user-agent')?.slice(0, 500) || null,
          })

          // Supabase handle password reset email
          const { error } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email: email,
            options: {
              redirectTo: `${new URL(request.url).origin}/auth/reset-password`
            }
          })

          if (error) {
            console.error('[PasswordReset] Error:', error)
            await supabaseAdmin.from('audit_logs').insert({
              category: 'auth',
              action: 'password_reset.failed',
              status: 'failure',
              actor_email: email,
              description: 'Falha interna ao gerar recuperação de senha',
              ip_address: ipAddress,
              user_agent: request.headers.get('user-agent')?.slice(0, 500) || null,
            })
            // We return 200 even on error to avoid email enumeration
          }

          return new Response(JSON.stringify({ success: true }), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        } catch (err) {
          return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 })
        }
      }
    }
  }
})
