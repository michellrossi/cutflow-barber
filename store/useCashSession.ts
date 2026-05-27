import { useMemo } from 'react';
import { useShop } from './index';
import { CashFlowEntry } from '../types';

export function useCashSession() {
  const { 
    cashSessions, 
    cashFlowEntries, 
    openCashSession, 
    closeCashSession, 
    addCashMovement, 
    formatCurrencyBRL 
  } = useShop();

  const openSession = useMemo(() => {
    return cashSessions.find(s => s.status === 'open');
  }, [cashSessions]);

  const sessionEntries = useMemo(() => {
    if (!openSession) return [];
    return cashFlowEntries.filter(e => e.sessionId === openSession.id);
  }, [openSession, cashFlowEntries]);

  // Helper para saber se a movimentação é física (dinheiro/gaveta)
  const isCashEntry = (entry: CashFlowEntry) => {
    // Saídas (output): são físicas se não contiverem a tag de método de banco/digital na descrição
    if (entry.type === 'output') {
      const desc = (entry.description || '').toLowerCase();
      return !(
        desc.includes('método: bank') || 
        desc.includes('método: pix') || 
        desc.includes('método: digital') || 
        desc.includes('método: credit') || 
        desc.includes('método: debit')
      );
    }
    
    // Entradas (input):
    // Se for de categoria diferente de "Venda / Serviço" (como Aporte), é físico
    if (entry.category !== 'Venda / Serviço') {
      return true;
    }
    
    // Se for "Venda / Serviço", só é físico se for cash (ou se for legado sem tag de método)
    const desc = (entry.description || '').toLowerCase();
    if (desc.includes('| método:')) {
      return desc.includes('método: cash') || desc.includes('método: dinheiro');
    }
    
    // Retrocompatibilidade: se não tem tag, assumimos que é físico (dinheiro)
    return true;
  };

  // Helper para saber se a movimentação é digital (PIX/Cartão)
  const isDigitalEntry = (entry: CashFlowEntry) => {
    if (entry.type === 'output') {
      const desc = (entry.description || '').toLowerCase();
      return (
        desc.includes('método: bank') || 
        desc.includes('método: pix') || 
        desc.includes('método: digital') || 
        desc.includes('método: credit') || 
        desc.includes('método: debit')
      );
    }
    if (entry.category !== 'Venda / Serviço') {
      return false;
    }
    const desc = (entry.description || '').toLowerCase();
    if (desc.includes('| método:')) {
      return !desc.includes('método: cash') && !desc.includes('método: dinheiro');
    }
    return false;
  };

  // Separação de entradas e saídas físicas
  const cashEntries = useMemo(() => sessionEntries.filter(isCashEntry), [sessionEntries]);
  const digitalEntries = useMemo(() => sessionEntries.filter(isDigitalEntry), [sessionEntries]);

  // Cálculos do Caixa Físico (Dinheiro)
  const totalCashInputs = useMemo(() => {
    return cashEntries.filter(e => e.type === 'input').reduce((acc, curr) => acc + curr.amount, 0);
  }, [cashEntries]);

  const totalCashOutputs = useMemo(() => {
    return cashEntries.filter(e => e.type === 'output').reduce((acc, curr) => acc + curr.amount, 0);
  }, [cashEntries]);

  const expectedClosingBalance = useMemo(() => {
    if (!openSession) return 0;
    return openSession.openingBalance + totalCashInputs - totalCashOutputs;
  }, [openSession, totalCashInputs, totalCashOutputs]);

  const cashSales = useMemo(() => {
    return cashEntries.filter(e => e.type === 'input' && e.category === 'Venda / Serviço').reduce((acc, curr) => acc + curr.amount, 0);
  }, [cashEntries]);

  const cashAportes = useMemo(() => {
    return cashEntries.filter(e => e.type === 'input' && e.category !== 'Venda / Serviço').reduce((acc, curr) => acc + curr.amount, 0);
  }, [cashEntries]);

  const cashSangrias = useMemo(() => {
    return cashEntries.filter(e => e.type === 'output' && e.category !== 'Repasse Comissão').reduce((acc, curr) => acc + curr.amount, 0);
  }, [cashEntries]);

  const cashCommissions = useMemo(() => {
    return cashEntries.filter(e => e.type === 'output' && e.category === 'Repasse Comissão').reduce((acc, curr) => acc + curr.amount, 0);
  }, [cashEntries]);

  // Vendas Digitais do Turno
  const totalDigitalSales = useMemo(() => {
    return digitalEntries.filter(e => e.type === 'input' && e.category === 'Venda / Serviço').reduce((acc, curr) => acc + curr.amount, 0);
  }, [digitalEntries]);

  const digitalPix = useMemo(() => {
    return digitalEntries.filter(e => e.type === 'input' && (e.description || '').toLowerCase().includes('método: pix')).reduce((acc, curr) => acc + curr.amount, 0);
  }, [digitalEntries]);

  const digitalCredit = useMemo(() => {
    return digitalEntries.filter(e => e.type === 'input' && (e.description || '').toLowerCase().includes('método: credit')).reduce((acc, curr) => acc + curr.amount, 0);
  }, [digitalEntries]);

  const digitalDebit = useMemo(() => {
    return digitalEntries.filter(e => e.type === 'input' && (e.description || '').toLowerCase().includes('método: debit')).reduce((acc, curr) => acc + curr.amount, 0);
  }, [digitalEntries]);

  const digitalSubscription = useMemo(() => {
    return digitalEntries.filter(e => e.type === 'input' && (e.description || '').toLowerCase().includes('método: subscription')).reduce((acc, curr) => acc + curr.amount, 0);
  }, [digitalEntries]);

  const digitalCommissions = useMemo(() => {
    return digitalEntries.filter(e => e.type === 'output' && e.category === 'Repasse Comissão').reduce((acc, curr) => acc + curr.amount, 0);
  }, [digitalEntries]);

  // Lógica Unificada de Fechamento de Caixa com Fundo Fixo e Sangria Automática
  const handleCloseCash = async (
    informedClosingBalance: number,
    fundoFixoAtivo: boolean,
    fundoFixoValor: number
  ) => {
    if (!openSession) {
      return { success: false, error: 'Nenhuma sessão de caixa aberta encontrada.' };
    }

    try {
      // Se adotar fundo de troco fixo para o próximo turno e o valor contado for superior
      if (fundoFixoAtivo && informedClosingBalance > fundoFixoValor) {
        const excedente = informedClosingBalance - fundoFixoValor;

        // Fazer a sangria automática do excedente
        const sangriaRes = await addCashMovement({
          type: 'output',
          category: 'Sangria',
          amount: excedente,
          description: 'Sangria Automática (Fechamento - Fundo Fixo)'
        });

        if (!sangriaRes.success) {
          throw new Error(sangriaRes.error || 'Erro ao realizar sangria automática do excedente.');
        }

        // Fechar o caixa informando que sobrou exatamente o valor do fundo fixo
        const closeRes = await closeCashSession(fundoFixoValor);
        return closeRes;
      } else {
        // Fechamento normal com o valor informado
        const closeRes = await closeCashSession(informedClosingBalance);
        return closeRes;
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro ao fechar caixa.' };
    }
  };

  return {
    openSession,
    sessionEntries,
    isCashEntry,
    isDigitalEntry,
    
    // Físico
    totalCashInputs,
    totalCashOutputs,
    expectedClosingBalance,
    cashSales,
    cashAportes,
    cashSangrias,
    cashCommissions,

    // Digital
    totalDigitalSales,
    digitalPix,
    digitalCredit,
    digitalDebit,
    digitalSubscription,
    digitalCommissions,

    // Ações
    openCashSession,
    addCashMovement,
    closeCashSession,
    handleCloseCash,
    formatCurrencyBRL
  };
}
