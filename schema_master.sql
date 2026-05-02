-- ==============================================================================
-- CUTFLOW — SCHEMA MASTER (Fonte Canônica Única)
-- Consolida: schema_completo.sql + supabase_security_fixes.sql +
--            supabase_metas_estoque_fixes.sql + security_webhook_fixes +
--            supabase_loyalty_fix.sql
--
-- Execute INTEGRALMENTE no SQL Editor do Supabase.
-- Idempotente: seguro de rodar em ambiente existente ou novo.
-- Última atualização: Abril/2026
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- SEÇÃO 1: ALTERAÇÕES EM TABELAS EXISTENTES
-- ==============================================================================

-- SHOPS
ALTER TABLE public.shops
    ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'trial',
    ADD COLUMN IF NOT EXISTS plan_tier TEXT DEFAULT 'essencial' CHECK (plan_tier IN ('essencial', 'profissional', 'premium')),
    ADD COLUMN IF NOT EXISTS whatsapp_instance TEXT,
    ADD COLUMN IF NOT EXISTS whatsapp_connected BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT,
    ADD COLUMN IF NOT EXISTS monthly_price NUMERIC(10,2) DEFAULT 97.00,
    ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.shops.monthly_price IS 'Valor mensal cobrado pelo plano SaaS';
COMMENT ON COLUMN public.shops.payment_confirmed_at IS 'Data da última confirmação de pagamento via Asaas webhook';

-- SERVICES
ALTER TABLE public.services
    ADD COLUMN IF NOT EXISTS image_url TEXT;

-- PROFESSIONALS
ALTER TABLE public.professionals
    ADD COLUMN IF NOT EXISTS commission_percentage INTEGER DEFAULT 50,
    ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#f97316',
    ADD COLUMN IF NOT EXISTS phone TEXT;

-- SETTINGS
ALTER TABLE public.settings
    ADD COLUMN IF NOT EXISTS title_color TEXT DEFAULT '#ffffff',
    ADD COLUMN IF NOT EXISTS text_color TEXT DEFAULT '#94a3b8',
    ADD COLUMN IF NOT EXISTS background_color TEXT DEFAULT '#0f172a',
    ADD COLUMN IF NOT EXISTS card_background_color TEXT DEFAULT '#1e293b',
    ADD COLUMN IF NOT EXISTS button_text_color TEXT DEFAULT '#ffffff',
    ADD COLUMN IF NOT EXISTS price_color TEXT DEFAULT '#f97316',
    ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#f97316',
    ADD COLUMN IF NOT EXISTS border_color TEXT DEFAULT '#334155',
    ADD COLUMN IF NOT EXISTS input_background_color TEXT DEFAULT '#0f172a',
    ADD COLUMN IF NOT EXISTS input_text_color TEXT DEFAULT '#ffffff',
    ADD COLUMN IF NOT EXISTS loyalty_mode TEXT DEFAULT 'card',
    ADD COLUMN IF NOT EXISTS loyalty_card_goal INTEGER DEFAULT 10,
    ADD COLUMN IF NOT EXISTS loyalty_points_ratio INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS loyalty_points_goal INTEGER DEFAULT 1000,
    ADD COLUMN IF NOT EXISTS loyalty_reward_value NUMERIC DEFAULT 10,
    ADD COLUMN IF NOT EXISTS loyalty_reward_type TEXT DEFAULT 'percentage',
    ADD COLUMN IF NOT EXISTS loyalty_reward_validity_days INTEGER DEFAULT 90,
    ADD COLUMN IF NOT EXISTS loyalty_enabled BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS business_hours JSONB,
    ADD COLUMN IF NOT EXISTS instagram TEXT,
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS facebook TEXT,
    ADD COLUMN IF NOT EXISTS whatsapp TEXT,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS payment_methods TEXT[] DEFAULT '{credit,debit,cash,pix}';

COMMENT ON COLUMN settings.description IS 'Campo Quem Somos da barbearia';
COMMENT ON COLUMN settings.payment_methods IS 'Lista de métodos de pagamento aceitos';
COMMENT ON COLUMN settings.phone IS 'Celular pessoal do dono da barbearia';

-- CLIENTS
ALTER TABLE public.clients
    ADD COLUMN IF NOT EXISTS total_spent NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS loyalty_card_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS birth_date DATE,
    ADD COLUMN IF NOT EXISTS last_name TEXT,
    ADD COLUMN IF NOT EXISTS cpf TEXT,
    ADD COLUMN IF NOT EXISTS gender TEXT,
    ADD COLUMN IF NOT EXISTS cep TEXT,
    ADD COLUMN IF NOT EXISTS street TEXT,
    ADD COLUMN IF NOT EXISTS number TEXT,
    ADD COLUMN IF NOT EXISTS complement TEXT,
    ADD COLUMN IF NOT EXISTS neighborhood TEXT,
    ADD COLUMN IF NOT EXISTS city TEXT,
    ADD COLUMN IF NOT EXISTS state TEXT,
    -- FIX: aniversariantes — consolidado do supabase_security_fixes.sql
    ADD COLUMN IF NOT EXISTS birthday_last_sent_year INTEGER DEFAULT 0;

