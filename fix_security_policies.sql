-- ==============================================================================
-- EQSAM CLOUD - SCRIPT DE CORREÇÃO DE POLÍTICAS DE SEGURANÇA (RLS HOTFIX)
-- Execute este script no SQL Editor do seu Dashboard Supabase.
-- ==============================================================================

-- 1. BLINDAGEM DE SYSTEM_SETTINGS
-- Revoga a leitura pública irrestrita de credenciais, senhas e tokens.
DROP POLICY IF EXISTS "Public read settings" ON public.system_settings;
DROP POLICY IF EXISTS "Public read branding settings only" ON public.system_settings;

-- Permitir leitura anônima e autenticada APENAS de chaves públicas de branding/layout
CREATE POLICY "Public read branding settings only" ON public.system_settings
FOR SELECT TO anon, authenticated
USING (key IN ('branding', 'public_config', 'recaptcha_site_key'));

-- Garantir que staff gerencie todas as configurações
DROP POLICY IF EXISTS "Staff manage settings" ON public.system_settings;
CREATE POLICY "Staff manage settings" ON public.system_settings
FOR ALL TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));


-- 2. BLINDAGEM DE WALLET_TRANSACTIONS (CARTEIRA DE SALDO)
-- Revoga a permissão de usuários inserirem transações de saldo diretamente
DROP POLICY IF EXISTS "Users can insert their own wallet transactions" ON public.wallet_transactions;
REVOKE INSERT ON public.wallet_transactions FROM authenticated;

-- Usuários só podem visualizar o próprio extrato
DROP POLICY IF EXISTS "Users can view their own wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Users can view their own wallet transactions" ON public.wallet_transactions
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Apenas staff e service_role podem inserir ou gerenciar transações de saldo
DROP POLICY IF EXISTS "Staff can manage all wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Staff can manage all wallet transactions" ON public.wallet_transactions
FOR ALL TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));


-- 3. FUNÇÃO ATÔMICA DE DÉBITO DE SALDO (PREVINE DOUBLE SPENDING / TOCTOU)
CREATE OR REPLACE FUNCTION public.debit_wallet_balance(
  _user_id uuid,
  _amount numeric,
  _invoice_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current numeric;
  _new_balance numeric;
BEGIN
  -- Bloqueio exclusivo de linha (Row-level exclusive lock)
  SELECT account_balance INTO _current
  FROM public.profiles
  WHERE id = _user_id
  FOR UPDATE;

  IF _current IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Perfil do cliente não encontrado');
  END IF;

  IF _current < _amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Saldo insuficiente',
      'current_balance', _current,
      'required', _amount
    );
  END IF;

  _new_balance := ROUND(_current - _amount, 2);

  -- Atualizar saldo do perfil
  UPDATE public.profiles
  SET account_balance = _new_balance,
      updated_at = now()
  WHERE id = _user_id;

  -- Liquidar fatura
  UPDATE public.invoices
  SET status = 'paid',
      payment_method = 'wallet',
      paid_at = now(),
      updated_at = now()
  WHERE id = _invoice_id;

  -- Inserir extrato
  INSERT INTO public.wallet_transactions (
    user_id,
    type,
    amount,
    balance_after,
    description,
    invoice_id
  ) VALUES (
    _user_id,
    'payment',
    -_amount,
    _new_balance,
    'Pagamento da Fatura #' || SUBSTRING(_invoice_id::text, 1, 8),
    _invoice_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'balance_after', _new_balance
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.debit_wallet_balance(uuid, numeric, uuid) TO service_role, authenticated;


-- 4. TABELA DE DEVELOPER API TOKENS (ACESSO CLI / DISCLOUD COMPATIBILITY)
CREATE TABLE IF NOT EXISTS public.user_api_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  token_prefix text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Ativar RLS
ALTER TABLE public.user_api_tokens ENABLE ROW LEVEL SECURITY;

-- Usuários só podem ver e excluir seus próprios tokens
DROP POLICY IF EXISTS "Users can view own api tokens" ON public.user_api_tokens;
CREATE POLICY "Users can view own api tokens" ON public.user_api_tokens
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own api tokens" ON public.user_api_tokens;
CREATE POLICY "Users can delete own api tokens" ON public.user_api_tokens
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Apenas service_role (backend) cria e atualiza tokens diretamente
GRANT SELECT, DELETE ON public.user_api_tokens TO authenticated;
GRANT ALL ON public.user_api_tokens TO service_role;

-- Índice para busca rápida de validação de token por hash
CREATE INDEX IF NOT EXISTS idx_user_api_tokens_hash ON public.user_api_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_user_api_tokens_user ON public.user_api_tokens (user_id);

-- ==============================================================================
-- Hotfix concluído com sucesso.
-- ==============================================================================

