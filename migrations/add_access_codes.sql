-- Tabela para armazenar códigos curtos de acesso do cliente
-- Substitui o JWT longo na URL por um código de 8 caracteres

CREATE TABLE IF NOT EXISTS access_codes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    code text NOT NULL UNIQUE,
    token text NOT NULL,
    expires_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Index para busca rápida pelo código
CREATE INDEX IF NOT EXISTS idx_access_codes_code ON access_codes (code);

-- Limpeza automática de códigos expirados (executar a cada hora via pg_cron ou manualmente)
-- DELETE FROM access_codes WHERE expires_at < now();

-- Habilitar RLS
ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Apenas o service_role pode inserir e ler (backend usa supabaseAdmin)
CREATE POLICY "Service role full access" ON access_codes
    FOR ALL
    USING (true)
    WITH CHECK (true);
