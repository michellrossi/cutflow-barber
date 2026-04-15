-- ==============================================================================
-- SCRIPT CONSOLIDADO DO SUPABASE (Substitui os Scripts 1 ao 10)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. ALTERAÇÕES EM TABELAS EXISTENTES
-- ==========================================

-- SHOPS
ALTER TABLE public.shops
    ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'trial',
    ADD COLUMN IF NOT EXISTS whatsapp_instance TEXT,
    ADD COLUMN IF NOT EXISTS whatsapp_connected BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;

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
    ADD COLUMN IF NOT EXISTS birthday_last_sent_year INTEGER DEFAULT 0;

-- COUPONS
ALTER TABLE public.coupons
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS is_loyalty_reward BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE;

-- APPOINTMENTS
ALTER TABLE public.appointments
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
    ADD COLUMN IF NOT EXISTS send_attempts_30d INTEGER DEFAULT 0;


-- ==========================================
-- 2. CRIAÇÃO DE NOVAS TABELAS
-- ==========================================

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

-- TEMPLATES DE MENSAGEM (Já com as correções do Script 9)
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

-- Caso a tabela message_templates já exista, garantimos que as colunas do Script 9 sejam adicionadas e alteradas
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

-- SESSÕES DO WHATSAPP (Para IA)
CREATE TABLE IF NOT EXISTS public.whatsapp_chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    remote_jid TEXT NOT NULL,
    context JSONB DEFAULT '{}',
    messages JSONB DEFAULT '[]',
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(shop_id, remote_jid)
);

