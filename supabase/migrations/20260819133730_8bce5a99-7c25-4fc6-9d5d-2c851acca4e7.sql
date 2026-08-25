-- Adicionar coluna de anexos na tabela ticket_messages
ALTER TABLE public.ticket_messages 
ADD COLUMN IF NOT EXISTS attachments text[] DEFAULT '{}';

-- Políticas de Storage para ticket-attachments
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Public Access' AND tablename = 'objects' AND schemaname = 'storage'
    ) THEN
        CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'ticket-attachments');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload attachments' AND tablename = 'objects' AND schemaname = 'storage'
    ) THEN
        CREATE POLICY "Authenticated users can upload attachments" 
        ON storage.objects FOR INSERT 
        TO authenticated 
        WITH CHECK (bucket_id = 'ticket-attachments');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own attachments' AND tablename = 'objects' AND schemaname = 'storage'
    ) THEN
        CREATE POLICY "Users can delete their own attachments" 
        ON storage.objects FOR DELETE 
        TO authenticated 
        USING (bucket_id = 'ticket-attachments' AND (auth.uid() = owner OR owner IS NULL));
    END IF;
END $$;

-- Grants
GRANT ALL ON TABLE public.ticket_messages TO authenticated;
GRANT ALL ON TABLE public.ticket_messages TO service_role;
