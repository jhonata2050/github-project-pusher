
-- 1. audit_logs: impedir forja de trilha de auditoria por clientes
CREATE POLICY "audit_logs_no_client_insert" ON public.audit_logs AS RESTRICTIVE FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "audit_logs_no_client_update" ON public.audit_logs AS RESTRICTIVE FOR UPDATE TO authenticated, anon USING (false);
CREATE POLICY "audit_logs_no_client_delete" ON public.audit_logs AS RESTRICTIVE FOR DELETE TO authenticated, anon USING (false);

-- 2. coupons: somente administradores
CREATE POLICY "coupons_admin_manage" ON public.coupons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. domains: dono ou staff
CREATE POLICY "domains_owner_select" ON public.domains FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "domains_staff_manage" ON public.domains FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- 4. email_logs: dono ou staff (somente leitura para o dono)
CREATE POLICY "email_logs_owner_select" ON public.email_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "email_logs_staff_manage" ON public.email_logs FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- 5. invoice_items: dono da fatura ou staff
CREATE POLICY "invoice_items_owner_select" ON public.invoice_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_items.invoice_id AND i.user_id = auth.uid()));
CREATE POLICY "invoice_items_staff_manage" ON public.invoice_items FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- 6. transactions: dono ou staff
CREATE POLICY "transactions_owner_select" ON public.transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "transactions_staff_manage" ON public.transactions FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- 7. whmcs_imports: somente administradores
CREATE POLICY "whmcs_imports_admin_manage" ON public.whmcs_imports FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 8. servers: garantir que anon/authenticated não tenham acesso direto às credenciais
REVOKE ALL ON public.servers FROM anon, authenticated;
GRANT ALL ON public.servers TO service_role;

-- 9. vps_instances: bloquear leitura direta de credenciais SSH pela API de dados
REVOKE ALL ON public.vps_instances FROM anon, authenticated;
GRANT ALL ON public.vps_instances TO service_role;

-- 10. Funções: fixar search_path e restringir execução
ALTER FUNCTION public.cleanup_old_vps_metrics() SET search_path = public;
REVOKE ALL ON FUNCTION public.cleanup_old_vps_metrics() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_vps_metrics() TO service_role;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated, service_role;
