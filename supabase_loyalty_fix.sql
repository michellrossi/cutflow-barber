-- ==============================================================================
-- CUTFLOW — FIX: Programa de Fidelidade (award_loyalty_reward)
-- Execute no SQL Editor do Supabase para corrigir a função.
-- Data: Abril/2026
-- ==============================================================================

-- Garante que a coluna loyalty_enabled existe na tabela settings
ALTER TABLE public.settings
    ADD COLUMN IF NOT EXISTS loyalty_enabled BOOLEAN DEFAULT true;

-- Garante que a coluna loyalty_mode existe na tabela settings
ALTER TABLE public.settings
    ADD COLUMN IF NOT EXISTS loyalty_mode TEXT DEFAULT 'card';

-- ── RPC: Recompensa de Fidelidade (Atômica — suporta modo card e points) ────
-- Gera cupom único + zera o contador correto + retorna dados para o WhatsApp.
CREATE OR REPLACE FUNCTION public.award_loyalty_reward(p_client_id UUID, p_shop_id UUID)
RETURNS JSON AS $$
DECLARE
    v_client RECORD;
    v_settings RECORD;
    v_coupon_code TEXT;
    v_expires_at TIMESTAMPTZ;
    v_meta_atingida BOOLEAN := false;
BEGIN
    -- Lock atômico para evitar cupons duplicados em requisições simultâneas
    SELECT * INTO v_client FROM public.clients WHERE id = p_client_id AND shop_id = p_shop_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Cliente não encontrado');
    END IF;

    SELECT * INTO v_settings FROM public.settings WHERE shop_id = p_shop_id;
    IF NOT FOUND OR COALESCE(v_settings.loyalty_enabled, true) = false THEN
        RETURN json_build_object('success', false, 'message', 'Programa de fidelidade desativado');
    END IF;

    -- Verifica se a meta foi realmente atingida conforme o modo configurado
    IF COALESCE(v_settings.loyalty_mode, 'card') = 'card' THEN
        -- Modo Cartão Fidelidade: conta visitas (loyalty_card_count)
        IF v_client.loyalty_card_count >= COALESCE(v_settings.loyalty_card_goal, 10) THEN
            v_meta_atingida := true;
        END IF;
    ELSE
        -- Modo Pontos: soma pontos por valor gasto (loyalty_points)
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

    -- Zera o contador correto conforme o modo configurado
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

-- Recarrega o cache do PostgREST
NOTIFY pgrst, 'reload schema';
