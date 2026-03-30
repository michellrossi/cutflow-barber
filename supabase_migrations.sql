-- ==========================================================
-- 1. EXTENSÕES E TABELAS BASE
-- ==========================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabelas principais (caso não existam)
CREATE TABLE IF NOT EXISTS public.clients (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_id uuid REFERENCES shops(id) ON DELETE CASCADE,
    name text NOT NULL,
    phone text,
    email text,
    avatar_url text,
    notes text,
    total_spent numeric DEFAULT 0,
    loyalty_points integer DEFAULT 0,
    loyalty_card_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.client_auth_tokens (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
    token text NOT NULL UNIQUE,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.message_templates (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_id uuid REFERENCES shops(id) ON DELETE CASCADE,
    title text NOT NULL,
    content text NOT NULL,
    trigger text NOT NULL,
    delay_value integer DEFAULT 0,
    delay_unit text DEFAULT 'minutes',
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_id uuid REFERENCES shops(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    price numeric NOT NULL,
    services_per_month integer NOT NULL,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.client_subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_id uuid REFERENCES shops(id) ON DELETE CASCADE,
    client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
    plan_id uuid REFERENCES subscription_plans(id) ON DELETE CASCADE,
    status text DEFAULT 'pending',
    start_date date,
    next_billing_date date,
    services_used_this_month integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================================
-- 2. ATUALIZAÇÃO DE COLUNAS (SCHEMA)
-- ==========================================================

-- Shops
ALTER TABLE public.shops 
ADD COLUMN IF NOT EXISTS trial_started_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS trial_ends_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS plan text DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS whatsapp_instance text,
ADD COLUMN IF NOT EXISTS whatsapp_connected boolean DEFAULT false;

-- Professionals
ALTER TABLE public.professionals 
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS commission_percentage integer DEFAULT 50,
ADD COLUMN IF NOT EXISTS color text DEFAULT '#f97316';

-- Services
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS image_url text;

-- Coupons
ALTER TABLE public.coupons 
ADD COLUMN IF NOT EXISTS max_uses integer,
ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS is_loyalty_reward boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id) ON DELETE CASCADE;

-- Settings (Cores e Fidelidade)
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
ADD COLUMN IF NOT EXISTS loyalty_mode text DEFAULT 'card',
ADD COLUMN IF NOT EXISTS loyalty_card_goal integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS loyalty_points_ratio integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS loyalty_points_goal integer DEFAULT 1000,
ADD COLUMN IF NOT EXISTS loyalty_reward_value numeric DEFAULT 10,
ADD COLUMN IF NOT EXISTS loyalty_reward_type text DEFAULT 'percentage',
ADD COLUMN IF NOT EXISTS loyalty_reward_validity_days integer DEFAULT 90;

-- Appointments
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS payment_method text,
ADD COLUMN IF NOT EXISTS used_subscription_id uuid REFERENCES client_subscriptions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS confirmation_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_24h_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_1h_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS rescheduling_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS post_sale_sent boolean DEFAULT false;

-- ==========================================================
-- 3. ÍNDICES E CONSTRAINTS
-- ==========================================================
DROP INDEX IF EXISTS idx_agendamento_unico_ativo;
CREATE UNIQUE INDEX idx_agendamento_unico_ativo 
ON public.appointments (shop_id, professional_id, date, time)
WHERE status NOT IN ('cancelled', 'noshow');

-- ==========================================================
-- 4. FUNÇÕES E TRIGGERS
-- ==========================================================

-- Função para incrementar uso de cupom
CREATE OR REPLACE FUNCTION increment_coupon_usage(p_code TEXT, p_shop_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.coupons 
  SET uses = uses + 1 
  WHERE code = p_code AND shop_id = p_shop_id;
END;
$$ LANGUAGE plpgsql;

-- Função de Agendamento com Rate Limit
CREATE OR REPLACE FUNCTION public.book_appointment(
  p_shop_id UUID, p_client_name TEXT, p_client_phone TEXT, p_service_ids TEXT[],
  p_professional_id UUID, p_date TEXT, p_time TEXT, p_total_value NUMERIC,
  p_coupon_code TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_appointment_id UUID;
  v_daily_count INTEGER;
BEGIN
  -- Rate Limit: 3 agendamentos por dia por telefone
  SELECT COUNT(*) INTO v_daily_count FROM public.appointments
  WHERE shop_id = p_shop_id AND client_phone = p_client_phone AND DATE(created_at) = CURRENT_DATE;

  IF v_daily_count >= 3 THEN
    RAISE EXCEPTION 'Limite diário atingido para este número.';
  END IF;

  INSERT INTO public.appointments (
    shop_id, client_name, client_phone, service_ids, professional_id, date, time, total_value, coupon_code, status
  ) VALUES (
    p_shop_id, p_client_name, p_client_phone, p_service_ids, p_professional_id, p_date, p_time, p_total_value, p_coupon_code, 'scheduled'
  ) RETURNING id INTO v_appointment_id;

  IF p_coupon_code IS NOT NULL THEN
    PERFORM increment_coupon_usage(p_coupon_code, p_shop_id);
  END IF;

  RETURN json_build_object('id', v_appointment_id, 'status', 'success');
END;
$$ LANGUAGE plpgsql;

-- Gatilho para Total Gasto do Cliente
CREATE OR REPLACE FUNCTION update_client_total_spent() RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed') OR (TG_OP = 'INSERT' AND NEW.status = 'completed') THEN
        UPDATE clients SET total_spent = total_spent + NEW.total_value WHERE id = NEW.client_id;
    ELSIF (TG_OP = 'UPDATE' AND OLD.status = 'completed' AND NEW.status != 'completed') OR (TG_OP = 'DELETE' AND OLD.status = 'completed') THEN
        UPDATE clients SET total_spent = total_spent - OLD.total_value WHERE id = OLD.client_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_client_spending ON appointments;
CREATE TRIGGER tr_update_client_spending AFTER INSERT OR UPDATE OR DELETE ON appointments FOR EACH ROW EXECUTE FUNCTION update_client_total_spent();

-- ==========================================================
-- 5. SEGURANÇA (RLS) - POLÍTICAS CONSOLIDADAS
-- ==========================================================

-- Habilitar RLS em todas
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_auth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_subscriptions ENABLE ROW LEVEL SECURITY;

-- Limpar políticas antigas para evitar conflitos
DO $$ 
DECLARE pol RECORD;
BEGIN 
    FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' 
    LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename); 
    END LOOP; 
END $$;

-- POLÍTICAS: SHOPS
CREATE POLICY "Shops_Public_Select" ON shops FOR SELECT USING (true);
CREATE POLICY "Shops_Owner_All" ON shops FOR ALL USING (auth.uid() = owner_id);

-- POLÍTICAS: SERVIÇOS, PROFISSIONAIS, SETTINGS, CUPONS, BLOQUEIOS, TEMPLATES, PLANOS
-- (Padrão: Público lê, Dono gerencia)
CREATE POLICY "Public_Read_Common" ON services FOR SELECT USING (true);
CREATE POLICY "Public_Read_Common" ON professionals FOR SELECT USING (true);
CREATE POLICY "Public_Read_Common" ON settings FOR SELECT USING (true);
CREATE POLICY "Public_Read_Common" ON coupons FOR SELECT USING (true);
CREATE POLICY "Public_Read_Common" ON blocked_slots FOR SELECT USING (true);
CREATE POLICY "Public_Read_Common" ON message_templates FOR SELECT USING (true);
CREATE POLICY "Public_Read_Common" ON subscription_plans FOR SELECT USING (true);

CREATE POLICY "Owner_Manage_Services" ON services FOR ALL USING (EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND owner_id = auth.uid()));
CREATE POLICY "Owner_Manage_Professionals" ON professionals FOR ALL USING (EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND owner_id = auth.uid()));
CREATE POLICY "Owner_Manage_Settings" ON settings FOR ALL USING (EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND owner_id = auth.uid()));
CREATE POLICY "Owner_Manage_Coupons" ON coupons FOR ALL USING (EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND owner_id = auth.uid()));
CREATE POLICY "Owner_Manage_Blocked" ON blocked_slots FOR ALL USING (EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND owner_id = auth.uid()));
CREATE POLICY "Owner_Manage_Templates" ON message_templates FOR ALL USING (EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND owner_id = auth.uid()));
CREATE POLICY "Owner_Manage_Plans" ON subscription_plans FOR ALL USING (EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND owner_id = auth.uid()));

