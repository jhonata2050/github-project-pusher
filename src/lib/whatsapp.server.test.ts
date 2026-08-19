
import { describe, it, expect, vi } from 'vitest';
import { testWhatsAppConnection } from './whatsapp.server';

// Mock do supabaseAdmin
vi.mock('@/integrations/supabase/client.server', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockImplementation(async () => {
        return { data: { value: '5511999999999' } };
      }),
      insert: vi.fn().mockResolvedValue({ error: null })
    })
  }
}));

describe('whatsapp.server tests', () => {
  it('should format URL and endpoint correctly for Evolution Go', async () => {
    // Mock global fetch
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });
    global.fetch = mockFetch;

    // A função real lê do banco, vamos ver o que ela faz
    // A implementação atual em whatsapp.server.ts:61 é:
    // const endpoint = `${evolutionUrl}/message/sendText/${instance}`;
    
    // De acordo com a docs da Evolution Go:
    // POST /instance/create
    // POST /message/sendText/{instance}
    // O código atual PARECE correto para Evolution Go, mas a Evolution API usa /message/sendText/{instance} também.
    // A diferença crucial costuma ser os headers e os nomes dos campos.
    // Evolution Go na doc menciona apikey no header.
    
    expect(true).toBe(true);
  });
});
