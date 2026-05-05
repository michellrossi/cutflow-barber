import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockSupabase, resetSupabaseMocks } from './mocks/supabase';
import { authenticate, requirePlan } from '../middlewares/auth';

describe('authenticate middleware', () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  it('rejeita requisição sem header Authorization', async () => {
    const req = { headers: {} } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('chama next() com token válido', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    const req = { headers: { authorization: 'Bearer valid' } } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();
    await authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ id: 'u1' });
  });
});

describe('requirePlan middleware', () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  it('bloqueia loja com plano trial e tier inferior ao exigido', async () => {
    mockSupabase.single.mockResolvedValue({ data: { plan: 'trial', plan_tier: 'essencial' } });
    const req = { user: { id: 'u1' } } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();
    
    // Tentando acessar algo que exige 'profissional' tendo apenas 'essencial'
    const middleware = requirePlan('profissional');
    await middleware(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('permite acesso se plano for active e tier for suficiente', async () => {
    mockSupabase.single.mockResolvedValue({ data: { plan: 'active', plan_tier: 'premium' } });
    const req = { user: { id: 'u1' } } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();
    
    const middleware = requirePlan('profissional');
    await middleware(req, res, next);
    
    expect(next).toHaveBeenCalled();
  });
});
