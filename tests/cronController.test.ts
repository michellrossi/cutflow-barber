import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, resetSupabaseMocks } from './mocks/supabase';
import { runCronLogic } from '../controllers/cronController';
import * as helpers from '../lib/helpers';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';

dayjs.extend(utc);
dayjs.extend(timezone);

// Mock do helpers
vi.mock('../lib/helpers', async () => {
  const actual = await vi.importActual('../lib/helpers');
  return {
    ...actual as any,
    isInstanceConnected: vi.fn().mockResolvedValue(true),
    generateWhatsAppMessage: vi.fn().mockResolvedValue('Mensagem de Teste'),
    sendWhatsApp: vi.fn().mockResolvedValue(true),
    logAutomatedMessage: vi.fn().mockResolvedValue(true)
  };
});

describe('cronController.runCronLogic', () => {
  beforeEach(() => {
    resetSupabaseMocks();
    vi.clearAllMocks();
    
    // Configurar o relógio para uma data fixa para garantir consistência
    // Vamos supor que hoje é 2026-05-05 10:00:00 (Terça-feira)
    const fixedDate = dayjs.tz('2026-05-05T10:00:00', 'America/Sao_Paulo');
    vi.useFakeTimers();
    vi.setSystemTime(fixedDate.toDate());
  });

  it('deve enviar lembrete de 24h para agendamentos elegíveis', async () => {
    // 1. Mock agendamentos de 24h
    // No código: diffHours <= 25 && diffHours >= 23
    // O agendamento deve ser para amanhã (2026-05-06) às 10:00
    const mockApt = {
      id: 'apt-1',
      client_name: 'João',
      client_phone: '5511999999999',
      shop_id: 'shop-1',
      date: '2026-05-06',
      time: '10:00:00',
      service_ids: ['svc-1'],
      reminder_24h_sent: false,
      send_attempts_24h: 0,
      professionals: { name: 'Barbeiro 1' },
      shops: { id: 'shop-1', name: 'Barbearia X', whatsapp_instance: 'inst-1', whatsapp_connected: true }
    };

    // Sequência de chamadas do Supabase no runCronLogic:
    // 1. Lembretes 24h (select)
    // 2. Lembretes 1h (select)
    // 3. Reagendamento (select)
    // 4. Pós-venda (select)
    // 5. Retenção 30d (select)
    // 6. Aniversariantes (rpc)
    
    // Mock das respostas sequenciais para os SELECTs principais do Cron
    // A ordem é: 24h, 1h, Reagendamento, Pós-venda, Retenção 30d
    // Usamos um contador para saber qual chamada está sendo feita
    let callCount = 0;
    mockSupabase.lte.mockImplementation(() => {
      callCount++;
      if (callCount === 2) { // Fim do chain de 24h
        return Promise.resolve({ data: [mockApt], error: null });
      }
      return mockSupabase;
    });

    mockSupabase.eq.mockImplementation(() => {
      if (callCount === 2) { // update ou getServicesNamesForApt
        return Promise.resolve({ data: [{ id: 'svc-1', name: 'Corte' }], error: null });
      }
      return mockSupabase;
    });

    // Como o chain de 1h termina em eq, e o chain de 24h termina em lte...
    // Vamos apenas fazer o runCronLogic passar sem erros nos outros chains
    mockSupabase.gte.mockResolvedValue({ data: [], error: null });
    mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

    await runCronLogic();

    // Verificações
    expect(helpers.sendWhatsApp).toHaveBeenCalledWith(
      '5511999999999',
      'Mensagem de Teste',
      'inst-1'
    );
    
    expect(mockSupabase.update).toHaveBeenCalledWith({ reminder_24h_sent: true });
    expect(helpers.logAutomatedMessage).toHaveBeenCalledWith(
      'shop-1',
      'João',
      '5511999999999',
      'Lembrete 24h',
      'sent'
    );
  });

  it('deve enviar lembrete de 1h para agendamentos elegíveis', async () => {
    // Agora o agendamento é para hoje às 11:00 (daqui a 1h)
    const mockApt = {
      id: 'apt-2',
      client_name: 'Maria',
      client_phone: '5511888888888',
      shop_id: 'shop-2',
      date: '2026-05-05',
      time: '11:00:00',
      service_ids: ['svc-2'],
      reminder_1h_sent: false,
      send_attempts_1h: 0,
      professionals: { name: 'Barbeiro 2' },
      shops: { id: 'shop-2', name: 'Barbearia Y', whatsapp_instance: 'inst-2', whatsapp_connected: true }
    };

    // Mock 24h: from.select.in.eq.lte.gte.lte
    mockSupabase.lte.mockReturnThis(); 
    mockSupabase.lte.mockResolvedValueOnce({ data: [], error: null }); 
    
    // Mock 1h: from.select.in.eq.lte.eq
    mockSupabase.lte.mockReturnThis();
    mockSupabase.eq.mockResolvedValueOnce({ data: [mockApt], error: null }); 

    // Mock getServicesNamesForApt: from.select.eq
    mockSupabase.eq.mockResolvedValueOnce({ data: [{ id: 'svc-2', name: 'Barba' }], error: null });

    // Mock update reminder_1h_sent: from.update.eq
    mockSupabase.eq.mockResolvedValueOnce({ data: null, error: null });

    // Mock Reagendamento: from.select.in.eq.lte.gte
    mockSupabase.lte.mockReturnThis(); 
    mockSupabase.gte.mockResolvedValueOnce({ data: [], error: null });

    // Mock Pós-venda: from.select.eq.eq.lte.eq
    mockSupabase.eq.mockReturnThis(); 
    mockSupabase.eq.mockReturnThis(); 
    mockSupabase.lte.mockReturnThis(); 
    mockSupabase.eq.mockResolvedValueOnce({ data: [], error: null }); 

    // Mock Retenção 30d: from.select.eq.eq.lte.lte.gte
    mockSupabase.eq.mockReturnThis(); 
    mockSupabase.eq.mockReturnThis(); 
    mockSupabase.lte.mockReturnThis(); 
    mockSupabase.lte.mockReturnThis(); 
    mockSupabase.gte.mockResolvedValueOnce({ data: [], error: null }); 

    // Mock RPC Bday
    mockSupabase.rpc.mockResolvedValueOnce({ data: [], error: null });

    await runCronLogic();

    expect(helpers.sendWhatsApp).toHaveBeenCalledWith(
      '5511888888888',
      'Mensagem de Teste',
      'inst-2'
    );
    expect(mockSupabase.update).toHaveBeenCalledWith({ reminder_1h_sent: true });
    expect(helpers.logAutomatedMessage).toHaveBeenCalledWith(
      'shop-2',
      'Maria',
      '5511888888888',
      'Lembrete 1h',
      'sent'
    );
  });
});
