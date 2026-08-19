-- Remover políticas existentes se houver, para evitar erros de duplicidade
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their own tickets" ON public.tickets;
    DROP POLICY IF EXISTS "Users can create their own tickets" ON public.tickets;
    DROP POLICY IF EXISTS "Users can update their own tickets" ON public.tickets;
    DROP POLICY IF EXISTS "Admins can manage all tickets" ON public.tickets;
    DROP POLICY IF EXISTS "Users can view their ticket messages" ON public.ticket_messages;
    DROP POLICY IF EXISTS "Users can reply to their own tickets" ON public.ticket_messages;
    DROP POLICY IF EXISTS "Admins can manage all ticket messages" ON public.ticket_messages;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- Habilitar RLS se ainda não estiver habilitado
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- Permite que usuários autenticados vejam seus próprios tickets
CREATE POLICY "Users can view their own tickets"
ON public.tickets
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Permite que usuários autenticados criem tickets para si mesmos
CREATE POLICY "Users can create their own tickets"
ON public.tickets
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Permite que usuários autenticados atualizem seus próprios tickets (ex: fechar ticket)
CREATE POLICY "Users can update their own tickets"
ON public.tickets
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Permite que administradores façam tudo na tabela tickets
CREATE POLICY "Admins can manage all tickets"
ON public.tickets
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Permite que usuários autenticados vejam mensagens de seus tickets
CREATE POLICY "Users can view their ticket messages"
ON public.ticket_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tickets
    WHERE tickets.id = ticket_messages.ticket_id
    AND (tickets.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

-- Permite que usuários autenticados enviem mensagens em seus tickets
CREATE POLICY "Users can reply to their own tickets"
ON public.ticket_messages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tickets
    WHERE tickets.id = ticket_messages.ticket_id
    AND (tickets.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

-- Permite que administradores façam tudo na tabela ticket_messages
CREATE POLICY "Admins can manage all ticket messages"
ON public.ticket_messages
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Garantir privilégios
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tickets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ticket_messages TO authenticated;
GRANT ALL ON public.tickets TO service_role;
GRANT ALL ON public.ticket_messages TO service_role;
