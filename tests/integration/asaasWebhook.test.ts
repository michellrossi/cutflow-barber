import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';
import { mockSupabase, resetSupabaseMocks } from '../mocks/supabase';

(globalThis as any).mockSupabase = mockSupabase;

// Mock do supabaseAdmin
vi.mock('../../lib/supabase', () => {
    const supabaseAdminProxy = new Proxy({}, {
        get(target, prop, receiver) {
            const actualMock = (globalThis as any).mockSupabase;
            return actualMock ? Reflect.get(actualMock, prop, receiver) : undefined;
        }
    });
    return {
        supabaseAdmin: supabaseAdminProxy
    };
});

describe('Asaas Webhook Integration', () => {
    let app: any;
    const webhookToken = 'test-token';

    beforeEach(async () => {
        process.env.ASAAS_WEBHOOK_TOKEN = webhookToken;
        process.env.NODE_ENV = 'test';
        app = await createApp();
        resetSupabaseMocks();
    });

    it('deve retornar 401 se o token for inválido', async () => {
        const response = await request(app)
            .post('/api/asaas/webhook')
            .set('asaas-access-token', 'wrong-token')
            .send({ event: 'PAYMENT_CONFIRMED' });

        expect(response.status).toBe(401);
    });

    it('deve processar PAYMENT_CONFIRMED e ativar o plano da loja', async () => {
        const payment = {
            id: 'pay_123',
            customer: 'cus_123',
            description: 'Assinatura Plano Profissional'
        };

        // Mock busca evento (não existe duplicata)
        mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
        // Mock busca loja pelo customer id
        mockSupabase.maybeSingle.mockResolvedValueOnce({ data: { id: 'shop_123', name: 'Barbearia Teste' }, error: null });
        // Mock update da loja
        mockSupabase.update.mockReturnThis();
        // Mock insert do log do evento
        mockSupabase.insert.mockResolvedValueOnce({ error: null });

        const response = await request(app)
            .post('/api/asaas/webhook')
            .set('asaas-access-token', webhookToken)
            .send({
                id: 'evt_123',
                event: 'PAYMENT_CONFIRMED',
                payment
            });

        expect(response.status).toBe(200);
        expect(response.text).toBe('OK');
        
        // Verifica se a loja foi ativada com o tier correto
        expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
            plan: 'active',
            plan_tier: 'profissional'
        }));
    });

    it('deve retornar 200 (duplicate) se o evento já foi processado', async () => {
        // Mock busca evento (já existe)
        mockSupabase.maybeSingle.mockResolvedValueOnce({ data: { id: 'existing' }, error: null });

        const response = await request(app)
            .post('/api/asaas/webhook')
            .set('asaas-access-token', webhookToken)
            .send({
                id: 'evt_duplicate',
                event: 'PAYMENT_CONFIRMED',
                payment: { id: 'pay_123', customer: 'cus_123' }
            });

        expect(response.status).toBe(200);
        expect(response.text).toBe('OK (duplicate)');
        expect(mockSupabase.update).not.toHaveBeenCalled();
    });
});
