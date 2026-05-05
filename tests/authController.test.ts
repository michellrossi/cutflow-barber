import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, resetSupabaseMocks } from './mocks/supabase';
import jwt from 'jsonwebtoken';

// Mock helpers
const makeRes = () => {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  return res as any;
};

describe('authController', () => {
  beforeEach(() => {
    resetSupabaseMocks();
    process.env.JWT_SECRET = 'test-secret';
    process.env.SERVER_URL = 'http://localhost:3000';
    vi.resetModules();
  });

  it('deve lançar erro se JWT_SECRET não estiver configurado', async () => {
    delete process.env.JWT_SECRET;
    
    // Import dinâmico para forçar a execução da verificação de ambiente
    await expect(import('../controllers/authController')).rejects.toThrow('FATAL: JWT_SECRET não configurado no .env');
  });

  it('validateClientToken deve retornar 401 para token expirado ou inválido', async () => {
    const { validateClientToken } = await import('../controllers/authController');
    const req = { body: { token: 'invalid.token.here' } } as any;
    const res = makeRes();

    await validateClientToken(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Token inválido ou expirado' }));
  });

  it('requestClientLogin deve criar novo cliente se não existir e enviar WhatsApp', async () => {
    const { requestClientLogin } = await import('../controllers/authController');
    
    // Mock busca cliente (não encontra)
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    // Mock insert cliente
    mockSupabase.single.mockResolvedValueOnce({ data: { id: 'new-client-id', name: 'Test User' }, error: null });
    // Mock busca loja
    mockSupabase.single.mockResolvedValueOnce({ data: { id: 'shop-1', name: 'Barbearia X', whatsapp_instance: 'inst-1' }, error: null });

    // Mock do helper sendWhatsApp
    vi.mock('../lib/helpers', () => ({
        sendWhatsApp: vi.fn().mockResolvedValue(true)
    }));

    const req = { 
        body: { 
            shopId: 'shop-1', 
            phone: '11999999999', 
            name: 'Test User' 
        } 
    } as any;
    const res = makeRes();

    await requestClientLogin(req, res);

    expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({ name: 'Test User' }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
