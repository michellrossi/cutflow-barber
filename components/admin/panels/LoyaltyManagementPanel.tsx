import React from 'react';
import { useShop } from '../../../store';
import { Trophy } from 'lucide-react';

const WhatsappIcon = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.052 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
  </svg>
);

export const LoyaltyManagementPanel: React.FC = () => {
    const { shop, clients, appointments, settings, reloadClients } = useShop();
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        const load = async () => {
            if (shop?.id && clients.length === 0) {
                setLoading(true);
                await reloadClients(shop.id);
                setLoading(false);
            }
        };
        load();
    }, [shop?.id, clients.length, reloadClients]);

    const getProgress = (client: any) => {
        if (settings.loyaltyMode === 'card') {
            const progress = (client.loyaltyCardCount / (settings.loyaltyCardGoal || 1)) * 100;
            return Math.min(progress, 100);
        } else {
            const progress = (client.loyaltyPoints / (settings.loyaltyPointsGoal || 1)) * 100;
            return Math.min(progress, 100);
        }
    };

    const isGoalReached = (client: any) => {
        if (settings.loyaltyMode === 'card') {
            return client.loyaltyCardCount >= (settings.loyaltyCardGoal || 0);
        } else {
            return client.loyaltyPoints >= (settings.loyaltyPointsGoal || 0);
        }
    };

    const processedClients = React.useMemo(() => {
        return clients.map(client => {
            const clientAppts = appointments.filter(a => 
                (a.clientId === client.id) || 
                (!a.clientId && a.clientPhone === client.phone)
            ).filter(a => a.status === 'completed');

            // Ordenar por data desc
            clientAppts.sort((a, b) => new Date(b.date + 'T' + b.time).getTime() - new Date(a.date + 'T' + a.time).getTime());

            const lastAppt = clientAppts[0];
            return {
                ...client,
                lastVisitDate: lastAppt ? lastAppt.date : null
            };
        });
    }, [clients, appointments]);

    const openWhatsApp = (phone: string) => {
        const formattedPhone = phone.replace(/\D/g, '');
        window.open(`https://wa.me/${formattedPhone}`, '_blank');
    };

    return (
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6 font-montserrat">Gestão de Clientes</h3>
            <div className="space-y-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                        <div className="w-8 h-8 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
                        <p className="text-xs font-bold uppercase tracking-widest">Carregando Clientes...</p>
                    </div>
                ) : clients.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                        <p className="text-sm font-medium">Nenhum cliente encontrado para esta unidade.</p>
                    </div>
                ) : (
                    processedClients.map(client => (
                        <div key={client.id} className="p-4 border border-slate-200 rounded-2xl flex items-center gap-4 hover:border-orange-200 transition-all group">
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-700">{client.name}</span>
                                        {isGoalReached(client) && <Trophy className="text-yellow-500" size={18} />}
                                    </div>
                                    <span className="text-xs font-black text-slate-400 uppercase">
                                        {settings.loyaltyMode === 'card' 
                                            ? `${client.loyaltyCardCount || 0} / ${settings.loyaltyCardGoal || 0} visitas` 
                                            : `${client.loyaltyPoints || 0} / ${settings.loyaltyPointsGoal || 0} pts`}
                                    </span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2.5 p-0.5 border border-slate-200">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-1000 ${isGoalReached(client) ? 'bg-emerald-500' : 'bg-orange-500'}`} 
                                        style={{ width: `${getProgress(client)}%` }}
                                    ></div>
                                </div>
                                <div className="mt-2 text-[10px] text-slate-400 font-bold uppercase tracking-tight flex justify-between">
                                    <span>Última visita: {client.lastVisitDate ? new Date(client.lastVisitDate + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</span>
                                    {isGoalReached(client) && <span className="text-emerald-500">🏆 PRÊMIO DISPONÍVEL</span>}
                                </div>
                            </div>
                            <button 
                                onClick={() => openWhatsApp(client.phone)}
                                title="Enviar mensagem"
                                className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-green-50 hover:text-green-600 rounded-xl transition-all border border-slate-200"
                            >
                                <WhatsappIcon size={20} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