-- COUPONS
ALTER TABLE public.coupons
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS is_loyalty_reward BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE;

-- APPOINTMENTS
ALTER TABLE public.appointments
    ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS confirmation_sent BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS reminder_24h_sent BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS send_attempts_24h INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS reminder_1h_sent BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS send_attempts_1h INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS rescheduling_sent BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS send_attempts_reschedule INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS post_sale_sent BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS send_attempts_postsale INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS reminder_30d_sent BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS send_attempts_30d INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS nps_score SMALLINT CHECK (nps_score BETWEEN 1 AND 5),
    ADD COLUMN IF NOT EXISTS stock_deducted BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.appointments.client_id IS 'FK para clients — NULL em agendamentos anônimos/chatbot';
COMMENT ON COLUMN public.appointments.nps_score IS 'Nota NPS do cliente após atendimento (1-5 via WhatsApp)';

-- Índice para facilitar consultas NPS por barbearia
CREATE INDEX IF NOT EXISTS idx_appointments_nps
    ON public.appointments (shop_id, nps_score)
    WHERE nps_score IS NOT NULL;


-- ==============================================================================
-- SEÇÃO 2: CRIAÇÃO DE NOVAS TABELAS
-- ==============================================================================

-- GATILHOS DE AUTOMAÇÃO
CREATE TABLE IF NOT EXISTS public.automation_triggers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    value INTEGER DEFAULT 0,
    unit TEXT CHECK (unit IN ('minutes', 'hours', 'days')),
    period TEXT CHECK (period IN ('before', 'immediate', 'after')),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CATEGORIAS DE MENSAGENS
CREATE TABLE IF NOT EXISTS public.message_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    UNIQUE(shop_id, name)
);

-- TEMPLATES DE MENSAGEM
CREATE TABLE IF NOT EXISTS public.message_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    trigger TEXT,
    trigger_id UUID REFERENCES public.automation_triggers(id) ON DELETE SET NULL,
    delay_value INTEGER DEFAULT 0,
    delay_unit TEXT DEFAULT 'minutes',
    active BOOLEAN DEFAULT true,
    target TEXT DEFAULT 'client',
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE public.message_templates
    ADD COLUMN IF NOT EXISTS trigger_id UUID REFERENCES public.automation_triggers(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS target TEXT DEFAULT 'client',
    ADD COLUMN IF NOT EXISTS category TEXT,
    ADD COLUMN IF NOT EXISTS delay_value INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS delay_unit TEXT DEFAULT 'minutes';
ALTER TABLE public.message_templates ALTER COLUMN trigger DROP NOT NULL;

-- TOKENS DE CLIENTES
CREATE TABLE IF NOT EXISTS public.client_auth_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- SESSÕES DO WHATSAPP CHATBOT
-- FIX (security_fixes): message_count e bot_paused consolidados aqui
CREATE TABLE IF NOT EXISTS public.whatsapp_chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    remote_jid TEXT NOT NULL,
    context JSONB DEFAULT '{}',
    messages JSONB DEFAULT '[]',
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    message_count INTEGER DEFAULT 0,
    bot_paused BOOLEAN DEFAULT false,
    UNIQUE(shop_id, remote_jid)
);

-- Garante as colunas mesmo se a tabela já existia
ALTER TABLE public.whatsapp_chat_sessions
    ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS bot_paused BOOLEAN DEFAULT false;

