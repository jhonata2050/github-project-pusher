GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.services TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tickets TO authenticated;
GRANT SELECT ON TABLE public.email_logs TO authenticated;
GRANT SELECT ON TABLE public.products TO authenticated;

GRANT ALL ON TABLE public.profiles TO service_role;
GRANT ALL ON TABLE public.services TO service_role;
GRANT ALL ON TABLE public.invoices TO service_role;
GRANT ALL ON TABLE public.tickets TO service_role;
GRANT ALL ON TABLE public.email_logs TO service_role;
GRANT ALL ON TABLE public.products TO service_role;