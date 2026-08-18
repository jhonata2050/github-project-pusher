DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_user_id_profiles_fkey') THEN
    ALTER TABLE public.tickets
      ADD CONSTRAINT tickets_user_id_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ticket_messages_user_id_profiles_fkey') THEN
    ALTER TABLE public.ticket_messages
      ADD CONSTRAINT ticket_messages_user_id_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;