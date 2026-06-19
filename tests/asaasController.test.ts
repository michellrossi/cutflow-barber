import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, resetSupabaseMocks } from './mocks/supabase';
import { handleWebhook } from '../controllers/asaasController';

const makeReq = (body: object, token = 'valid-token') => ({
  headers: { 'asaas-access-token': token },
  body
} as any);

const makeRes = () => {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn(), send: vi.fn() };
  return res as any;
};

describe('asaasController.handleWebhook', () => {
  beforeEach(() => {
    resetSupabaseMocks();
    process.env.ASAAS_WEBHOOK_TOKEN = 'valid-token';
  });

  it('rejeita token inválido com 401', async () => {
    const req = makeReq({}, 'wrong-token');
    const res = makeRes();
    await handleWebhook(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('ignora evento duplicado (idempotência)', async () => {
    // Sobrescreve temporariamente a propriedade .then para simular erro de chave única (23505) no insert
    const originalThen = (mockSupabase as any).then;
    (mockSupabase as any).then = (resolve: any) => Promise.resolve({ error: { code: '23505' } }).then(resolve);

    const req = makeReq({ id: 'evt-123', event: 'PAYMENT_RECEIVED', payment: { customer: 'c1' } });
    const res = makeRes();
    await handleWebhook(req, res);

    // Restaura o comportamento padrão
    (mockSupabase as any).then = originalThen;

    expect(res.send).toHaveBeenCalledWith('OK (duplicate)');
    expect(mockSupabase.update).not.toHaveBeenCalled();
  });

  it('ativa plano ao receber PAYMENT_CONFIRMED usando externalReference', async () => {
    // Busca barbearia pelo customer ID
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: { id: 'shop-1', name: 'Barbearia X' } });
    
    const req = makeReq({ 
      id: 'evt-456', 
      event: 'PAYMENT_CONFIRMED', 
      payment: { 
        customer: 'cus-1',
        externalReference: JSON.stringify({ planTier: 'profissional', shopId: 'shop-1' })
      } 
    });
    const res = makeRes();
    
    await handleWebhook(req, res);
    
    expect(mockSupabase.update).toHaveBeenCalledWith(
      expect.objectContaining({ plan: 'active', plan_tier: 'profissional' })
    );
    expect(res.send).toHaveBeenCalledWith('OK');
  });

  it('ativa plano ao receber PAYMENT_CONFIRMED com fallback para descrição', async () => {
    // Busca barbearia pelo customer ID
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: { id: 'shop-1', name: 'Barbearia X' } });
    
    const req = makeReq({ 
      id: 'evt-456', 
      event: 'PAYMENT_CONFIRMED', 
      payment: { 
        customer: 'cus-1',
        description: 'Plano Premium anual para Barbearia X'
      } 
    });
    const res = makeRes();
    
    await handleWebhook(req, res);
    
    expect(mockSupabase.update).toHaveBeenCalledWith(
      expect.objectContaining({ plan: 'active', plan_tier: 'premium' })
    );
    expect(res.send).toHaveBeenCalledWith('OK');
  });

  it('suspende plano ao receber PAYMENT_OVERDUE', async () => {
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: { id: 'shop-1', name: 'Barbearia X' } }); // shop
    
    const req = makeReq({ 
        id: 'evt-789', 
        event: 'PAYMENT_OVERDUE', 
        payment: { customer: 'cus-1' } 
    });
    const res = makeRes();

    await handleWebhook(req, res);

    expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({ plan: 'suspended' })
    );
    expect(res.send).toHaveBeenCalledWith('OK');
  });
});