-- METAS FINANCEIRAS E ATENDIMENTOS
-- FIX (metas_fixes): período 'anual' já incluído aqui
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    professional_id UUID REFERENCES public.professionals(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('faturamento', 'atendimentos', 'venda_produtos')),
    target_value NUMERIC(12,2) NOT NULL,
    current_value NUMERIC(12,2) DEFAULT 0,
    period TEXT NOT NULL CHECK (period IN ('diário', 'semanal', 'mensal', 'anual')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- Garante a constraint de período atualizada mesmo se a tabela já existia
ALTER TABLE public.goals DROP CONSTRAINT IF EXISTS goals_period_check;
ALTER TABLE public.goals ADD CONSTRAINT goals_period_check
    CHECK (period IN ('diário', 'semanal', 'mensal', 'anual'));

-- ESTOQUE E PRODUTOS
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'Geral',
    cost_price NUMERIC(10,2) DEFAULT 0,
    sale_price NUMERIC(10,2) DEFAULT 0,
    current_stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- PRODUTOS VENDIDOS NOS AGENDAMENTOS
CREATE TABLE IF NOT EXISTS public.appointment_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- PLANOS DE ASSINATURA (Clube de Assinatura)
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL,
    services_per_month INTEGER NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- ASSINATURAS DOS CLIENTES
CREATE TABLE IF NOT EXISTS public.client_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due')),
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    next_billing_date DATE,
    services_used_this_month INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- CACHE DISTRIBUÍDO DE INSTÂNCIAS (Substitui Map em memória)
CREATE TABLE IF NOT EXISTS public.instance_status_cache (
    instance_name TEXT PRIMARY KEY,
    connected BOOLEAN NOT NULL,
    expires_at BIGINT NOT NULL
);


-- ==============================================================================
-- SEÇÃO 3: ÍNDICES
-- ==============================================================================

DROP INDEX IF EXISTS idx_agendamento_unico_ativo;
CREATE UNIQUE INDEX idx_agendamento_unico_ativo
ON public.appointments (shop_id, professional_id, date, time)
WHERE status NOT IN ('cancelled', 'noshow');

CREATE INDEX IF NOT EXISTS idx_message_templates_shop_id
ON public.message_templates(shop_id);

-- FIX (security_fixes): índice de chat sessions para limpeza de expiradas
CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_message
ON public.whatsapp_chat_sessions (last_message_at);

-- FIX (security_fixes): índice de aniversariantes usando função wrapper IMMUTABLE
-- (TO_CHAR não é IMMUTABLE — usamos wrapper para permitir indexação)
CREATE OR REPLACE FUNCTION public.birth_date_mmdd(d DATE)
RETURNS TEXT AS $$
  SELECT TO_CHAR(d, 'MM-DD');
$$ LANGUAGE sql IMMUTABLE STRICT;

CREATE INDEX IF NOT EXISTS idx_clients_birth_mmdd
ON public.clients (public.birth_date_mmdd(birth_date));


-- ==============================================================================
-- SEÇÃO 4: FUNÇÕES, PROCEDURES E TRIGGERS
-- ==============================================================================

-- ── Agendamento Seguro (RPC com limite diário + anti-conflito) ──────────────────
CREATE OR REPLACE FUNCTION public.book_appointment(
    p_shop_id UUID, p_client_name TEXT, p_client_phone TEXT,
    p_service_ids TEXT[], p_professional_id UUID, p_date TEXT,
    p_time TEXT, p_total_value NUMERIC, p_coupon_code TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_appointment_id UUID;
    v_daily_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_daily_count FROM public.appointments
    WHERE shop_id = p_shop_id
    AND client_phone = p_client_phone
    AND DATE(created_at) = CURRENT_DATE;

    IF v_daily_count >= 3 THEN
        RAISE EXCEPTION 'Limite diário atingido para este número.';
    END IF;

    BEGIN
        INSERT INTO public.appointments (
            shop_id, client_name, client_phone, service_ids,
            professional_id, date, time, total_value, coupon_code, status
        ) VALUES (
            p_shop_id, p_client_name, p_client_phone, p_service_ids,
            p_professional_id, p_date, p_time, p_total_value, p_coupon_code, 'scheduled'
        ) RETURNING id INTO v_appointment_id;

        RETURN json_build_object('id', v_appointment_id, 'status', 'success');
    EXCEPTION WHEN unique_violation THEN
        RETURN json_build_object('status', 'conflict', 'message', 'Horário já reservado');
    END;
END;
$$ LANGUAGE plpgsql;

-- ── Trigger: Atualizar Total Gasto pelo Cliente ────────────────────────────────
CREATE OR REPLACE FUNCTION update_client_total_spent()
RETURNS TRIGGER AS $$
BEGIN
    -- Guard: agendamentos anônimos (chatbot/link) podem não ter client_id
    IF (TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed')
    OR (TG_OP = 'INSERT' AND NEW.status = 'completed') THEN
        IF NEW.client_id IS NOT NULL THEN
            UPDATE clients SET total_spent = total_spent + COALESCE(NEW.total_value, 0) WHERE id = NEW.client_id;
        END IF;
    ELSIF (TG_OP = 'UPDATE' AND OLD.status = 'completed' AND NEW.status != 'completed')
    OR (TG_OP = 'DELETE' AND OLD.status = 'completed') THEN
        IF OLD.client_id IS NOT NULL THEN
            UPDATE clients SET total_spent = total_spent - COALESCE(OLD.total_value, 0) WHERE id = OLD.client_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_client_spending ON public.appointments;
CREATE TRIGGER tr_update_client_spending
AFTER INSERT OR UPDATE OR DELETE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION update_client_total_spent();

-- ── Trigger: Atualizar Metas Automaticamente ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_goals_on_completion()
RETURNS TRIGGER AS $$
DECLARE
    appointment_total NUMERIC(12,2);
    products_total NUMERIC(12,2);
    apt_date DATE;
BEGIN
    IF (NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed')) THEN
        apt_date := NEW.date::DATE;
        appointment_total := NEW.total_value;

        SELECT COALESCE(SUM(quantity * unit_price), 0) INTO products_total
        FROM public.appointment_products
        WHERE appointment_id = NEW.id;

        UPDATE public.goals
        SET current_value = current_value + (appointment_total + products_total)
        WHERE shop_id = NEW.shop_id AND category = 'faturamento'
          AND start_date <= apt_date AND end_date >= apt_date
          AND (professional_id IS NULL OR professional_id = NEW.professional_id);

        UPDATE public.goals
        SET current_value = current_value + 1
        WHERE shop_id = NEW.shop_id AND category = 'atendimentos'
          AND start_date <= apt_date AND end_date >= apt_date
          AND (professional_id IS NULL OR professional_id = NEW.professional_id);

        IF products_total > 0 THEN
            UPDATE public.goals
            SET current_value = current_value + products_total
            WHERE shop_id = NEW.shop_id AND category = 'venda_produtos'
              AND start_date <= apt_date AND end_date >= apt_date
              AND (professional_id IS NULL OR professional_id = NEW.professional_id);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_goals ON public.appointments;
CREATE TRIGGER trg_update_goals
AFTER UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.update_goals_on_completion();

-- ── Trigger: Controle de Estoque ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_stock_on_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. CASO: Finalizando (estoque ainda não deduzido)
    IF (NEW.status = 'completed' AND OLD.status != 'completed' AND (NEW.stock_deducted = FALSE OR NEW.stock_deducted IS NULL)) THEN
        UPDATE public.products p
        SET current_stock = p.current_stock - sub.total_qty
        FROM (
            SELECT product_id, SUM(quantity) as total_qty
            FROM public.appointment_products
            WHERE appointment_id = NEW.id
            GROUP BY product_id
        ) sub
        WHERE p.id = sub.product_id;

        -- Marca como deduzido
        NEW.stock_deducted := TRUE;

    -- 2. CASO: Revertendo de Finalizado (restaura estoque)
    ELSIF (OLD.status = 'completed' AND NEW.status != 'completed' AND NEW.stock_deducted = TRUE) THEN
        UPDATE public.products p
        SET current_stock = p.current_stock + sub.total_qty
        FROM (
            SELECT product_id, SUM(quantity) as total_qty
            FROM public.appointment_products
            WHERE appointment_id = OLD.id
            GROUP BY product_id
        ) sub
        WHERE p.id = sub.product_id;

        -- Marca como NÃO deduzido para permitir nova finalização futura
        NEW.stock_deducted := FALSE;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_stock_on_completion ON public.appointments;
CREATE TRIGGER trg_stock_on_completion
BEFORE UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.handle_stock_on_completion();

-- ── RPC: Tokens de Autenticação de Clientes ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_client_token(p_client_id UUID, p_token TEXT, p_expires_at TIMESTAMPTZ)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.client_auth_tokens (client_id, token, expires_at)
    VALUES (p_client_id, p_token, p_expires_at);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.validate_client_token(p_token TEXT)
RETURNS JSON AS $$
DECLARE
    v_token_id UUID;
    v_client_id UUID;
    v_client_data JSON;
BEGIN
    SELECT id, client_id INTO v_token_id, v_client_id
    FROM public.client_auth_tokens
    WHERE token = p_token AND expires_at > NOW();

    IF v_token_id IS NULL THEN
        RAISE EXCEPTION 'Token inválido ou expirado';
    END IF;

    DELETE FROM public.client_auth_tokens WHERE id = v_token_id;

    SELECT json_build_object(
        'id', c.id, 'shop_id', c.shop_id, 'name', c.name, 'phone', c.phone,
        'avatar_url', c.avatar_url, 'total_spent', c.total_spent, 'loyalty_points', c.loyalty_points,
        'loyalty_card_count', c.loyalty_card_count, 'created_at', c.created_at,
        'shops', json_build_object('slug', s.slug)
    ) INTO v_client_data
    FROM public.clients c
    JOIN public.shops s ON s.id = c.shop_id
    WHERE c.id = v_client_id;

    RETURN v_client_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── RPC: Recompensa de Fidelidade (Atômica — suporta modo card e points) ────
-- Chamada pelo servidor quando um cliente atinge a meta de visitas ou pontos.
-- Gera cupom único + zera contadores + retorna dados para envio de WhatsApp.
CREATE OR REPLACE FUNCTION public.award_loyalty_reward(p_client_id UUID, p_shop_id UUID)
RETURNS JSON AS $$
DECLARE
    v_client RECORD;
    v_settings RECORD;
    v_coupon_code TEXT;
    v_expires_at TIMESTAMPTZ;
    v_meta_atingida BOOLEAN := false;
BEGIN
    -- Lock otimista: garante atomicidade para leituras concorrentes
    SELECT * INTO v_client FROM public.clients WHERE id = p_client_id AND shop_id = p_shop_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Cliente não encontrado');
    END IF;

    SELECT * INTO v_settings FROM public.settings WHERE shop_id = p_shop_id;
    IF NOT FOUND OR COALESCE(v_settings.loyalty_enabled, true) = false THEN
        RETURN json_build_object('success', false, 'message', 'Programa de fidelidade desativado');
    END IF;

    -- Verifica se a meta foi realmente atingida conforme o modo
    IF COALESCE(v_settings.loyalty_mode, 'card') = 'card' THEN
        IF v_client.loyalty_card_count >= COALESCE(v_settings.loyalty_card_goal, 10) THEN
            v_meta_atingida := true;
        END IF;
    ELSE
        IF v_client.loyalty_points >= COALESCE(v_settings.loyalty_points_goal, 1000) THEN
            v_meta_atingida := true;
        END IF;
    END IF;

    IF NOT v_meta_atingida THEN
        RETURN json_build_object('success', false, 'message', 'Meta de fidelidade ainda não atingida');
    END IF;

    -- Gera código único do cupom
    v_coupon_code := 'FIDELIDADE-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 6));
    v_expires_at := NOW() + (COALESCE(v_settings.loyalty_reward_validity_days, 90) || ' days')::INTERVAL;

    -- Insere cupom usando colunas corretas da tabela coupons
    INSERT INTO public.coupons (shop_id, client_id, code, type, value, active, max_uses, usage_count, expires_at, is_loyalty_reward)
    VALUES (
        p_shop_id,
        p_client_id,
        v_coupon_code,
        COALESCE(v_settings.loyalty_reward_type, 'percentage'),
        COALESCE(v_settings.loyalty_reward_value, 10),
        true,
        1,
        0,
        v_expires_at,
        true
    );

    -- Zera o contador correto conforme o modo
    IF COALESCE(v_settings.loyalty_mode, 'card') = 'card' THEN
        UPDATE public.clients SET loyalty_card_count = 0 WHERE id = p_client_id;
    ELSE
        UPDATE public.clients SET loyalty_points = 0 WHERE id = p_client_id;
    END IF;

    RETURN json_build_object(
        'success', true,
        'couponCode', v_coupon_code,
        'clientName', v_client.name,
        'clientPhone', v_client.phone,
        'discount', v_settings.loyalty_reward_value,
        'discountType', COALESCE(v_settings.loyalty_reward_type, 'percentage'),
        'validityDays', COALESCE(v_settings.loyalty_reward_validity_days, 90)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.award_loyalty_reward(UUID, UUID) TO service_role;

-- ── RPC: Aniversariantes do Dia (Usa índice IMMUTABLE) ────────────────────────
-- FIX consolidado do supabase_security_fixes.sql
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
  v_today_mmdd := TO_CHAR(NOW() AT TIME ZONE 'America/Sao_Paulo', 'MM-DD');

  RETURN QUERY
    SELECT
      c.id,
      c.shop_id,
      c.name,
      c.phone,
      c.birth_date,
      c.birthday_last_sent_year
    FROM public.clients c
    WHERE public.birth_date_mmdd(c.birth_date) = v_today_mmdd
      AND (
        c.birthday_last_sent_year IS NULL
        OR c.birthday_last_sent_year != EXTRACT(YEAR FROM NOW())::INTEGER
      );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_birthday_clients_today() TO service_role;

-- ── RPC: Cálculo Retroativo de Metas (Backfill) ───────────────────────────────
-- FIX consolidado do supabase_metas_estoque_fixes.sql
CREATE OR REPLACE FUNCTION public.calculate_goal_current_value(p_goal_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    v_goal RECORD;
    v_total NUMERIC := 0;
    v_apt_total NUMERIC := 0;
    v_prod_total NUMERIC := 0;
BEGIN
    SELECT * INTO v_goal FROM public.goals WHERE id = p_goal_id;
    IF NOT FOUND THEN RETURN 0; END IF;

    IF v_goal.category = 'faturamento' THEN
        SELECT COALESCE(SUM(total_value), 0) INTO v_apt_total
        FROM public.appointments
        WHERE shop_id = v_goal.shop_id
          AND status = 'completed'
          AND date::DATE BETWEEN v_goal.start_date AND v_goal.end_date
          AND (v_goal.professional_id IS NULL OR professional_id = v_goal.professional_id);

        SELECT COALESCE(SUM(ap.quantity * ap.unit_price), 0) INTO v_prod_total
        FROM public.appointment_products ap
        JOIN public.appointments a ON a.id = ap.appointment_id
        WHERE a.shop_id = v_goal.shop_id
          AND a.status = 'completed'
          AND a.date::DATE BETWEEN v_goal.start_date AND v_goal.end_date
          AND (v_goal.professional_id IS NULL OR a.professional_id = v_goal.professional_id);

        v_total := v_apt_total + v_prod_total;

    ELSIF v_goal.category = 'atendimentos' THEN
        SELECT COUNT(*) INTO v_total
        FROM public.appointments
        WHERE shop_id = v_goal.shop_id
          AND status = 'completed'
          AND date::DATE BETWEEN v_goal.start_date AND v_goal.end_date
          AND (v_goal.professional_id IS NULL OR professional_id = v_goal.professional_id);

    ELSIF v_goal.category = 'venda_produtos' THEN
        SELECT COALESCE(SUM(ap.quantity * ap.unit_price), 0) INTO v_total
        FROM public.appointment_products ap
        JOIN public.appointments a ON a.id = ap.appointment_id
        WHERE a.shop_id = v_goal.shop_id
          AND a.status = 'completed'
          AND a.date::DATE BETWEEN v_goal.start_date AND v_goal.end_date
          AND (v_goal.professional_id IS NULL OR a.professional_id = v_goal.professional_id);
    END IF;

    RETURN v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que inicializa current_value ao criar uma meta (calcula backfill)
CREATE OR REPLACE FUNCTION public.sync_goal_initial_value()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.goals
    SET current_value = public.calculate_goal_current_value(NEW.id)
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_goal_initial ON public.goals;
CREATE TRIGGER trg_sync_goal_initial
AFTER INSERT ON public.goals
FOR EACH ROW EXECUTE FUNCTION public.sync_goal_initial_value();


-- ==============================================================================
-- SEÇÃO 5: REALTIME (Supabase Realtime para tabelas de metas e produtos)
-- FIX consolidado do supabase_metas_estoque_fixes.sql
-- ==============================================================================

ALTER TABLE public.goals    REPLICA IDENTITY FULL;
ALTER TABLE public.products REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'goals') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE goals;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'products') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE products;
    END IF;
END $$;


-- ==============================================================================
-- SEÇÃO 6: POLÍTICAS DE SEGURANÇA (RLS)
-- FIX CRÍTICO: products agora filtra por plano ativo e usa VIEW pública segura
-- ==============================================================================

ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_auth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_products ENABLE ROW LEVEL SECURITY;

-- Lojas
DROP POLICY IF EXISTS "Visibilidade Publica Lojas" ON public.shops;
CREATE POLICY "Visibilidade Publica Lojas" ON public.shops FOR SELECT USING (true);
DROP POLICY IF EXISTS "Dono_Gere_Loja" ON public.shops;
CREATE POLICY "Dono_Gere_Loja" ON public.shops FOR ALL USING (auth.uid() = owner_id);

-- Serviços
DROP POLICY IF EXISTS "Publico_Ve_Servicos" ON public.services;
CREATE POLICY "Publico_Ve_Servicos" ON public.services FOR SELECT USING (true);
DROP POLICY IF EXISTS "Dono_Gere_Servicos" ON public.services;
CREATE POLICY "Dono_Gere_Servicos" ON public.services FOR ALL USING (EXISTS (SELECT 1 FROM public.shops WHERE id = services.shop_id AND owner_id = auth.uid()));

-- Profissionais
DROP POLICY IF EXISTS "Publico_Ve_Profissionais" ON public.professionals;
CREATE POLICY "Publico_Ve_Profissionais" ON public.professionals FOR SELECT USING (true);
DROP POLICY IF EXISTS "Dono_Gere_Profissionais" ON public.professionals;
CREATE POLICY "Dono_Gere_Profissionais" ON public.professionals FOR ALL USING (EXISTS (SELECT 1 FROM public.shops WHERE id = professionals.shop_id AND owner_id = auth.uid()));

-- Agendamentos
DROP POLICY IF EXISTS "Dono_Gere_Agendamentos" ON public.appointments;
CREATE POLICY "Dono_Gere_Agendamentos" ON public.appointments FOR ALL USING (EXISTS (SELECT 1 FROM public.shops WHERE id = appointments.shop_id AND owner_id = auth.uid()));
DROP POLICY IF EXISTS "Criar Agendamento Paywall" ON public.appointments;
CREATE POLICY "Criar Agendamento Paywall" ON public.appointments FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.shops WHERE id = appointments.shop_id AND plan IN ('active', 'trial')));
DROP POLICY IF EXISTS "Publico_Le_Agendamentos" ON public.appointments;
CREATE POLICY "Publico_Le_Agendamentos" ON public.appointments FOR SELECT USING (EXISTS (SELECT 1 FROM public.shops WHERE id = appointments.shop_id AND owner_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.professionals WHERE user_id = auth.uid() AND shop_id = appointments.shop_id));
DROP POLICY IF EXISTS "Servidor_Atualiza_Flags" ON public.appointments;
-- Nota: O servidor usa service_role, que ignora RLS. Donos já têm permissão via "Dono_Gere_Agendamentos".

-- Clientes
DROP POLICY IF EXISTS "Dono_Gere_Clientes" ON public.clients;
CREATE POLICY "Dono_Gere_Clientes" ON public.clients FOR ALL USING (EXISTS (SELECT 1 FROM public.shops WHERE id = clients.shop_id AND owner_id = auth.uid()));
DROP POLICY IF EXISTS "Permitir_Auto_Cadastro" ON public.clients;
CREATE POLICY "Permitir_Auto_Cadastro" ON public.clients FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Publico_Le_Proprio_Perfil" ON public.clients;
CREATE POLICY "Publico_Le_Proprio_Perfil" ON public.clients 
FOR SELECT 
USING (
  phone = current_setting('request.jwt.claims', true)::json->>'phone' -- Se autenticado via JWT
  OR 
  phone = current_setting('app.current_client_phone', true) -- Via variável de sessão manual
);

-- Automações, Categorias e Templates
DROP POLICY IF EXISTS "Dono_Gere_Templates" ON public.message_templates;
CREATE POLICY "Dono_Gere_Templates" ON public.message_templates FOR ALL USING (EXISTS (SELECT 1 FROM public.shops WHERE id = message_templates.shop_id AND owner_id = auth.uid()));
DROP POLICY IF EXISTS "Dono_Gere_Categorias" ON public.message_categories;
CREATE POLICY "Dono_Gere_Categorias" ON public.message_categories FOR ALL USING (EXISTS (SELECT 1 FROM public.shops WHERE id = message_categories.shop_id AND owner_id = auth.uid()));
DROP POLICY IF EXISTS "Publico_Ve_Gatilhos" ON public.automation_triggers;
CREATE POLICY "Publico_Ve_Gatilhos" ON public.automation_triggers FOR SELECT USING (true);
DROP POLICY IF EXISTS "Dono_Gere_Gatilhos" ON public.automation_triggers;
CREATE POLICY "Dono_Gere_Gatilhos" ON public.automation_triggers FOR ALL USING (EXISTS (SELECT 1 FROM public.shops WHERE id = automation_triggers.shop_id AND owner_id = auth.uid()));

-- Tokens (Acesso bloqueado via API anon)
DROP POLICY IF EXISTS "Server_Only_Tokens" ON public.client_auth_tokens;
CREATE POLICY "Server_Only_Tokens" ON public.client_auth_tokens FOR ALL USING (false) WITH CHECK (false);

-- Chat Sessions (IA e Donos)
DROP POLICY IF EXISTS "Allow server-side access to chat sessions" ON public.whatsapp_chat_sessions;
CREATE POLICY "Allow server-side access to chat sessions" ON public.whatsapp_chat_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Dono_Gere_Sessoes" ON public.whatsapp_chat_sessions;
CREATE POLICY "Dono_Gere_Sessoes" ON public.whatsapp_chat_sessions FOR ALL USING (EXISTS (SELECT 1 FROM public.shops WHERE id = whatsapp_chat_sessions.shop_id AND owner_id = auth.uid()));

-- Metas
DROP POLICY IF EXISTS "Dono_Gere_Metas" ON public.goals;
CREATE POLICY "Dono_Gere_Metas" ON public.goals FOR ALL USING (EXISTS (SELECT 1 FROM public.shops WHERE id = goals.shop_id AND owner_id = auth.uid()));

-- Assinaturas
DROP POLICY IF EXISTS "Dono_Gere_Planos" ON public.subscription_plans;
CREATE POLICY "Dono_Gere_Planos" ON public.subscription_plans FOR ALL USING (EXISTS (SELECT 1 FROM public.shops WHERE id = subscription_plans.shop_id AND owner_id = auth.uid()));
DROP POLICY IF EXISTS "Publico_Ve_Planos" ON public.subscription_plans;
CREATE POLICY "Publico_Ve_Planos" ON public.subscription_plans FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "Dono_Gere_Assinaturas_Clientes" ON public.client_subscriptions;
CREATE POLICY "Dono_Gere_Assinaturas_Clientes" ON public.client_subscriptions FOR ALL USING (EXISTS (SELECT 1 FROM public.shops WHERE id = client_subscriptions.shop_id AND owner_id = auth.uid()));

DROP POLICY IF EXISTS "Cliente_Ve_Propria_Assinatura" ON public.client_subscriptions;
CREATE POLICY "Cliente_Ve_Propria_Assinatura" ON public.client_subscriptions 
FOR SELECT 
USING (
  client_id IN (
    SELECT id FROM public.clients 
    WHERE phone = current_setting('request.jwt.claims', true)::json->>'phone'
       OR phone = current_setting('app.current_client_phone', true)
  )
);

-- ──────────────────────────────────────────────────────────────────────────────
-- FIX CRÍTICO DE SEGURANÇA (era: USING (true) sem filtro de plano)
-- Produtos agora exige plano ativo/trial para leitura pública.
-- A view products_public expõe apenas colunas seguras (sem cost_price e min_stock).
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Publico_Ve_Produtos" ON public.products;
CREATE POLICY "Publico_Ve_Produtos" ON public.products
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.shops
            WHERE id = products.shop_id
            AND plan IN ('active', 'trial')
        )
    );

