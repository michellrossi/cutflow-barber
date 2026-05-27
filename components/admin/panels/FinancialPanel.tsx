import React, { useState, useMemo } from 'react';
import { useShop, useCashSession } from '../../../store';
import { useToast } from '../../ui/ToastContext';
import {
  Wallet, TrendingUp, Users, BarChart3, ArrowUpCircle, ArrowDownCircle,
  Plus, Lock, Unlock, AlertTriangle, X, Loader2, RefreshCw, Download,
  CheckCircle, Clock, DollarSign, CreditCard, Smartphone, Banknote,
  ChevronRight, Scissors, Package, Award, AlertCircle, TrendingDown,
  Calendar, Filter, ShoppingBag, Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type FinancialTab = 'cash' | 'billing' | 'commissions' | 'reports';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const today = () => new Date().toISOString().split('T')[0];
const thisMonthStart = () => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; };

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard: React.FC<{
  label: string; value: string; sub?: string; icon: React.ReactNode;
  color?: 'orange' | 'green' | 'red' | 'blue' | 'indigo' | 'slate';
  trend?: { pct: number };
}> = ({ label, value, sub, icon, color = 'orange', trend }) => {
  const colorMap: Record<string, { bg: string; icon: string; circle: string }> = {
    orange: { bg: 'bg-white', icon: 'text-orange-600', circle: 'bg-orange-50' },
    green: { bg: 'bg-white', icon: 'text-emerald-600', circle: 'bg-emerald-50' },
    red: { bg: 'bg-white', icon: 'text-red-600', circle: 'bg-red-50' },
    blue: { bg: 'bg-white', icon: 'text-blue-600', circle: 'bg-blue-50' },
    indigo: { bg: 'bg-white', icon: 'text-indigo-600', circle: 'bg-indigo-50' },
    slate: { bg: 'bg-white', icon: 'text-slate-600', circle: 'bg-slate-50' },
  };

  const currentStyle = colorMap[color] || colorMap.orange;

  return (
    <div className={`${currentStyle.bg} border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-4 transition-all hover:shadow-md`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${currentStyle.circle}`}>
          {React.isValidElement(icon)
            ? React.cloneElement(icon as React.ReactElement<any>, { size: 20, className: currentStyle.icon })
            : icon}
        </div>
        <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{label}</p>
      </div>
      
      <div className="space-y-1">
        <p className="text-3xl font-black text-slate-900">{value}</p>
        {(sub || trend) && (
          <div className="flex items-center gap-2">
            {sub && <p className="text-sm text-slate-500">{sub}</p>}
            {trend && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${trend.pct >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {trend.pct >= 0 ? '+' : ''}{trend.pct.toFixed(1)}%
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Alert Banner ─────────────────────────────────────────────────────────────
const AlertBanner: React.FC<{ type: 'warning' | 'danger' | 'info'; message: string; onDismiss?: () => void }> = ({ type, message, onDismiss }) => {
  const styles: Record<string, string> = {
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    danger: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };
  const icons: Record<string, React.ReactNode> = {
    warning: <AlertTriangle size={16} className="shrink-0" />,
    danger: <AlertCircle size={16} className="shrink-0 text-red-500" />,
    info: <CheckCircle size={16} className="shrink-0 text-blue-500" />,
  };
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${styles[type]} text-sm font-medium`}>
      {icons[type]}
      <span className="flex-1">{message}</span>
      {onDismiss && <button onClick={onDismiss}><X size={14} /></button>}
    </div>
  );
};

