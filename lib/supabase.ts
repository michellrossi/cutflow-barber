import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl) {
    console.error("❌ ERRO CRÍTICO: supabaseUrl faltando!");
}

export const supabaseAdmin = createClient(
    supabaseUrl || 'https://placeholder.supabase.co', 
    serviceRoleKey || 'placeholder'
);
