-- ============================================================
-- MIGRAÇÃO: 2026-05-01 — NPS + SaaS Overdue + Admin Auth
-- Execute no Supabase SQL Editor (seguro para rodar novamente)
-- ============================================================

-- 1. Coluna NPS na tabela appointments
ALTER TABLE public.appointments
    ADD COLUMN IF NOT EXISTS nps_score SMALLINT CHECK (nps_score BETWEEN 1 AND 5);

COMMENT ON COLUMN public.appointments.nps_score IS 'Nota NPS do cliente após atendimento (1-5 via WhatsApp)';

-- 2. Colunas de gestão SaaS na tabela shops
ALTER TABLE public.shops
    ADD COLUMN IF NOT EXISTS monthly_price NUMERIC(10,2) DEFAULT 97.00,
    ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.shops.monthly_price IS 'Valor mensal cobrado pelo plano SaaS';
COMMENT ON COLUMN public.shops.payment_confirmed_at IS 'Data da última confirmação de pagamento via Asaas webhook';

-- 3. Índice para facilitar consultas NPS por barbearia
CREATE INDEX IF NOT EXISTS idx_appointments_nps
    ON public.appointments (shop_id, nps_score)
    WHERE nps_score IS NOT NULL;
