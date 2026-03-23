
import React, { useMemo } from 'react';
import { useShop } from '../../store';
import { Award, Calendar, Clock, LogOut, Star, User, History, Tag, Smartphone, CheckCircle2, AlertCircle } from 'lucide-react';

export const ClientProfile: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
    const { currentClient, appointments, services, settings, coupons } = useShop();

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

    return (
        <div className="max-w-2xl mx-auto space-y-8 pb-20">
            {/* Header */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center justify-between shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-orange-500/20 text-orange-500 rounded-full flex items-center justify-center border-2 border-orange-500/30">
                        <User size={32} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">{currentClient.name}</h2>
                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                            <Smartphone size={14} />
                            <span>{currentClient.phone}</span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={onLogout}
                    className="p-3 bg-slate-800 hover:bg-red-500/10 text-slate-400 hover:text-red-500 rounded-xl transition-all"
                    title="Sair"
                >
                    <LogOut size={20} />
                </button>
            </div>

            {/* Loyalty Card */}
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-xl shadow-orange-500/20 relative overflow-hidden group">
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
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Tag size={20} className="text-orange-500" />
                        Suas Recompensas
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                        {clientCoupons.map(coupon => (
                            <div key={coupon.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between group hover:border-orange-500/50 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-lg flex items-center justify-center border border-green-500/20">
                                        <Tag size={24} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-white">{coupon.type === 'percentage' ? `${coupon.value}% OFF` : `R$ ${coupon.value} OFF`}</p>
                                        <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">{coupon.code}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold">Expira em:</p>
                                    <p className="text-xs text-red-400 font-bold">{coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : 'Sem expiração'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* History */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <History size={20} className="text-orange-500" />
                    Histórico de Agendamentos
                </h3>
                
                {clientAppointments.length === 0 ? (
                    <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-12 text-center space-y-3">
                        <Calendar className="text-slate-700 mx-auto" size={40} />
                        <p className="text-slate-500">Você ainda não possui agendamentos.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {clientAppointments.map(apt => {
                            const aptServices = services.filter(s => apt.serviceIds.includes(s.id));
                            return (
                                <div key={apt.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between hover:bg-slate-800/50 transition-all">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-white">{new Date(apt.date).toLocaleDateString()}</span>
                                            <span className="text-slate-500 text-xs">•</span>
                                            <span className="text-slate-400 text-sm">{apt.time}</span>
                                        </div>
                                        <p className="text-sm text-slate-300 truncate max-w-[200px]">
                                            {aptServices.map(s => s.name).join(', ')}
                                        </p>
                                    </div>
                                    <div className="text-right space-y-1">
                                        <p className="font-bold text-orange-500">R$ {apt.totalValue}</p>
                                        <div className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full inline-block ${
                                            apt.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                                            apt.status === 'cancelled' ? 'bg-red-500/10 text-red-500' :
                                            'bg-blue-500/10 text-blue-500'
                                        }`}>
                                            {apt.status === 'completed' ? 'Concluído' :
                                             apt.status === 'cancelled' ? 'Cancelado' :
                                             'Agendado'}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
