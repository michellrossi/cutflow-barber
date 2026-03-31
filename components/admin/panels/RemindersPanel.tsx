import React, { useState, useMemo, useEffect } from 'react';
import { useShop } from '../../../store';
import { MessageSquare, Plus, Save, Trash2, Bell, Clock, CheckCircle, RefreshCw, Eye, Copy, Info, Sparkles, Users, UserCheck, Tags, Smile, Smartphone, Loader2 } from 'lucide-react';
import { MessageTemplate, MessageCategory } from '../../../types';
import { motion, AnimatePresence } from 'framer-motion';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { useToast } from '../../ui/ToastContext';

export const RemindersPanel: React.FC = () => {
    const { 
        messageTemplates, addMessageTemplate, updateMessageTemplate, removeMessageTemplate, 
        messageCategories, addMessageCategory, removeMessageCategory,
        settings, professionals, services, shop,
        getWhatsAppQRCode, getWhatsAppStatus, disconnectWhatsApp
    } = useShop();
    const { showToast } = useToast();
    
    const [activeTab, setActiveTab] = useState<'clients' | 'team' | 'triggers' | 'whatsapp' | 'notifications'>('clients');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Partial<MessageTemplate> | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    // WhatsApp State
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [wsLoading, setWsLoading] = useState(false);
    const [wsStatus, setWsStatus] = useState<'connected' | 'disconnected' | 'loading'>('loading');

    const checkStatus = async () => {
        const res = await getWhatsAppStatus();
        if (res.connected) {
            setWsStatus('connected');
            setQrCode(null);
        } else {
            setWsStatus('disconnected');
        }
    };

    useEffect(() => {
        if (activeTab === 'whatsapp') {
            checkStatus();
            const interval = setInterval(checkStatus, 10000);
            return () => clearInterval(interval);
        }
    }, [activeTab]);

    const handleConnect = async () => {
        setWsLoading(true);
        const res = await getWhatsAppQRCode();
        setWsLoading(false);
        if (res.qrcode) {
            setQrCode(res.qrcode);
        } else if (res.connected) {
            setWsStatus('connected');
        } else {
            showToast(res.error || 'Erro ao gerar QR Code', 'error');
        }
    };

    const handleDisconnect = async () => {
        setWsLoading(true);
        const res = await disconnectWhatsApp();
        setWsLoading(false);
        if (res.success) {
            setWsStatus('disconnected');
            setQrCode(null);
            showToast('WhatsApp desconectado com sucesso!');
        } else {
            showToast(res.error || 'Erro ao desconectar', 'error');
        }
    };

    const variables = [
        { label: 'Nome do Cliente', value: '[CLIENTE]' },
        { label: 'Serviço', value: '[SERVICO]' },
        { label: 'Data', value: '[DATA]' },
        { label: 'Hora', value: '[HORA]' },
        { label: 'Barbeiro', value: '[BARBEIRO]' },
        { label: 'Barbearia', value: '[BARBEARIA]' },
    ];

    const filteredTemplates = useMemo(() => {
        const target = activeTab === 'team' ? 'professional' : 'client';
        return messageTemplates.filter(t => (t.target || 'client') === target);
    }, [messageTemplates, activeTab]);

    const handleSave = async () => {
        if (!editingTemplate?.title || !editingTemplate?.content) return;

        const target = activeTab === 'team' ? 'professional' : 'client';

        if (editingTemplate.id) {
            await updateMessageTemplate(editingTemplate.id, { ...editingTemplate, target });
        } else {
            await addMessageTemplate({
                title: editingTemplate.title,
                content: editingTemplate.content,
                trigger: editingTemplate.trigger || 'custom',
                delayValue: editingTemplate.delayValue || 0,
                delayUnit: editingTemplate.delayUnit || 'minutes',
                active: editingTemplate.active ?? true,
                target,
                category: editingTemplate.category
            });
        }
        setIsModalOpen(false);
        setEditingTemplate(null);
        setShowEmojiPicker(false);
    };

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;
        await addMessageCategory(newCategoryName.trim());
        setNewCategoryName('');
    };

    const onEmojiClick = (emojiData: EmojiClickData) => {
        if (!editingTemplate) return;
        const content = editingTemplate.content || '';
        setEditingTemplate({ ...editingTemplate, content: content + emojiData.emoji });
    };

    const replaceVariables = (text: string) => {
        return text
            .replace(/\[CLIENTE\]/g, 'João Silva')
            .replace(/\[SERVICO\]/g, services[0]?.name || 'Corte de Cabelo')
            .replace(/\[DATA\]/g, new Date().toLocaleDateString('pt-BR'))
            .replace(/\[HORA\]/g, '14:30')
            .replace(/\[BARBEIRO\]/g, professionals[0]?.name || 'Carlos')
            .replace(/\[BARBEARIA\]/g, settings.name || 'Barbearia Premium');
    };

    const getTriggerLabel = (trigger: string) => {
        switch (trigger) {
            case 'immediate_confirmation': return 'Confirmação Imediata';
            case 'appointment_reminder': return 'Lembrete';
            case 'rescheduling_request': return 'Reagendamento';
            case 'post_sale': return 'Pós-venda';
            default: return 'Personalizado';
        }
    };

    const [testPhone, setTestPhone] = useState('');
    const [isTesting, setIsTesting] = useState(false);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);

    const handleGenerateAI = async () => {
        if (!editingTemplate?.trigger) return;
        
        setIsGeneratingAI(true);
        try {
            const response = await fetch('/api/ai/generate-template', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    trigger: editingTemplate.trigger,
                    shopName: settings.name || 'Nossa Barbearia',
                    tone: 'amigável e profissional'
                })
            });

            const data = await response.json();
            if (data.success) {
                setEditingTemplate(prev => ({
                    ...prev,
                    content: data.text
                }));
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Erro ao gerar template com IA:', error);
            alert('Erro ao gerar mensagem com IA. Tente novamente.');
        } finally {
            setIsGeneratingAI(false);
        }
    };

    const handleTest = async (templateId: string) => {
        if (!testPhone) {
            alert('Por favor, insira um número de telefone para teste.');
            return;
        }

        setIsTesting(true);
        try {
            const response = await fetch('/api/notify/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: testPhone, templateId })
            });
            const data = await response.json();
            alert(data.message || (data.success ? 'Teste enviado!' : 'Falha no teste.'));
        } catch (error) {
            console.error('Erro no teste:', error);
            alert('Erro ao enviar teste.');
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div className="space-y-6"> {/* Removido p-6, max-w-7xl e mx-auto para alinhar à esquerda */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8"> {/* Ajustado para items-start */}
               <div>
                   <h2 className="text-2xl font-bold text-slate-900 mb-1">Automação</h2>
                   <p className="text-[#6b7d99] text-sm font-medium">Gerencie suas mensagens automáticas do WhatsApp</p>
               </div>

                <div className="flex flex-wrap gap-3">
                    {activeTab !== 'triggers' && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-md border border-slate-200">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Testar em:</span>
                            <input 
                                type="text" 
                                placeholder="5511999999999"
                                value={testPhone}
                                onChange={(e) => setTestPhone(e.target.value)}
                                className="bg-transparent border-none outline-none text-sm font-medium text-slate-700 w-32"
                            />
                        </div>
                    )}
                    {activeTab !== 'triggers' && (
                        <button 
                            onClick={() => {
                                setEditingTemplate({ trigger: 'custom', delayUnit: 'minutes', delayValue: 0, active: true });
                                setIsModalOpen(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors font-medium shadow-lg shadow-orange-200"
                        >
                            <Plus size={18} />
                            Novo Modelo
                        </button>
                    )}
                </div>
            </div>

            {/* Sub-menus Internos */}
            <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-lg w-fit">
                <button
                    onClick={() => setActiveTab('clients')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-bold transition-all ${
                        activeTab === 'clients' 
                        ? 'bg-white text-orange-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <Users size={18} />
                    Clientes
                </button>
                <button
                    onClick={() => setActiveTab('team')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-bold transition-all ${
                        activeTab === 'team' 
                        ? 'bg-white text-orange-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <UserCheck size={18} />
                    Equipe
                </button>
                <button
                    onClick={() => setActiveTab('triggers')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-bold transition-all ${
                        activeTab === 'triggers' 
                        ? 'bg-white text-orange-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <Tags size={18} />
                    Gatilhos
                </button>
                <button
                    onClick={() => setActiveTab('whatsapp')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-bold transition-all ${
                        activeTab === 'whatsapp' 
                        ? 'bg-white text-orange-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <Smartphone size={18} />
                    WhatsApp
                </button>
                <button
                    onClick={() => setActiveTab('notifications')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-bold transition-all ${
                        activeTab === 'notifications' 
                        ? 'bg-white text-orange-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <Bell size={18} />
                    Preferências
                </button>
            </div>

            {activeTab === 'whatsapp' && (
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-left shadow-sm"> {/* Mudado de text-center para text-left */}
            {wsStatus === 'connected' ? (
                <div className="flex flex-col items-start py-6"> {/* Mudado de items-center para items-start */}
                    <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6 border border-green-100">
                        <Smartphone size={40} className="text-green-500" />
                    </div>
                    <h4 className="text-2xl font-bold text-slate-900 mb-2">WhatsApp Conectado!</h4>
                    <p className="text-slate-500 mb-8 max-w-md">Sua barbearia já está enviando mensagens automáticas.</p>
                    {/* Botão de desconectar */}
                </div>
            ) : (
                <div className="flex flex-col items-start py-6"> {/* Mudado de items-center para items-start */}
                            {qrCode ? (
                                <div className="space-y-6">
                                    <div className="bg-white p-4 rounded-xl inline-block shadow-2xl border border-slate-100">
                                        <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64" />
                                    </div>
                                    <div className="max-w-xs mx-auto">
                                        <p className="text-slate-900 font-bold mb-2">Escaneie o QR Code</p>
                                        <p className="text-slate-500 text-sm">Abra o WhatsApp no seu celular, vá em Aparelhos Conectados e escaneie o código acima.</p>
                                    </div>
                                    <button 
                                        onClick={() => setQrCode(null)}
                                        className="text-slate-400 hover:text-slate-600 text-sm font-medium underline"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
                                        <MessageSquare size={40} className="text-slate-400" />
                                    </div>
                                    <h4 className="text-2xl font-bold text-slate-900 mb-2">Conectar WhatsApp</h4>
                                    <p className="text-slate-500 mb-8 max-w-md mx-auto">Habilite o envio de mensagens automáticas de confirmação e lembretes para seus clientes.</p>
                                    <button 
                                        onClick={handleConnect}
                                        disabled={wsLoading}
                                        className="px-12 py-4 bg-green-600 hover:bg-green-500 text-white rounded-md font-bold shadow-lg shadow-green-100 transition-all flex items-center gap-2"
                                    >
                                        {wsLoading && <Loader2 size={20} className="animate-spin" />}
                                        Gerar QR Code de Conexão
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            ) : activeTab === 'notifications' ? (
                <div className="bg-white border border-slate-200 rounded-lg p-8 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-900 mb-6">Preferências de Notificação</h2>
                    <div className="space-y-6 max-w-2xl">
                        <NotificationToggle 
                            title="Confirmação de Agendamento" 
                            desc="Envia uma mensagem assim que o cliente realiza o agendamento." 
                            active={true}
                        />
                        <NotificationToggle 
                            title="Lembrete de 24 horas" 
                            desc="Envia um lembrete automático um dia antes do horário marcado." 
                            active={true}
                        />
                        <NotificationToggle 
                            title="Lembrete de 1 hora" 
                            desc="Envia um lembrete final uma hora antes do atendimento." 
                            active={true}
                        />
                        <NotificationToggle 
                            title="Solicitação de Avaliação" 
                            desc="Envia uma mensagem de agradecimento e link para avaliação após o serviço." 
                            active={false}
                        />
                    </div>
                </div>
            ) : activeTab === 'triggers' ? (
                <div className="space-y-6">
                    <div className="bg-white rounded-lg border border-slate-200 p-8 shadow-sm">
                        <h2 className="text-lg font-bold text-slate-900 mb-6">Gerenciar Gatilhos</h2>
                        <div className="flex gap-4 mb-8">
                            <input 
                                type="text"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                placeholder="Nome do novo gatilho..."
                                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                            />
                            <button 
                                onClick={handleAddCategory}
                                className="px-6 py-3 bg-orange-500 text-white rounded-md font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-200 flex items-center gap-2"
                            >
                                <Plus size={20} />
                                Adicionar
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {messageCategories.map((category) => (
                                <div 
                                    key={category.id}
                                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100 group"
                                >
                                    <span className="font-bold text-slate-700">{category.name}</span>
                                    <button 
                                        onClick={() => removeMessageCategory(category.id)}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTemplates.map((template) => (
                        <motion.div 
                            key={template.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-orange-50 text-orange-600 rounded-md">
                                    <MessageSquare size={24} />
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => handleTest(template.id)}
                                        disabled={isTesting}
                                        className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
                                        title="Enviar Teste"
                                    >
                                        <Copy size={18} />
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setEditingTemplate(template);
                                            setIsModalOpen(true);
                                        }}
                                        className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-md transition-colors"
                                    >
                                        <Eye size={18} />
                                    </button>
                                    <button 
                                        onClick={() => removeMessageTemplate(template.id)}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            <h3 className="font-bold text-slate-900 text-lg mb-1">{template.title}</h3>
                            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 mb-4">
                                <span className="px-2 py-0.5 bg-slate-100 rounded-md">{getTriggerLabel(template.trigger)}</span>
                                {template.category && (
                                    <span className="px-2 py-0.5 bg-orange-50 text-orange-600 rounded-md border border-orange-100">{template.category}</span>
                                )}
                                {template.delayValue > 0 && (
                                    <span className="flex items-center gap-1">
                                        <Clock size={12} />
                                        {template.delayValue} {template.delayUnit === 'minutes' ? 'min' : template.delayUnit === 'hours' ? 'h' : 'd'}
                                    </span>
                                )}
                            </div>

                            <div className="bg-slate-50 rounded-md p-4 text-sm text-slate-600 line-clamp-4 flex-grow mb-4 italic">
                                "{template.content}"
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                <span className={`text-xs font-bold px-2 py-1 rounded-md ${template.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {template.active ? 'Ativo' : 'Inativo'}
                                </span>
                                <button 
                                    onClick={() => updateMessageTemplate(template.id, { active: !template.active })}
                                    className="text-xs font-medium text-orange-600 hover:underline"
                                >
                                    {template.active ? 'Desativar' : 'Ativar'}
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Modal de Edição */}
            <AnimatePresence>
                {isModalOpen && (
                    <div 
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                        onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}
                    >
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col md:flex-row"
                        >
                            {/* Editor */}
                            <div className="flex-1 p-8 overflow-y-auto border-r border-slate-100">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold text-slate-900">
                                        {editingTemplate?.id ? 'Editar Modelo' : 'Novo Modelo'}
                                    </h2>
                                    <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                        <Plus className="rotate-45" size={24} />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Título do Modelo</label>
                                            <input 
                                                type="text"
                                                value={editingTemplate?.title || ''}
                                                onChange={(e) => setEditingTemplate(prev => ({ ...prev, title: e.target.value }))}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                                placeholder="Ex: Lembrete 2h antes"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Gatilho</label>
                                            <select 
                                                value={editingTemplate?.trigger || 'custom'}
                                                onChange={(e) => setEditingTemplate(prev => ({ ...prev, trigger: e.target.value as any }))}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                            >
                                                <option value="immediate_confirmation">Confirmação Imediata</option>
                                                <option value="appointment_reminder">Lembrete de Agendamento</option>
                                                <option value="rescheduling_request">Solicitação Reagendamento</option>
                                                <option value="post_sale">Pós-venda e Avaliação</option>
                                                <option value="custom">Personalizado</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Tempo de Envio</label>
                                            <div className="flex gap-2">
                                                <input 
                                                    type="number"
                                                    value={editingTemplate?.delayValue || 0}
                                                    onChange={(e) => setEditingTemplate(prev => ({ ...prev, delayValue: parseInt(e.target.value) }))}
                                                    className="w-20 px-4 py-3 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                                />
                                                <select 
                                                    value={editingTemplate?.delayUnit || 'minutes'}
                                                    onChange={(e) => setEditingTemplate(prev => ({ ...prev, delayUnit: e.target.value as any }))}
                                                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                                >
                                                    <option value="minutes">Minutos</option>
                                                    <option value="hours">Horas</option>
                                                    <option value="days">Dias</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-end mb-2">
                                            <label className="block text-sm font-bold text-slate-700">Conteúdo da Mensagem</label>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                                    className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 px-2 py-1 rounded-md border border-slate-200 transition-all"
                                                >
                                                    <Smile size={12} />
                                                    EMOJIS
                                                </button>
                                                <button 
                                                    onClick={handleGenerateAI}
                                                    disabled={isGeneratingAI}
                                                    className="flex items-center gap-1.5 text-[10px] font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-2 py-1 rounded-md border border-orange-200 transition-all disabled:opacity-50"
                                                >
                                                    <Sparkles size={12} className={isGeneratingAI ? 'animate-pulse' : ''} />
                                                    {isGeneratingAI ? 'GERANDO...' : 'GERAR COM IA'}
                                                </button>
                                            </div>
                                        </div>

                                        {showEmojiPicker && (
                                            <div className="absolute z-[60] mt-2">
                                                <div className="fixed inset-0" onClick={() => setShowEmojiPicker(false)} />
                                                <div className="relative">
                                                    <EmojiPicker 
                                                        onEmojiClick={onEmojiClick}
                                                        theme={Theme.LIGHT}
                                                        width={300}
                                                        height={400}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {variables.map(v => (
                                                <button 
                                                    key={v.value}
                                                    onClick={() => {
                                                        const content = editingTemplate?.content || '';
                                                        setEditingTemplate(prev => ({ ...prev, content: content + ' ' + v.value }));
                                                    }}
                                                    className="px-2 py-1 bg-slate-100 hover:bg-orange-100 hover:text-orange-700 text-slate-600 rounded-md text-xs font-bold transition-colors border border-slate-200"
                                                >
                                                    {v.value}
                                                </button>
                                            ))}
                                        </div>
                                        <textarea 
                                            value={editingTemplate?.content || ''}
                                            onChange={(e) => setEditingTemplate(prev => ({ ...prev, content: e.target.value }))}
                                            rows={6}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-orange-500 outline-none transition-all resize-none"
                                            placeholder="Digite sua mensagem aqui..."
                                        />
                                        <div className="flex items-center gap-2 mt-2 text-slate-400 text-xs">
                                            <Info size={14} />
                                            <span>As variáveis entre colchetes serão substituídas automaticamente.</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 pt-4">
                                        <button 
                                            onClick={() => setIsModalOpen(false)}
                                            className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-md font-bold hover:bg-slate-200 transition-all"
                                        >
                                            Cancelar
                                        </button>
                                        <button 
                                            onClick={handleSave}
                                            className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-md font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-200 flex items-center justify-center gap-2"
                                        >
                                            <Save size={20} />
                                            Salvar Modelo
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Preview */}
                            <div className="w-full md:w-80 bg-slate-50 p-8 flex flex-col">
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <Eye size={16} />
                                    Visualização
                                </h3>

                                <div className="flex-grow flex items-center justify-center">
                                    <div className="relative w-full">
                                        {/* WhatsApp Style Bubble */}
                                        <div className="bg-white rounded-lg p-4 shadow-xl border border-slate-100 relative max-w-full">
                                            <div className="text-sm text-slate-800 whitespace-pre-wrap break-words">
                                                {editingTemplate?.content ? replaceVariables(editingTemplate.content) : 'Sua mensagem aparecerá aqui...'}
                                            </div>
                                            <div className="text-[10px] text-slate-400 text-right mt-2">
                                                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                            {/* Triangle */}
                                            <div className="absolute -left-2 top-4 w-0 h-0 border-t-[8px] border-t-transparent border-r-[12px] border-r-white border-b-[8px] border-b-transparent"></div>
                                        </div>
                                        <div className="mt-4 text-center">
                                            <p className="text-[10px] text-slate-400 font-medium">Exemplo de como o {activeTab === 'team' ? 'profissional' : 'cliente'} receberá</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-auto pt-6">
                                    <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
                                        <div className="flex items-center gap-2 text-orange-700 font-bold text-xs mb-1">
                                            <Bell size={14} />
                                            Configuração Ativa
                                        </div>
                                        <p className="text-[10px] text-orange-600 leading-relaxed">
                                            Este modelo será disparado {editingTemplate?.delayValue || 0} {editingTemplate?.delayUnit === 'minutes' ? 'minutos' : editingTemplate?.delayUnit === 'hours' ? 'horas' : 'dias'} após o gatilho ser ativado.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

const NotificationToggle: React.FC<{ title: string, desc: string, active: boolean }> = ({ title, desc, active }) => {
    const [isEnabled, setIsEnabled] = useState(active);
    return (
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
            <div className="pr-8">
                <h4 className="text-slate-900 font-bold text-sm mb-1">{title}</h4>
                <p className="text-xs text-slate-500">{desc}</p>
            </div>
            <button 
                onClick={() => setIsEnabled(!isEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isEnabled ? 'bg-orange-500' : 'bg-slate-300'}`}
            >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
        </div>
    );
};
