-- ==========================================================
-- 1. ESTRUTURA DE TABELAS E COLUNAS (IA, FIDELIDADE E CORES)
-- ==========================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ajustes na tabela SHOPS (Planos e WhatsApp)
ALTER TABLE public.shops 
ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS whatsapp_instance TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_connected BOOLEAN DEFAULT false; [cite: 36, 81]

-- Ajustes na tabela SERVICES (Imagens)
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS image_url TEXT; [cite: 57, 63]

-- Ajustes na tabela PROFESSIONALS (Comissão, Cores e Notificações)
ALTER TABLE public.professionals 
ADD COLUMN IF NOT EXISTS commission_percentage INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#f97316',
ADD COLUMN IF NOT EXISTS phone TEXT; [cite: 55, 62, 72, 80]

-- Ajustes na tabela SETTINGS (Personalização Visual e Fidelidade)
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
ADD COLUMN IF NOT EXISTS loyalty_reward_validity_days INTEGER DEFAULT 90; [cite: 58, 59, 60, 66, 67, 68, 82]

-- Ajustes na tabela CLIENTS (Fidelidade e Gastos)
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS total_spent NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS loyalty_card_count INTEGER DEFAULT 0; [cite: 47, 65]

-- Ajustes na tabela COUPONS (Expiração e Fidelidade)
ALTER TABLE public.coupons 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_loyalty_reward BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE; [cite: 54, 64, 69]

-- Ajustes na tabela APPOINTMENTS (Notificações e Rastreamento)
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS confirmation_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_24h_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_1h_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS rescheduling_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS post_sale_sent BOOLEAN DEFAULT false; [cite: 70, 71, 79, 92]

-- Nova Tabela: Modelos de Mensagens (WhatsApp)
CREATE TABLE IF NOT EXISTS public.message_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    trigger TEXT NOT NULL,
    delay_value INTEGER DEFAULT 0,
    delay_unit TEXT DEFAULT 'minutes',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
); [cite: 84]

-- Nova Tabela: Tokens de Autenticação (WhatsApp Login)
CREATE TABLE IF NOT EXISTS public.client_auth_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
); [cite: 68]

-- ==========================================================
-- 2. ÍNDICES E CONSTRAINTS
-- ==========================================================
-- Garante que não existam agendamentos duplicados no mesmo horário, exceto os cancelados
DROP INDEX IF EXISTS idx_agendamento_unico_ativo;
CREATE UNIQUE INDEX idx_agendamento_unico_ativo 
ON public.appointments (shop_id, professional_id, date, time)
WHERE status NOT IN ('cancelled', 'noshow'); [cite: 30]

CREATE INDEX IF NOT EXISTS idx_message_templates_shop_id ON public.message_templates(shop_id); [cite: 91]

-- ==========================================================
-- 3. FUNÇÕES (BOOKING E FINANCEIRO)
-- ==========================================================
-- Limpeza de funções antigas para evitar conflitos de tipos (Candidate Function Error)
DROP FUNCTION IF EXISTS public.book_appointment(uuid, text, text, text[], uuid, text, text, numeric, text);
DROP FUNCTION IF EXISTS public.book_appointment(uuid, text, text, uuid[], uuid, date, time, numeric, text);

-- Função principal de agendamento com Rate Limit
CREATE OR REPLACE FUNCTION public.book_appointment(
  p_shop_id UUID, p_client_name TEXT, p_client_phone TEXT, p_service_ids TEXT[],
  p_professional_id UUID, p_date TEXT, p_time TEXT, p_total_value NUMERIC,
  p_coupon_code TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_appointment_id UUID;
  v_daily_count INTEGER;
BEGIN
  -- Rate Limit: Máximo 3 por dia por telefone
  SELECT COUNT(*) INTO v_daily_count FROM public.appointments
  WHERE shop_id = p_shop_id AND client_phone = p_client_phone AND DATE(created_at) = CURRENT_DATE;

  IF v_daily_count >= 3 THEN
    RAISE EXCEPTION 'Limite diário atingido.';
  END IF; [cite: 38, 40]

  INSERT INTO public.appointments (shop_id, client_name, client_phone, service_ids, professional_id, date, time, total_value, coupon_code, status)
  VALUES (p_shop_id, p_client_name, p_client_phone, p_service_ids, p_professional_id, p_date, p_time, p_total_value, p_coupon_code, 'scheduled')
  RETURNING id INTO v_appointment_id; [cite: 44]

  RETURN json_build_object('id', v_appointment_id, 'status', 'success');
END;
$$ LANGUAGE plpgsql; [cite: 46]

-- Função para atualizar gastos do cliente
CREATE OR REPLACE FUNCTION update_client_total_spent() RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed') OR (TG_OP = 'INSERT' AND NEW.status = 'completed') THEN
        UPDATE clients SET total_spent = total_spent + NEW.total_value WHERE id = NEW.client_id;
    ELSIF (TG_OP = 'UPDATE' AND OLD.status = 'completed' AND NEW.status != 'completed') OR (TG_OP = 'DELETE' AND OLD.status = 'completed') THEN
        UPDATE clients SET total_spent = total_spent - OLD.total_value WHERE id = OLD.client_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql; [cite: 48, 49, 50, 51]

-- ==========================================================
-- 4. TRIGGERS
-- ==========================================================
DROP TRIGGER IF EXISTS tr_update_client_spending ON appointments;
CREATE TRIGGER tr_update_client_spending 
AFTER INSERT OR UPDATE OR DELETE ON appointments 
FOR EACH ROW EXECUTE FUNCTION update_client_total_spent(); [cite: 52]

-- ==========================================================
-- 5. POLÍTICAS DE SEGURANÇA (RLS)
-- ==========================================================
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_auth_tokens ENABLE ROW LEVEL SECURITY; [cite: 73, 77, 85]

-- Lojas e Filhas (Acesso Público para Clientes)
CREATE POLICY "Visibilidade Publica Lojas" ON public.shops FOR SELECT USING (true); [cite: 1]
CREATE POLICY "Publico_Ve_Servicos" ON public.services FOR SELECT USING (true); [cite: 5]
CREATE POLICY "Publico_Ve_Profissionais" ON public.professionals FOR SELECT USING (true); [cite: 6]

-- Gestão do Dono
CREATE POLICY "Dono_Gere_Loja" ON public.shops FOR ALL USING (auth.uid() = owner_id); [cite: 3, 4]
CREATE POLICY "Dono_Gere_Servicos" ON public.services FOR ALL USING (EXISTS (SELECT 1 FROM public.shops WHERE id = services.shop_id AND owner_id = auth.uid())); [cite: 9]
CREATE POLICY "Dono_Gere_Agendamentos" ON public.appointments FOR ALL USING (EXISTS (SELECT 1 FROM public.shops WHERE id = appointments.shop_id AND owner_id = auth.uid())); [cite: 14]

-- Agendamentos e Paywall
CREATE POLICY "Criar Agendamento Paywall" ON public.appointments FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.shops WHERE id = appointments.shop_id AND plan IN ('active', 'trial'))); [cite: 36]
CREATE POLICY "Publico_Le_Agendamentos" ON public.appointments FOR SELECT USING (true); [cite: 13]

-- Tokens e Templates
CREATE POLICY "Tokens_Acesso_Publico" ON public.client_auth_tokens FOR ALL USING (true); [cite: 74, 75, 76]
CREATE POLICY "Dono_Gere_Templates" ON public.message_templates FOR ALL USING (EXISTS (SELECT 1 FROM public.shops WHERE id = message_templates.shop_id AND owner_id = auth.uid())); [cite: 88, 89, 90]