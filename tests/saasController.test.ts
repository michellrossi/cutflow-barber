import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockSupabase, resetSupabaseMocks } from './mocks/supabase';
import { getStats, getShops } from '../controllers/saasController';

describe('saasController', () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  it('getStats chama a RPC correta e retorna dados', async () => {
    mockSupabase.rpc.mockResolvedValueOnce({ data: { total_shops: 10 }, error: null });
    const req = {} as any;
    const res = { json: vi.fn(), status: vi.fn().mockReturnThis() } as any;

    await getStats(req, res);

    expect(mockSupabase.rpc).toHaveBeenCalledWith('get_saas_stats');
    expect(res.json).toHaveBeenCalledWith({ total_shops: 10 });
  });

  it('getShops retorna lista de lojas ordenadas por criação', async () => {
    const mockShops = [{ id: '1', name: 'Barber A' }, { id: '2', name: 'Barber B' }];
    mockSupabase.select.mockReturnThis();
    mockSupabase.order.mockResolvedValueOnce({ data: mockShops });

    const req = {} as any;
    const res = { json: vi.fn(), status: vi.fn().mockReturnThis() } as any;

    await getShops(req, res);

    expect(mockSupabase.from).toHaveBeenCalledWith('shops');
    expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(res.json).toHaveBeenCalledWith(mockShops);
  });
});
