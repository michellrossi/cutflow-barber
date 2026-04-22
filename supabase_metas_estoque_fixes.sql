-- ==========================================
-- FIX 1 & 5: REALTIME SUBSCRIPTIONS
-- Habilita o realtime para as tabelas que não estavam atualizando
-- ==========================================

-- Habilitar Realtime para goals e products (via SQL se as tabelas já existem)
-- Nota: Para o Realtime funcionar, as tabelas devem ter PK e REPLICA IDENTITY FULL
ALTER TABLE public.goals REPLICA IDENTITY FULL;
ALTER TABLE public.products REPLICA IDENTITY FULL;

-- Adicionar as tabelas na publicação do Supabase Realtime
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'goals') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE goals;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'products') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE products;
  END IF;
END $$;

-- ==========================================
-- FIX 1 (METAS): CÁLCULO RETROATIVO
-- Garante que ao criar uma meta, ela já puxe dados passados do período
-- ==========================================

-- 1a. Função de cálculo dinâmico (Backfill)
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
        -- Soma agendamentos concluídos no período
        SELECT COALESCE(SUM(total_value), 0) INTO v_apt_total
        FROM public.appointments
        WHERE shop_id = v_goal.shop_id 
          AND status = 'completed'
          AND date::DATE BETWEEN v_goal.start_date AND v_goal.end_date
          AND (v_goal.professional_id IS NULL OR professional_id = v_goal.professional_id);
          
        -- Soma produtos vendidos nesses agendamentos
        SELECT COALESCE(SUM(ap.quantity * ap.unit_price), 0) INTO v_prod_total
        FROM public.appointment_products ap
        JOIN public.appointments a ON a.id = ap.appointment_id
        WHERE a.shop_id = v_goal.shop_id
          AND a.status = 'completed'
          AND a.date::DATE BETWEEN v_goal.start_date AND v_goal.end_date
          AND (v_goal.professional_id IS NULL OR a.professional_id = v_goal.professional_id);
        
        v_total := v_apt_total + v_prod_total;
        
    ELSIF v_goal.category = 'atendimentos' THEN
        -- Conta agendamentos concluídos
        SELECT COUNT(*) INTO v_total
        FROM public.appointments
        WHERE shop_id = v_goal.shop_id 
          AND status = 'completed'
          AND date::DATE BETWEEN v_goal.start_date AND v_goal.end_date
          AND (v_goal.professional_id IS NULL OR professional_id = v_goal.professional_id);
          
    ELSIF v_goal.category = 'venda_produtos' THEN
        -- Soma apenas produtos vendidos
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

-- 2. Trigger para inicializar o valor ao criar a meta
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

-- ==========================================
-- FIX: Adicionar 'anual' ao período válido
-- ==========================================
ALTER TABLE public.goals DROP CONSTRAINT IF EXISTS goals_period_check;
ALTER TABLE public.goals ADD CONSTRAINT goals_period_check
  CHECK (period IN ('diário', 'semanal', 'mensal', 'anual'));

-- Recarrega o cache do PostgREST
NOTIFY pgrst, 'reload schema';