DROP POLICY IF EXISTS "Dono_Gere_Produtos" ON public.products;
CREATE POLICY "Dono_Gere_Produtos" ON public.products FOR ALL USING (EXISTS (SELECT 1 FROM public.shops WHERE id = products.shop_id AND owner_id = auth.uid()));

DROP POLICY IF EXISTS "Dono_Gere_Vendas_Produtos" ON public.appointment_products;
CREATE POLICY "Dono_Gere_Vendas_Produtos" ON public.appointment_products FOR ALL USING (EXISTS (SELECT 1 FROM public.appointments a JOIN public.shops s ON s.id = a.shop_id WHERE a.id = appointment_products.appointment_id AND s.owner_id = auth.uid()));


-- ==============================================================================
-- SEÇÃO 7: VIEW PÚBLICA SEGURA DE PRODUTOS
-- Expõe apenas colunas seguras ao público — sem cost_price, sem min_stock
-- FIX consolidado do supabase_security_fixes.sql
-- ==============================================================================

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

GRANT SELECT ON public.products_public TO anon, authenticated;


-- ==============================================================================
-- SEÇÃO 8: MIGRAÇÕES DE DADOS
-- ==============================================================================

-- Inserir gatilho de aniversário nas lojas que ainda não o possuem
INSERT INTO automation_triggers (shop_id, name, value, unit, period, active)
SELECT id, 'Aniversário', 0, 'days', 'immediate', true
FROM shops
WHERE NOT EXISTS (
    SELECT 1 FROM automation_triggers
    WHERE automation_triggers.shop_id = shops.id
    AND automation_triggers.name = 'Aniversário'
);



