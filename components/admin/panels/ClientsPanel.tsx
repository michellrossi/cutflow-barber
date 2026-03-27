import React, { useState, useMemo } from 'react';
import { useShop } from '../../../store';
import { Client, Appointment } from '../../../types';
import { Search, Filter, ChevronRight, MessageCircle, Plus, Star, Edit2, Trash2, X, Save, Phone, Mail, User, Loader2, Eye, Calendar, Clock, DollarSign } from 'lucide-react';
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

  // View State
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingClient, setViewingClient] = useState<ProcessedClient | null>(null);

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

  const handleViewClient = (client: ProcessedClient) => {
    setViewingClient(client);
    setIsViewModalOpen(true);
  };

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'Baixo': return 'bg-green-100 text-green-900 border-green-400';
      case 'Médio': return 'bg-yellow-100 text-yellow-900 border-yellow-400';
      case 'Alto': return 'bg-orange-100 text-orange-900 border-orange-400';
      case 'Crítico': return 'bg-red-100 text-red-900 border-red-400';
      default: return 'bg-slate-100 text-slate-900 border-slate-400';
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
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Gestão de Clientes</h2>
          <p className="text-slate-500 text-sm">Gerencie sua base, identifique oportunidades e recupere clientes inativos.</p>
        </div>
        <button 
          onClick={() => handleOpenForm()}
          className="text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors self-start md:self-auto shadow-lg"
          style={{ backgroundColor: settings.primaryColor }}
        >
          <Plus size={18} />
          Novo Cliente
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 w-full lg:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7d99]" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome, telefone ou email..." 
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-slate-900 focus:outline-none focus:border-orange-500 transition-colors placeholder:text-[#6b7d99]"
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
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                <th className="p-4 font-bold w-1/6">Nome</th>
                <th className="p-4 font-bold w-1/6">Celular</th>
                <th className="p-4 font-bold w-1/6">Data Último Corte</th>
                <th className="p-4 font-bold w-1/6">Status</th>
                <th className="p-4 font-bold w-1/6 text-center">Frequência</th>
                <th className="p-4 font-bold w-1/6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Nenhum cliente encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="p-4 truncate">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs border border-slate-200 shrink-0">
                          {client.avatarUrl ? (
                            <img src={client.avatarUrl} alt={client.name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            client.name.substring(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="font-bold text-slate-900 truncate">{client.name}</div>
                      </div>
                    </td>
                    <td className="p-4 text-[#6b7d99] text-sm font-medium">
                      {client.phone}
                    </td>
                    <td className="p-4">
                      {client.metrics.lastCutDate ? (
                        <div>
                          <div className="text-sm font-bold text-slate-900">
                            {new Date(client.metrics.lastCutDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </div>
                          <div className="text-[10px] font-medium text-[#6b7d99]">
                            há {client.metrics.daysSinceLastCut} dias
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-[#6b7d99] italic">Nunca cortou</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${getRiskBadgeColor(client.metrics.risk)}`}>
                        {client.metrics.risk}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col items-center gap-1">
                        {renderStars(client.metrics.frequency)}
                        <span className="text-[10px] font-bold text-[#6b7d99]">{client.metrics.frequency}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <a 
                          href={`https://wa.me/${client.phone.replace(/\D/g, '')}?text=Olá ${client.name}!`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-600 hover:text-white transition-colors"
                          title="WhatsApp"
                        >
                          <MessageCircle size={14} />
                        </a>
                        <button 
                          onClick={() => handleViewClient(client)}
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors"
                          title="Visualizar Detalhes"
                        >
                          <Eye size={14} />
                        </button>
                        <button 
                          onClick={() => handleOpenForm(client)}
                          className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-800 hover:text-white transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => { setClientToDelete(client); setIsDeleteModalOpen(true); }}
                          className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={14} />
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
          <div className="bg-white p-6 rounded-xl border border-slate-200 w-full max-w-lg shadow-2xl relative animate-scale-up">
            <button onClick={() => setIsFormOpen(false)} className="absolute top-4 right-4 text-[#6b7d99] hover:text-slate-900 transition-colors">
              <X size={20} />
            </button>
            
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              {editingClient ? <Edit2 size={20} className="text-orange-500"/> : <Plus size={20} className="text-green-500"/>}
              {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7d99]" size={18} />
                  <input 
                    required
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-slate-900 focus:border-orange-500 focus:outline-none"
                    placeholder="Ex: João Silva"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Telefone (WhatsApp)</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7d99]" size={18} />
                    <input 
                      required
                      type="tel" 
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-slate-900 focus:border-orange-500 focus:outline-none"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Email (Opcional)</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7d99]" size={18} />
                    <input 
                      type="email" 
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-slate-900 focus:border-orange-500 focus:outline-none"
                      placeholder="joao@email.com"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Observações</label>
                <textarea 
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus:border-orange-500 focus:outline-none min-h-[100px]"
                  placeholder="Preferências, alergias, etc..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition-colors"
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

      {/* View Details Modal */}
      {isViewModalOpen && viewingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={(e) => e.target === e.currentTarget && setIsViewModalOpen(false)}>
          <div className="bg-white rounded-xl border border-slate-200 w-full max-w-2xl shadow-2xl relative animate-scale-up overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-xl border-2 border-slate-300">
                  {viewingClient.avatarUrl ? (
                    <img src={viewingClient.avatarUrl} alt={viewingClient.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    viewingClient.name.substring(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">{viewingClient.name}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${getRiskBadgeColor(viewingClient.metrics.risk)}`}>
                      {viewingClient.metrics.risk}
                    </span>
                    <div className="flex items-center gap-1 text-slate-600 text-sm font-medium">
                      <Phone size={14} /> {viewingClient.phone}
                    </div>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsViewModalOpen(false)} className="text-slate-400 hover:text-slate-900 p-2">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                  <div className="text-slate-500 text-xs uppercase font-bold mb-1">Total Gasto</div>
                  <div className="text-xl font-bold text-green-600 flex items-center justify-center gap-1">
                    <DollarSign size={16} />
                    {viewingClient.metrics.totalSpent.toFixed(2)}
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                  <div className="text-slate-500 text-xs uppercase font-bold mb-1">Cortes Realizados</div>
                  <div className="text-xl font-bold text-slate-900 flex items-center justify-center gap-1">
                    <Star size={16} className="text-yellow-500" />
                    {viewingClient.metrics.totalCuts}
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                  <div className="text-slate-500 text-xs uppercase font-bold mb-1">Frequência</div>
                  <div className="text-xl font-bold text-slate-900">
                    {viewingClient.metrics.frequency}
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                  <div className="text-slate-500 text-xs uppercase font-bold mb-1">Último Corte</div>
                  <div className="text-sm font-bold text-slate-900">
                    {viewingClient.metrics.lastCutDate ? new Date(viewingClient.metrics.lastCutDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'N/A'}
                  </div>
                </div>
              </div>

              {/* History Sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Past Appointments */}
                <div className="space-y-4">
                  <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Clock size={18} className="text-orange-500" />
                    Histórico de Serviços
                  </h4>
                  <div className="space-y-3">
                    {appointments
                      .filter(a => (a.clientId === viewingClient.id || (!a.clientId && a.clientPhone === viewingClient.phone)) && a.status === 'completed')
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .slice(0, 5)
                      .map(appt => (
                        <div key={appt.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between items-center">
                          <div>
                            <div className="text-sm font-bold text-slate-900">
                              {new Date(appt.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                            </div>
                            <div className="text-xs text-slate-500">
                              {appt.serviceIds.length} serviço(s)
                            </div>
                          </div>
                          <div className="text-sm font-bold text-green-600">
                            R$ {appt.totalValue.toFixed(2)}
                          </div>
                        </div>
                      ))}
                    {appointments.filter(a => (a.clientId === viewingClient.id || (!a.clientId && a.clientPhone === viewingClient.phone)) && a.status === 'completed').length === 0 && (
                      <div className="text-slate-500 text-sm italic py-4">Nenhum serviço realizado ainda.</div>
                    )}
                  </div>
                </div>

                {/* Upcoming Appointments */}
                <div className="space-y-4">
                  <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Calendar size={18} className="text-blue-500" />
                    Próximos Agendamentos
                  </h4>
                  <div className="space-y-3">
                    {appointments
                      .filter(a => (a.clientId === viewingClient.id || (!a.clientId && a.clientPhone === viewingClient.phone)) && a.status === 'scheduled')
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map(appt => (
                        <div key={appt.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between items-center">
                          <div>
                            <div className="text-sm font-bold text-slate-900">
                              {new Date(appt.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                            </div>
                            <div className="text-xs text-slate-600">
                              às {appt.time}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase">
                            Agendado
                          </span>
                        </div>
                      ))}
                    {appointments.filter(a => (a.clientId === viewingClient.id || (!a.clientId && a.clientPhone === viewingClient.phone)) && a.status === 'scheduled').length === 0 && (
                      <div className="text-slate-500 text-sm italic py-4">Nenhum agendamento futuro.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {viewingClient.notes && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h4 className="text-sm font-bold text-slate-500 uppercase mb-2">Observações</h4>
                  <p className="text-slate-700 text-sm italic">"{viewingClient.notes}"</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button 
                onClick={() => setIsViewModalOpen(false)}
                className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const FilterButton: React.FC<{ active: boolean, onClick: () => void, label: string, count?: number, color?: 'red' | 'yellow' | 'green' }> = ({ active, onClick, label, count, color }) => {
  const getColorClasses = () => {
    if (!active) return 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50';
    if (color === 'red') return 'bg-red-50 border-red-500 text-red-700';
    if (color === 'yellow') return 'bg-yellow-50 border-yellow-500 text-yellow-700';
    if (color === 'green') return 'bg-green-50 border-green-500 text-green-700';
    return 'bg-orange-500 border-orange-600 text-white';
  };

  const dotColors = {
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500'
  };

  return (
    <button 
      onClick={onClick}
      className={`px-4 py-1.5 rounded-lg border text-sm whitespace-nowrap flex items-center gap-2 transition-all shadow-sm ${getColorClasses()}`}
    >
      {color && <div className={`w-2 h-2 rounded-full ${dotColors[color]}`}></div>}
      {label}
      {count !== undefined && (
        <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${active ? 'bg-white/20' : 'bg-slate-100'} font-bold`}>
          {count}
        </span>
      )}
    </button>
  );
};
