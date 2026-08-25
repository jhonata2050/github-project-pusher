-- Corrigir relacionamento de email_logs para apontar para public.profiles
-- 1. Remover a constraint antiga se existir (ela aponta para auth.users)
ALTER TABLE public.email_logs DROP CONSTRAINT IF EXISTS email_logs_user_id_fkey;

-- 2. Adicionar a nova constraint apontando para public.profiles(id)
ALTER TABLE public.email_logs 
ADD CONSTRAINT email_logs_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. Garantir privilégios (já concedidos, mas para segurança)
GRANT SELECT, INSERT ON public.email_logs TO authenticated;
GRANT ALL ON public.email_logs TO service_role;
