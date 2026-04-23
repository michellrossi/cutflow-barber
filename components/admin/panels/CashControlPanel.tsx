import React, { useState, useMemo } from 'react';
import { useShop } from '../../../store';
import { useToast } from '../../ui/ToastContext';
import { 
  Wallet, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Plus, 
  Minus,
  Lock,
  Unlock,
  AlertTriangle,
  FileText,
  X,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const CashControlPanel: React.FC = () => {
  const { cashSessions, cashFlowEntries, openCashSession, closeCashSession, addCashMovement, formatCurrencyBRL } = useShop();
  const { showToast } = useToast();

  const openSession = cashSessions.find(s => s.status === 'open');

  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('');

  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [informedClosingBalance, setInformedClosingBalance] = useState('');

  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementType, setMovementType] = useState<'input' | 'output'>('input');
  const [movementData, setMovementData] = useState({ category: '', amount: '', description: '' });

  const [isSaving, setIsSaving] = useState(false);

  // --- Calculations ---
  const sessionEntries = useMemo(() => {
     if (!openSession) return [];
     // Return only entries for the open session
     return cashFlowEntries.filter(e => e.sessionId === openSession.id);
  }, [openSession, cashFlowEntries]);

  const totalInputs = sessionEntries.filter(e => e.type === 'input').reduce((acc, curr) => acc + curr.amount, 0);
  const totalOutputs = sessionEntries.filter(e => e.type === 'output').reduce((acc, curr) => acc + curr.amount, 0);
  
  const expectedClosingBalance = openSession ? (openSession.openingBalance + totalInputs - totalOutputs) : 0;

  // --- Handlers ---
  const handleOpenCash = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSaving(true);
      const balance = Number(openingBalance) || 0;
      const { success, error } = await openCashSession(balance);
      setIsSaving(false);

      if (success) {
          showToast('Caixa aberto com sucesso!', 'success');
          setIsOpeningModalOpen(false);
          setOpeningBalance('');
      } else {
          showToast(error || 'Erro ao abrir caixa', 'error');
      }
  };

  const handleCloseCash = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSaving(true);
      const balance = Number(informedClosingBalance) || 0;
      const { success, error } = await closeCashSession(balance);
      setIsSaving(false);

      if (success) {
          showToast('Caixa fechado com sucesso!', 'success');
          setIsClosingModalOpen(false);
          setInformedClosingBalance('');
      } else {
          showToast(error || 'Erro ao fechar caixa', 'error');
      }
  };

  const handleAddMovement = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSaving(true);
      const { success, error } = await addCashMovement({
          type: movementType,
          category: movementData.category || (movementType === 'input' ? 'Aporte' : 'Sangria'),
          amount: Number(movementData.amount),
          description: movementData.description
      });
      setIsSaving(false);

      if (success) {
          showToast('Movimentação registrada!', 'success');
          setIsMovementModalOpen(false);
          setMovementData({ category: '', amount: '', description: '' });
      } else {
          showToast(error || 'Erro ao registrar movimentação', 'error');
      }
  };

  return (
    <div className="animate-fade-in relative pb-20 p-1">
      {/* 1. Cabeçalho e Descrição */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Controle de Caixa Operacional</h2>
          <p className="text-[#6b7d99] text-sm font-medium">Faça abertura, fechamento e controle de sangrias diárias em dinheiro físico.</p>
        </div>
        
        {openSession ? (
            <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
                <button 
                  onClick={() => setIsMovementModalOpen(true)}
                  className="bg-white border border-slate-200 text-slate-700 font-bold px-6 py-3 rounded-xl flex items-center justify-center gap-2 transition-all hover:bg-slate-50 flex-1 whitespace-nowrap"
                >
                  <FileText size={18} /> Lançar Extrato
                </button>
                <button 
                  onClick={() => setIsClosingModalOpen(true)}
                  className="bg-red-600 text-white font-bold px-6 py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:bg-red-700 flex-1 whitespace-nowrap"
                >
                  <Lock size={18} className="stroke-[3px]" /> Fechar Caixa
                </button>
            </div>
        ) : (
            <div className="w-full md:w-auto mt-4 md:mt-0">
                <button 
                  onClick={() => setIsOpeningModalOpen(true)}
                  className="bg-emerald-600 text-white font-bold px-6 py-3 rounded-[2rem] flex items-center justify-center gap-2 transition-all shadow-lg hover:bg-emerald-700 w-full"
                >
                  <Unlock size={20} className="stroke-[3px]" /> Abrir Caixa
                </button>
            </div>
        )}
      </div>

      {openSession ? (
          <>
            {/* Cards de Status */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Wallet size={48} className="text-slate-900" />
                    </div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Fundo de Reserva</p>
                    <p className="text-2xl font-black text-slate-900">{formatCurrencyBRL(openSession.openingBalance)}</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-emerald-200 shadow-sm">
                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1 flex items-center gap-1"><ArrowUpCircle size={14}/> Entradas (Dinheiro)</p>
                    <p className="text-2xl font-black text-emerald-700">{formatCurrencyBRL(totalInputs)}</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-red-200 shadow-sm">
                    <p className="text-xs font-bold text-red-600 uppercase tracking-widest mb-1 flex items-center gap-1"><ArrowDownCircle size={14}/> Saídas / Sangrias</p>
                    <p className="text-2xl font-black text-red-700">{formatCurrencyBRL(totalOutputs)}</p>
                </div>
                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Saldo Final Esperado</p>
                    <p className="text-2xl font-black text-white">{formatCurrencyBRL(expectedClosingBalance)}</p>
                </div>
            </div>

            {/* Resumo Movimentações */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-bold text-slate-900">Extrato da Sessão Atual</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white text-slate-400 text-xs uppercase tracking-wider border-b border-slate-100">
                                <th className="p-4 font-bold">Horário</th>
                                <th className="p-4 font-bold">Tipo</th>
                                <th className="p-4 font-bold">Categoria/Motivo</th>
                                <th className="p-4 font-bold text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sessionEntries.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-slate-400 text-sm">
                                        Nenhuma movimentação lançada nesta sessão ainda.
                                    </td>
                                </tr>
                            )}
                            {sessionEntries.map(entry => (
                                <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 text-sm text-[#6b7d99] font-medium">
                                        {new Date(entry.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td className="p-4">
                                        {entry.type === 'input' ? (
                                            <span className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-bold uppercase tracking-wider flex w-max items-center gap-1">
                                                <ArrowUpCircle size={12}/> Entrada
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 bg-red-50 text-red-700 border border-red-200 rounded-md text-[10px] font-bold uppercase tracking-wider flex w-max items-center gap-1">
                                                <ArrowDownCircle size={12}/> Saída
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <p className="font-bold text-slate-900 text-sm">{entry.category}</p>
                                        {entry.description && <p className="text-xs text-slate-500 mt-0.5">{entry.description}</p>}
                                    </td>
                                    <td className={`p-4 text-right font-bold text-sm ${entry.type === 'input' ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {entry.type === 'input' ? '+' : '-'} {formatCurrencyBRL(entry.amount)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
          </>
      ) : (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center max-w-2xl mx-auto shadow-sm">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <Lock size={24} className="text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Caixa Fechado</h3>
              <p className="text-[#6b7d99] text-sm mb-6 max-w-md">Para registrar pagamentos em dinheiro e gerenciar sangrias do dia, você precisa iniciar uma nova sessão de caixa.</p>
              <button 
                  onClick={() => setIsOpeningModalOpen(true)}
                  className="bg-emerald-600 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-lg hover:bg-emerald-700"
              >
                  Abrir Caixa Agora
              </button>
          </div>
      )}

      {/* Modais (Abertura, Lançamento, Fechamento) */}
      <AnimatePresence>
        {isOpeningModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && setIsOpeningModalOpen(false)}>
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white p-6 rounded-2xl border border-slate-200 w-full max-w-sm shadow-2xl relative">
                    <button onClick={() => setIsOpeningModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900"><X size={20}/></button>
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4"><Unlock size={24}/></div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">Abertura de Caixa</h3>
                    <p className="text-sm text-slate-500 mb-6">Informe quanto de dinheiro (troco/fundo de reserva) tem na gaveta agora.</p>
                    <form onSubmit={handleOpenCash} className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Valor Inicial (R$)</label>
                            <input required type="number" step="0.01" min="0" value={openingBalance} onChange={e => setOpeningBalance(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-lg font-black text-slate-900 focus:outline-none focus:border-emerald-500 text-center" placeholder="0.00" />
                        </div>
                        <button type="submit" disabled={isSaving} className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl hover:bg-emerald-700 active:scale-95 transition-all text-sm flex items-center justify-center gap-2">
                           {isSaving ? <Loader2 className="animate-spin" size={18}/> : 'Iniciar Sessão'}
                        </button>
                    </form>
                </motion.div>
            </div>
        )}

        {isMovementModalOpen && (
             <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && setIsMovementModalOpen(false)}>
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white p-6 rounded-2xl border border-slate-200 w-full max-w-md shadow-2xl relative">
                    <button onClick={() => setIsMovementModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900"><X size={20}/></button>
                    <h3 className="text-lg font-bold text-slate-900 mb-6">Novo Lançamento Manual</h3>
                    
                    <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-lg">
                        <button onClick={() => setMovementType('input')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all flex justify-center items-center gap-2 ${movementType === 'input' ? 'bg-white text-emerald-600 shadow' : 'text-slate-500 hover:text-slate-700'}`}>
                            <ArrowUpCircle size={16}/> Entrada
                        </button>
                        <button onClick={() => setMovementType('output')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all flex justify-center items-center gap-2 ${movementType === 'output' ? 'bg-white text-red-600 shadow' : 'text-slate-500 hover:text-slate-700'}`}>
                            <ArrowDownCircle size={16}/> Saída
                        </button>
                    </div>

                    <form onSubmit={handleAddMovement} className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Motivo / Categoria</label>
                            <input required value={movementData.category} onChange={e => setMovementData({...movementData, category: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-slate-500" placeholder={movementType === 'input' ? 'Ex: Suprimento, Recebimento Avulso' : 'Ex: Sangria, Pagamento Fornecedor, Lanche'} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Valor (R$)</label>
                            <input required type="number" step="0.01" min="0.01" value={movementData.amount} onChange={e => setMovementData({...movementData, amount: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xl font-black text-slate-900 focus:outline-none focus:border-slate-500" placeholder="0.00" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Observação (Opcional)</label>
                            <textarea value={movementData.description} onChange={e => setMovementData({...movementData, description: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-700 focus:outline-none focus:border-slate-500 resize-none h-20" />
                        </div>
                        <button type="submit" disabled={isSaving} className={`w-full text-white font-bold py-4 rounded-xl transition-all text-sm flex items-center justify-center gap-2 ${movementType === 'input' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
                           {isSaving ? <Loader2 className="animate-spin" size={18}/> : `Confirmar ${movementType === 'input' ? 'Entrada' : 'Saída'}`}
                        </button>
                    </form>
                </motion.div>
             </div>
        )}

        {isClosingModalOpen && openSession && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && setIsClosingModalOpen(false)}>
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white p-6 rounded-2xl border border-slate-200 w-full max-w-sm shadow-2xl relative">
                    <button onClick={() => setIsClosingModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900"><X size={20}/></button>
                    <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4"><Lock size={24}/></div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">Fechamento de Caixa</h3>
                    
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4 mt-4">
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span>Fundo Inicial:</span>
                            <span className="font-bold text-slate-900">{formatCurrencyBRL(openSession.openingBalance)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span>Soma Entradas:</span>
                            <span className="font-bold text-emerald-600">+{formatCurrencyBRL(totalInputs)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-500 mb-3 pb-3 border-b border-slate-200">
                            <span>Soma Saídas:</span>
                            <span className="font-bold text-red-600">-{formatCurrencyBRL(totalOutputs)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="font-bold text-slate-700">Sistema (Esperado):</span>
                            <span className="font-black text-slate-900">{formatCurrencyBRL(expectedClosingBalance)}</span>
                        </div>
                    </div>

                    <form onSubmit={handleCloseCash} className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Valor Real na Gaveta (R$)</label>
                            <input required type="number" step="0.01" min="0" value={informedClosingBalance} onChange={e => setInformedClosingBalance(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xl font-black text-slate-900 focus:outline-none focus:border-red-500 text-center" placeholder="Ex: 150.00" />
                        </div>
                        
                        {Number(informedClosingBalance) > 0 && Math.abs(Number(informedClosingBalance) - expectedClosingBalance) > 0.01 && (
                            <div className="flex bg-orange-50 border border-orange-200 rounded-lg p-3 gap-3 items-start">
                                <AlertTriangle size={16} className="text-orange-500 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-xs font-bold text-orange-800">Diferença de Caixa</p>
                                    <p className="text-[10px] text-orange-600 font-medium">Atenção! Você reportou {formatCurrencyBRL(Number(informedClosingBalance))} mas o esperado é {formatCurrencyBRL(expectedClosingBalance)}. Diferença de {formatCurrencyBRL(Number(informedClosingBalance) - expectedClosingBalance)}.</p>
                                </div>
                            </div>
                        )}

                        <button type="submit" disabled={isSaving} className="w-full bg-red-600 text-white font-bold py-4 rounded-xl hover:bg-red-700 active:scale-95 transition-all text-sm flex items-center justify-center gap-2">
                           {isSaving ? <Loader2 className="animate-spin" size={18}/> : 'Confirmar Fechamento'}
                        </button>
                    </form>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
};
