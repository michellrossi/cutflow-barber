import { vi } from 'vitest';

export const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  neq: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  not: vi.fn().mockReturnThis(),
  single: vi.fn().mockImplementation(() => Promise.resolve({ data: null, error: null })),
  maybeSingle: vi.fn().mockImplementation(() => Promise.resolve({ data: null, error: null })),
  limit: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  rpc: vi.fn().mockImplementation(() => Promise.resolve({ data: null, error: null })),
  auth: { 
    getUser: vi.fn(),
    getSession: vi.fn().mockImplementation(() => Promise.resolve({ data: { session: null }, error: null }))
  }
};

// Helper para resetar e manter os retornos encadeáveis
export const resetSupabaseMocks = () => {
  vi.clearAllMocks();
  mockSupabase.from.mockReturnThis();
  mockSupabase.select.mockReturnThis();
  mockSupabase.insert.mockReturnThis();
  mockSupabase.update.mockReturnThis();
  mockSupabase.delete.mockReturnThis();
  mockSupabase.eq.mockReturnThis();
  mockSupabase.neq.mockReturnThis();
  mockSupabase.gte.mockReturnThis();
  mockSupabase.lte.mockReturnThis();
  mockSupabase.in.mockReturnThis();
  mockSupabase.not.mockReturnThis();
  mockSupabase.limit.mockReturnThis();
  mockSupabase.order.mockReturnThis();
};

// Mock do módulo para que qualquer import de ../lib/supabase receba o mock
vi.mock('../../lib/supabase', () => ({
  supabaseAdmin: mockSupabase
}));
