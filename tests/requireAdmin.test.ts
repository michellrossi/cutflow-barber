import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireAdmin } from '../middlewares/requireAdmin';

describe('requireAdmin middleware', () => {
  beforeEach(() => {
    process.env.SAAS_ADMIN_KEY = 'master-key';
    vi.resetAllMocks();
  });

  it('rejeita requisição sem header x-saas-admin-key', async () => {
    const req = { headers: {} } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();
    
    requireAdmin(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejeita key incorreta', async () => {
    const req = { headers: { 'x-saas-admin-key': 'wrong' } } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();
    
    requireAdmin(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('permite acesso com key correta', async () => {
    const req = { headers: { 'x-saas-admin-key': 'master-key' } } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();
    
    requireAdmin(req, res, next);
    
    expect(next).toHaveBeenCalled();
  });
});
