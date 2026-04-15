-- Tabela para sessões de chat do WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    remote_jid TEXT NOT NULL, -- WhatsApp ID do cliente (ex: 5511999999999@s.whatsapp.net)
    context JSONB DEFAULT '{}', -- Estado atual (step, service_id, pro_id, date, etc)
    messages JSONB DEFAULT '[]', -- Histórico formatado para o Gemini
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(shop_id, remote_jid)
);

-- Habilitar RLS (apenas para o admin/servidor via service_role)
ALTER TABLE public.whatsapp_chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow server-side access to chat sessions" 
ON public.whatsapp_chat_sessions 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);
