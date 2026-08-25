import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Utilitário para validação de assinaturas de webhook.
 */
export function verifyHmacSignature(
  body: string,
  signature: string | null | undefined,
  secret: string | null | undefined,
  headerPrefix: string = ''
): boolean {
  if (!signature || !secret || !body) return false;
  
  const cleanSignature = headerPrefix ? signature.replace(headerPrefix, '') : signature;
  
  try {
    const hmac = createHmac('sha256', secret);
    const expected = hmac.update(body).digest('hex');
    
    // Usar timingSafeEqual para evitar ataques de temporização
    return timingSafeEqual(
      Buffer.from(cleanSignature, 'utf8'),
      Buffer.from(expected, 'utf8')
    );
  } catch (e) {
    console.error('[Webhook] Erro na validação de assinatura:', e);
    return false;
  }
}

/**
 * Validação específica para Stripe (simplificada sem biblioteca oficial)
 */
export function verifyStripeSignature(
  body: string,
  signature: string | null | undefined,
  secret: string | null | undefined
): boolean {
  if (!signature || !secret || !body) return false;

  // Stripe signature format: t=timestamp,v1=signature
  const parts = signature.split(',');
  const timestamp = parts.find(p => p.startsWith('t='))?.split('=')[1];
  const v1 = parts.find(p => p.startsWith('v1='))?.split('=')[1];

  if (!timestamp || !v1) return false;

  const signedPayload = `${timestamp}.${body}`;
  const hmac = createHmac('sha256', secret);
  const expected = hmac.update(signedPayload).digest('hex');

  return timingSafeEqual(
    Buffer.from(v1, 'utf8'),
    Buffer.from(expected, 'utf8')
  );
}