-- POLÍTICAS: APPOINTMENTS (O Paywall está aqui)
CREATE POLICY "Appts_Public_Select" ON appointments FOR SELECT USING (true);
CREATE POLICY "Appts_Public_Insert_Paywall" ON appointments FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND plan IN ('active', 'trial')));
CREATE POLICY "Appts_Owner_Manage" ON appointments FOR ALL USING (EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND owner_id = auth.uid()));
CREATE POLICY "Appts_Pro_Update" ON appointments FOR UPDATE USING (EXISTS (SELECT 1 FROM professionals WHERE id = professional_id AND user_id = auth.uid()));

-- POLÍTICAS: CLIENTS E ASSINATURAS (Privacidade da Equipe)
CREATE POLICY "Team_Read_Clients" ON clients FOR SELECT USING (EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND owner_id = auth.uid()) OR EXISTS (SELECT 1 FROM professionals WHERE shop_id = clients.shop_id AND user_id = auth.uid()));
CREATE POLICY "Owner_Manage_Clients" ON clients FOR ALL USING (EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND owner_id = auth.uid()));
CREATE POLICY "Owner_Manage_Subs" ON client_subscriptions FOR ALL USING (EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND owner_id = auth.uid()));
CREATE POLICY "Public_Read_Subs" ON client_subscriptions FOR SELECT USING (true);

-- POLÍTICAS: TOKENS
CREATE POLICY "Tokens_All" ON client_auth_tokens FOR ALL USING (true);