-- ==============================================================================
-- SEÇÃO: CONTROLE DE CAIXA (cash_sessions + cash_flow_entries)
-- Absorvido do arquivo separado cash_control_setup.sql
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.cash_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('open', 'closed')),
    opening_balance NUMERIC(12,2) DEFAULT 0,
    closing_balance NUMERIC(12,2),
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    closed_at TIMESTAMP WITH TIME ZONE,
    opened_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.cash_flow_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.cash_sessions(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('input', 'output')),
    category TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- Garantir apenas uma sessão aberta por loja
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_open_session_per_shop
    ON public.cash_sessions (shop_id)
    WHERE status = 'open';

ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_flow_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dono_Gere_Caixa" ON public.cash_sessions;
CREATE POLICY "Dono_Gere_Caixa" ON public.cash_sessions FOR ALL USING (
    EXISTS (SELECT 1 FROM public.shops WHERE id = cash_sessions.shop_id AND owner_id = auth.uid())
);

DROP POLICY IF EXISTS "Dono_Gere_Movimentacoes" ON public.cash_flow_entries;
CREATE POLICY "Dono_Gere_Movimentacoes" ON public.cash_flow_entries FOR ALL USING (
    EXISTS (SELECT 1 FROM public.shops WHERE id = cash_flow_entries.shop_id AND owner_id = auth.uid())
);

-- ==============================================================================
-- FIM DO SCRIPT — Recarrega cache do PostgREST
-- ==============================================================================
NOTIFY pgrst, 'reload schema';

-- ==============================================================================
-- CORREÇÕES DE SEGURANÇA E IDEMPOTÊNCIA
-- ==============================================================================

-- 1. Proteção do cache de instâncias (Impede manipulação anônima)
ALTER TABLE public.instance_status_cache ENABLE ROW LEVEL SECURITY;

-- 2. Tabela de eventos para garantir idempotência em Webhooks (ex: Asaas)
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id TEXT UNIQUE NOT NULL,
    source TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
