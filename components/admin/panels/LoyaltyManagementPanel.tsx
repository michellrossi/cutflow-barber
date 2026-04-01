import React from 'react';
import { useShop } from '../../../store';
import { Trophy, MessageSquare } from 'lucide-react';

export const LoyaltyManagementPanel: React.FC = () => {
    const { clients, settings } = useShop();

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

    const openWhatsApp = (phone: string) => {
        const formattedPhone = phone.replace(/\D/g, '');
        window.open(`https://wa.me/${formattedPhone}`, '_blank');
    };

    return (
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Gestão de Clientes</h3>
            <div className="space-y-4">
                {clients.map(client => (
                    <div key={client.id} className="p-4 border border-slate-200 rounded-lg flex items-center gap-4">
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900">{client.name}</span>
                                    {isGoalReached(client) && <Trophy className="text-yellow-500" size={18} />}
                                </div>
                                <span className="text-xs text-slate-500">
                                    {settings.loyaltyMode === 'card' 
                                        ? `${client.loyaltyCardCount || 0} / ${settings.loyaltyCardGoal || 0} visitas` 
                                        : `${client.loyaltyPoints || 0} / ${settings.loyaltyPointsGoal || 0} pontos`}
                                </span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2.5">
                                <div 
                                    className={`h-2.5 rounded-full ${isGoalReached(client) ? 'bg-green-500' : 'bg-orange-500'}`} 
                                    style={{ width: `${getProgress(client)}%` }}
                                ></div>
                            </div>
                            <div className="mt-2 text-xs text-slate-400">
                                Última visita: {client.createdAt ? new Date(client.createdAt).toLocaleDateString('pt-BR') : 'Sem histórico'}
                            </div>
                        </div>
                        <button 
                            onClick={() => openWhatsApp(client.phone)}
                            className="p-2 text-slate-400 hover:text-green-500 transition-colors"
                        >
                            <MessageSquare size={20} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
