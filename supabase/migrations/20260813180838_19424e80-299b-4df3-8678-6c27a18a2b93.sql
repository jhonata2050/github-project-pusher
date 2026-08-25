-- Adicionar chave estrangeira explícita se faltar (profiles usa o mesmo id de auth.users)
ALTER TABLE public.tickets 
DROP CONSTRAINT IF EXISTS tickets_user_id_fkey;

ALTER TABLE public.tickets
ADD CONSTRAINT tickets_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id);
