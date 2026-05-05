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
  
  const chainableMethods = [
    'from', 'select', 'insert', 'update', 'delete', 
    'eq', 'neq', 'gte', 'lte', 'in', 'not', 'limit', 'order'
  ];

  chainableMethods.forEach(method => {
    (mockSupabase as any)[method].mockReturnValue(mockSupabase);
  });

  // Para tornar o mockSupabase "awaitable" (thenable)
  (mockSupabase as any).then = (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve);

  mockSupabase.single.mockImplementation(() => Promise.resolve({ data: null, error: null }));
  mockSupabase.maybeSingle.mockImplementation(() => Promise.resolve({ data: null, error: null }));
  mockSupabase.rpc.mockImplementation(() => Promise.resolve({ data: null, error: null }));
};

// Mock do módulo
vi.mock('../../lib/supabase', () => ({
  supabaseAdmin: mockSupabase
}));
