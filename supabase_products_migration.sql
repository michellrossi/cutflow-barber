
-- 1. Tabela de Produtos (Inventory)
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

-- 2. Tabela de junção Appointment <-> Products (Vendas casadas)
CREATE TABLE IF NOT EXISTS public.appointment_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- 3. Function & Trigger para desconto automático de estoque
CREATE OR REPLACE FUNCTION public.handle_stock_on_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Verifica se o status mudou para 'completed'
    IF (TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed') THEN
        -- Descontar estoque de produtos vinculados
        UPDATE public.products p
        SET current_stock = p.current_stock - ap.quantity
        FROM public.appointment_products ap
        WHERE ap.appointment_id = NEW.id
          AND ap.product_id = p.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_stock_on_completion ON public.appointments;
CREATE TRIGGER trg_stock_on_completion
AFTER UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.handle_stock_on_completion();

-- 4. RLS Políticas
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dono_Gere_Produtos" ON public.products;
CREATE POLICY "Dono_Gere_Produtos" ON public.products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.shops WHERE id = products.shop_id AND owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Dono_Gere_Vendas_Produtos" ON public.appointment_products;
CREATE POLICY "Dono_Gere_Vendas_Produtos" ON public.appointment_products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.appointments a 
            JOIN public.shops s ON s.id = a.shop_id 
            WHERE a.id = appointment_products.appointment_id AND s.owner_id = auth.uid())
  );

-- Garantir que anon key possa ver produtos para exibição pública (opcional, mas comum para "vitrine")
DROP POLICY IF EXISTS "Publico_Ve_Produtos" ON public.products;
CREATE POLICY "Publico_Ve_Produtos" ON public.products
  FOR SELECT USING (true);
