import { Professional, Appointment, CommissionPayment } from '../types.js';

export function calculateCommissions(
  professionals: Professional[],
  appointments: Appointment[],
  commissionPayments: CommissionPayment[],
  period: string,
  periodStart: string,
  periodEnd: string
) {
  return professionals.map(p => {
    // Filtra apenas agendamentos completados deste profissional
    const pApts = appointments.filter(a => a.professionalId === p.id && a.status === 'completed');
    const revenue = pApts.reduce((s, a) => s + (a.totalValue || 0), 0);
    const commPct = p.commissionPercentage ?? 50;
    const commission = revenue * commPct / 100;
    const shopRevenue = revenue - commission;

    // Calcular o total já pago a este profissional no período selecionado
    const paidInPeriod = commissionPayments
      .filter(cp => {
        if (cp.professionalId !== p.id) return false;
        if (period === 'all') return true;
        return cp.periodStart === periodStart && cp.periodEnd === periodEnd;
      })
      .reduce((sum, cp) => sum + (cp.amountPaid || 0), 0);

    const pendingPayout = Math.max(0, commission - paidInPeriod);

    return {
      ...p,
      count: pApts.length,
      revenue,
      commission,
      shopRevenue,
      commPct,
      paidInPeriod,
      pendingPayout
    };
  }).sort((a, b) => b.revenue - a.revenue);
}
