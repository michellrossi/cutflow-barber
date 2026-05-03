import type { ShopState } from '../types';

// Tipo de retorno padrão para todas as mutations
export type MutationResult<T = unknown> = Promise<{ success: boolean; data?: T; error?: string }>;

// Re-exporta tipos de domínio que os contextos precisam (opcional se importar direto de ../types)
export type { ShopState };
