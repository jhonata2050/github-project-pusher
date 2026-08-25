-- Adicionar colunas SSH à tabela vps_instances
ALTER TABLE public.vps_instances 
ADD COLUMN IF NOT EXISTS ssh_host TEXT,
ADD COLUMN IF NOT EXISTS ssh_port INTEGER DEFAULT 22,
ADD COLUMN IF NOT EXISTS ssh_user TEXT DEFAULT 'root',
ADD COLUMN IF NOT EXISTS ssh_password TEXT;

-- Criar tabela de histórico de métricas
CREATE TABLE IF NOT EXISTS public.vps_metrics_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vps_id UUID NOT NULL REFERENCES public.vps_instances(id) ON DELETE CASCADE,
    cpu INTEGER NOT NULL,
    ram INTEGER NOT NULL,
    disk INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.vps_metrics_history ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT ON public.vps_metrics_history TO authenticated;
GRANT ALL ON public.vps_metrics_history TO service_role;

-- Políticas de RLS para vps_metrics_history
CREATE POLICY "Users can view metrics of their own VPS" 
ON public.vps_metrics_history
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.vps_instances v
        JOIN public.services s ON v.service_id = s.id
        WHERE v.id = public.vps_metrics_history.vps_id
        AND s.user_id = auth.uid()
    )
);

CREATE POLICY "Admins can view all metrics" 
ON public.vps_metrics_history
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert metrics" 
ON public.vps_metrics_history
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_vps_metrics_history_vps_time ON public.vps_metrics_history(vps_id, created_at DESC);

-- Opcional: Função para limpeza automática (retendo 30 dias)
CREATE OR REPLACE FUNCTION public.cleanup_old_vps_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.vps_metrics_history
    WHERE created_at < now() - interval '30 days';
END;
$$;
