
import React, { useMemo, useState } from 'react';
import { useShop } from '../../store';
import { Award, Calendar, Clock, LogOut, Star, User, History, Tag, Smartphone, CheckCircle2, AlertCircle, ArrowLeft, X } from 'lucide-react';
import { ConfirmationModal } from '../ui/ConfirmationModal';

export const ClientProfile: React.FC<{ onLogout: () => void, onBack: () => void }> = ({ onLogout, onBack }) => {
    const { currentClient, appointments, services, settings, coupons, professionals, updateAppointmentStatus } = useShop();
    const [cancelModal, setCancelModal] = useState<{ isOpen: boolean; aptId: string | null }>({ isOpen: false, aptId: null });

    const clientAppointments = useMemo(() => {
        if (!currentClient) return [];
        return appointments.filter(a => a.clientId === currentClient.id || a.clientPhone === currentClient.phone)
            .sort((a, b) => new Date(b.date + 'T' + b.time).getTime() - new Date(a.date + 'T' + a.time).getTime());
    }, [currentClient, appointments]);

    const clientCoupons = useMemo(() => {
        if (!currentClient) return [];
        return coupons.filter(c => c.clientId === currentClient.id && c.active && (!c.expiresAt || new Date(c.expiresAt) > new Date()));
    }, [currentClient, coupons]);

    if (!currentClient) return null;

    const getLoyaltyProgress = () => {
        if (settings.loyaltyMode === 'points') {
            const goal = settings.loyaltyPointsGoal || 1000;
            const current = currentClient.loyaltyPoints || 0;
            const percentage = Math.min(100, (current / goal) * 100);
            return { current, goal, percentage, label: 'Pontos' };
        } else {
            const goal = settings.loyaltyCardGoal || 10;
            const current = currentClient.loyaltyCardCount || 0;
            const percentage = Math.min(100, (current / goal) * 100);
            return { current, goal, percentage, label: 'Visitas' };
        }
    };

    const progress = getLoyaltyProgress();
    
    const handleCancelClick = (aptId: string) => {
        setCancelModal({ isOpen: true, aptId });
    };

    const handleConfirmCancel = async () => {
        if (cancelModal.aptId) {
            await updateAppointmentStatus(cancelModal.aptId, 'cancelled');
            setCancelModal({ isOpen: false, aptId: null });
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8 pb-20 pt-6 px-4">
            {/* Back Button */}
            <button 
                onClick={onBack}
                className="flex items-center gap-2 transition-colors mb-4 hover:brightness-110"
                style={{ color: settings.textColor || '#94a3b8' }}
            >
                <ArrowLeft size={20} />
                <span>Voltar</span>
            </button>

            {/* Header */}
            <div className="border rounded-2xl p-6 flex items-center justify-between shadow-xl" style={{ backgroundColor: settings.cardBackgroundColor || '#0f172a', borderColor: settings.borderColor || '#1e293b' }}>
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center border-2" style={{ backgroundColor: `${settings.accentColor || settings.primaryColor}33`, color: settings.accentColor || settings.primaryColor, borderColor: `${settings.accentColor || settings.primaryColor}4d` }}>
                        <User size={32} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold" style={{ color: settings.titleColor || '#ffffff' }}>{currentClient.name}</h2>
                        <div className="flex items-center gap-2 text-sm" style={{ color: settings.textColor || '#94a3b8' }}>
                            <Smartphone size={14} />
                            <span>{currentClient.phone}</span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={onLogout}
                    className="p-3 rounded-xl transition-all hover:bg-red-500/10 hover:text-red-500"
                    style={{ backgroundColor: settings.inputBackgroundColor || '#1e293b', color: settings.textColor || '#94a3b8' }}
                    title="Sair"
                >
                    <LogOut size={20} />
                </button>
            </div>

            {/* Loyalty Card */}
            <div className="rounded-2xl p-6 text-white shadow-xl relative overflow-hidden group" style={{ background: `linear-gradient(to bottom right, ${settings.accentColor || settings.primaryColor}, ${settings.accentColor || settings.primaryColor}dd)`, boxShadow: `0 20px 25px -5px ${settings.accentColor || settings.primaryColor}33` }}>
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700"></div>
                <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-black/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700"></div>
                
                <div className="relative z-10 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Award size={24} />
                            <span className="font-bold uppercase tracking-wider text-sm">Programa de Fidelidade</span>
                        </div>
                        <Star size={24} className="fill-white/20 text-white/40" />
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-end">
                            <span className="text-4xl font-black tracking-tighter">{progress.current}</span>
                            <span className="text-sm font-medium opacity-80">Meta: {progress.goal} {progress.label}</span>
                        </div>
                        <div className="h-3 bg-black/20 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-white rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${progress.percentage}%` }}
                            ></div>
                        </div>
                    </div>

                    <p className="text-xs font-medium opacity-90 leading-relaxed">
                        {progress.percentage >= 100 
                            ? "Parabéns! Você atingiu a meta e ganhou uma recompensa!" 
                            : `Faltam apenas ${progress.goal - progress.current} ${progress.label} para sua próxima recompensa.`}
                    </p>
                </div>
            </div>

            {/* Available Rewards */}
            {clientCoupons.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: settings.titleColor || '#ffffff' }}>
                        <Tag size={20} style={{ color: settings.accentColor || settings.primaryColor }} />
                        Suas Recompensas
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                        {clientCoupons.map(coupon => (
                            <div key={coupon.id} className="border rounded-xl p-4 flex items-center justify-between group transition-all" style={{ backgroundColor: settings.cardBackgroundColor || '#0f172a', borderColor: settings.borderColor || '#1e293b' }}>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-lg flex items-center justify-center border border-green-500/20">
                                        <Tag size={24} />
                                    </div>
                                    <div>
                                        <p className="font-bold" style={{ color: settings.titleColor || '#ffffff' }}>{coupon.type === 'percentage' ? `${coupon.value}% OFF` : `R$ ${coupon.value} OFF`}</p>
                                        <p className="text-xs uppercase tracking-widest font-bold" style={{ color: settings.textColor || '#64748b' }}>{coupon.code}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] uppercase font-bold" style={{ color: settings.textColor || '#64748b' }}>Expira em:</p>
                                    <p className="text-xs font-bold text-red-400">{coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : 'Sem expiração'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* History */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: settings.titleColor || '#ffffff' }}>
                    <History size={20} style={{ color: settings.accentColor || settings.primaryColor }} />
                    Histórico de Agendamentos
                </h3>
                
                {clientAppointments.length === 0 ? (
                    <div className="border border-dashed rounded-2xl p-12 text-center space-y-3" style={{ backgroundColor: `${settings.cardBackgroundColor}80` || 'rgba(15, 23, 42, 0.5)', borderColor: settings.borderColor || '#1e293b' }}>
                        <Calendar className="mx-auto" style={{ color: settings.textColor || '#334155' }} size={40} />
                        <p style={{ color: settings.textColor || '#64748b' }}>Você ainda não possui agendamentos.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {clientAppointments.map(apt => {
                            const aptServices = services.filter(s => apt.serviceIds.includes(s.id));
                            const professional = professionals.find(p => p.id === apt.professionalId);
                            return (
                                <div key={apt.id} className="border rounded-xl p-4 flex items-center justify-between transition-all" style={{ backgroundColor: settings.cardBackgroundColor || '#0f172a', borderColor: settings.borderColor || '#1e293b' }}>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold" style={{ color: settings.titleColor || '#ffffff' }}>{new Date(apt.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                                            <span className="text-xs" style={{ color: settings.textColor || '#64748b' }}>•</span>
                                            <span className="text-sm" style={{ color: settings.textColor || '#94a3b8' }}>{apt.time.substring(0, 5)}</span>
                                        </div>
                                        <p className="text-sm truncate max-w-[200px]" style={{ color: settings.textColor || '#cbd5e1' }}>
                                            {aptServices.map(s => s.name).join(', ')}
                                        </p>
                                        {professional && (
                                            <p className="text-[10px] flex items-center gap-1" style={{ color: settings.textColor || '#64748b' }}>
                                                <User size={10} />
                                                {professional.name}
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right space-y-1">
                                        <p className="font-bold" style={{ color: settings.priceColor || settings.accentColor || settings.primaryColor }}>R$ {apt.totalValue}</p>
                                        <div className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full inline-block ${
                                            apt.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                                            apt.status === 'cancelled' ? 'bg-red-500/10 text-red-500' :
                                            'bg-blue-500/10 text-blue-500'
                                        }`}>
                                            {apt.status === 'completed' ? 'Concluído' :
                                             apt.status === 'cancelled' ? 'Cancelado' :
                                             'Agendado'}
                                        </div>
                                        {(apt.status === 'scheduled' || apt.status === 'confirmed') && 
                                          new Date(apt.date + 'T' + apt.time) > new Date() && (
                                            <div className="mt-2">
                                                <button 
                                                    onClick={() => handleCancelClick(apt.id)}
                                                    className="text-[10px] font-bold uppercase text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 ml-auto"
                                                >
                                                    <X size={10} />
                                                    Cancelar
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <ConfirmationModal 
                isOpen={cancelModal.isOpen}
                onClose={() => setCancelModal({ isOpen: false, aptId: null })}
                onConfirm={handleConfirmCancel}
                title="Cancelar Agendamento"
                message="Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita."
                confirmText="Sim, Cancelar"
                isDestructive={true}
            />
        </div>
    );
};
