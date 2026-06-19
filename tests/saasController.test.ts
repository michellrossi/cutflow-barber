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
    const mockShops = [
      { id: '1', name: 'Barber A', plan: 'active', monthly_price: 97, whatsapp_connected: true, created_at: '2026-06-19T00:00:00Z', users: { email: 'ownerA@test.com' } },
      { id: '2', name: 'Barber B', plan: 'trial', monthly_price: 97, whatsapp_connected: false, created_at: '2026-06-18T00:00:00Z', users: null }
    ];
    mockSupabase.select.mockReturnThis();
    mockSupabase.order.mockResolvedValueOnce({ data: mockShops });

    const req = {} as any;
    const res = { json: vi.fn(), status: vi.fn().mockReturnThis() } as any;

    await getShops(req, res);

    expect(mockSupabase.from).toHaveBeenCalledWith('shops');
    expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(res.json).toHaveBeenCalledWith({
      shops: [
        { id: '1', name: 'Barber A', owner_email: 'ownerA@test.com', plan: 'active', monthly_price: 97, whatsapp_connected: true, created_at: '2026-06-19T00:00:00Z' },
        { id: '2', name: 'Barber B', owner_email: undefined, plan: 'trial', monthly_price: 97, whatsapp_connected: false, created_at: '2026-06-18T00:00:00Z' }
      ]
    });
  });
});
