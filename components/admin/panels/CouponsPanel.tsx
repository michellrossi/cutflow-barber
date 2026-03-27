import React, { useState, useMemo } from 'react';
import { useShop } from '../../../store';
import { Coupon } from '../../../types';
import { ConfirmationModal } from '../../ui/ConfirmationModal';
import { Plus, X, Loader2, Trash2, Calendar } from 'lucide-react';
import { useToast } from '../../ui/ToastContext';

export const CouponsPanel: React.FC = () => {
    const { coupons, addCoupon, updateCoupon, removeCoupon, settings } = useShop();
    const { showToast } = useToast();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'all' | 'active' | 'expired'>('all');
    
    const [formData, setFormData] = useState<{
        code: string;
        value: string;
        type: 'percentage' | 'fixed';
        maxUses: string;
        expiresAt: string;
    }>({ code: '', value: '', type: 'percentage', maxUses: '', expiresAt: '' });

    const isCouponExpired = (coupon: Coupon) => {
        const now = new Date();
        if (coupon.expiresAt && new Date(coupon.expiresAt + 'T23:59:59') < now) return true;
        if (coupon.maxUses && coupon.usageCount >= coupon.maxUses) return true;
        return !coupon.active;
    };

    const filteredCoupons = useMemo(() => {
        return coupons.filter(coupon => {
            const expired = isCouponExpired(coupon);
            if (activeTab === 'active') return !expired;
            if (activeTab === 'expired') return expired;
            return true;
        });
    }, [coupons, activeTab]);

    const handleEdit = (coupon: Coupon) => {
        setEditingId(coupon.id);
        setFormData({
            code: coupon.code,
            value: coupon.value.toString(),
            type: coupon.type,
            maxUses: coupon.maxUses ? coupon.maxUses.toString() : '',
            expiresAt: coupon.expiresAt || ''
        });
        setIsFormOpen(true);
    };

    const confirmDelete = async () => {
        if (deleteId) {
            const { success, error } = await removeCoupon(deleteId);
            if (success) {
                showToast('Cupom removido com sucesso!');
                setDeleteId(null);
            } else {
                showToast(error || 'Erro ao remover cupom.', 'error');
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const couponData = {
            code: formData.code.toUpperCase(),
            value: Number(formData.value),
            type: formData.type,
            active: true,
            maxUses: formData.maxUses ? parseInt(formData.maxUses) : null,
            expiresAt: formData.expiresAt || undefined
        };

        let result;
        if (editingId) {
            result = await updateCoupon(editingId, couponData);
        } else {
            result = await addCoupon(couponData);
        }

        setIsSaving(false);

        if (result.success) {
            showToast(editingId ? 'Cupom atualizado!' : 'Cupom criado!');
            setIsFormOpen(false);
            setEditingId(null);
            setFormData({ code: '', value: '', type: 'percentage', maxUses: '', expiresAt: '' });
        } else {
            showToast(result.error || 'Erro ao salvar.', 'error');
        }
    };

    return (
        <div className="animate-fade-in">
            <ConfirmationModal 
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={confirmDelete}
                title="Remover Cupom"
                message="Tem certeza que deseja remover este cupom? Ele não poderá mais ser utilizado."
                confirmText="Remover"
                isDestructive
            />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Gestão de Cupons</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Crie e gerencie promoções para fidelizar seus clientes.</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-6 border-b border-slate-700 mb-8">
                {[
                    { id: 'all', label: 'Todos' },
                    { id: 'active', label: 'Ativos' },
                    { id: 'expired', label: 'Expirados' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`pb-4 text-sm font-bold transition-all relative ${
                            activeTab === tab.id ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        {tab.label}
                        {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-full" />
                        )}
                    </button>
                ))}
            </div>

            {isFormOpen && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={(e) => e.target === e.currentTarget && setIsFormOpen(false)}>
                 <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 animate-scale-up relative w-full max-w-2xl shadow-2xl">
                     <button onClick={() => setIsFormOpen(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
                     <h3 className="text-xl font-bold mb-6 text-white">{editingId ? 'Editar Cupom' : 'Novo Cupom'}</h3>
                     <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Código do Cupom</label>
                                <input required value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:outline-none focus:border-orange-500 uppercase font-bold tracking-wider" placeholder="Ex: VERAO10" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Tipo de Desconto</label>
                                <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:outline-none focus:border-orange-500 font-medium">
                                    <option value="percentage">Porcentagem (%)</option>
                                    <option value="fixed">Valor Fixo (R$)</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Valor</label>
                                <div className="relative">
                                    <input required type="number" value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:outline-none focus:border-orange-500 font-bold" />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">{formData.type === 'percentage' ? '%' : 'R$'}</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Limite de Uso</label>
                                <input 
                                    type="number" 
                                    min="0"
                                    value={formData.maxUses} 
                                    onChange={e => setFormData({...formData, maxUses: e.target.value})} 
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:outline-none focus:border-orange-500" 
                                    placeholder="Ilimitado"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Expira em</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                    <input 
                                        type="date" 
                                        value={formData.expiresAt} 
                                        onChange={e => setFormData({...formData, expiresAt: e.target.value})} 
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 pl-12 text-white focus:outline-none focus:border-orange-500" 
                                    />
                                </div>
                            </div>
                        </div>

                        <button type="submit" className="w-full py-4 rounded-xl text-white font-bold text-lg hover:brightness-110 flex items-center justify-center gap-2 shadow-lg transition-all" style={{ backgroundColor: settings.primaryColor }} disabled={isSaving}>
                            {isSaving ? <Loader2 size={20} className="animate-spin" /> : (editingId ? 'Salvar Alterações' : 'Criar Cupom')}
                        </button>
                     </form>
                 </div>
                 </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredCoupons.map(coupon => {
                    const expired = isCouponExpired(coupon);
                    const usagePercentage = coupon.maxUses ? (coupon.usageCount / coupon.maxUses) * 100 : 0;
                    
                    return (
                        <div key={coupon.id} className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col relative group hover:border-slate-400 dark:hover:border-slate-600 transition-all shadow-sm dark:shadow-xl">
                            {/* Header do Card */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="bg-slate-100 dark:bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-green-600 dark:text-green-500 font-bold tracking-widest text-xs">
                                    {coupon.code}
                                </div>
                                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                                    expired ? 'bg-red-100 text-red-600 border border-red-200 dark:bg-red-500/10 dark:text-red-500 dark:border-red-500/20' : 'bg-green-100 text-green-600 border border-green-200 dark:bg-green-500/10 dark:text-green-500 dark:border-green-500/20'
                                }`}>
                                    <div className={`w-1 h-1 rounded-full ${expired ? 'bg-red-500' : 'bg-green-500'}`} />
                                    {expired ? 'EXPIRADO' : 'ATIVO'}
                                </div>
                            </div>

                            {/* Info de Benefício */}
                            <div className="mb-4">
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Valor do Benefício</p>
                                <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                                    {coupon.type === 'percentage' ? `${coupon.value}% de desconto` : `R$ ${coupon.value.toFixed(2)} OFF`}
                                </h4>
                            </div>

                            {/* Progresso de Uso */}
                            <div className="mb-4">
                                <div className="flex justify-between items-end mb-1.5">
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Uso atual</p>
                                    <p className="text-[9px] font-bold text-slate-400">
                                        {coupon.usageCount}{coupon.maxUses ? `/${coupon.maxUses}` : ' (Ilimitado)'}
                                    </p>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700/50">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-1000 ${expired ? 'bg-red-500/50' : 'bg-green-500'}`}
                                        style={{ width: `${coupon.maxUses ? Math.min(usagePercentage, 100) : 10}%` }}
                                    />
                                </div>
                            </div>

                            {/* Expiração */}
                            <div className="mb-5">
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">
                                    {expired ? 'Expirou em' : 'Expira em'}
                                </p>
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    {coupon.expiresAt ? new Date(coupon.expiresAt + 'T12:00:00').toLocaleDateString('pt-BR') : 'Sem validade'}
                                </p>
                            </div>

                            {/* Ações */}
                            <div className="mt-auto flex gap-2">
                                <button 
                                    onClick={() => handleEdit(coupon)} 
                                    className="flex-1 py-2 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-bold text-xs"
                                >
                                    Editar
                                </button>
                                <button 
                                    onClick={() => setDeleteId(coupon.id)} 
                                    className="p-2 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-100 dark:hover:text-red-500 dark:hover:bg-red-500/10 transition-all"
                                >
                                    <Trash2 size={16}/>
                                </button>
                            </div>
                        </div>
                    );
                })}

                {/* Card de Novo Cupom */}
                <button 
                    onClick={() => { 
                        setIsFormOpen(true); 
                        setEditingId(null); 
                        setFormData({ code: '', value: '', type: 'percentage', maxUses: '', expiresAt: '' }); 
                    }}
                    className="bg-slate-50 dark:bg-slate-800/20 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-4 flex flex-col items-center justify-center gap-3 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/30 transition-all min-h-[250px] group"
                >
                    <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:text-orange-500 group-hover:scale-110 transition-all shadow-sm">
                        <Plus size={20} />
                    </div>
                    <div className="text-center">
                        <p className="text-base font-bold text-slate-900 dark:text-white mb-0.5">Novo Cupom</p>
                        <p className="text-xs text-slate-500">Crie uma nova regra de promoção</p>
                    </div>
                </button>
            </div>
        </div>
    );
};
