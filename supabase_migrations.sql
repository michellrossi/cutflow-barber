-- Migration: Adicionar novos campos no Supabase
-- Execute este script no SQL Editor do seu painel do Supabase

-- 1. Adicionar forma de pagamento na tabela de agendamentos
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS payment_method text;

-- 2. Adicionar comissão na tabela de profissionais (caso ainda não exista)
ALTER TABLE professionals 
ADD COLUMN IF NOT EXISTS commission_percentage numeric DEFAULT 50;

-- 3. Adicionar limite de uso na tabela de cupons (caso ainda não exista)
ALTER TABLE coupons 
ADD COLUMN IF NOT EXISTS max_uses integer;

-- 4. Adicionar campos de assinatura/trial na tabela de lojas (caso ainda não existam)
ALTER TABLE shops 
ADD COLUMN IF NOT EXISTS trial_started_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS trial_ends_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS plan text DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS payment_confirmed_at timestamp with time zone;

-- 5. Criar tabela de clientes (CRM)
CREATE TABLE IF NOT EXISTS clients (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_id uuid REFERENCES shops(id) ON DELETE CASCADE,
    name text NOT NULL,
    phone text,
    email text,
    avatar_url text,
    notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Vincular agendamentos aos clientes
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id) ON DELETE SET NULL;

-- 7. Campos de Fidelidade nos Clientes
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS loyalty_points integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS loyalty_card_count integer DEFAULT 0;

-- 8. Configurações de Fidelidade na tabela settings
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS loyalty_mode text DEFAULT 'card', -- 'points' | 'card'
ADD COLUMN IF NOT EXISTS loyalty_card_goal integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS loyalty_points_ratio integer DEFAULT 1, -- pontos por real gasto
ADD COLUMN IF NOT EXISTS loyalty_points_goal integer DEFAULT 1000,
ADD COLUMN IF NOT EXISTS loyalty_reward_value numeric DEFAULT 10,
ADD COLUMN IF NOT EXISTS loyalty_reward_type text DEFAULT 'percentage', -- 'percentage' | 'fixed'
ADD COLUMN IF NOT EXISTS loyalty_reward_validity_days integer DEFAULT 90;

-- 9. Tabela de Tokens de Autenticação para Clientes (WhatsApp Login)
CREATE TABLE IF NOT EXISTS client_auth_tokens (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
    token text NOT NULL UNIQUE,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Rastreamento de Recompensas de Fidelidade nos Cupons
ALTER TABLE coupons
ADD COLUMN IF NOT EXISTS is_loyalty_reward boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id) ON DELETE CASCADE;

-- 11. Rastreamento de Notificações nos Agendamentos (IA WhatsApp)
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS confirmation_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_24h_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_1h_sent boolean DEFAULT false;

-- 12. Celular do Profissional para Notificações
ALTER TABLE professionals 
ADD COLUMN IF NOT EXISTS phone text;

-- 13. WhatsApp Multi-Instance Fields
ALTER TABLE shops 
ADD COLUMN IF NOT EXISTS whatsapp_instance text,
ADD COLUMN IF NOT EXISTS whatsapp_connected boolean DEFAULT false;

-- 14. Habilitar RLS e criar políticas básicas para acesso do cliente
-- Importante: Isso garante que o cliente consiga se autenticar via token

ALTER TABLE client_auth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;

-- 15. Tabela de Modelos de Mensagem (WhatsApp)
CREATE TABLE IF NOT EXISTS message_templates (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_id uuid REFERENCES shops(id) ON DELETE CASCADE,
    title text NOT NULL,
    content text NOT NULL,
    trigger text NOT NULL, -- 'immediate_confirmation', 'appointment_reminder', 'rescheduling_request', 'post_sale', 'custom'
    delay_value integer DEFAULT 0,
    delay_unit text DEFAULT 'minutes', -- 'minutes', 'hours', 'days'
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

-- Políticas para client_auth_tokens
CREATE POLICY "Permitir inserção de token por qualquer um" ON client_auth_tokens FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir leitura de token por qualquer um" ON client_auth_tokens FOR SELECT USING (true);
CREATE POLICY "Permitir deleção de token por qualquer um" ON client_auth_tokens FOR DELETE USING (true);

-- Políticas para clients
CREATE POLICY "Permitir leitura de clientes por qualquer um" ON clients FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de clientes por qualquer um" ON clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização do próprio cliente" ON clients FOR UPDATE USING (true);

-- Políticas para appointments (leitura pública para o fluxo de agendamento e histórico)
CREATE POLICY "Permitir leitura de agendamentos por qualquer um" ON appointments FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de agendamentos por qualquer um" ON appointments FOR INSERT WITH CHECK (true);

-- Políticas para outras tabelas (leitura pública necessária para o BookingFlow)
CREATE POLICY "Permitir leitura de lojas por qualquer um" ON shops FOR SELECT USING (true);
CREATE POLICY "Permitir leitura de configurações por qualquer um" ON settings FOR SELECT USING (true);
CREATE POLICY "Permitir leitura de serviços por qualquer um" ON services FOR SELECT USING (true);
CREATE POLICY "Permitir leitura de profissionais por qualquer um" ON professionals FOR SELECT USING (true);

-- Políticas para message_templates
CREATE POLICY "Permitir leitura de modelos por qualquer um" ON message_templates FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de modelos por qualquer um" ON message_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de modelos por qualquer um" ON message_templates FOR UPDATE USING (true);
CREATE POLICY "Permitir deleção de modelos por qualquer um" ON message_templates FOR DELETE USING (true);
