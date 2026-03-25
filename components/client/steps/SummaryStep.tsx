import React from 'react';
import { Service, Professional } from '../../../types';
import { ArrowLeft, Check, AlertCircle } from 'lucide-react';

interface SummaryStepProps {
    customerInfo: { name: string, phone: string };
    setCustomerInfo: (info: { name: string, phone: string }) => void;
    couponCode: string;
    setCouponCode: (c: string) => void;
    appliedCoupon: string | null;
    handleApplyCoupon: () => void;
    settings: any;
    selectedServices: Service[];
    selectedProId: string | null;
    professionals: Professional[];
    selectedDate: string;
    selectedTime: string;
    subtotal: number;
    discountAmount: number;
    total: number;
    handleFinish: (e: React.MouseEvent) => void;
    setStep: (s: any) => void;
    loading: boolean;
    error: string | null;
}

export const SummaryStep: React.FC<SummaryStepProps> = ({ 
    customerInfo, setCustomerInfo, couponCode, setCouponCode, appliedCoupon, handleApplyCoupon, 
    settings, selectedServices, selectedProId, professionals, selectedDate, selectedTime, 
    subtotal, discountAmount, total, handleFinish, setStep, loading, error
}) => (
    <div className="max-w-4xl mx-auto py-8 px-4">
            <button onClick={() => setStep('datetime')} className="flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity" style={{ color: settings.textColor || '#94a3b8' }}><ArrowLeft size={16}/> Voltar</button>
            <h2 className="text-3xl font-bold mb-2" style={{ color: settings.titleColor || '#ffffff' }}>Finalizar agendamento</h2>
            <p className="mb-8" style={{ color: settings.textColor || '#94a3b8' }}>Confirme seus dados e conclua a reserva</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Form */}
                <div className="space-y-6">
                <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                    <h3 className="font-bold text-lg mb-4" style={{ color: settings.titleColor || '#ffffff' }}>Seus dados</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm mb-1" style={{ color: settings.textColor || '#94a3b8' }}>Nome completo</label>
                            <input value={customerInfo.name} onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-orange-500" placeholder="Seu nome" />
                        </div>
                        <div>
                            <label className="block text-sm mb-1" style={{ color: settings.textColor || '#94a3b8' }}>WhatsApp</label>
                            <input value={customerInfo.phone} onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-orange-500" placeholder="(00) 00000-0000" />
                        </div>
                    </div>
                </div>

                <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                    <h3 className="font-bold text-lg mb-4" style={{ color: settings.titleColor || '#ffffff' }}>Cupom de desconto</h3>
                    <div className="flex gap-2">
                        <input 
                            value={couponCode} 
                            onChange={e => setCouponCode(e.target.value)}
                            disabled={!!appliedCoupon}
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-orange-500 uppercase" 
                            placeholder="Digite o cupom" 
                        />
                        <button 
                            onClick={handleApplyCoupon}
                            disabled={!!appliedCoupon || !couponCode}
                            className="px-6 rounded-lg font-medium text-slate-900 hover:opacity-90 disabled:opacity-50"
                            style={{ backgroundColor: settings.primaryColor }}
                        >
                            {appliedCoupon ? <Check size={20}/> : 'Aplicar'}
                        </button>
                    </div>
                    {appliedCoupon && <p className="text-green-500 text-sm mt-2 flex items-center gap-1"><Check size={14}/> Cupom {appliedCoupon} aplicado!</p>}
                </div>
                </div>

                {/* Right Column: Summary */}
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 h-fit">
                <h3 className="font-bold text-lg mb-6" style={{ color: settings.titleColor || '#ffffff' }}>Resumo do agendamento</h3>
                
                <div className="space-y-4 mb-6">
                    <div className="flex justify-between items-start pb-4 border-b border-slate-700">
                        <div>
                            <p className="text-sm" style={{ color: settings.textColor || '#94a3b8' }}>Serviços</p>
                            <div className="font-medium" style={{ color: settings.titleColor || '#ffffff' }}>
                                {selectedServices.map(s => <div key={s.id}>{s.name}</div>)}
                            </div>
                        </div>
                        <div className="text-right" style={{ color: settings.textColor || '#cbd5e1' }}>R$ {subtotal.toFixed(2)}</div>
                    </div>

                    <div className="pb-4 border-b border-slate-700">
                        <p className="text-sm" style={{ color: settings.textColor || '#94a3b8' }}>Profissional</p>
                        <div className="font-medium" style={{ color: settings.titleColor || '#ffffff' }}>
                            {selectedProId ? professionals.find(p => p.id === selectedProId)?.name : 'Sem preferência'}
                        </div>
                    </div>

                    <div className="pb-4 border-b border-slate-700">
                        <p className="text-sm" style={{ color: settings.textColor || '#94a3b8' }}>Data e horário</p>
                        <div className="font-medium" style={{ color: settings.titleColor || '#ffffff' }}>
                            {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })} às {selectedTime?.substring(0, 5)}
                        </div>
                    </div>
                </div>

                <div className="space-y-2 mb-6">
                        <div className="flex justify-between" style={{ color: settings.textColor || '#94a3b8' }}>
                            <span>Subtotal</span>
                            <span>R$ {subtotal.toFixed(2)}</span>
                        </div>
                        {discountAmount > 0 && (
                            <div className="flex justify-between text-green-500">
                                <span>Desconto</span>
                                <span>- R$ {discountAmount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-2xl font-bold pt-4 border-t border-slate-700" style={{ color: settings.titleColor || '#ffffff' }}>
                            <span>Total</span>
                            <span>R$ {total.toFixed(2)}</span>
                        </div>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2 text-red-400 text-sm">
                        <AlertCircle size={16} className="mt-0.5 shrink-0"/>
                        <p>{error}</p>
                    </div>
                )}

                <button 
                    onClick={handleFinish}
                    disabled={loading}
                    className="w-full py-4 rounded-lg text-white font-bold text-lg hover:brightness-110 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: settings.primaryColor }}
                >
                    {loading ? 'Confirmando...' : 'Confirmar Agendamento'}
                </button>
                </div>
            </div>
    </div>
);