import React, { useState, useMemo } from 'react';
import { useShop } from '../../../store';
import { Client, Appointment } from '../../../types';
import { Search, Filter, ChevronRight, MessageCircle, Plus, Star, Edit2, Trash2, X, Save, Phone, Mail, User, Loader2 } from 'lucide-react';
import { useToast } from '../../ui/ToastContext';
import { ConfirmationModal } from '../../ui/ConfirmationModal';

interface ClientMetrics {
  lastCutDate: string | null;
  daysSinceLastCut: number;
  totalCuts: number;
  frequency: 'VIP' | 'Alta' | 'Média' | 'Baixa' | 'Novo';
  risk: 'Baixo' | 'Médio' | 'Alto' | 'Crítico' | 'Novo';
  totalSpent: number;
}

interface ProcessedClient extends Client {
  metrics: ClientMetrics;
}

export const ClientsPanel: React.FC = () => {
  const { clients, appointments, addClient, updateClient, removeClient, settings } = useShop();
  const { showToast } = useToast();

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'high_risk' | 'medium_risk' | 'vip' | 'new'>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    notes: ''
  });

  // Process Data
  const processedClients = useMemo(() => {
    return clients.map(client => {
      // Find appointments for this client
      // Match by ID is best, fallback to Phone if ID missing in appointment (legacy)
      const clientAppts = appointments.filter(a => 
        (a.clientId === client.id) || 
        (!a.clientId && a.clientPhone === client.phone)
      ).filter(a => a.status === 'completed');

      // Sort by date desc
      clientAppts.sort((a, b) => new Date(b.date + 'T' + b.time).getTime() - new Date(a.date + 'T' + a.time).getTime());

      const lastAppt = clientAppts[0];
      const lastCutDate = lastAppt ? lastAppt.date : null;
      
      let daysSinceLastCut = 0;
      if (lastCutDate) {
        const diff = new Date().getTime() - new Date(lastCutDate).getTime();
        daysSinceLastCut = Math.floor(diff / (1000 * 60 * 60 * 24));
      }

      const totalCuts = clientAppts.length;
      const totalSpent = clientAppts.reduce((sum, a) => sum + a.totalValue, 0);

      // Determine Frequency & Risk
      let frequency: ClientMetrics['frequency'] = 'Baixa';
      let risk: ClientMetrics['risk'] = 'Novo';

      if (totalCuts === 0) {
        frequency = 'Novo';
        risk = 'Novo';
      } else {
        // Frequency Logic
        if (totalCuts >= 10) frequency = 'VIP';
        else if (totalCuts >= 5) frequency = 'Alta';
        else if (totalCuts >= 2) frequency = 'Média';
        
        // Risk Logic
        if (daysSinceLastCut > 90) risk = 'Crítico';
        else if (daysSinceLastCut > 60) risk = 'Alto';
        else if (daysSinceLastCut > 30) risk = 'Médio';
        else risk = 'Baixo';
      }

      return {
        ...client,
        metrics: {
          lastCutDate,
          daysSinceLastCut,
          totalCuts,
          frequency,
          risk,
          totalSpent
        }
      };
    });
  }, [clients, appointments]);

  // Filter Data
  const filteredClients = useMemo(() => {
    return processedClients.filter(client => {
      const matchesSearch = 
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone.includes(searchTerm) ||
        (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      if (filter === 'all') return true;
      if (filter === 'high_risk') return client.metrics.risk === 'Alto' || client.metrics.risk === 'Crítico';
      if (filter === 'medium_risk') return client.metrics.risk === 'Médio';
      if (filter === 'vip') return client.metrics.frequency === 'VIP';
      if (filter === 'new') return client.metrics.risk === 'Novo';

      return true;
    });
  }, [processedClients, searchTerm, filter]);

  // Handlers
  const handleOpenForm = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name,
        phone: client.phone,
        email: client.email || '',
        notes: client.notes || ''
      });
    } else {
      setEditingClient(null);
      setFormData({ name: '', phone: '', email: '', notes: '' });
    }
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (editingClient) {
        await updateClient(editingClient.id, formData);
        showToast('Cliente atualizado com sucesso!');
      } else {
        await addClient(formData);
        showToast('Cliente cadastrado com sucesso!');
      }
      setIsFormOpen(false);
    } catch (error) {
      showToast('Erro ao salvar cliente.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!clientToDelete) return;
    
    try {
      await removeClient(clientToDelete.id);
      showToast('Cliente removido com sucesso!');
      setIsDeleteModalOpen(false);
      setClientToDelete(null);
    } catch (error) {
      showToast('Erro ao remover cliente.', 'error');
    }
  };

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'Baixo': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'Médio': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'Alto': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'Crítico': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const renderStars = (frequency: string) => {
    let count = 1;
    if (frequency === 'VIP') count = 5;
    else if (frequency === 'Alta') count = 4;
    else if (frequency === 'Média') count = 3;
    else if (frequency === 'Baixa') count = 2;

    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star 
            key={star} 
            size={12} 
            className={star <= count ? "fill-yellow-500 text-yellow-500" : "text-slate-700"} 
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Gestão de Clientes</h2>
          <p className="text-slate-400 text-sm">Gerencie sua base, identifique oportunidades e recupere clientes inativos.</p>
        </div>
        <button 
          onClick={() => handleOpenForm()}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors self-start md:self-auto shadow-lg shadow-green-500/20"
        >
          <Plus size={18} />
          Novo Cliente
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
        <div className="relative flex-1 w-full lg:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome, telefone ou email..." 
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-orange-500 transition-colors placeholder:text-slate-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0 no-scrollbar">
          <FilterButton 
            active={filter === 'all'} 
            onClick={() => setFilter('all')} 
            label="Todos" 
            count={processedClients.length} 
          />
          <FilterButton 
            active={filter === 'high_risk'} 
            onClick={() => setFilter('high_risk')} 
            label="Risco Alto" 
            color="red"
            count={processedClients.filter(c => c.metrics.risk === 'Alto' || c.metrics.risk === 'Crítico').length}
          />
          <FilterButton 
            active={filter === 'medium_risk'} 
            onClick={() => setFilter('medium_risk')} 
            label="Risco Médio" 
            color="yellow"
            count={processedClients.filter(c => c.metrics.risk === 'Médio').length}
          />
          <FilterButton 
            active={filter === 'vip'} 
            onClick={() => setFilter('vip')} 
            label="VIPs" 
            color="green"
            count={processedClients.filter(c => c.metrics.frequency === 'VIP').length}
          />
          <FilterButton 
            active={filter === 'new'} 
            onClick={() => setFilter('new')} 
            label="Novos" 
            count={processedClients.filter(c => c.metrics.risk === 'Novo').length}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800/50 text-xs text-slate-400 uppercase tracking-wider">
                <th className="p-4 font-medium">Cliente</th>
                <th className="p-4 font-medium">Último Corte</th>
                <th className="p-4 font-medium">Frequência</th>
                <th className="p-4 font-medium">Status / Risco</th>
                <th className="p-4 font-medium text-right">Total Gasto</th>
                <th className="p-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    Nenhum cliente encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-700/30 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-sm border border-slate-600">
                          {client.avatarUrl ? (
                            <img src={client.avatarUrl} alt={client.name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            client.name.substring(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-white">{client.name}</div>
                          <div className="text-xs text-slate-400 flex items-center gap-1">
                            <Phone size={10} /> {client.phone}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {client.metrics.lastCutDate ? (
                        <div>
                          <div className="text-sm text-white">
                            {new Date(client.metrics.lastCutDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </div>
                          <div className="text-xs text-slate-500">
                            há {client.metrics.daysSinceLastCut} dias
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 italic">Nunca cortou</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        {renderStars(client.metrics.frequency)}
                        <span className="text-xs text-slate-400">{client.metrics.frequency} ({client.metrics.totalCuts} cortes)</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${getRiskBadgeColor(client.metrics.risk)}`}>
                        {client.metrics.risk}
                      </span>
                    </td>
                    <td className="p-4 text-right font-bold text-white">
                      R$ {(client.totalSpent || 0).toFixed(2)}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {(client.metrics.risk === 'Alto' || client.metrics.risk === 'Crítico') && (
                          <a 
                            href={`https://wa.me/${client.phone.replace(/\D/g, '')}?text=Olá ${client.name}, sentimos sua falta! Que tal agendar um horário com desconto especial?`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white transition-colors"
                            title="Enviar Mensagem WhatsApp"
                          >
                            <MessageCircle size={16} />
                          </a>
                        )}
                        <button 
                          onClick={() => handleOpenForm(client)}
                          className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => { setClientToDelete(client); setIsDeleteModalOpen(true); }}
                          className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Excluir Cliente"
        message={`Tem certeza que deseja excluir ${clientToDelete?.name}? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        isDestructive
      />

      {/* Modal Form */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={(e) => e.target === e.currentTarget && setIsFormOpen(false)}>
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 w-full max-w-lg shadow-2xl relative animate-scale-up">
            <button onClick={() => setIsFormOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white">
              <X size={20} />
            </button>
            
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              {editingClient ? <Edit2 size={20} className="text-orange-500"/> : <Plus size={20} className="text-green-500"/>}
              {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input 
                    required
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:border-orange-500 focus:outline-none"
                    placeholder="Ex: João Silva"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Telefone (WhatsApp)</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                      required
                      type="tel" 
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:border-orange-500 focus:outline-none"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Email (Opcional)</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                      type="email" 
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:border-orange-500 focus:outline-none"
                      placeholder="joao@email.com"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Observações</label>
                <textarea 
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-orange-500 focus:outline-none min-h-[100px]"
                  placeholder="Preferências, alergias, etc..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="flex-1 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20} />}
                  {editingClient ? 'Salvar Alterações' : 'Cadastrar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const FilterButton: React.FC<{ active: boolean, onClick: () => void, label: string, count?: number, color?: 'red' | 'yellow' | 'green' }> = ({ active, onClick, label, count, color }) => {
  const getColorClasses = () => {
    if (!active) return 'border-slate-700 text-slate-400 hover:bg-slate-700/50';
    if (color === 'red') return 'bg-red-500/10 border-red-500/50 text-red-400';
    if (color === 'yellow') return 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400';
    if (color === 'green') return 'bg-green-500/10 border-green-500/50 text-green-400';
    return 'bg-slate-700 border-slate-600 text-white';
  };

  const dotColors = {
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500'
  };

  return (
    <button 
      onClick={onClick}
      className={`px-4 py-2 rounded-lg border text-sm whitespace-nowrap flex items-center gap-2 transition-all ${getColorClasses()}`}
    >
      {color && <div className={`w-2 h-2 rounded-full ${dotColors[color]}`}></div>}
      {label}
      {count !== undefined && (
        <span className={`text-xs px-1.5 py-0.5 rounded ${active ? 'bg-black/20' : 'bg-slate-800'} opacity-70`}>
          {count}
        </span>
      )}
    </button>
  );
};
