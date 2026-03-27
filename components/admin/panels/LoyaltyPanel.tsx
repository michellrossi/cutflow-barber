
import React, { useState } from 'react';
import { useShop } from '../../../store';
import { Award, CreditCard, Target, Percent, DollarSign, Clock, Save, CheckCircle2, Info } from 'lucide-react';

export const LoyaltyPanel: React.FC = () => {
    const { settings, updateSettings } = useShop();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        loyaltyMode: settings.loyaltyMode || 'card',
        loyaltyCardGoal: settings.loyaltyCardGoal || 10,
        loyaltyPointsRatio: settings.loyaltyPointsRatio || 1,
        loyaltyPointsGoal: settings.loyaltyPointsGoal || 1000,
        loyaltyRewardValue: settings.loyaltyRewardValue || 10,
        loyaltyRewardType: settings.loyaltyRewardType || 'percentage',
        loyaltyRewardValidityDays: settings.loyaltyRewardValidityDays || 90
    });

    const handleSave = async () => {
        setLoading(true);
        setSuccess(false);
        const result = await updateSettings(formData);
        setLoading(false);
        if (result.success) {
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        }
    };

    return (
        <div className="max-w-4xl space-y-8">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <Award className="text-orange-500" size={24} />
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Programa de Fidelidade</h3>
                        <p className="text-sm text-slate-500 text-balance">Configure como seus clientes ganham recompensas e retornam à sua barbearia.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Modo de Fidelidade */}
                    <div className="space-y-4">
                        <label className="block text-sm font-bold text-slate-700">Modo do Programa</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setFormData({ ...formData, loyaltyMode: 'card' })}
                                className={`flex flex-col items-center gap-3 p-4 rounded-xl border transition-all ${formData.loyaltyMode === 'card' ? 'bg-orange-50 border-orange-500 text-orange-600 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'}`}
                            >
                                <CreditCard size={24} />
                                <div className="text-center">
                                    <span className="block font-bold text-sm">Cartão Fidelidade</span>
                                    <span className="text-[10px] opacity-60">Baseado em visitas</span>
                                </div>
                            </button>
                            <button
                                onClick={() => setFormData({ ...formData, loyaltyMode: 'points' })}
                                className={`flex flex-col items-center gap-3 p-4 rounded-xl border transition-all ${formData.loyaltyMode === 'points' ? 'bg-orange-50 border-orange-500 text-orange-600 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'}`}
                            >
                                <Target size={24} />
                                <div className="text-center">
                                    <span className="block font-bold text-sm">Sistema de Pontos</span>
                                    <span className="text-[10px] opacity-60">Baseado em gastos</span>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Meta */}
                    <div className="space-y-4">
                        {formData.loyaltyMode === 'card' ? (
                            <>
                                <label className="block text-sm font-bold text-slate-700">Meta de Visitas</label>
                                <div className="relative">
                                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="number"
                                        value={formData.loyaltyCardGoal}
                                        onChange={(e) => setFormData({ ...formData, loyaltyCardGoal: parseInt(e.target.value) })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:border-orange-500 text-slate-900"
                                        placeholder="Ex: 10"
                                    />
                                </div>
                                <p className="text-[11px] text-slate-500 italic">O cliente ganha o prêmio após completar {formData.loyaltyCardGoal} visitas.</p>
                            </>
                        ) : (
                            <>
                                <label className="block text-sm font-bold text-slate-700">Meta de Pontos</label>
                                <div className="relative">
                                    <Target className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="number"
                                        value={formData.loyaltyPointsGoal}
                                        onChange={(e) => setFormData({ ...formData, loyaltyPointsGoal: parseInt(e.target.value) })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:border-orange-500 text-slate-900"
                                        placeholder="Ex: 1000"
                                    />
                                </div>
                                <div className="mt-4 space-y-2">
                                    <label className="block text-sm font-bold text-slate-700">Pontos por Real Gasto (R$ 1,00 = X pontos)</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            type="number"
                                            value={formData.loyaltyPointsRatio}
                                            onChange={(e) => setFormData({ ...formData, loyaltyPointsRatio: parseInt(e.target.value) })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:border-orange-500 text-slate-900"
                                            placeholder="Ex: 1"
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <Percent className="text-orange-500" size={24} />
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Recompensa Automática</h3>
                        <p className="text-sm text-slate-500">Configure o cupom que será gerado quando o cliente atingir a meta.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-700">Tipo de Desconto</label>
                        <select
                            value={formData.loyaltyRewardType}
                            onChange={(e) => setFormData({ ...formData, loyaltyRewardType: e.target.value as 'percentage' | 'fixed' })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-4 focus:outline-none focus:border-orange-500 text-slate-900"
                        >
                            <option value="percentage">Porcentagem (%)</option>
                            <option value="fixed">Valor Fixo (R$)</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-700">Valor do Desconto</label>
                        <div className="relative">
                            {formData.loyaltyRewardType === 'fixed' ? <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /> : <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />}
                            <input
                                type="number"
                                value={formData.loyaltyRewardValue}
                                onChange={(e) => setFormData({ ...formData, loyaltyRewardValue: parseFloat(e.target.value) })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:border-orange-500 text-slate-900"
                                placeholder="Ex: 10"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-700">Validade (Dias)</label>
                        <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="number"
                                value={formData.loyaltyRewardValidityDays}
                                onChange={(e) => setFormData({ ...formData, loyaltyRewardValidityDays: parseInt(e.target.value) })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:border-orange-500 text-slate-900"
                                placeholder="Ex: 90"
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg flex gap-3">
                    <Info className="text-blue-500 shrink-0" size={20} />
                    <p className="text-xs text-blue-600 leading-relaxed">
                        Quando o cliente atingir a meta, um cupom de uso único será gerado e vinculado ao perfil dele. 
                        O cupom expirará automaticamente após {formData.loyaltyRewardValidityDays} dias se não for utilizado.
                    </p>
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-orange-500/20"
                >
                    {loading ? <Clock className="animate-spin" size={20} /> : success ? <CheckCircle2 size={20} /> : <Save size={20} />}
                    {loading ? 'Salvando...' : success ? 'Configurações Salvas!' : 'Salvar Configurações'}
                </button>
            </div>
        </div>
    );
};