-- METAS FINANCEIRAS E ATENDIMENTOS
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    professional_id UUID REFERENCES public.professionals(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('faturamento', 'atendimentos', 'venda_produtos')),
    target_value NUMERIC(12,2) NOT NULL,
    current_value NUMERIC(12,2) DEFAULT 0,
    period TEXT NOT NULL CHECK (period IN ('diário', 'semanal', 'mensal')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

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


-- ==========================================
-- 3. ÍNDICES
-- ==========================================
DROP INDEX IF EXISTS idx_agendamento_unico_ativo;
CREATE UNIQUE INDEX idx_agendamento_unico_ativo
ON public.appointments (shop_id, professional_id, date, time)
WHERE status NOT IN ('cancelled', 'noshow');

CREATE INDEX IF NOT EXISTS idx_message_templates_shop_id
ON public.message_templates(shop_id);


-- ==========================================
-- 4. FUNÇÕES, PROCEDURES E TRIGGERS
-- ==========================================

-- Função: Criar Agendamento e evitar fraude (limite diário)
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

-- Função & Trigger: Atualizar Total Gasto pelo Cliente
CREATE OR REPLACE FUNCTION update_client_total_spent()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed')
    OR (TG_OP = 'INSERT' AND NEW.status = 'completed') THEN
        UPDATE clients SET total_spent = total_spent + NEW.total_value WHERE id = NEW.client_id;
    ELSIF (TG_OP = 'UPDATE' AND OLD.status = 'completed' AND NEW.status != 'completed')
    OR (TG_OP = 'DELETE' AND OLD.status = 'completed') THEN
        UPDATE clients SET total_spent = total_spent - OLD.total_value WHERE id = OLD.client_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_client_spending ON public.appointments;
CREATE TRIGGER tr_update_client_spending
AFTER INSERT OR UPDATE OR DELETE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION update_client_total_spent();

-- Função & Trigger: Atualizar Metas Automaticamente
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
        WHERE shop_id = NEW.shop_id AND category = 'faturamento' AND start_date <= apt_date AND end_date >= apt_date AND (professional_id IS NULL OR professional_id = NEW.professional_id);

        UPDATE public.goals
        SET current_value = current_value + 1
        WHERE shop_id = NEW.shop_id AND category = 'atendimentos' AND start_date <= apt_date AND end_date >= apt_date AND (professional_id IS NULL OR professional_id = NEW.professional_id);

        IF products_total > 0 THEN
            UPDATE public.goals
            SET current_value = current_value + products_total
            WHERE shop_id = NEW.shop_id AND category = 'venda_produtos' AND start_date <= apt_date AND end_date >= apt_date AND (professional_id IS NULL OR professional_id = NEW.professional_id);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_goals ON public.appointments;
CREATE TRIGGER trg_update_goals
AFTER UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.update_goals_on_completion();

-- Função & Trigger: Controle de Estoque (Produtos)
CREATE OR REPLACE FUNCTION public.handle_stock_on_completion()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed') THEN
        UPDATE public.products p
        SET current_stock = p.current_stock - ap.quantity
        FROM public.appointment_products ap
        WHERE ap.appointment_id = NEW.id AND ap.product_id = p.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_stock_on_completion ON public.appointments;
CREATE TRIGGER trg_stock_on_completion
AFTER UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.handle_stock_on_completion();

-- Funções RPC para Tokens (Segurança Alta - Ignoram RLS)
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

-- Função RPC: Recompensa de Fidelidade
CREATE OR REPLACE FUNCTION public.award_loyalty_reward(p_client_id UUID, p_shop_id UUID)
RETURNS JSON AS $$
DECLARE
    v_client RECORD;
    v_settings RECORD;
    v_coupon_code TEXT;
    v_expires_at TIMESTAMPTZ;
BEGIN
    SELECT * INTO v_client FROM public.clients WHERE id = p_client_id AND shop_id = p_shop_id FOR UPDATE;
    IF NOT FOUND THEN RETURN json_build_object('success', false, 'message', 'Cliente não encontrado'); END IF;

    SELECT * INTO v_settings FROM public.settings WHERE shop_id = p_shop_id;
    IF NOT FOUND OR COALESCE(v_settings.loyalty_enabled, true) = false THEN
        RETURN json_build_object('success', false, 'message', 'Fidelidade desativada');
    END IF;

    IF v_client.loyalty_points < v_settings.loyalty_points_goal THEN
        RETURN json_build_object('success', false, 'message', 'Meta não atingida');
    END IF;

    v_coupon_code := UPPER(SPLIT_PART(v_client.name, ' ', 1)) || RIGHT(v_client.phone, 4) || EXTRACT(DAY FROM CURRENT_DATE)::TEXT;
    v_expires_at := NOW() + (COALESCE(v_settings.loyalty_reward_validity_days, 90) || ' days')::INTERVAL;

    INSERT INTO public.coupons (shop_id, client_id, code, discount_value, discount_type, expires_at, is_loyalty_reward)
    VALUES (p_shop_id, p_client_id, v_coupon_code, COALESCE(v_settings.loyalty_reward_value, 0), COALESCE(v_settings.loyalty_reward_type, 'percentage'), v_expires_at, true);

    UPDATE public.clients SET loyalty_points = 0 WHERE id = p_client_id;

    RETURN json_build_object('success', true, 'couponCode', v_coupon_code, 'clientName', v_client.name, 'clientPhone', v_client.phone, 'discount', v_settings.loyalty_reward_value, 'discountType', v_settings.loyalty_reward_type, 'validityDays', v_settings.loyalty_reward_validity_days);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- 5. POLÍTICAS DE SEGURANÇA (RLS)
-- ==========================================

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
CREATE POLICY "Servidor_Atualiza_Flags" ON public.appointments FOR UPDATE USING (true) WITH CHECK (true);

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

-- Chat Sessions (Exclusivo para Service Role da IA)
DROP POLICY IF EXISTS "Allow server-side access to chat sessions" ON public.whatsapp_chat_sessions;
CREATE POLICY "Allow server-side access to chat sessions" ON public.whatsapp_chat_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Metas
DROP POLICY IF EXISTS "Dono_Gere_Metas" ON public.goals;
CREATE POLICY "Dono_Gere_Metas" ON public.goals FOR ALL USING (EXISTS (SELECT 1 FROM public.shops WHERE id = goals.shop_id AND owner_id = auth.uid()));

-- Produtos e Vendas
DROP POLICY IF EXISTS "Publico_Ve_Produtos" ON public.products;
CREATE POLICY "Publico_Ve_Produtos" ON public.products FOR SELECT USING (true);
DROP POLICY IF EXISTS "Dono_Gere_Produtos" ON public.products;
CREATE POLICY "Dono_Gere_Produtos" ON public.products FOR ALL USING (EXISTS (SELECT 1 FROM public.shops WHERE id = products.shop_id AND owner_id = auth.uid()));
DROP POLICY IF EXISTS "Dono_Gere_Vendas_Produtos" ON public.appointment_products;
CREATE POLICY "Dono_Gere_Vendas_Produtos" ON public.appointment_products FOR ALL USING (EXISTS (SELECT 1 FROM public.appointments a JOIN public.shops s ON s.id = a.shop_id WHERE a.id = appointment_products.appointment_id AND s.owner_id = auth.uid()));


-- ==========================================
-- 6. MIGRAÇÕES DE DADOS GERAIS
-- ==========================================

-- Inserir o gatilho de aniversário nas lojas que ainda não o possuem
INSERT INTO automation_triggers (shop_id, name, value, unit, period, active)
SELECT id, 'Aniversário', 0, 'days', 'immediate', true
FROM shops
WHERE NOT EXISTS (
    SELECT 1 FROM automation_triggers 
    WHERE automation_triggers.shop_id = shops.id 
    AND automation_triggers.name = 'Aniversário'
);

-- Recarrega o cache do PostgREST do Supabase no final
NOTIFY pgrst, 'reload schema';