// ─── Simples Bar Component ────────────────────────────────────────────────────
const SimpleBar: React.FC<{ label: string; value: number; max: number; color: string; valueLabel: string }> = ({ label, value, max, color, valueLabel }) => (
  <div>
    <div className="flex justify-between text-xs mb-1">
      <span className="font-medium text-slate-700 truncate max-w-[140px]">{label}</span>
      <span className="font-bold text-slate-900">{valueLabel}</span>
    </div>
    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${max > 0 ? Math.min((value / max) * 100, 100) : 0}%` }} />
    </div>
  </div>
);

// ─── Modal Generic ─────────────────────────────────────────────────────────────
const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; maxW?: string }> = ({ title, onClose, children, maxW = 'max-w-md' }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && onClose()}>
    <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
      className={`bg-white rounded-2xl shadow-2xl border border-slate-200 w-full ${maxW} max-h-[90vh] overflow-y-auto`}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-colors"><X size={18} /></button>
      </div>
      {children}
    </motion.div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-ABA 1: CAIXA FÍSICO
// ═══════════════════════════════════════════════════════════════════════════════
const CashTab: React.FC = () => {
  const { professionals, cashSessions } = useShop();
  const {
    openSession,
    sessionEntries: cashEntries,
    totalCashInputs,
    totalCashOutputs,
    expectedClosingBalance: expectedBalance,
    cashSales,
    cashAportes: aportes,
    cashSangrias: sangrias,
    totalDigitalSales,
    digitalPix,
    digitalCredit,
    digitalDebit,
    digitalSubscription,
    openCashSession,
    addCashMovement,
    handleCloseCash,
    formatCurrencyBRL
  } = useCashSession();

  const { showToast } = useToast();

  const [modal, setModal] = useState<'open' | 'close' | 'aporte' | 'sangria' | null>(null);
  const [form, setForm] = useState({ amount: '', reason: '', obs: '', destination: 'cofre', responsavel: '' });
  const [informedClose, setInformedClose] = useState('');
  const [justif, setJustif] = useState('');

  const [showHistory, setShowHistory] = useState(false);
  const closedSessions = useMemo(() => {
    return cashSessions.filter(s => s.status === 'closed').slice(0, 10);
  }, [cashSessions]);
  
  const [fundoFixoAtivo, setFundoFixoAtivo] = useState(true);
  const [fundoFixoValor, setFundoFixoValor] = useState('100.00');
  const [saving, setSaving] = useState(false);

  const closeModal = () => { setModal(null); setForm({ amount: '', reason: '', obs: '', destination: 'cofre', responsavel: '' }); setInformedClose(''); setJustif(''); };

  const handleOpen = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const r = await openCashSession(Number(form.amount) || 0);
    setSaving(false);
    if (r.success) { showToast('Caixa aberto!', 'success'); closeModal(); }
    else showToast(r.error || 'Erro', 'error');
  };

  const handleClose = async (e: React.FormEvent) => {
    e.preventDefault();
    const diff = Math.abs(Number(informedClose) - expectedBalance);
    if (diff > 0.01 && !justif.trim()) { showToast('Informe a justificativa para a diferença de caixa.', 'error'); return; }
    setSaving(true);
    
    const r = await handleCloseCash(
      Number(informedClose),
      fundoFixoAtivo,
      Number(fundoFixoValor) || 0,
      justif
    );

    setSaving(false);
    if (r.success) { 
      showToast(
        fundoFixoAtivo && Number(informedClose) > Number(fundoFixoValor)
          ? `Caixa fechado! Sangria de ${formatCurrencyBRL(Number(informedClose) - Number(fundoFixoValor))} realizada e fundo de ${formatCurrencyBRL(Number(fundoFixoValor))} deixado.`
          : 'Caixa fechado com sucesso!', 
        'success'
      ); 
      closeModal(); 
    }
    else showToast(r.error || 'Erro ao fechar caixa.', 'error');
  };

  const handleMovement = (type: 'input' | 'output', category: string) => async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const r = await addCashMovement({ type, category, amount: Number(form.amount), description: form.obs || form.reason });
    setSaving(false);
    if (r.success) { showToast(type === 'input' ? 'Aporte confirmado!' : 'Sangria confirmada!', 'success'); closeModal(); }
    else showToast(r.error || 'Erro', 'error');
  };

  const openedAt = openSession ? new Date(openSession.openedAt) : null;
  const hoursOpen = openedAt ? Math.floor((Date.now() - openedAt.getTime()) / 3600000) : 0;

  const ENTRY_COLORS: Record<string, string> = {
    'Venda / Serviço': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Aporte': 'bg-blue-50 text-blue-700 border-blue-200',
    'Sangria': 'bg-amber-50 text-amber-700 border-amber-200',
    'Despesa': 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Alertas Inteligentes */}
      <div className="space-y-2">
        {hoursOpen > 12 && openSession && <AlertBanner type="warning" message={`Caixa aberto há ${hoursOpen}h. Considere realizar o fechamento.`} />}
        {!openSession && <AlertBanner type="danger" message="Nenhum caixa aberto. Inicie uma sessão para registrar movimentos em dinheiro." />}
        {expectedBalance > 1000 && <AlertBanner type="warning" message={`Saldo elevado na gaveta (${formatCurrencyBRL(expectedBalance)}). Considere realizar uma sangria.`} />}
      </div>

      {/* Status ao Vivo */}
      <div className={`flex flex-col md:flex-row items-start md:items-center justify-between p-5 rounded-2xl border-2 gap-4 ${openSession ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${openSession ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
            {openSession ? <Unlock size={22} /> : <Lock size={22} />}
          </div>
          <div>
            <p className={`font-black text-lg ${openSession ? 'text-emerald-900' : 'text-red-900'}`}>
              {openSession ? 'Caixa Aberto (Operação Física)' : 'Caixa Fechado'}
            </p>
            <p className={`text-sm font-medium ${openSession ? 'text-emerald-700' : 'text-red-600'}`}>
              {openSession ? `Desde ${openedAt?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • ${hoursOpen}h abertas` : 'Aguardando abertura de sessão'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {openSession ? (
            <>
              <button onClick={() => setModal('aporte')} className="bg-[#ea580c] text-white font-bold px-6 py-2.5 rounded-[2rem] flex items-center gap-2 text-sm shadow-lg shadow-orange-600/20 hover:scale-[1.02] active:scale-95 transition-all">
                <Plus size={18} className="stroke-[3px]" /> Aporte
              </button>
              <button onClick={() => setModal('sangria')} className="bg-white border-2 border-amber-200 text-amber-700 font-bold px-6 py-2.5 rounded-[2rem] flex items-center gap-2 text-sm hover:bg-amber-50 active:scale-95 transition-all">
                <ArrowDownCircle size={16} /> Sangria
              </button>
              <button onClick={() => setModal('close')} className="bg-white border-2 border-red-200 text-red-600 font-bold px-6 py-2.5 rounded-[2rem] flex items-center gap-2 text-sm hover:bg-red-50 active:scale-95 transition-all">
                <Lock size={16} /> Fechar Caixa
              </button>
            </>
          ) : (
            <button onClick={() => setModal('open')} className="bg-[#ea580c] text-white font-bold px-8 py-3 rounded-[2rem] flex items-center gap-2 shadow-lg shadow-orange-600/20 hover:scale-[1.02] active:scale-95 transition-all">
              <Plus size={20} className="stroke-[3px]" /> Abrir Caixa
            </button>
          )}
        </div>
      </div>

      {openSession ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <KpiCard label="Fundo Inicial" value={formatCurrencyBRL(openSession.openingBalance)} icon={<Wallet />} color="slate" />
              <KpiCard label="Entradas (Gaveta)" value={formatCurrencyBRL(totalCashInputs)} icon={<ArrowUpCircle />} color="green" />
              <KpiCard label="Saídas (Gaveta)" value={formatCurrencyBRL(totalCashOutputs)} icon={<ArrowDownCircle />} color="red" />
              <KpiCard label="Vendas (Espécie)" value={formatCurrencyBRL(cashSales)} icon={<Banknote />} color="green" />
              <KpiCard label="Aportes (Troco)" value={formatCurrencyBRL(aportes)} icon={<Plus />} color="blue" />
              <KpiCard label="Saldo Físico (Gaveta)" value={formatCurrencyBRL(expectedBalance)} icon={<DollarSign />} color="indigo" />
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900">Extrato da Sessão (Físico)</h3>
                <span className="text-xs text-slate-500 font-medium">{cashEntries.length} movimentos</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="px-5 py-3">Hora</th>
                      <th className="px-5 py-3">Tipo / Origem</th>
                      <th className="px-5 py-3">Descrição</th>
                      <th className="px-5 py-3 text-right">Valor</th>
                      <th className="px-5 py-3 text-right">Saldo Após</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cashEntries.length === 0 && (
                      <tr><td colSpan={5} className="py-12 text-center text-slate-400 text-sm">Nenhum movimento em dinheiro físico lançado.</td></tr>
                    )}
                    {(() => {
                      let runningBalance = openSession.openingBalance;
                      return [...cashEntries].reverse().map(e => {
                        if (e.type === 'input') runningBalance += e.amount;
                        else runningBalance -= e.amount;
                        const bal = runningBalance;
                        return (
                          <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-3.5 text-sm text-slate-500 font-medium whitespace-nowrap">
                              {new Date(e.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border uppercase tracking-wide ${ENTRY_COLORS[e.category] || (e.type === 'input' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200')}`}>
                                {e.category}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-sm text-slate-600">{e.description || '—'}</td>
                            <td className={`px-5 py-3.5 text-right font-bold text-sm ${e.type === 'input' ? 'text-emerald-600' : 'text-red-600'}`}>
                              {e.type === 'input' ? '+' : '-'}{formatCurrencyBRL(e.amount)}
                            </td>
                            <td className="px-5 py-3.5 text-right font-bold text-slate-900 text-sm">{formatCurrencyBRL(bal)}</td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 sticky top-4">
              <div>
                <h4 className="font-extrabold text-slate-900 text-base">Vendas Digitais do Turno</h4>
                <p className="text-slate-400 text-xs mt-1">Conferência rápida para bater maquininhas e PIX sem misturar com o saldo físico.</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 bg-teal-50/50 rounded-xl border border-teal-100/50">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center">
                      <Smartphone size={16} />
                    </div>
                    <span className="text-xs font-bold text-slate-700">PIX</span>
                  </div>
                  <span className="text-sm font-black text-teal-700">{formatCurrencyBRL(digitalPix)}</span>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-purple-50/50 rounded-xl border border-purple-100/50">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                      <CreditCard size={16} />
                    </div>
                    <span className="text-xs font-bold text-slate-700">Cartão Crédito</span>
                  </div>
                  <span className="text-sm font-black text-purple-700">{formatCurrencyBRL(digitalCredit)}</span>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-blue-50/50 rounded-xl border border-blue-100/50">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                      <CreditCard size={16} />
                    </div>
                    <span className="text-xs font-bold text-slate-700">Cartão Débito</span>
                  </div>
                  <span className="text-sm font-black text-blue-700">{formatCurrencyBRL(digitalDebit)}</span>
                </div>

                {digitalSubscription > 0 && (
                  <div className="flex items-center justify-between p-3.5 bg-orange-50/50 rounded-xl border border-orange-100/50">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center">
                        <Award size={16} />
                      </div>
                      <span className="text-xs font-bold text-slate-700">Assinaturas</span>
                    </div>
                    <span className="text-sm font-black text-orange-700">{formatCurrencyBRL(digitalSubscription)}</span>
                  </div>
                )}
              </div>

              <div className="h-px bg-slate-100" />

              <div className="flex justify-between items-center bg-slate-900 text-white p-4 rounded-xl shadow-inner">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Vendas Digitais</span>
                <span className="text-lg font-black text-white">{formatCurrencyBRL(totalDigitalSales)}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center max-w-2xl mx-auto shadow-sm">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <Lock size={24} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Caixa Fechado</h3>
          <p className="text-[#6b7d99] text-sm mb-6 max-w-md">Para registrar pagamentos em dinheiro e gerenciar sangrias do dia, você precisa iniciar uma nova sessão de caixa.</p>
          <button 
            onClick={() => setModal('open')}
            className="bg-[#ea580c] text-white font-bold px-10 py-4 rounded-[2rem] flex items-center gap-2 transition-all shadow-lg shadow-orange-600/20 hover:scale-105 active:scale-95"
          >
            <Plus size={24} className="stroke-[3px]" /> Abrir Caixa Agora
          </button>
        </div>
      )}

      {/* Modais */}
      <AnimatePresence>
        {modal === 'open' && (
          <Modal title="Abrir Caixa" onClose={closeModal} maxW="max-w-sm">
            <form onSubmit={handleOpen} className="p-6 space-y-4">
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-sm text-emerald-700 font-medium flex items-start gap-2">
                <CheckCircle size={16} className="mt-0.5 shrink-0" />
                Informe o troco ou fundo de reserva que está na gaveta agora.
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Valor Inicial (R$)</label>
                <input type="number" step="0.01" min="0" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-2xl font-black text-center text-slate-900 focus:outline-none focus:border-emerald-500" placeholder="0,00" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Responsável (Opcional)</label>
                <input value={form.responsavel} onChange={e => setForm({ ...form, responsavel: e.target.value })
                } className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:outline-none focus:border-emerald-500" placeholder="Nome do responsável" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Observação (Opcional)</label>
                <textarea value={form.obs} onChange={e => setForm({ ...form, obs: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-700 focus:outline-none focus:border-emerald-500 resize-none h-16" />
              </div>
              <button disabled={saving} type="submit" className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2">
                {saving ? <Loader2 className="animate-spin" size={18} /> : <><Unlock size={18} /> Iniciar Sessão</>}
              </button>
            </form>
          </Modal>
        )}

        {modal === 'aporte' && (
          <Modal title="Registrar Aporte" onClose={closeModal} maxW="max-w-sm">
            <form onSubmit={handleMovement('input', form.reason || 'Aporte')} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Valor (R$)</label>
                <input type="number" step="0.01" min="0.01" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-2xl font-black text-center text-slate-900 focus:outline-none focus:border-blue-500" placeholder="0,00" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Motivo</label>
                <select value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-500">
                  <option value="">Selecione o motivo</option>
                  <option>Aporte Inicial</option><option>Reforço de Troco</option><option>Suprimento</option><option>Outro</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Autorizado por</label>
                <input value={form.responsavel} onChange={e => setForm({ ...form, responsavel: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:outline-none focus:border-blue-500" placeholder="Nome do responsável" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Observação</label>
                <textarea value={form.obs} onChange={e => setForm({ ...form, obs: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-700 focus:outline-none focus:border-blue-500 resize-none h-16" />
              </div>
              <button disabled={saving} type="submit" className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2">
                {saving ? <Loader2 className="animate-spin" size={18} /> : <><ArrowUpCircle size={18} /> Confirmar Aporte</>}
              </button>
            </form>
          </Modal>
        )}

        {modal === 'sangria' && (
          <Modal title="Registrar Sangria" onClose={closeModal} maxW="max-w-sm">
            <form onSubmit={handleMovement('output', form.reason || 'Sangria')} className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700 font-medium flex items-start gap-2">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                Retirada de dinheiro do caixa. Será registrado no extrato.
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Valor (R$)</label>
                <input type="number" step="0.01" min="0.01" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-2xl font-black text-center text-slate-900 focus:outline-none focus:border-amber-500" placeholder="0,00" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Motivo</label>
                <select value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-amber-500">
                  <option value="">Selecione</option>
                  <option>Sangria para Cofre</option><option>Pagamento Fornecedor</option><option>Despesa Operacional</option><option>Repasse ao Gerente</option><option>Outro</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Destino</label>
                <div className="flex gap-2">
                  {['Cofre', 'Gerente', 'Banco'].map(d => (
                    <button type="button" key={d} onClick={() => setForm({ ...form, destination: d })}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${form.destination === d ? 'bg-amber-50 border-amber-400 text-amber-800' : 'bg-white border-slate-200 text-slate-500'}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Observação</label>
                <textarea value={form.obs} onChange={e => setForm({ ...form, obs: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-700 focus:outline-none focus:border-amber-500 resize-none h-16" />
              </div>
              <button disabled={saving} type="submit" className="w-full bg-amber-600 text-white font-bold py-4 rounded-xl hover:bg-amber-700 active:scale-95 transition-all flex items-center justify-center gap-2">
                {saving ? <Loader2 className="animate-spin" size={18} /> : <><ArrowDownCircle size={18} /> Confirmar Sangria</>}
              </button>
            </form>
          </Modal>
        )}

        {modal === 'close' && openSession && (
          <Modal title="Fechar Caixa" onClose={closeModal} maxW="max-w-sm">
            <form onSubmit={handleClose} className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Fundo Inicial</span><span className="font-bold">{formatCurrencyBRL(openSession.openingBalance)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">+ Entradas</span><span className="font-bold text-emerald-600">{formatCurrencyBRL(totalCashInputs)}</span></div>
                <div className="flex justify-between pb-2 border-b border-slate-200"><span className="text-slate-500">- Saídas</span><span className="font-bold text-red-600">{formatCurrencyBRL(totalCashOutputs)}</span></div>
                <div className="flex justify-between text-base"><span className="font-bold text-slate-700">Sistema Esperado</span><span className="font-black text-slate-900">{formatCurrencyBRL(expectedBalance)}</span></div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Valor Real Contado na Gaveta (R$)</label>
                <input type="number" step="0.01" min="0" required value={informedClose} onChange={e => setInformedClose(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-2xl font-black text-center text-slate-900 focus:outline-none focus:border-red-500 text-center" placeholder="0,00" />
              </div>
              
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={fundoFixoAtivo} onChange={e => setFundoFixoAtivo(e.target.checked)} className="rounded border-slate-300 text-orange-500 focus:ring-orange-500 bg-white" />
                  <span className="text-xs font-bold text-slate-700">Deixar fundo padrão para o próximo turno</span>
                </label>
                {fundoFixoAtivo && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Valor do Fundo Fixo (R$)</label>
                    <input type="number" step="0.01" min="0" required value={fundoFixoValor} onChange={e => setFundoFixoValor(e.target.value)} 
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-red-500" placeholder="100.00" />
                  </div>
                )}
              </div>
              
              {Number(informedClose) > 0 && Math.abs(Number(informedClose) - expectedBalance) > 0.01 && (
                <div className="space-y-3">
                  <div className={`p-3 rounded-xl border flex items-start gap-3 ${Math.abs(Number(informedClose) - expectedBalance) > 50 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                    <AlertTriangle size={16} className={`shrink-0 mt-0.5 ${Math.abs(Number(informedClose) - expectedBalance) > 50 ? 'text-red-500' : 'text-amber-500'}`} />
                    <div>
                      <p className="text-xs font-bold text-slate-800">Divergência de Caixa</p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Diferença: <strong className={Number(informedClose) - expectedBalance > 0 ? 'text-emerald-600' : 'text-red-600'}>
                          {Number(informedClose) > expectedBalance ? '+' : ''}{formatCurrencyBRL(Number(informedClose) - expectedBalance)}
                        </strong>
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Justificativa (Obrigatória) *</label>
                    <textarea required value={justif} onChange={e => setJustif(e.target.value)} placeholder="Explique a divergência encontrada..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-700 focus:outline-none focus:border-red-500 resize-none h-20" />
                  </div>
                </div>
              )}

              {fundoFixoAtivo && Number(informedClose) > Number(fundoFixoValor) && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-lg text-xs font-medium">
                  Uma sangria automática de <strong>{formatCurrencyBRL(Number(informedClose) - Number(fundoFixoValor))}</strong> será registrada no fechamento para deixar exatamente o troco de <strong>{formatCurrencyBRL(Number(fundoFixoValor))}</strong>.
                </div>
              )}

              <button disabled={saving} type="submit" className="w-full bg-red-600 text-white font-bold py-4 rounded-xl hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center gap-2">
                {saving ? <Loader2 className="animate-spin" size={18} /> : <><Lock size={18} /> Confirmar Fechamento</>}
              </button>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      {/* SEÇÃO: HISTÓRICO DE SESSÕES ANTERIORES */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <button 
          type="button"
          onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center justify-between font-extrabold text-slate-800 hover:text-[#ea580c] transition-colors focus:outline-none"
        >
          <div className="flex items-center gap-2">
            <Clock size={20} className="text-slate-500" />
            <span>Histórico de Caixas Fechados (Últimas 10 Sessões)</span>
          </div>
          <ChevronRight size={20} className={`transition-transform duration-300 text-slate-400 ${showHistory ? 'rotate-90' : ''}`} />
        </button>

        <AnimatePresence>
          {showHistory && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden pt-2"
            >
              {closedSessions.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-6">Nenhum caixa fechado registrado até o momento.</p>
              ) : (
                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Abertura / Fechamento</th>
                        <th className="px-4 py-3 text-right">Fundo Inicial</th>
                        <th className="px-4 py-3 text-right">Entradas</th>
                        <th className="px-4 py-3 text-right">Saídas</th>
                        <th className="px-4 py-3 text-right">Esperado</th>
                        <th className="px-4 py-3 text-right">Contado</th>
                        <th className="px-4 py-3 text-right">Diferença</th>
                        <th className="px-4 py-3">Justificativa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {closedSessions.map(s => {
                        return (
                          <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <p className="font-bold text-slate-900">
                                {new Date(s.openedAt).toLocaleDateString('pt-BR')} {new Date(s.openedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                              {s.closedAt && (
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  Fechado: {new Date(s.closedAt).toLocaleDateString('pt-BR')} {new Date(s.closedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-right font-semibold text-slate-800">{formatCurrencyBRL(s.openingBalance)}</td>
                            <td className="px-4 py-3.5 text-right text-emerald-600 font-semibold">
                              {s.totalInputs !== undefined ? formatCurrencyBRL(s.totalInputs) : '—'}
                            </td>
                            <td className="px-4 py-3.5 text-right text-red-500 font-semibold">
                              {s.totalOutputs !== undefined ? formatCurrencyBRL(s.totalOutputs) : '—'}
                            </td>
                            <td className="px-4 py-3.5 text-right text-slate-800 font-semibold">
                              {s.expectedBalance !== undefined ? formatCurrencyBRL(s.expectedBalance) : '—'}
                            </td>
                            <td className="px-4 py-3.5 text-right text-slate-950 font-bold">
                              {s.closingBalance !== undefined ? formatCurrencyBRL(s.closingBalance) : '—'}
                            </td>
                            <td className="px-4 py-3.5 text-right whitespace-nowrap">
                              {s.difference !== undefined ? (
                                <span className={`font-black text-xs ${s.difference > 0.01 ? 'text-emerald-600' : s.difference < -0.01 ? 'text-red-600' : 'text-slate-500'}`}>
                                  {s.difference > 0.01 ? '+' : ''}{formatCurrencyBRL(s.difference)}
                                </span>
                              ) : '—'}
                            </td>
                            <td className="px-4 py-3.5 max-w-[180px] truncate text-[11px] text-slate-500 italic" title={s.justification || ''}>
                              {s.justification || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-ABA 2: FATURAMENTO
// ═══════════════════════════════════════════════════════════════════════════════
const BillingTab: React.FC<{ period: string; selectedProId: string }> = ({ period, selectedProId }) => {
  const { appointments, services, professionals, products } = useShop();

  const now = new Date();
  const todayStr = today();
  const monthStart = thisMonthStart();

  const inRange = (apt: typeof appointments[0]) => {
    if (selectedProId !== 'all' && apt.professionalId !== selectedProId) return false;
    if (period === 'today') return apt.date === todayStr;
    if (period === 'week') {
      const d = new Date(apt.date + 'T12:00:00');
      const wStart = new Date(); wStart.setDate(now.getDate() - now.getDay());
      return d >= wStart;
    }
    if (period === 'month') return apt.date >= monthStart;
    return true;
  };

  const completed = appointments.filter(a => a.status === 'completed' && inRange(a));
  const todayCompleted = appointments.filter(a => a.status === 'completed' && a.date === todayStr && (selectedProId === 'all' || a.professionalId === selectedProId));

  const totalRevenue = completed.reduce((s, a) => s + a.totalValue, 0);
  const todayRevenue = todayCompleted.reduce((s, a) => s + a.totalValue, 0);
  const avgTicket = completed.length > 0 ? totalRevenue / completed.length : 0;
  const pixTotal = completed.filter(a => a.paymentMethod === 'pix').reduce((s, a) => s + a.totalValue, 0);
  const cardTotal = completed.filter(a => a.paymentMethod === 'credit').reduce((s, a) => s + a.totalValue, 0);
  const debitTotal = completed.filter(a => a.paymentMethod === 'debit').reduce((s, a) => s + a.totalValue, 0);
  const cashTotal = completed.filter(a => a.paymentMethod === 'cash').reduce((s, a) => s + a.totalValue, 0);

  // Top profissionais
  const proRanking = professionals.map(p => {
    const pApts = completed.filter(a => a.professionalId === p.id);
    return { id: p.id, name: p.name, color: p.color || '#f97316', revenue: pApts.reduce((s, a) => s + a.totalValue, 0), count: pApts.length };
  }).sort((a, b) => b.revenue - a.revenue);
  const maxRevenue = proRanking[0]?.revenue || 1;

  // Últimas vendas
  const recentSales = [...completed].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 20);

  const getServiceName = (ids: string[]) => ids.map(id => services.find(s => s.id === id)?.name || '').filter(Boolean).join(', ') || 'Serviço';
  const getProName = (id: string | null) => professionals.find(p => p.id === id)?.name || '–';

  const PAYMENT_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    pix: { label: 'PIX', icon: <Smartphone size={14} />, color: 'bg-teal-50 text-teal-700 border-teal-200' },
    credit: { label: 'Crédito', icon: <CreditCard size={14} />, color: 'bg-purple-50 text-purple-700 border-purple-200' },
    debit: { label: 'Débito', icon: <CreditCard size={14} />, color: 'bg-blue-50 text-blue-700 border-blue-200' },
    cash: { label: 'Dinheiro', icon: <Banknote size={14} />, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    subscription: { label: 'Assinatura', icon: <Award size={14} />, color: 'bg-orange-50 text-orange-700 border-orange-200' },
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Faturamento Período" value={fmtBRL(totalRevenue)} icon={<TrendingUp />} color="green" />
        <KpiCard label="Faturamento Hoje" value={fmtBRL(todayRevenue)} icon={<DollarSign />} color="orange" />
        <KpiCard label="Ticket Médio" value={fmtBRL(avgTicket)} icon={<BarChart3 />} color="blue" />
        <KpiCard label="Atendimentos" value={String(completed.length)} sub={`${todayCompleted.length} hoje`} icon={<Scissors />} color="indigo" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="PIX Recebido" value={fmtBRL(pixTotal)} icon={<Smartphone />} color="blue" sub={`${completed.filter(a => a.paymentMethod === 'pix').length} transações`} />
        <KpiCard label="Crédito" value={fmtBRL(cardTotal)} icon={<CreditCard />} color="slate" sub={`${completed.filter(a => a.paymentMethod === 'credit').length} transações`} />
        <KpiCard label="Débito" value={fmtBRL(debitTotal)} icon={<CreditCard />} color="blue" sub={`${completed.filter(a => a.paymentMethod === 'debit').length} transações`} />
        <KpiCard label="Dinheiro" value={fmtBRL(cashTotal)} icon={<Banknote />} color="green" sub={`${completed.filter(a => a.paymentMethod === 'cash').length} transações`} />
      </div>

      {/* Grid de Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Mix Pagamentos */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h4 className="font-bold text-slate-900 mb-4">Mix de Pagamento</h4>
          {totalRevenue > 0 ? (
            <div className="space-y-3">
              {Object.entries({ pix: pixTotal, credit: cardTotal, debit: debitTotal, cash: cashTotal }).map(([key, val]) => (
                <SimpleBar key={key} label={PAYMENT_CONFIG[key]?.label || key} value={val} max={totalRevenue}
                  valueLabel={fmtBRL(val)} color={key === 'pix' ? 'bg-teal-500' : key === 'credit' ? 'bg-purple-500' : key === 'debit' ? 'bg-blue-500' : 'bg-emerald-500'} />
              ))}
            </div>
          ) : <p className="text-slate-400 text-sm text-center py-4">Sem dados no período</p>}
        </div>

        {/* Top Barbeiros */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h4 className="font-bold text-slate-900 mb-4">Ranking Barbeiros</h4>
          {proRanking.length > 0 ? (
            <div className="space-y-3">
              {proRanking.slice(0, 5).map((p, i) => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className={`text-xs font-black w-5 text-center ${i === 0 ? 'text-amber-500' : 'text-slate-400'}`}>{i + 1}º</span>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: p.color }}>
                    {p.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-slate-700 truncate">{p.name}</span>
                      <span className="font-bold text-slate-900 ml-2">{fmtBRL(p.revenue)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(p.revenue / maxRevenue) * 100}%`, backgroundColor: p.color }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-slate-400 text-sm text-center py-4">Sem dados no período</p>}
        </div>
      </div>

      {/* Tabela Vendas */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h4 className="font-bold text-slate-900">Vendas do Período</h4>
          <span className="text-xs text-slate-500 font-medium">{recentSales.length} registros</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3">Data / Hora</th>
                <th className="px-5 py-3">Cliente</th>
                <th className="px-5 py-3">Barbeiro</th>
                <th className="px-5 py-3">Serviço</th>
                <th className="px-5 py-3">Pagamento</th>
                <th className="px-5 py-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentSales.length === 0 && (
                <tr><td colSpan={6} className="py-12 text-center text-slate-400">Nenhuma venda no período</td></tr>
              )}
              {recentSales.map(apt => {
                const pm = PAYMENT_CONFIG[apt.paymentMethod || 'pix'];
                return (
                  <tr key={apt.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 text-sm text-slate-500 whitespace-nowrap">
                      <div>{new Date(apt.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</div>
                      <div className="text-[11px] text-slate-400">{apt.time?.substring(0, 5)}</div>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-900 text-sm">{apt.clientName}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-600">{getProName(apt.professionalId)}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-600 max-w-[150px] truncate">{getServiceName(apt.serviceIds)}</td>
                    <td className="px-5 py-3.5">
                      {pm && <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border flex w-max items-center gap-1 ${pm.color}`}>{pm.icon} {pm.label}</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-[#ea580c] text-sm">{fmtBRL(apt.totalValue)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-ABA 3: COMISSÕES
// ═══════════════════════════════════════════════════════════════════════════════
const CommissionsTab: React.FC<{ period: string; selectedProId: string }> = ({ period, selectedProId }) => {
  const { 
    appointments, professionals, addCashMovement, 
    commissionPayments, addCommissionPayment 
  } = useShop();
  const { showToast } = useToast();

  const todayStr = today();
  const monthStart = thisMonthStart();

  const { periodStart, periodEnd } = useMemo(() => {
    const todayStr = today();
    if (period === 'today') {
      return { periodStart: todayStr, periodEnd: todayStr };
    }
    if (period === 'week') {
      const now = new Date();
      const wStart = new Date(now);
      wStart.setDate(now.getDate() - now.getDay());
      const wEnd = new Date(wStart);
      wEnd.setDate(wStart.getDate() + 6);
      return { 
        periodStart: wStart.toISOString().split('T')[0], 
        periodEnd: wEnd.toISOString().split('T')[0] 
      };
    }
    if (period === 'month') {
      const now = new Date();
      const mStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { 
        periodStart: mStart.toISOString().split('T')[0], 
        periodEnd: mEnd.toISOString().split('T')[0] 
      };
    }
    return { periodStart: '2000-01-01', periodEnd: '2099-12-31' };
  }, [period]);

  const inRange = (apt: typeof appointments[0]) => {
    if (selectedProId !== 'all' && apt.professionalId !== selectedProId) return false;
    if (period === 'today') return apt.date === todayStr;
    if (period === 'week') {
      return apt.date >= periodStart && apt.date <= periodEnd;
    }
    if (period === 'month') return apt.date >= periodStart && apt.date <= periodEnd;
    return true;
  };

  const completed = appointments.filter(a => a.status === 'completed' && inRange(a));

  const filteredProfessionals = useMemo(() => {
    if (selectedProId === 'all') return professionals;
    return professionals.filter(p => p.id === selectedProId);
  }, [professionals, selectedProId]);

  const proStats = useMemo(() => {
    return filteredProfessionals.map(p => {
      const pApts = completed.filter(a => a.professionalId === p.id);
      const revenue = pApts.reduce((s, a) => s + a.totalValue, 0);
      const commPct = p.commissionPercentage ?? 50;
      const commission = revenue * commPct / 100;
      const shopRevenue = revenue - commission;

      // Calcular o total já pago a este barbeiro no período selecionado
      const paidInPeriod = commissionPayments
        .filter(cp => {
          if (cp.professionalId !== p.id) return false;
          if (period === 'all') return true;
          return cp.periodStart === periodStart && cp.periodEnd === periodEnd;
        })
        .reduce((sum, cp) => sum + cp.amountPaid, 0);

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
  }, [filteredProfessionals, completed, commissionPayments, period, periodStart, periodEnd]);

  const totalCommission = proStats.reduce((s, p) => s + p.commission, 0);
  const totalPending = proStats.reduce((s, p) => s + p.pendingPayout, 0);
  const totalRevenue = proStats.reduce((s, p) => s + p.revenue, 0);
  const topEarner = proStats[0];

  const [detailPro, setDetailPro] = useState<string | null>(null);
  const [payModal, setPayModal] = useState<{ id: string; name: string; amount: number } | null>(null);
  const [payObs, setPayObs] = useState('');
  
  // Novo estado de Origem de Pagamento de Comissão
  const [origemPagamento, setOrigemPagamento] = useState<'gaveta' | 'banco'>('banco');
  
  const [paying, setPaying] = useState(false);

  const detailData = useMemo(() => {
    if (!detailPro) return [];
    return completed.filter(a => a.professionalId === detailPro);
  }, [detailPro, completed]);

  const handlePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModal) return;
    setPaying(true);

    try {
      // 1. Registra a saída no caixa (se for de gaveta) ou apenas registra no extrato de despesas
      const r = await addCashMovement({
        type: 'output',
        category: 'Repasse Comissão',
        amount: payModal.amount,
        description: `Comissão de ${payModal.name}${origemPagamento === 'banco' ? ' | Método: bank' : ''}${payObs ? ' — ' + payObs : ''}`,
      });

      if (!r.success) {
        throw new Error(r.error || 'Erro ao registrar movimentação no caixa');
      }

      // 2. Insere na tabela commission_payments
      const cpRes = await addCommissionPayment({
        professionalId: payModal.id,
        periodStart,
        periodEnd,
        amountPaid: payModal.amount,
        paymentMethod: origemPagamento === 'gaveta' ? 'gaveta' : 'banco'
      });

      if (!cpRes.success) {
        throw new Error(cpRes.error || 'Erro ao registrar liquidação da comissão no banco de dados');
      }

      showToast(
        origemPagamento === 'banco'
          ? `Comissão de ${payModal.name} paga via PIX (banco) e registrada!`
          : `Comissão de ${payModal.name} paga em dinheiro e deduzida da gaveta!`, 
        'success'
      );
      setPayModal(null);
      setPayObs('');
    } catch (err: any) {
      showToast(err.message || 'Erro ao registrar pagamento', 'error');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Comissão Total" value={fmtBRL(totalCommission)} icon={<Award />} color="orange" />
        <KpiCard label="Repasses Pendentes" value={fmtBRL(totalPending)} icon={<Clock />} color="red" sub="A pagar" />
        <KpiCard label="Maior Faturador" value={topEarner?.name || '–'} icon={<Star />} color="indigo" sub={topEarner ? fmtBRL(topEarner.revenue) : undefined} />
        <KpiCard label="Receita Loja" value={fmtBRL(totalRevenue - totalCommission)} icon={<TrendingUp />} color="green" />
      </div>

      {/* Tabela */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h4 className="font-bold text-slate-900">Resumo por Barbeiro</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3">Barbeiro</th>
                <th className="px-5 py-3 text-center">Atendimentos</th>
                <th className="px-5 py-3 text-right">Receita Gerada</th>
                <th className="px-5 py-3 text-center">% Comissão</th>
                <th className="px-5 py-3 text-right">Comissão Total</th>
                <th className="px-5 py-3 text-right">Comissão Paga</th>
                <th className="px-5 py-3 text-right">Repasse Pendente</th>
                <th className="px-5 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {proStats.length === 0 && (
                <tr><td colSpan={8} className="py-12 text-center text-slate-400">Nenhum barbeiro correspondente aos filtros.</td></tr>
              )}
              {proStats.map(p => (
                <React.Fragment key={p.id}>
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ backgroundColor: p.color || '#ea580c' }}>
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{p.name}</p>
                          <p className="text-[11px] text-slate-500">{p.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="bg-slate-100 text-slate-700 text-sm font-bold px-3 py-1 rounded-full">{p.count}</span>
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-slate-900 text-sm">{fmtBRL(p.revenue)}</td>
                    <td className="px-5 py-4 text-center">
                      <span className="bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold px-2.5 py-1 rounded-full">{p.commPct}%</span>
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-slate-950 text-sm">{fmtBRL(p.commission)}</td>
                    <td className="px-5 py-4 text-right font-bold text-emerald-600 text-sm">{fmtBRL(p.paidInPeriod)}</td>
                    <td className="px-5 py-4 text-right font-bold text-orange-600 text-sm">{fmtBRL(p.pendingPayout)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => setDetailPro(detailPro === p.id ? null : p.id)}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1">
                          <ChevronRight size={12} className={`transition-transform ${detailPro === p.id ? 'rotate-90' : ''}`} />
                          Detalhe
                        </button>
                        {p.pendingPayout > 0 ? (
                          <button onClick={() => { setPayModal({ id: p.id, name: p.name, amount: p.pendingPayout }); setOrigemPagamento('banco'); }}
                            className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-lg hover:bg-emerald-100 transition-colors">
                            Pagar
                          </button>
                        ) : (
                          <span className="px-3 py-1.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-200">
                            Quitado
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                  {detailPro === p.id && (
                    <tr>
                      <td colSpan={8} className="px-6 pb-4 pt-0 bg-slate-50">
                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mt-2">
                          <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200">
                            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Atendimentos de {p.name}</p>
                          </div>
                          <table className="w-full text-left text-xs">
                            <tbody className="divide-y divide-slate-100">
                              {detailData.map(apt => (
                                <tr key={apt.id} className="hover:bg-slate-50">
                                  <td className="px-4 py-2.5 text-slate-500">{new Date(apt.date + 'T12:00:00').toLocaleDateString('pt-BR')} {apt.time?.substring(0, 5)}</td>
                                  <td className="px-4 py-2.5 font-medium text-slate-800">{apt.clientName}</td>
                                  <td className="px-4 py-2.5 text-right font-bold text-slate-900">{fmtBRL(apt.totalValue)}</td>
                                  <td className="px-4 py-2.5 text-right font-bold text-orange-600">{fmtBRL(apt.totalValue * p.commPct / 100)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
            {proStats.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200 font-black text-slate-900 text-sm">
                  <td className="px-5 py-4">Total Geral</td>
                  <td className="px-5 py-4 text-center">
                    <span className="font-black">{proStats.reduce((s, p) => s + p.count, 0)}</span>
                  </td>
                  <td className="px-5 py-4 text-right">{fmtBRL(totalRevenue)}</td>
                  <td className="px-5 py-4"></td>
                  <td className="px-5 py-4 text-right">{fmtBRL(totalCommission)}</td>
                  <td className="px-5 py-4 text-right text-emerald-600">{fmtBRL(proStats.reduce((s, p) => s + p.paidInPeriod, 0))}</td>
                  <td className="px-5 py-4 text-right text-orange-600">{fmtBRL(totalPending)}</td>
                  <td className="px-5 py-4"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Modal Pagar Comissão */}
      <AnimatePresence>
        {payModal && (
          <Modal title={`Pagar Comissão — ${payModal.name}`} onClose={() => { setPayModal(null); setPayObs(''); }}>
            <form onSubmit={handlePayout} className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Barbeiro</span>
                  <span className="font-bold text-slate-900">{payModal.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Valor a pagar</span>
                  <span className="font-black text-orange-600 text-lg">{fmtBRL(payModal.amount)}</span>
                </div>
              </div>

              {/* Seletor de Origem de Pagamento de Comissão */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Origem do Pagamento</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setOrigemPagamento('gaveta')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1 ${origemPagamento === 'gaveta' ? 'bg-orange-50 border-orange-400 text-orange-800' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                    <Banknote size={14} /> Gaveta (Dinheiro)
                  </button>
                  <button type="button" onClick={() => setOrigemPagamento('banco')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1 ${origemPagamento === 'banco' ? 'bg-blue-50 border-blue-400 text-blue-800' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                    <Smartphone size={14} /> Conta Bancária (PIX)
                  </button>
                </div>
              </div>

              {origemPagamento === 'banco' ? (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700 font-medium flex items-start gap-2">
                  <CheckCircle size={14} className="mt-0.5 shrink-0" />
                  Pago via PIX/Banco. A despesa será registrada nos relatórios de lucro, mas <strong>NÃO</strong> deduzirá do saldo físico da gaveta do caixa.
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 font-medium flex items-start gap-2">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  Retirada em espécie da gaveta. O valor <strong>será deduzido</strong> do saldo físico do caixa.
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Observação (Opcional)</label>
                <input value={payObs} onChange={e => setPayObs(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:outline-none focus:border-emerald-500"
                  placeholder="Ex: Referente à semana 17–23/04" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => { setPayModal(null); setPayObs(''); }}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={paying}
                  className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 active:scale-95 transition-all text-sm flex items-center justify-center gap-2">
                  {paying ? <Loader2 className="animate-spin" size={16} /> : <><CheckCircle size={16} /> Confirmar Pagamento</>}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
};

const ReportsTab: React.FC<{ period: string; selectedProId: string }> = ({ period, selectedProId }) => {
  const { appointments, professionals, cashSessions, cashFlowEntries, services } = useShop();

  const todayStr = today();
  const yesterdayStr = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]; })();
  const monthStart = thisMonthStart();
  const now = new Date();
  const lastMonthStart = (() => { const d = new Date(); d.setMonth(d.getMonth() - 1, 1); return d.toISOString().split('T')[0]; })();
  const lastMonthEnd = (() => { const d = new Date(); d.setDate(0); return d.toISOString().split('T')[0]; })();

  const inRange = (apt: typeof appointments[0]) => {
    if (selectedProId !== 'all' && apt.professionalId !== selectedProId) return false;
    if (period === 'today') return apt.date === todayStr;
    if (period === 'week') { const d = new Date(apt.date + 'T12:00:00'); const wStart = new Date(); wStart.setDate(now.getDate() - now.getDay()); return d >= wStart; }
    if (period === 'month') return apt.date >= monthStart;
    return true;
  };

  const completed = appointments.filter(a => a.status === 'completed' && inRange(a));
  const todayCompleted = appointments.filter(a => a.status === 'completed' && a.date === todayStr && (selectedProId === 'all' || a.professionalId === selectedProId));
  const yestCompleted = appointments.filter(a => a.status === 'completed' && a.date === yesterdayStr && (selectedProId === 'all' || a.professionalId === selectedProId));
  const thisMonthCompleted = appointments.filter(a => a.status === 'completed' && a.date >= monthStart && (selectedProId === 'all' || a.professionalId === selectedProId));
  const lastMonthCompleted = appointments.filter(a => a.status === 'completed' && a.date >= lastMonthStart && a.date <= lastMonthEnd && (selectedProId === 'all' || a.professionalId === selectedProId));

  const totalRevenue = completed.reduce((s, a) => s + a.totalValue, 0);
  const todayRevenue = todayCompleted.reduce((s, a) => s + a.totalValue, 0);
  const yestRevenue = yestCompleted.reduce((s, a) => s + a.totalValue, 0);
  const thisMonthRevenue = thisMonthCompleted.reduce((s, a) => s + a.totalValue, 0);
  const lastMonthRevenue = lastMonthCompleted.reduce((s, a) => s + a.totalValue, 0);
  const growthVsLastMonth = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;
  const growthToday = yestRevenue > 0 ? ((todayRevenue - yestRevenue) / yestRevenue) * 100 : 0;

  const totalCommission = professionals
    .filter(p => selectedProId === 'all' || p.id === selectedProId)
    .reduce((sTot, p) => {
      const rev = completed.filter(a => a.professionalId === p.id).reduce((s, a) => s + a.totalValue, 0);
      return sTot + rev * (p.commissionPercentage ?? 50) / 100;
    }, 0);
  const estimatedProfit = totalRevenue - totalCommission;

  const cancelled = appointments.filter(a => a.status === 'cancelled' && inRange(a));
  const scheduled = appointments.filter(a => inRange(a));
  const completionRate = scheduled.length > 0 ? (completed.length / scheduled.length) * 100 : 0;

  // Alertas Inteligentes
  const alerts: { type: 'warning' | 'danger' | 'info'; msg: string }[] = [];
  if (growthToday < -20) alerts.push({ type: 'danger', msg: `Faturamento hoje está ${Math.abs(growthToday).toFixed(0)}% abaixo de ontem.` });
  if (cancelled.length > 3) alerts.push({ type: 'warning', msg: `${cancelled.length} cancelamentos no período. Acima do normal.` });
  if (totalCommission > totalRevenue * 0.6) alerts.push({ type: 'warning', msg: `Comissões representam ${((totalCommission / totalRevenue) * 100).toFixed(0)}% do faturamento.` });
  if (professionals.some(p => completed.filter(a => a.professionalId === p.id).length === 0)) {
    alerts.push({ type: 'info', msg: 'Alguns profissionais não realizaram atendimentos no período.' });
  }

  // Relatórios por serviço: simplified
  const serviceRevenue = services.map(s => {
    const apts = completed.filter(a => a.serviceIds.includes(s.id));
    return { name: s.name, count: apts.length, revenue: apts.reduce((sum, a) => sum + a.totalValue / (a.serviceIds.length || 1), 0) };
  }).sort((a, b) => b.revenue - a.revenue);
  const maxSvcRev = serviceRevenue[0]?.revenue || 1;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Alertas Inteligentes */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => <AlertBanner key={i} type={a.type} message={a.msg} />)}
        </div>
      )}

      {/* KPIs Executivos */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard label="Receita Bruta" value={fmtBRL(totalRevenue)} icon={<TrendingUp />} color="green" />
        <KpiCard label="Lucro Estimado" value={fmtBRL(estimatedProfit)} icon={<DollarSign />} color="indigo" />
        <KpiCard label="Total Comissões" value={fmtBRL(totalCommission)} icon={<Award />} color="orange" />
        <KpiCard label="Crescimento Mês" value={`${growthVsLastMonth >= 0 ? '+' : ''}${growthVsLastMonth.toFixed(1)}%`} icon={growthVsLastMonth >= 0 ? <TrendingUp /> : <TrendingDown />} color={growthVsLastMonth >= 0 ? 'green' : 'red'} />
        <KpiCard label="Cancelamentos" value={String(cancelled.length)} icon={<AlertCircle />} color={cancelled.length > 3 ? 'red' : 'slate'} />
        <KpiCard label="Taxa Conclusão" value={`${completionRate.toFixed(0)}%`} icon={<CheckCircle />} color={completionRate > 70 ? 'green' : 'orange'} />
      </div>

      {/* Gráficos e Rankings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Serviços */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h4 className="font-bold text-slate-900 mb-4">Top Serviços por Receita</h4>
          {serviceRevenue.filter(s => s.count > 0).length > 0 ? (
            <div className="space-y-3">
              {serviceRevenue.filter(s => s.count > 0).slice(0, 6).map(s => (
                <SimpleBar key={s.name} label={s.name} value={s.revenue} max={maxSvcRev}
                  valueLabel={`${fmtBRL(s.revenue)} (${s.count})`} color="bg-orange-400" />
              ))}
            </div>
          ) : <p className="text-center text-slate-400 text-sm py-4">Sem dados</p>}
        </div>

        {/* Tipo pagamento */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h4 className="font-bold text-slate-900 mb-4">Performance por Forma de Pagamento</h4>
          <div className="space-y-4">
            {(['pix', 'credit', 'debit', 'cash', 'subscription'] as const).map(pm => {
              const pmApts = completed.filter(a => a.paymentMethod === pm);
              const pmRev = pmApts.reduce((s, a) => s + a.totalValue, 0);
              const pct = totalRevenue > 0 ? (pmRev / totalRevenue * 100) : 0;
              const labels: Record<string, string> = { pix: 'PIX', credit: 'Cartão Crédito', debit: 'Cartão Débito', cash: 'Dinheiro', subscription: 'Assinatura' };
              const colors: Record<string, string> = { pix: 'bg-teal-500', credit: 'bg-purple-500', debit: 'bg-blue-500', cash: 'bg-emerald-500', subscription: 'bg-orange-500' };
              return (
                <div key={pm}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-medium text-slate-700">{labels[pm]}</span>
                    <span className="text-slate-500">{pmApts.length} vendas · {fmtBRL(pmRev)} · <strong>{pct.toFixed(1)}%</strong></span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${colors[pm]}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Funil de Atendimentos */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h4 className="font-bold text-slate-900 mb-4">Funil de Atendimentos</h4>
          <div className="space-y-3">
            {[
              { label: 'Agendados', count: scheduled.length, color: 'bg-blue-500', textColor: 'text-blue-700', bg: 'bg-blue-50' },
              { label: 'Confirmados', count: appointments.filter(a => a.status === 'confirmed' && inRange(a)).length, color: 'bg-orange-500', textColor: 'text-orange-700', bg: 'bg-orange-50' },
              { label: 'Concluídos', count: completed.length, color: 'bg-emerald-500', textColor: 'text-emerald-700', bg: 'bg-emerald-50' },
              { label: 'Cancelados', count: cancelled.length, color: 'bg-red-400', textColor: 'text-red-700', bg: 'bg-red-50' },
            ].map((item, i) => (
              <div key={i} className={`${item.bg} rounded-xl px-4 py-3 flex items-center justify-between`}>
                <span className={`text-sm font-bold ${item.textColor}`}>{item.label}</span>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-2 bg-white/60 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: scheduled.length > 0 ? `${(item.count / scheduled.length) * 100}%` : '0%' }} />
                  </div>
                  <span className={`text-lg font-black ${item.textColor} w-8 text-right`}>{item.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ranking Equipe */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h4 className="font-bold text-slate-900 mb-4">Ranking da Equipe</h4>
          <div className="space-y-3">
            {professionals.map((p, i) => {
              const pApts = completed.filter(a => a.professionalId === p.id);
              const rev = pApts.reduce((s, a) => s + a.totalValue, 0);
              const pct = totalRevenue > 0 ? (rev / totalRevenue) * 100 : 0;
              return (
                <div key={p.id} className="flex items-center gap-3">
                  <span className={`text-sm font-black w-6 text-center ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-orange-700' : 'text-slate-300'}`}>
                    {i + 1}
                  </span>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: p.color || '#ea580c' }}>
                    {p.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-slate-700">{p.name}</span>
                      <span className="font-bold">{pApts.length} atend. · {fmtBRL(rev)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: p.color || '#ea580c' }} />
                    </div>
                  </div>
                </div>
              );
            })}
            {professionals.length === 0 && <p className="text-slate-400 text-sm text-center py-4">Nenhum profissional cadastrado</p>}
          </div>
        </div>
      </div>

      {/* Comparação Meses */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h4 className="font-bold text-slate-900 mb-2">Comparativo de Faturamento</h4>
        <p className="text-xs text-slate-500 mb-4">Mês atual vs. mês anterior</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 rounded-xl p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Mês Anterior</p>
            <p className="text-2xl font-black text-slate-400">{fmtBRL(lastMonthRevenue)}</p>
            <p className="text-xs text-slate-400 mt-1">{lastMonthCompleted.length} atendimentos</p>
          </div>
          <div className={`rounded-xl p-4 text-center ${growthVsLastMonth >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${growthVsLastMonth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>Mês Atual</p>
            <p className={`text-2xl font-black ${growthVsLastMonth >= 0 ? 'text-emerald-800' : 'text-red-800'}`}>{fmtBRL(thisMonthRevenue)}</p>
            <p className={`text-xs mt-1 font-bold ${growthVsLastMonth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {growthVsLastMonth >= 0 ? '+' : ''}{growthVsLastMonth.toFixed(1)}% vs anterior
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
export const FinancialPanel: React.FC<{ initialTab?: FinancialTab }> = ({ initialTab }) => {
  const [activeTab, setActiveTab] = useState<FinancialTab>(initialTab || 'cash');
  const [period, setPeriod] = useState('month');
  
  // Novo estado de Filtro por Profissional
  const [selectedProId, setSelectedProId] = useState<string>('all');

  const { cashSessions, refresh, appointments, professionals, cashFlowEntries } = useShop();
  const { showToast } = useToast();
  const openSession = cashSessions.find(s => s.status === 'open');

  const handleExport = () => {
    try {
      const todayStr = today();
      const monthStart = thisMonthStart();
      const now = new Date();
      const wStart = new Date();
      wStart.setDate(now.getDate() - now.getDay());
      wStart.setHours(0, 0, 0, 0);

      const inRangeDate = (dateStr: string) => {
        if (period === 'today') return dateStr === todayStr;
        if (period === 'week') return new Date(dateStr + 'T12:00:00') >= wStart;
        if (period === 'month') return dateStr >= monthStart;
        return true; 
      };

      const inRangeDateTime = (isoStr: string) => {
        const dateStr = isoStr.split('T')[0];
        return inRangeDate(dateStr);
      };

      let csvContent = "data:text/csv;charset=utf-8,";
      if (activeTab === 'billing' || activeTab === 'reports' || activeTab === 'commissions') {
          csvContent += "Data;Cliente;Profissional;Valor;Pagamento;Status\n";
          const filtered = appointments.filter(a => inRangeDate(a.date) && (selectedProId === 'all' || a.professionalId === selectedProId));
          filtered.forEach(a => {
              csvContent += `${a.date};${a.clientName};${professionals.find(p => p.id === a.professionalId)?.name || '---'};${a.totalValue};${a.paymentMethod};${a.status}\n`;
          });
      } else {
          csvContent += "Data;Tipo;Categoria;Valor;Descricao\n";
          const filtered = cashFlowEntries.filter(e => inRangeDateTime(e.createdAt));
          filtered.forEach(e => {
              csvContent += `${new Date(e.createdAt).toLocaleDateString('pt-BR')};${e.type};${e.category};${e.amount};${e.description}\n`;
          });
      }
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `cutflow_financeiro_${activeTab}_${period}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("Relatório exportado!");
    } catch (e) {
      showToast("Erro ao exportar", "error");
    }
  };

  const TABS: { id: FinancialTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'cash', label: 'Caixa Físico', icon: <Wallet size={18} />, badge: openSession ? 'Aberto' : undefined },
    { id: 'billing', label: 'Faturamento', icon: <TrendingUp size={18} /> },
    { id: 'commissions', label: 'Comissões', icon: <Users size={18} /> },
    { id: 'reports', label: 'Relatórios', icon: <BarChart3 size={18} /> },
  ];

  const PERIOD_OPTIONS = [
    { value: 'today', label: 'Hoje' },
    { value: 'week', label: 'Esta Semana' },
    { value: 'month', label: 'Este Mês' },
    { value: 'all', label: 'Todo período' },
  ];

  return (
    <div className="animate-fade-in pb-20">
      {/* ── Cabeçalho ─────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Financeiro</h2>
          <p className="text-[#6b7d99] text-sm font-medium">Controle total do dinheiro, vendas, repasses e performance financeira.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Seletor de Profissional (só para abas que usam) */}
          {activeTab !== 'cash' && (
            <select value={selectedProId} onChange={e => setSelectedProId(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl px-4 py-2.5 focus:outline-none focus:border-orange-500 cursor-pointer shadow-sm">
              <option value="all">Todos os Barbeiros</option>
              {professionals.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
          {/* Seletor de Período (só para abas que usam) */}
          {activeTab !== 'cash' && (
            <select value={period} onChange={e => setPeriod(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl px-4 py-2.5 focus:outline-none focus:border-orange-500 cursor-pointer shadow-sm">
              {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          )}
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Download size={16} /> Exportar
          </button>
          <button 
            onClick={() => { refresh(); showToast("Dados atualizados!"); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RefreshCw size={16} /> Atualizar
          </button>
        </div>
      </div>

      {/* ── Sub-menu Tabs (padrão cutflow2) ──────────────────────────── */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-fit mb-8 overflow-x-auto no-scrollbar max-w-full">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id); if (tab.id === 'cash') setSelectedProId('all'); }}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-bold transition-all whitespace-nowrap relative
              ${activeTab === tab.id ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {tab.icon}
            {tab.label}
            {tab.badge && (
              <span className={`absolute -top-1.5 -right-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wide
                ${openSession ? 'bg-emerald-500 text-white' : 'bg-red-400 text-white'}`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Conteúdo ────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
          {activeTab === 'cash' && <CashTab />}
          {activeTab === 'billing' && <BillingTab period={period} selectedProId={selectedProId} />}
          {activeTab === 'commissions' && <CommissionsTab period={period} selectedProId={selectedProId} />}
          {activeTab === 'reports' && <ReportsTab period={period} selectedProId={selectedProId} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
