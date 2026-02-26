import React, { useState } from 'react';
import { Search, Filter, ChevronRight, MessageCircle, Plus, Star } from 'lucide-react';

interface ClientData {
  id: string;
  name: string;
  phone: string;
  avatarUrl?: string;
  lastCutDate: string;
  lastCutStatus: string;
  lastCutStatusColor: string;
  frequencyStars: number;
  frequencyText: string;
  riskScore: 'Baixo Risco' | 'Alto Risco' | 'Atenção' | 'Crítico';
}

const mockClients: ClientData[] = [
  {
    id: '1',
    name: 'Carlos Silva',
    phone: '+55 11 99999-9999',
    avatarUrl: 'https://picsum.photos/seed/carlos/100/100',
    lastCutDate: '15 Out, 2023',
    lastCutStatus: 'com @BarberPro',
    lastCutStatusColor: 'text-slate-400',
    frequencyStars: 4,
    frequencyText: 'Alta',
    riskScore: 'Baixo Risco',
  },
  {
    id: '2',
    name: 'Marcos Oliveira',
    phone: '+55 21 98888-8888',
    lastCutDate: '02 Set, 2023',
    lastCutStatus: 'Ausente há 45 dias',
    lastCutStatusColor: 'text-red-400',
    frequencyStars: 2,
    frequencyText: 'Média',
    riskScore: 'Alto Risco',
  },
  {
    id: '3',
    name: 'João Souza',
    phone: '+55 11 97777-7777',
    avatarUrl: 'https://picsum.photos/seed/joao/100/100',
    lastCutDate: '20 Out, 2023',
    lastCutStatus: 'Agendado para amanhã',
    lastCutStatusColor: 'text-slate-400',
    frequencyStars: 5,
    frequencyText: 'VIP',
    riskScore: 'Baixo Risco',
  },
  {
    id: '4',
    name: 'Pedro Santos',
    phone: '+55 31 96666-6666',
    lastCutDate: '28 Set, 2023',
    lastCutStatus: 'Sem agendamento',
    lastCutStatusColor: 'text-slate-400',
    frequencyStars: 3,
    frequencyText: 'Média',
    riskScore: 'Atenção',
  },
  {
    id: '5',
    name: 'Lucas Lima',
    phone: '+55 41 95555-5555',
    avatarUrl: 'https://picsum.photos/seed/lucas/100/100',
    lastCutDate: '05 Jul, 2023',
    lastCutStatus: 'Churn Provável',
    lastCutStatusColor: 'text-red-400',
    frequencyStars: 1,
    frequencyText: 'Baixa',
    riskScore: 'Crítico',
  }
];

export const ClientsPanel: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'vip'>('all');

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'Baixo Risco': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'Alto Risco': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'Atenção': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'Crítico': return 'bg-red-900/30 text-red-400 border-red-500/20';
      default: return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const renderStars = (count: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star 
            key={star} 
            size={14} 
            className={star <= count ? "fill-green-500 text-green-500" : "text-slate-600"} 
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Gestão de Clientes</h2>
          <p className="text-slate-400 text-sm">Monitore o comportamento da sua base, identifique clientes em risco e aumente a retenção.</p>
        </div>
        <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors self-start md:self-auto">
          <Plus size={18} />
          Novo Cliente
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome, telefone ou email..." 
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-green-500 transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          <button 
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg border text-sm whitespace-nowrap flex items-center gap-2 transition-colors ${filter === 'all' ? 'bg-slate-800 border-slate-700 text-white' : 'border-slate-800 text-slate-400 hover:bg-slate-800'}`}
          >
            Todos <span className="bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded">128</span>
          </button>
          <button 
            onClick={() => setFilter('high')}
            className={`px-4 py-2 rounded-lg border text-sm whitespace-nowrap flex items-center gap-2 transition-colors ${filter === 'high' ? 'bg-slate-800 border-slate-700 text-white' : 'border-slate-800 text-slate-400 hover:bg-slate-800'}`}
          >
            <div className="w-2 h-2 rounded-full bg-red-500"></div> Risco Alto
          </button>
          <button 
            onClick={() => setFilter('medium')}
            className={`px-4 py-2 rounded-lg border text-sm whitespace-nowrap flex items-center gap-2 transition-colors ${filter === 'medium' ? 'bg-slate-800 border-slate-700 text-white' : 'border-slate-800 text-slate-400 hover:bg-slate-800'}`}
          >
            <div className="w-2 h-2 rounded-full bg-yellow-500"></div> Risco Médio
          </button>
          <button 
            onClick={() => setFilter('vip')}
            className={`px-4 py-2 rounded-lg border text-sm whitespace-nowrap flex items-center gap-2 transition-colors ${filter === 'vip' ? 'bg-slate-800 border-slate-700 text-white' : 'border-slate-800 text-slate-400 hover:bg-slate-800'}`}
          >
            <Star size={14} className="text-green-500" /> Vips
          </button>
          <button className="p-2 rounded-lg border border-slate-800 text-slate-400 hover:bg-slate-800 transition-colors">
            <Filter size={18} />
          </button>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider">
                <th className="p-4 font-medium">Cliente</th>
                <th className="p-4 font-medium">Último Corte</th>
                <th className="p-4 font-medium">Frequência</th>
                <th className="p-4 font-medium">Score de Risco</th>
                <th className="p-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {mockClients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-800/50 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {client.avatarUrl ? (
                        <img src={client.avatarUrl} alt={client.name} className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold">
                          {client.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-white">{client.name}</div>
                        <div className="text-xs text-slate-400">{client.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm text-white">{client.lastCutDate}</div>
                    <div className={`text-xs ${client.lastCutStatusColor}`}>{client.lastCutStatus}</div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {renderStars(client.frequencyStars)}
                      <span className="text-sm text-slate-300">{client.frequencyText}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getRiskBadgeColor(client.riskScore)}`}>
                      {client.riskScore}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {(client.riskScore === 'Alto Risco' || client.riskScore === 'Crítico') ? (
                      <button className="flex items-center gap-1 text-green-500 hover:text-green-400 text-sm font-medium ml-auto transition-colors">
                        <MessageCircle size={16} />
                        RECUPERAR
                      </button>
                    ) : (
                      <button className="text-slate-400 hover:text-white p-1 rounded transition-colors ml-auto block">
                        <ChevronRight size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
