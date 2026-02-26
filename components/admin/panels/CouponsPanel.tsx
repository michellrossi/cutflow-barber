import React, { useState } from 'react';
import { useShop } from '../../../store';
import { Coupon } from '../../../types';
import { ConfirmationModal } from '../../ui/ConfirmationModal';
// ADICIONADO: Edit2, Trash2 e Power nos imports
import { Plus, Tag, X, Loader2, Edit2, Trash2, Power } from 'lucide-react';
import { useToast } from '../../ui/ToastContext';

export const CouponsPanel: React.FC = () => {
    // Nota: Certifique-se que seu useShop expõe a função de atualizar status ou use o updateCoupon
    const { coupons, addCoupon, updateCoupon, removeCoupon, settings } = useShop();
    const { showToast } = useToast();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    const [formData, setFormData] = useState({ 
        code: '', 
        value: '', 
        type: 'percentage' as 'percentage' | 'fixed', 
        maxUses: '' 
    });

    // Função para alternar status (usando o updateCoupon existente)
    const toggleCouponStatus = async (id: string, currentStatus: boolean) => {
        const result = await updateCoupon(id, { active: !currentStatus });
        if (result.success) {
            showToast(`Cupom ${!currentStatus ? 'ativado' : 'desativado'}!`);
        }
    };

    const handleEdit = (coupon: Coupon) => {
        setEditingId(coupon.id);
        setFormData({
            code: coupon.code,
            value: coupon.discountValue.toString(), // Ajustado de .value para .discountValue
            type: coupon.discountType, // Ajustado de .type para .discountType
            maxUses: coupon.usageLimit ? coupon.usageLimit.toString() : '' // Ajustado de .maxUses para .usageLimit
        });
        setIsFormOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const couponData = {
            code: formData.code.toUpperCase(),
            discountValue: Number(formData.value),
            discountType: formData.type,
            active: true,
            usageLimit: formData.maxUses ? parseInt(formData.maxUses) : null
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
            setFormData({ code: '', value: '', type: 'percentage', maxUses: '' });
        } else {
            showToast(result.error || 'Erro ao salvar.', 'error');
        }
    };

    return (
        <div>
            {/* ... Modal de confirmação permanece igual ... */}

            <div className="flex justify-between mb-8">
                <p className="text-slate-400">Gerencie cupons de desconto.</p>
                <button 
                    onClick={() => { 
                        setIsFormOpen(true); 
                        setEditingId(null); 
                        setFormData({ code: '', value: '', type: 'percentage', maxUses: '' }); 
                    }} 
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-all" 
                    style={{ backgroundColor: settings.primaryColor }}
                >
                    <Plus size={18} /> Criar Cupom
                </button>
            </div>

            {/* Grid e Cards - Agora com os nomes de variáveis corretos */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3">
                {coupons.map(coupon => (
                    <div 
                        key={coupon.id} 
                        className="bg-slate-800/50 rounded-2xl border border-slate-700 flex flex-col overflow-hidden group hover:border-slate-600 transition-all w-full max-w-[190px] shadow-lg"
                    >
                        <div className="relative h-32 w-full bg-slate-900/40 flex items-center justify-center overflow-hidden">
                            <div className="absolute top-2 right-2">
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shadow-lg ${coupon.active ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                    {coupon.active ? 'ATIVO' : 'INATIVO'}
                                </span>
                            </div>
                            
                            <div className="flex flex-col items-center">
                                <div className="p-3 bg-orange-500/10 rounded-full mb-2">
                                    <Tag size={24} className="text-orange-500" />
                                </div>
                                <span className="text-xs font-mono font-bold text-white tracking-wider bg-slate-900 px-2 py-1 rounded border border-slate-700">
                                    {coupon.code}
                                </span>
                            </div>
                            
                            <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-slate-900 rounded-full" />
                            <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-slate-900 rounded-full" />
                        </div>

                        <div className="p-3 flex flex-col flex-1 text-center">
                            <div className="mb-3">
                                <h3 className="text-xl font-black text-white leading-tight">
                                    {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `R$ ${coupon.discountValue}`}
                                </h3>
                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">
                                    de desconto
                                </p>
                            </div>

                            <div className="space-y-1 mb-4">
                                <p className="text-[10px] text-slate-500 line-clamp-1">
                                    Uso: {coupon.usageCount || 0} / {coupon.usageLimit || '∞'}
                                </p>
                            </div>
                            
                            <div className="mt-auto flex gap-1.5 justify-center">
                                <button 
                                    onClick={() => handleEdit(coupon)} 
                                    className="p-2 bg-slate-700/50 rounded-lg text-slate-300 hover:text-white hover:bg-slate-600 transition-colors"
                                    title="Editar"
                                >
                                    <Edit2 size={14}/>
                                </button>
                                <button 
                                    onClick={() => toggleCouponStatus(coupon.id, coupon.active)} 
                                    className={`p-2 rounded-lg transition-colors ${coupon.active ? 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20' : 'bg-slate-700/50 text-slate-400 hover:text-white'}`}
                                    title={coupon.active ? "Desativar" : "Ativar"}
                                >
                                    <Power size={14}/>
                                </button>
                                <button 
                                    onClick={() => setDeleteId(coupon.id)} 
                                    className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
                                    title="Excluir"
                                >
                                    <Trash2 size={14}/>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Card de Adicionar Novo */}
                <button 
                    onClick={() => { setIsFormOpen(true); setEditingId(null); setFormData({ code: '', value: '', type: 'percentage', maxUses: '' }); }}
                    className="bg-transparent rounded-2xl border-2 border-dashed border-slate-700 hover:border-slate-500 hover:bg-slate-800/30 transition-all flex flex-col items-center justify-center text-center w-full max-w-[190px] min-h-[280px] group"
                >
                    <div className="w-10 h-10 rounded-full bg-slate-800 group-hover:bg-slate-700 flex items-center justify-center mb-3 transition-colors">
                        <Plus size={20} className="text-slate-400 group-hover:text-white" />
                    </div>
                    <h3 className="font-medium text-sm text-slate-300 group-hover:text-white transition-colors">Novo Cupom</h3>
                </button>
            </div>
        </div>
    );
};