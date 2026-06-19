import { describe, it, expect } from 'vitest';
import { calculateCommissions } from '../utils/finance';
import { Professional, Appointment, CommissionPayment } from '../types';

describe('calculateCommissions', () => {
  const mockProfessionals: Professional[] = [
    { 
      id: 'p1', 
      name: 'Barbeiro 1', 
      shopId: 's1', 
      role: 'barber',
      photoUrl: '',
      email: 'b1@test.com', 
      commissionPercentage: 50 
    },
    { 
      id: 'p2', 
      name: 'Barbeiro 2', 
      shopId: 's1', 
      role: 'barber',
      photoUrl: '',
      email: 'b2@test.com', 
      commissionPercentage: 60 
    },
  ];

  const mockAppointments: Appointment[] = [
    { 
      id: 'a1', 
      shopId: 's1', 
      professionalId: 'p1', 
      clientId: 'c1', 
      clientName: 'Cliente 1',
      clientPhone: '11999999999',
      serviceIds: ['s1'], 
      date: '2026-06-19', 
      time: '10:00', 
      totalValue: 100, 
      status: 'completed', 
      paymentMethod: 'cash',
      createdAt: '2026-06-19T10:00:00Z'
    },
    { 
      id: 'a2', 
      shopId: 's1', 
      professionalId: 'p1', 
      clientId: 'c2', 
      clientName: 'Cliente 2',
      clientPhone: '11999999999',
      serviceIds: ['s1'], 
      date: '2026-06-19', 
      time: '11:00', 
      totalValue: 200, 
      status: 'completed', 
      paymentMethod: 'credit',
      createdAt: '2026-06-19T11:00:00Z'
    },
    // Agendamento cancelado (não deve entrar na conta)
    { 
      id: 'a3', 
      shopId: 's1', 
      professionalId: 'p1', 
      clientId: 'c3', 
      clientName: 'Cliente 3',
      clientPhone: '11999999999',
      serviceIds: ['s1'], 
      date: '2026-06-19', 
      time: '12:00', 
      totalValue: 150, 
      status: 'cancelled', 
      paymentMethod: 'cash',
      createdAt: '2026-06-19T12:00:00Z'
    },
    // Agendamento de outro profissional
    { 
      id: 'a4', 
      shopId: 's1', 
      professionalId: 'p2', 
      clientId: 'c4', 
      clientName: 'Cliente 4',
      clientPhone: '11999999999',
      serviceIds: ['s1'], 
      date: '2026-06-19', 
      time: '13:00', 
      totalValue: 150, 
      status: 'completed', 
      paymentMethod: 'cash',
      createdAt: '2026-06-19T13:00:00Z'
    },
  ];

  const mockCommissionPayments: CommissionPayment[] = [
    { 
      id: 'cp1', 
      shopId: 's1', 
      professionalId: 'p1', 
      periodStart: '2026-06-01', 
      periodEnd: '2026-06-30', 
      amountPaid: 30, 
      paymentMethod: 'gaveta', 
      paidAt: '2026-06-19' 
    }
  ];

  it('calcula comissão padrão de 50% e trata múltiplos profissionais', () => {
    const stats = calculateCommissions(mockProfessionals, mockAppointments, [], 'all', '', '');

    const p1Stats = stats.find(p => p.id === 'p1');
    const p2Stats = stats.find(p => p.id === 'p2');

    // Barbeiro 1: a1 (100) + a2 (200) = faturamento 300. Comissão 50% = 150.
    expect(p1Stats).toBeDefined();
    expect(p1Stats?.revenue).toBe(300);
    expect(p1Stats?.commission).toBe(150);
    expect(p1Stats?.shopRevenue).toBe(150);
    expect(p1Stats?.pendingPayout).toBe(150);

    // Barbeiro 2: a4 (150) = faturamento 150. Comissão 60% = 90.
    expect(p2Stats).toBeDefined();
    expect(p2Stats?.revenue).toBe(150);
    expect(p2Stats?.commission).toBe(90);
    expect(p2Stats?.shopRevenue).toBe(60);
    expect(p2Stats?.pendingPayout).toBe(90);
  });

  it('trata pagamentos parciais no período e calcula pendências corretas', () => {
    // Para o Barbeiro 1 com pagamento parcial de 30 no período
    const stats = calculateCommissions(mockProfessionals, mockAppointments, mockCommissionPayments, 'custom', '2026-06-01', '2026-06-30');
    
    const p1Stats = stats.find(p => p.id === 'p1');
    expect(p1Stats).toBeDefined();
    expect(p1Stats?.commission).toBe(150);
    expect(p1Stats?.paidInPeriod).toBe(30);
    expect(p1Stats?.pendingPayout).toBe(120); // 150 - 30
  });

  it('retorna faturamento e comissões zerados para período sem atendimentos completados', () => {
    // Passando array de appointments vazio
    const stats = calculateCommissions(mockProfessionals, [], [], 'all', '', '');
    
    stats.forEach(p => {
      expect(p.revenue).toBe(0);
      expect(p.commission).toBe(0);
      expect(p.pendingPayout).toBe(0);
      expect(p.count).toBe(0);
    });
  });
});
