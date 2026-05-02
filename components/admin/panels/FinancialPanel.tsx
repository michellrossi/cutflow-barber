import React, { useState, useMemo } from 'react';
import { useShop } from '../../../store';
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
  const { cashSessions, cashFlowEntries, openCashSession, closeCashSession, addCashMovement, professionals } = useShop();
  const { showToast } = useToast();

  const openSession = cashSessions.find(s => s.status === 'open');
  const sessionEntries = useMemo(() => cashFlowEntries.filter(e => e.sessionId === openSession?.id), [cashFlowEntries, openSession]);

  const totalInputs = sessionEntries.filter(e => e.type === 'input').reduce((a, b) => a + b.amount, 0);
  const totalOutputs = sessionEntries.filter(e => e.type === 'output').reduce((a, b) => a + b.amount, 0);
  const expectedBalance = openSession ? openSession.openingBalance + totalInputs - totalOutputs : 0;

  const cashSales = sessionEntries.filter(e => e.type === 'input' && e.category === 'Venda / Serviço').reduce((a, b) => a + b.amount, 0);
  const aportes = sessionEntries.filter(e => e.type === 'input' && e.category !== 'Venda / Serviço').reduce((a, b) => a + b.amount, 0);
  const sangrias = sessionEntries.filter(e => e.type === 'output').reduce((a, b) => a + b.amount, 0);

  const [modal, setModal] = useState<'open' | 'close' | 'aporte' | 'sangria' | null>(null);
  const [form, setForm] = useState({ amount: '', reason: '', obs: '', destination: 'cofre', responsavel: '' });
  const [informedClose, setInformedClose] = useState('');
  const [justif, setJustif] = useState('');
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
    const r = await closeCashSession(Number(informedClose));
    setSaving(false);
    if (r.success) { showToast('Caixa fechado!', 'success'); closeModal(); }
    else showToast(r.error || 'Erro', 'error');
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
        {expectedBalance > 1000 && <AlertBanner type="warning" message={`Saldo elevado na gaveta (${fmtBRL(expectedBalance)}). Considere realizar uma sangria.`} />}
      </div>

      {/* Status ao Vivo */}
      <div className={`flex flex-col md:flex-row items-start md:items-center justify-between p-5 rounded-2xl border-2 gap-4 ${openSession ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${openSession ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
            {openSession ? <Unlock size={22} /> : <Lock size={22} />}
          </div>
          <div>
            <p className={`font-black text-lg ${openSession ? 'text-emerald-900' : 'text-red-900'}`}>
              {openSession ? 'Caixa Aberto' : 'Caixa Fechado'}
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard label="Fundo Inicial" value={fmtBRL(openSession?.openingBalance || 0)} icon={<Wallet />} color="slate" />
        <KpiCard label="Vendas (Cash)" value={fmtBRL(cashSales)} icon={<Banknote />} color="green" />
        <KpiCard label="Aportes" value={fmtBRL(aportes)} icon={<ArrowUpCircle />} color="blue" />
        <KpiCard label="Sangrias" value={fmtBRL(sangrias)} icon={<ArrowDownCircle />} color="red" />
        <KpiCard label="Entradas Total" value={fmtBRL(totalInputs)} icon={<TrendingUp />} color="green" />
        <KpiCard label="Saldo Gaveta" value={fmtBRL(expectedBalance)} icon={<DollarSign />} color="indigo" />
      </div>

      {/* Tabela Extrato */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Extrato da Sessão</h3>
          <span className="text-xs text-slate-500 font-medium">{sessionEntries.length} movimentos</span>
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
              {sessionEntries.length === 0 && (
                <tr><td colSpan={5} className="py-12 text-center text-slate-400 text-sm">Nenhum movimento ainda. Registre vendas ou movimentos manuais.</td></tr>
              )}
              {(() => {
                let runningBalance = openSession?.openingBalance || 0;
                return [...sessionEntries].reverse().map(e => {
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
                        {e.type === 'input' ? '+' : '-'}{fmtBRL(e.amount)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-slate-900 text-sm">{fmtBRL(bal)}</td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>

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
                <div className="flex justify-between"><span className="text-slate-500">Fundo Inicial</span><span className="font-bold">{fmtBRL(openSession.openingBalance)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">+ Entradas</span><span className="font-bold text-emerald-600">{fmtBRL(totalInputs)}</span></div>
                <div className="flex justify-between pb-2 border-b border-slate-200"><span className="text-slate-500">- Saídas</span><span className="font-bold text-red-600">{fmtBRL(totalOutputs)}</span></div>
                <div className="flex justify-between text-base"><span className="font-bold text-slate-700">Sistema Esperado</span><span className="font-black text-slate-900">{fmtBRL(expectedBalance)}</span></div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Valor Real Contado na Gaveta (R$)</label>
                <input type="number" step="0.01" min="0" required value={informedClose} onChange={e => setInformedClose(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-2xl font-black text-center text-slate-900 focus:outline-none focus:border-red-500" placeholder="0,00" />
              </div>
              {Number(informedClose) > 0 && Math.abs(Number(informedClose) - expectedBalance) > 0.01 && (
                <div className="space-y-3">
                  <div className={`p-3 rounded-xl border flex items-start gap-3 ${Math.abs(Number(informedClose) - expectedBalance) > 50 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                    <AlertTriangle size={16} className={`shrink-0 mt-0.5 ${Math.abs(Number(informedClose) - expectedBalance) > 50 ? 'text-red-500' : 'text-amber-500'}`} />
                    <div>
                      <p className="text-xs font-bold text-slate-800">Divergência de Caixa</p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Diferença: <strong className={Number(informedClose) - expectedBalance > 0 ? 'text-emerald-600' : 'text-red-600'}>
                          {Number(informedClose) > expectedBalance ? '+' : ''}{fmtBRL(Number(informedClose) - expectedBalance)}
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
              <button disabled={saving} type="submit" className="w-full bg-red-600 text-white font-bold py-4 rounded-xl hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center gap-2">
                {saving ? <Loader2 className="animate-spin" size={18} /> : <><Lock size={18} /> Confirmar Fechamento</>}
              </button>
            </form>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-ABA 2: FATURAMENTO
// ═══════════════════════════════════════════════════════════════════════════════
const BillingTab: React.FC<{ period: string }> = ({ period }) => {
  const { appointments, services, professionals, products } = useShop();

  const now = new Date();
  const todayStr = today();
  const monthStart = thisMonthStart();

  const inRange = (apt: typeof appointments[0]) => {
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
  const todayCompleted = appointments.filter(a => a.status === 'completed' && a.date === todayStr);

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
const CommissionsTab: React.FC<{ period: string }> = ({ period }) => {
  const { appointments, professionals, addCashMovement } = useShop();
  const { showToast } = useToast();

  const todayStr = today();
  const monthStart = thisMonthStart();
  const now = new Date();

  const inRange = (apt: typeof appointments[0]) => {
    if (period === 'today') return apt.date === todayStr;
    if (period === 'week') { const d = new Date(apt.date + 'T12:00:00'); const wStart = new Date(); wStart.setDate(now.getDate() - now.getDay()); return d >= wStart; }
    if (period === 'month') return apt.date >= monthStart;
    return true;
  };

  const completed = appointments.filter(a => a.status === 'completed' && inRange(a));

  const proStats = professionals.map(p => {
    const pApts = completed.filter(a => a.professionalId === p.id);
    const revenue = pApts.reduce((s, a) => s + a.totalValue, 0);
    const commPct = p.commissionPercentage ?? 50;
    const commission = revenue * commPct / 100;
    const shopRevenue = revenue - commission;
    return { ...p, count: pApts.length, revenue, commission, shopRevenue, commPct };
  }).sort((a, b) => b.revenue - a.revenue);

  const totalCommission = proStats.reduce((s, p) => s + p.commission, 0);
  const totalRevenue = proStats.reduce((s, p) => s + p.revenue, 0);
  const topEarner = proStats[0];

  const [detailPro, setDetailPro] = useState<string | null>(null);
  const [payModal, setPayModal] = useState<{ id: string; name: string; amount: number } | null>(null);
  const [payObs, setPayObs] = useState('');
  const [paying, setPaying] = useState(false);

  const detailData = useMemo(() => {
    if (!detailPro) return [];
    return completed.filter(a => a.professionalId === detailPro);
  }, [detailPro, completed]);

  const handlePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModal) return;
    setPaying(true);
    // Registra a saída no caixa como repasse de comissão
    const r = await addCashMovement({
      type: 'output',
      category: 'Repasse Comissão',
      amount: payModal.amount,
      description: `Comissão de ${payModal.name}${payObs ? ' — ' + payObs : ''}`,
    });
    setPaying(false);
    if (r.success) {
      showToast(`Comissão de ${payModal.name} paga e registrada no caixa!`, 'success');
      setPayModal(null);
      setPayObs('');
    } else {
      showToast(r.error || 'Erro ao registrar pagamento', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Comissão Total" value={fmtBRL(totalCommission)} icon={<Award />} color="orange" />
        <KpiCard label="Repasses Pendentes" value={fmtBRL(totalCommission)} icon={<Clock />} color="red" sub="A pagar" />
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
                <th className="px-5 py-3 text-right">Valor Comissão</th>
                <th className="px-5 py-3 text-right">Valor Loja</th>
                <th className="px-5 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {proStats.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-slate-400">Nenhum dado no período</td></tr>
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
                    <td className="px-5 py-4 text-right font-bold text-orange-600 text-sm">{fmtBRL(p.commission)}</td>
                    <td className="px-5 py-4 text-right font-bold text-emerald-700 text-sm">{fmtBRL(p.shopRevenue)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => setDetailPro(detailPro === p.id ? null : p.id)}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1">
                          <ChevronRight size={12} className={`transition-transform ${detailPro === p.id ? 'rotate-90' : ''}`} />
                          Detalhe
                        </button>
                        <button onClick={() => setPayModal({ id: p.id, name: p.name, amount: p.commission })}
                          className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-lg hover:bg-emerald-100 transition-colors">
                          Pagar
                        </button>
                      </div>
                    </td>
                  </tr>
                  {detailPro === p.id && (
                    <tr>
                      <td colSpan={7} className="px-6 pb-4 pt-0 bg-slate-50">
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
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td className="px-5 py-4 text-sm font-black text-slate-900">Total Geral</td>
                  <td className="px-5 py-4 text-center">
                    <span className="text-slate-900 font-black text-sm">{proStats.reduce((s, p) => s + p.count, 0)}</span>
                  </td>
                  <td className="px-5 py-4 text-right font-black text-slate-900 text-sm">{fmtBRL(totalRevenue)}</td>
                  <td className="px-5 py-4"></td>
                  <td className="px-5 py-4 text-right font-black text-slate-900 text-sm">{fmtBRL(totalCommission)}</td>
                  <td className="px-5 py-4 text-right font-black text-slate-900 text-sm">{fmtBRL(totalRevenue - totalCommission)}</td>
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
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 font-medium flex items-start gap-2">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                O valor será registrado como saída no caixa físico ativo, se houver.
              </div>
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

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-ABA 4: RELATÓRIOS
// ═══════════════════════════════════════════════════════════════════════════════
const ReportsTab: React.FC<{ period: string }> = ({ period }) => {
  const { appointments, professionals, cashSessions, cashFlowEntries } = useShop();

  const todayStr = today();
  const yesterdayStr = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]; })();
  const monthStart = thisMonthStart();
  const now = new Date();
  const lastMonthStart = (() => { const d = new Date(); d.setMonth(d.getMonth() - 1, 1); return d.toISOString().split('T')[0]; })();
  const lastMonthEnd = (() => { const d = new Date(); d.setDate(0); return d.toISOString().split('T')[0]; })();

  const inRange = (apt: typeof appointments[0]) => {
    if (period === 'today') return apt.date === todayStr;
    if (period === 'week') { const d = new Date(apt.date + 'T12:00:00'); const wStart = new Date(); wStart.setDate(now.getDate() - now.getDay()); return d >= wStart; }
    if (period === 'month') return apt.date >= monthStart;
    return true;
  };

  const completed = appointments.filter(a => a.status === 'completed' && inRange(a));
  const todayCompleted = appointments.filter(a => a.status === 'completed' && a.date === todayStr);
  const yestCompleted = appointments.filter(a => a.status === 'completed' && a.date === yesterdayStr);
  const thisMonthCompleted = appointments.filter(a => a.status === 'completed' && a.date >= monthStart);
  const lastMonthCompleted = appointments.filter(a => a.status === 'completed' && a.date >= lastMonthStart && a.date <= lastMonthEnd);

  const totalRevenue = completed.reduce((s, a) => s + a.totalValue, 0);
  const todayRevenue = todayCompleted.reduce((s, a) => s + a.totalValue, 0);
  const yestRevenue = yestCompleted.reduce((s, a) => s + a.totalValue, 0);
  const thisMonthRevenue = thisMonthCompleted.reduce((s, a) => s + a.totalValue, 0);
  const lastMonthRevenue = lastMonthCompleted.reduce((s, a) => s + a.totalValue, 0);
  const growthVsLastMonth = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;
  const growthToday = yestRevenue > 0 ? ((todayRevenue - yestRevenue) / yestRevenue) * 100 : 0;

  const totalCommission = professionals.reduce((sTot, p) => {
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
  const { services } = useShop();
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
            {(['pix', 'credit', 'cash'] as const).map(pm => {
              const pmApts = completed.filter(a => a.paymentMethod === pm);
              const pmRev = pmApts.reduce((s, a) => s + a.totalValue, 0);
              const pct = totalRevenue > 0 ? (pmRev / totalRevenue * 100) : 0;
              const labels: Record<string, string> = { pix: 'PIX', credit: 'Cartão', cash: 'Dinheiro' };
              const colors: Record<string, string> = { pix: 'bg-teal-500', credit: 'bg-purple-500', cash: 'bg-emerald-500' };
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
export const FinancialPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<FinancialTab>('cash');
  const [period, setPeriod] = useState('month');

  const { cashSessions } = useShop();
  const openSession = cashSessions.find(s => s.status === 'open');

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
          {/* Seletor de Período (só para abas que usam) */}
          {activeTab !== 'cash' && (
            <select value={period} onChange={e => setPeriod(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl px-4 py-2.5 focus:outline-none focus:border-orange-500 cursor-pointer shadow-sm">
              {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          )}
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
            <Download size={16} /> Exportar
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
            <RefreshCw size={16} /> Atualizar
          </button>
        </div>
      </div>

      {/* ── Sub-menu Tabs (padrão cutflow2) ──────────────────────────── */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-fit mb-8 overflow-x-auto no-scrollbar max-w-full">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
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
          {activeTab === 'billing' && <BillingTab period={period} />}
          {activeTab === 'commissions' && <CommissionsTab period={period} />}
          {activeTab === 'reports' && <ReportsTab period={period} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
