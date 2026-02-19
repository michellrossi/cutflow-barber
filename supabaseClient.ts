import { createClient } from '@supabase/supabase-js';

// Augment Vite's ImportMetaEnv interface to include our specific variables.
// This merges with the existing ImportMetaEnv defined by vite/client.
declare global {
  interface ImportMetaEnv {
    VITE_SUPABASE_URL: string;
    VITE_SUPABASE_ANON_KEY: string;
  }
}

// IMPORTANTE: No Vite, as variáveis de ambiente DEVEM ser acessadas diretamente
// (ex: import.meta.env.VITE_NOME) para que o bundler consiga substituir
// o valor estaticamente durante a construção do projeto.
// Acesso dinâmico via colchetes (import.meta.env[key]) geralmente falha em produção.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Verificação de segurança simplificada e robusta
if (!supabaseUrl || !supabaseKey) {
  const errorMsg = "ERRO DE CONFIGURAÇÃO: As credenciais do Supabase não foram encontradas. Certifique-se de que VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY estão definidas no arquivo .env";
  console.error(errorMsg);
  throw new Error(errorMsg);
}

export const supabase = createClient(supabaseUrl, supabaseKey);