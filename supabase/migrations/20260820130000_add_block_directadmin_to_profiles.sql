ALTER TABLE public.profiles ADD COLUMN block_directadmin BOOLEAN DEFAULT false;

-- Permitir que administradores leiam e escrevam este campo
-- GRANT ALL ON public.profiles TO authenticated; -- Já deve existir, mas reforçando o acesso ao campo
