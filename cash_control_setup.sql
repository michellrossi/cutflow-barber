-- ==============================================================================
-- SETUP DE CONTROLE DE CAIXA (CASH FLOW)
-- ==============================================================================

-- 1. Criação das Tabelas

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

-- Para evitar duas sessões de caixa abertas ao mesmo tempo na mesma barbearia
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_open_session_per_shop 
ON public.cash_sessions (shop_id) 
WHERE status = 'open';

-- 2. Habilitar RLS e criar políticas

ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_flow_entries ENABLE ROW LEVEL SECURITY;

-- Políticas para cash_sessions
DROP POLICY IF EXISTS "Dono_Gere_Caixa" ON public.cash_sessions;
CREATE POLICY "Dono_Gere_Caixa" ON public.cash_sessions FOR ALL USING (
    EXISTS (SELECT 1 FROM public.shops WHERE id = cash_sessions.shop_id AND owner_id = auth.uid())
);

-- Políticas para cash_flow_entries
DROP POLICY IF EXISTS "Dono_Gere_Movimentacoes" ON public.cash_flow_entries;
CREATE POLICY "Dono_Gere_Movimentacoes" ON public.cash_flow_entries FOR ALL USING (
    EXISTS (SELECT 1 FROM public.shops WHERE id = cash_flow_entries.shop_id AND owner_id = auth.uid())
);

NOTIFY pgrst, 'reload schema';
