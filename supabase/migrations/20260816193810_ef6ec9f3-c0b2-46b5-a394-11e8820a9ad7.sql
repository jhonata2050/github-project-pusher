ALTER TABLE public.invoices 
ADD CONSTRAINT invoices_user_id_fkey_profiles 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;