
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { mockSupabase, resetSupabaseMocks } from './mocks/supabase';

// Mock helpers
vi.mock('../lib/helpers', () => ({
    isInstanceConnected: vi.fn().mockResolvedValue(true),
    generateWhatsAppMessage: vi.fn().mockResolvedValue('test message'),
    sendWhatsApp: vi.fn().mockResolvedValue(true),
    logAutomatedMessage: vi.fn().mockResolvedValue(true)
}));

// Mock Gemini
vi.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: class {
        getGenerativeModel = () => ({
            generateContent: vi.fn().mockResolvedValue({
                response: { text: () => 'motivador' }
            })
        })
    }
}));

// Importar APÓS os mocks
import { runCronLogic } from '../controllers/cronController';

describe('cronController', () => {
    beforeEach(() => {
        resetSupabaseMocks();
        vi.clearAllMocks();
        vi.useFakeTimers();

        // Setup padrão chainable
        mockSupabase.select.mockReturnThis();
        mockSupabase.delete.mockReturnThis();
        mockSupabase.lt.mockReturnThis();
        mockSupabase.eq.mockReturnThis();
        mockSupabase.in.mockReturnThis();
        mockSupabase.gte.mockReturnThis();
        mockSupabase.lte.mockReturnThis();
        mockSupabase.order.mockReturnThis();
        mockSupabase.limit.mockReturnThis();
        mockSupabase.single.mockResolvedValue({ data: null, error: null });
        mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null });
        
        // Mock padrão para queries sem dados
        mockSupabase.from.mockImplementation(() => ({
            ...mockSupabase,
            then: (resolve: any) => resolve({ data: [], error: null })
        }));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('deve rodar runCronLogic sem erros quando não há dados', async () => {
        await expect(runCronLogic()).resolves.not.toThrow();
    });

    it('deve processar o relatório semanal na segunda-feira às 7h', async () => {
        const mockNow = new Date('2026-05-04T07:00:00-03:00');
        vi.setSystemTime(mockNow);

        const mockApts = [{ 
            id: '1', shop_id: 'shop1', total_value: 100, date: '2026-05-04', status: 'completed', service_ids: ['s1'],
            shops: { name: 'Shop 1', whatsapp_instance: 'inst1', whatsapp_connected: true }
        }];
        
        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'settings') {
                return { ...mockSupabase, then: (resolve: any) => resolve({ data: [{ shop_id: 'shop1', phone: '123' }], error: null }) };
            }
            if (table === 'services') {
                 return { ...mockSupabase, then: (resolve: any) => resolve({ data: [{ name: 'Corte' }], error: null }) };
            }
            if (table === 'appointments') {
                return { ...mockSupabase, then: (resolve: any) => resolve({ data: mockApts, error: null }) };
            }
            return { ...mockSupabase, then: (resolve: any) => resolve({ data: [], error: null }) };
        });

        await expect(runCronLogic()).resolves.not.toThrow();
    });

    it('deve processar lembretes de 24h', async () => {
        const mockNow = new Date('2026-05-04T10:00:00-03:00');
        vi.setSystemTime(mockNow);

        const mockApt = { 
            id: '24h', shop_id: 'shop1', date: '2026-05-05', time: '10:00:00', 
            client_name: 'Joe', client_phone: '123',
            reminder_24h_sent: false, send_attempts_24h: 0,
            shops: { id: 'shop1', name: 'Shop 1', whatsapp_instance: 'inst1', whatsapp_connected: true }
        };

        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'appointments') {
                return { ...mockSupabase, then: (resolve: any) => resolve({ data: [mockApt], error: null }) };
            }
            return { ...mockSupabase, then: (resolve: any) => resolve({ data: [], error: null }) };
        });

        await runCronLogic();
        expect(mockSupabase.update).toHaveBeenCalled();
    });

    it('deve processar lembretes de 1h', async () => {
        const mockNow = new Date('2026-05-04T09:00:00-03:00');
        vi.setSystemTime(mockNow);

        const mockApt = { 
            id: '1h', shop_id: 'shop1', date: '2026-05-04', time: '10:00:00', 
            client_name: 'Joe', client_phone: '123',
            reminder_1h_sent: false, send_attempts_1h: 0,
            shops: { id: 'shop1', name: 'Shop 1', whatsapp_instance: 'inst1', whatsapp_connected: true }
        };

        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'appointments') {
                return { ...mockSupabase, then: (resolve: any) => resolve({ data: [mockApt], error: null }) };
            }
            return { ...mockSupabase, then: (resolve: any) => resolve({ data: [], error: null }) };
        });

        await runCronLogic();
        expect(mockSupabase.update).toHaveBeenCalled();
    });

    it('deve processar aniversariantes', async () => {
        const mockNow = new Date('2026-05-04T10:00:00-03:00');
        vi.setSystemTime(mockNow);

        mockSupabase.rpc.mockImplementation(() => ({
            ...mockSupabase,
            then: (resolve: any) => resolve({ data: [{ id: 'c1', name: 'Bday', phone: '123', shop_id: 's1' }], error: null })
        }));

        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'shops') {
                return { ...mockSupabase, then: (resolve: any) => resolve({ data: [{ id: 's1', name: 'S1', whatsapp_instance: 'i1', whatsapp_connected: true }], error: null }) };
            }
            return { ...mockSupabase, then: (resolve: any) => resolve({ data: [], error: null }) };
        });

        await runCronLogic();
        expect(mockSupabase.rpc).toHaveBeenCalledWith('get_birthday_clients_today');
    });
});
