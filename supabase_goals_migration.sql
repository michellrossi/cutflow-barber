
-- 1. Tabela de Metas (Goals)
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    professional_id UUID REFERENCES public.professionals(id) ON DELETE SET NULL, -- Opcional: nulo = meta global
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('faturamento', 'atendimentos', 'venda_produtos')),
    target_value NUMERIC(12,2) NOT NULL,
    current_value NUMERIC(12,2) DEFAULT 0,
    period TEXT NOT NULL CHECK (period IN ('diário', 'semanal', 'mensal')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- 2. RLS para Metas
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dono_Gere_Metas" ON public.goals;
CREATE POLICY "Dono_Gere_Metas" ON public.goals
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.shops WHERE id = goals.shop_id AND owner_id = auth.uid())
  );

-- 3. Function para Atualizar Metas Automaticamente
CREATE OR REPLACE FUNCTION public.update_goals_on_completion()
RETURNS TRIGGER AS $$
DECLARE
    appointment_total NUMERIC(12,2);
    products_total NUMERIC(12,2);
    apt_date DATE;
BEGIN
    -- Só age quando o status muda para 'completed'
    IF (NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed')) THEN
        
        apt_date := NEW.date::DATE;
        appointment_total := NEW.total_value; -- Assume que NEW.total_value tem o valor dos serviços

        -- Calcula o total vendido em produtos para este agendamento
        SELECT COALESCE(SUM(quantity * unit_price), 0) INTO products_total 
        FROM public.appointment_products 
        WHERE appointment_id = NEW.id;

        -- 3.1 Atualiza metas de 'faturamento' (Serviços + Produtos)
        UPDATE public.goals
        SET current_value = current_value + (appointment_total + products_total)
        WHERE shop_id = NEW.shop_id
          AND category = 'faturamento'
          AND start_date <= apt_date 
          AND end_date >= apt_date
          AND (professional_id IS NULL OR professional_id = NEW.professional_id);

        -- 3.2 Atualiza metas de 'atendimentos' (Contagem simples)
        UPDATE public.goals
        SET current_value = current_value + 1
        WHERE shop_id = NEW.shop_id
          AND category = 'atendimentos'
          AND start_date <= apt_date 
          AND end_date >= apt_date
          AND (professional_id IS NULL OR professional_id = NEW.professional_id);

        -- 3.3 Atualiza metas de 'venda_produtos' (Apenas Valor dos Produtos)
        IF products_total > 0 THEN
            UPDATE public.goals
            SET current_value = current_value + products_total
            WHERE shop_id = NEW.shop_id
              AND category = 'venda_produtos'
              AND start_date <= apt_date 
              AND end_date >= apt_date
              AND (professional_id IS NULL OR professional_id = NEW.professional_id);
        END IF;

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger de Metas
DROP TRIGGER IF EXISTS trg_update_goals ON public.appointments;
CREATE TRIGGER trg_update_goals
AFTER UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_goals_on_completion();
