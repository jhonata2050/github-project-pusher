-- Transferência de privilégios admin entre usuários
DO $$
BEGIN
  -- Remover admin do jhonatavieira2008@gmail.com
  DELETE FROM public.user_roles 
  WHERE user_id = 'b3c3c4b6-a398-48b6-8705-b065d412c294' 
    AND role = 'admin';

  -- Conceder admin ao jhonatavs@proton.me
  INSERT INTO public.user_roles (user_id, role) 
  VALUES ('a2230c6d-5f64-4b40-a0f6-f5e559cc80fd', 'admin') 
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;
