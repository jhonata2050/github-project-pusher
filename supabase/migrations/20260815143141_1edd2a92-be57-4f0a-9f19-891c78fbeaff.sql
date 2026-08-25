CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('auth', 'system', 'data', 'security')),
  action text NOT NULL,
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failure', 'warning')),
  actor_id uuid,
  actor_email text,
  entity_type text,
  entity_id text,
  description text NOT NULL,
  ip_address inet,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

CREATE INDEX audit_logs_created_at_idx ON public.audit_logs (created_at DESC);
CREATE INDEX audit_logs_category_created_at_idx ON public.audit_logs (category, created_at DESC);
CREATE INDEX audit_logs_actor_id_created_at_idx ON public.audit_logs (actor_id, created_at DESC);
CREATE INDEX audit_logs_entity_idx ON public.audit_logs (entity_type, entity_id);

CREATE OR REPLACE FUNCTION public.capture_audit_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row_id text;
  changed_columns jsonb := '[]'::jsonb;
  event_action text;
  event_description text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    row_id := COALESCE(to_jsonb(NEW)->>'id', to_jsonb(NEW)->>'key');
    event_action := 'record.created';
    event_description := format('Registro criado em %I', TG_TABLE_NAME);
  ELSIF TG_OP = 'UPDATE' THEN
    row_id := COALESCE(to_jsonb(NEW)->>'id', to_jsonb(NEW)->>'key');
    SELECT COALESCE(jsonb_agg(key ORDER BY key), '[]'::jsonb)
      INTO changed_columns
      FROM jsonb_each(to_jsonb(NEW)) current_row
     WHERE (to_jsonb(OLD)->current_row.key) IS DISTINCT FROM current_row.value
       AND current_row.key NOT IN ('api_token', 'password', 'token', 'secret', 'smtp_pass', 'resend_api_key');
    event_action := 'record.updated';
    event_description := format('Registro alterado em %I', TG_TABLE_NAME);
  ELSE
    row_id := COALESCE(to_jsonb(OLD)->>'id', to_jsonb(OLD)->>'key');
    event_action := 'record.deleted';
    event_description := format('Registro excluído de %I', TG_TABLE_NAME);
  END IF;

  INSERT INTO public.audit_logs (
    category,
    action,
    status,
    actor_id,
    entity_type,
    entity_id,
    description,
    metadata
  ) VALUES (
    'data',
    event_action,
    'success',
    auth.uid(),
    TG_TABLE_NAME,
    row_id,
    event_description,
    jsonb_build_object('operation', TG_OP, 'changed_columns', changed_columns)
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
DECLARE
  target record;
BEGIN
  FOR target IN
    SELECT c.relname AS table_name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE c.relkind = 'r'
       AND n.nspname = 'public'
       AND c.relname NOT IN ('audit_logs', 'spatial_ref_sys')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_changes ON public.%I', target.table_name);
    EXECUTE format(
      'CREATE TRIGGER audit_changes AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.capture_audit_change()',
      target.table_name
    );
  END LOOP;
END;
$$;