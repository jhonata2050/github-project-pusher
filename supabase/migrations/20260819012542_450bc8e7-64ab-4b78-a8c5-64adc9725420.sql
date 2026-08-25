DELETE FROM public.system_settings 
WHERE key IN (
    'abacatepay_api_key', 
    'abacatepay_webhook_secret', 
    'stripe_webhook_secret', 
    'mercadopago_access_token', 
    'mercadopago_public_key', 
    'mercadopago_webhook_secret', 
    'woovi_webhook_secret', 
    'cajupay_base_url'
) AND (value::text = '""' OR value::text = 'null');