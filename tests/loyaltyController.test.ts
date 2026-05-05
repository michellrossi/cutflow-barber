import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, resetSupabaseMocks } from './mocks/supabase';
import { generateReward } from '../controllers/loyaltyController';

const makeRes = () => {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  return res as any;
};

describe('loyaltyController.generateReward', () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  it('deve retornar 404 se o cliente não pertencer à loja (cross-tenant check)', async () => {
    // Mock: Cliente não encontrado para aquele shop_id específico
    mockSupabase.single.mockResolvedValueOnce({ data: null, error: null });

    const req = { body: { clientId: 'client-1', shopId: 'shop-wrong' } } as any;
    const res = makeRes();

    await generateReward(req, res);

    expect(mockSupabase.eq).toHaveBeenCalledWith('shop_id', 'shop-wrong');
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Cliente não encontrado' }));
  });

  it('deve inserir cupom com colunas corretas ao gerar prêmio', async () => {
    // 1. Mock busca cliente (single)
    mockSupabase.single.mockResolvedValueOnce({ data: { id: 'c1', name: 'User' }, error: null });
    // 2. Mock busca settings (single)
    mockSupabase.single.mockResolvedValueOnce({ data: { loyaltyEnabled: true, loyaltyRewardValue: 15 }, error: null });
    
    // O reset de contadores (update) e o insert usarão o .then default do mockSupabase
    // que agora resolve automaticamente.

    const req = { body: { clientId: 'c1', shopId: 'shop-1' } } as any;
    const res = makeRes();

    await generateReward(req, res);

    expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
      client_id: 'c1',
      max_uses: 1,
      is_loyalty_reward: true,
      usage_count: 0
    }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
