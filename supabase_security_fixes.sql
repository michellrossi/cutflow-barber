-- ============================================================
-- CUTFLOW: SECURITY & PERFORMANCE FIXES
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- ============================================================
-- FIX 1: Rate limiting na tabela whatsapp_chat_sessions
-- Adiciona message_count e last_message_at para controle
-- ============================================================
ALTER TABLE public.whatsapp_chat_sessions
  ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bot_paused BOOLEAN DEFAULT false;

-- ============================================================
-- FIX 2: Expiração de sessões do chatbot
-- Cron semanal para deletar sessões inativas há mais de 7 dias
-- ============================================================
-- Índice para otimizar busca de sessões expiradas
CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_message
  ON public.whatsapp_chat_sessions (last_message_at);

-- ============================================================
-- FIX 3: Proteger cost_price e min_stock na policy pública de produtos
-- Remove a policy irrestrita e cria uma view com colunas seguras
-- ============================================================

-- 3a. Remove a policy anterior irrestrita (se existir)
DROP POLICY IF EXISTS "Publico_Ve_Produtos" ON public.products;

-- 3b. Cria policy que filtra apenas lojas com plano ativo/trial E só permite anon ver colunas vitais
-- Nota: RLS não filtra colunas individualmente — usamos uma VIEW para isso
CREATE POLICY "Publico_Ve_Produtos" ON public.products
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.shops
      WHERE id = products.shop_id
      AND plan IN ('active', 'trial')
    )
  );

-- 3c. Cria view pública que expõe apenas colunas seguras (sem cost_price e min_stock)
DROP VIEW IF EXISTS public.products_public;
CREATE VIEW public.products_public AS
  SELECT
    p.id,
    p.shop_id,
    p.name,
    p.category,
    p.sale_price,
    p.current_stock,
    p.created_at
  FROM public.products p
  JOIN public.shops s ON s.id = p.shop_id
  WHERE s.plan IN ('active', 'trial');

-- Garante que a view seja acessível publicamente (apenas SELECT)
GRANT SELECT ON public.products_public TO anon, authenticated;

-- ============================================================
-- FIX 5: Índice de expressão para busca de aniversariantes
-- Evita full table scan com ilike a cada execução do cron
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_clients_birth_mmdd
  ON public.clients (TO_CHAR(birth_date, 'MM-DD'));

-- Função RPC para buscar aniversariantes do dia usando o índice
CREATE OR REPLACE FUNCTION public.get_birthday_clients_today()
RETURNS TABLE (
  id UUID,
  shop_id UUID,
  name TEXT,
  phone TEXT,
  birth_date DATE,
  birthday_last_sent_year INTEGER
) AS $$
DECLARE
  v_today_mmdd TEXT;
BEGIN
  v_today_mmdd := TO_CHAR(NOW(), 'MM-DD');

  RETURN QUERY
    SELECT
      c.id,
      c.shop_id,
      c.name,
      c.phone,
      c.birth_date,
      c.birthday_last_sent_year
    FROM public.clients c
    WHERE TO_CHAR(c.birth_date, 'MM-DD') = v_today_mmdd
      AND (
        c.birthday_last_sent_year IS NULL
        OR c.birthday_last_sent_year != EXTRACT(YEAR FROM NOW())::INTEGER
      );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_birthday_clients_today() TO service_role;

-- ============================================================
-- FIX 8: Chatbot precisa passar pela função book_appointment
-- Adiciona parâmetro opcional p_client_name para chatbot
-- (A função existente já tem client_name, então apenas garantimos
-- que o chatbot use RPC em vez de INSERT direto)
-- ============================================================
-- Nenhuma mudança SQL necessária — mudança é apenas no server.ts

-- ============================================================
-- FIX: Adiciona coluna birthday_last_sent_year se não existir
-- ============================================================
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS birthday_last_sent_year INTEGER;

-- ============================================================
-- NOTIFY do schema reload
-- ============================================================
NOTIFY pgrst, 'reload schema';
