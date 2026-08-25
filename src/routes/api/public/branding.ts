import { createFileRoute } from '@tanstack/react-router';
import { getBrandingImplementation, updateBrandingImplementation } from '@/lib/admin.server';
import { createClient } from '@supabase/supabase-js';

export const Route = createFileRoute('/api/public/branding')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const branding = await getBrandingImplementation();
          return new Response(JSON.stringify(branding), {
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'public, max-age=300',
            },
          });
        } catch (error) {
          console.error('[API Branding] Error:', error);
          return new Response(JSON.stringify({ error: 'Failed to fetch branding' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      },
      POST: async ({ request }) => {
        try {
          const authHeader = request.headers.get('Authorization');
          if (!authHeader?.startsWith('Bearer ')) {
            return new Response('Unauthorized', { status: 401 });
          }
          const token = authHeader.replace('Bearer ', '');
          
          const supabase = createClient(
            process.env['SUPABASE_URL']!,
            process.env['SUPABASE_PUBLISHABLE_KEY']!,
            {
              global: { headers: { Authorization: `Bearer ${token}` } }
            }
          );
          
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError || !user) return new Response('Unauthorized', { status: 401 });

          const body = await request.json();
          
          // Pegando claims para auditoria
          const { data: claimsData } = await supabase.auth.getClaims(token);

          const result = await updateBrandingImplementation(body, { 
            supabase, 
            userId: user.id, 
            claims: claimsData?.claims || { email: user.email }
          });
          
          return new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (error: any) {
          console.error('[API Branding POST] Error:', error);
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
    },
  },
});
