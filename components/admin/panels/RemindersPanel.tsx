import React, { useState, useMemo, useEffect } from 'react';
import { useShop } from '../../../store';
import { supabase } from '../../../supabaseClient';
import { MessageSquare, Plus, Save, Trash2, Bell, Clock, CheckCircle, RefreshCw, Eye, Copy, Info, Sparkles, Users, UserCheck, Tags, Smile, Smartphone, Loader2, UserMinus, History, AlertCircle } from 'lucide-react';
import { MessageTemplate, MessageCategory } from '../../../types';
import { motion, AnimatePresence } from 'framer-motion';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { useToast } from '../../ui/ToastContext';

export const RemindersPanel: React.FC<{ initialTab?: string }> = ({ initialTab = 'clients' }) => {
    const {
        messageTemplates, addMessageTemplate, updateMessageTemplate, removeMessageTemplate,
        messageCategories, addMessageCategory, removeMessageCategory,
        automationTriggers, addAutomationTrigger, updateAutomationTrigger, removeAutomationTrigger,
        settings, professionals, services, shop, botPausedCount, session,
        getWhatsAppQRCode, getWhatsAppStatus, disconnectWhatsApp
    } = useShop();
    const { showToast } = useToast();

    const [activeTab, setActiveTab] = useState<any>(initialTab);

    useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Partial<MessageTemplate> | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    
    // Trigger Modal State
    const [isTriggerModalOpen, setIsTriggerModalOpen] = useState(false);
    const [editingTrigger, setEditingTrigger] = useState<any>(null);

    // WhatsApp State
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [wsLoading, setWsLoading] = useState(false);
    const [wsStatus, setWsStatus] = useState<'connected' | 'disconnected' | 'loading'>('loading');
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

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
                triggerId: editingTemplate.triggerId || '',
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

    const handleTriggerSave = async () => {
        if (!editingTrigger?.name) return;
        
        if (editingTrigger.id) {
            await updateAutomationTrigger(editingTrigger.id, editingTrigger);
        } else {
            await addAutomationTrigger({
                name: editingTrigger.name,
                value: editingTrigger.value || 1,
                unit: editingTrigger.unit || 'hours',
                period: editingTrigger.period || 'before',
                active: true
            });
        }
        setIsTriggerModalOpen(false);
        setEditingTrigger(null);
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

    const getTriggerName = (triggerId?: string) => {
        if (!triggerId) return 'Personalizado';
        const trigger = automationTriggers.find(t => t.id === triggerId);
        return trigger ? trigger.name : 'Personalizado';
    };

    const [testPhone, setTestPhone] = useState('');
    const [isTesting, setIsTesting] = useState(false);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);

    const [textGenCount, setTextGenCount] = useState(0);

    const handleGenerateAI = async () => {
        if (!editingTemplate?.triggerId) return;
        if (textGenCount >= 2) {
            showToast('Limite máximo de 2 gerações por sessão atingido.', 'error');
            return;
        }
        
        const triggerName = getTriggerName(editingTemplate.triggerId);

        setIsGeneratingAI(true);
        try {
            const response = await fetch('/api/ai/generate-template', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token || ''}`
                },
                body: JSON.stringify({
                    trigger: triggerName,
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
                setTextGenCount(prev => prev + 1);
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Erro ao gerar template com IA:', error);
            showToast('Erro ao gerar mensagem com IA.', 'error');
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
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token || ''}`
                },
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
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Gestão de Automações</h1>
                    <p className="text-slate-500">Se conecte e gerencie suas mensagens automáticas do WhatsApp</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    {activeTab !== 'whatsapp' && activeTab !== 'triggers' && activeTab !== 'notifications' && (
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
                    {activeTab !== 'whatsapp' && activeTab !== 'triggers' && activeTab !== 'notifications' && (
                        <button
                            onClick={() => {
                                setEditingTemplate({ triggerId: '', active: true });
                                setIsModalOpen(true);
                            }}
                            className="bg-orange-600 text-white font-bold px-6 py-3 rounded-[2rem] flex items-center justify-center gap-2 transition-all shadow-[0px_4px_10px_rgba(234,88,12,0.2)] hover:bg-orange-700 whitespace-nowrap"
                        >
                            <Plus size={20} className="stroke-[3px]" />
                            Novo Modelo
                        </button>
                    )}
                </div>
            </div>

            {/* Sub-menus Internos */}
            <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-lg w-fit">
                <button
                    onClick={() => setActiveTab('clients')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-bold transition-all ${activeTab === 'clients'
                            ? 'bg-white text-orange-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Users size={18} />
                    Clientes
                </button>
                <button
                    onClick={() => setActiveTab('team')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-bold transition-all ${activeTab === 'team'
                            ? 'bg-white text-orange-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <UserCheck size={18} />
                    Equipe
                </button>
                <button
                    onClick={() => setActiveTab('triggers')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-bold transition-all ${activeTab === 'triggers'
                            ? 'bg-white text-orange-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Tags size={18} />
                    Gatilhos
                </button>
                <button
                    onClick={() => setActiveTab('whatsapp')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-bold transition-all ${activeTab === 'whatsapp'
                            ? 'bg-white text-orange-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Smartphone size={18} />
                    WhatsApp
                </button>
                <button
                    onClick={() => setActiveTab('notifications')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-bold transition-all ${activeTab === 'notifications'
                            ? 'bg-white text-orange-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Bell size={18} />
                    Preferências
                </button>
                <button
                    onClick={() => setActiveTab('logs')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-bold transition-all ${activeTab === 'logs'
                            ? 'bg-white text-orange-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <History size={18} />
                    Gestão de Mensagens
                </button>
                <button
                    onClick={() => setActiveTab('chatbot')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-bold transition-all relative ${activeTab === 'chatbot'
                            ? 'bg-white text-orange-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <MessageSquare size={18} />
                    Atendimento IA
                    {botPausedCount > 0 && (
                        <span className="flex items-center justify-center bg-red-500 text-white text-[10px] font-black rounded-full w-5 h-5 shadow-sm animate-pulse">
                            {botPausedCount}
                        </span>
                    )}
                </button>
            </div>

            {activeTab === 'whatsapp' ? (
                <div className="bg-white border border-slate-200 rounded-lg p-8 text-left shadow-sm">
                    {wsStatus === 'loading' ? (
                        <div className="flex flex-col items-center py-12">
                            <Loader2 size={48} className="text-orange-500 animate-spin mb-4" />
                            <p className="text-slate-400 font-medium">Verificando conexão...</p>
                        </div>
                    ) : wsStatus === 'connected' ? (
                        <div className="flex flex-col items-center py-12">
                            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6 border border-green-100">
                                <Smartphone size={40} className="text-green-500" />
                            </div>
                            <h4 className="text-2xl font-bold text-slate-900 mb-2">WhatsApp Conectado!</h4>
                            <p className="text-slate-500 mb-8 max-w-md mx-auto">Sua barbearia já está enviando mensagens automáticas de confirmação e lembretes.</p>
                            <button
                                onClick={handleDisconnect}
                                className="px-8 py-3 bg-red-50 text-red-600 border border-red-100 rounded-md font-bold hover:bg-red-600 hover:text-white transition-all shadow-sm"
                            >
                                Desconectar WhatsApp
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center py-12">
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
                    <h2 className="text-lg font-bold text-slate-900 mb-6">Preferências de Mensagens Automáticas</h2>
                    <div className="space-y-6 max-w-2xl">
                        {automationTriggers.map(trigger => (
                            <NotificationToggle
                                key={trigger.id}
                                title={trigger.name}
                                desc={`${trigger.period === 'immediate' ? 'Envia imediatamente' : `Envia ${trigger.value} ${trigger.unit === 'minutes' ? 'minutos' : trigger.unit === 'hours' ? 'horas' : 'dias'} ${trigger.period === 'before' ? 'antes' : 'após'} o agendamento`}.`}
                                active={trigger.active}
                                onToggle={(active) => updateAutomationTrigger(trigger.id, { active })}
                            />
                        ))}
                    </div>
                </div>
            ) : activeTab === 'triggers' ? (
                <div className="space-y-6">
                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Configuração de Gatilhos</h2>
                                <p className="text-sm text-slate-500">Defina os momentos exatos que as mensagens devem ser enviadas.</p>
                            </div>
                             <button 
                                onClick={() => {
                                    setEditingTrigger({ name: '', value: 1, unit: 'hours', period: 'before' });
                                    setIsTriggerModalOpen(true);
                                }}
                                className="bg-orange-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-600 transition-all flex items-center gap-2 shadow-sm"
                            >
                                <Plus size={18} /> Novo Gatilho
                            </button>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.1em]">
                                    <tr>
                                        <th className="px-8 py-4">Nome do Gatilho</th>
                                        <th className="px-8 py-4">Valor</th>
                                        <th className="px-8 py-4">Tempo</th>
                                        <th className="px-8 py-4">Período</th>
                                        <th className="px-8 py-4 text-center">Status</th>
                                        <th className="px-8 py-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {automationTriggers.map(trigger => (
                                        <tr key={trigger.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-8 py-5 font-bold text-slate-700">{trigger.name}</td>
                                            <td className="px-8 py-5 font-medium text-slate-600">
                                                <input 
                                                    type="number" 
                                                    value={trigger.value} 
                                                    onChange={(e) => updateAutomationTrigger(trigger.id, { value: parseInt(e.target.value) })}
                                                    className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded outline-none"
                                                />
                                            </td>
                                            <td className="px-8 py-5 font-medium text-slate-600">
                                                <select 
                                                    value={trigger.unit} 
                                                    onChange={(e) => updateAutomationTrigger(trigger.id, { unit: e.target.value as any })}
                                                    className="px-2 py-1 bg-slate-50 border border-slate-200 rounded outline-none"
                                                >
                                                    <option value="minutes">Minutos</option>
                                                    <option value="hours">Horas</option>
                                                    <option value="days">Dias</option>
                                                </select>
                                            </td>
                                            <td className="px-8 py-5">
                                                <select 
                                                    value={trigger.period} 
                                                    onChange={(e) => updateAutomationTrigger(trigger.id, { period: e.target.value as any })}
                                                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition-all outline-none ${
                                                        trigger.period === 'immediate' ? 'bg-blue-50 text-blue-600' :
                                                        trigger.period === 'before' ? 'bg-orange-50 text-orange-600' :
                                                        'bg-green-50 text-green-600'
                                                    }`}
                                                >
                                                    <option value="immediate">Imediato</option>
                                                    <option value="before">Antes</option>
                                                    <option value="after">Após</option>
                                                </select>
                                            </td>
                                            <td className="px-8 py-5 text-center">
                                                <button 
                                                    onClick={() => updateAutomationTrigger(trigger.id, { active: !trigger.active })}
                                                    className={`w-10 h-5 rounded-full relative transition-all ${trigger.active ? 'bg-green-500' : 'bg-slate-200'}`}
                                                >
                                                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${trigger.active ? 'left-5.5' : 'left-0.5'}`} />
                                                </button>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <button 
                                                    onClick={() => removeAutomationTrigger(trigger.id)}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : activeTab === 'chatbot' ? (
                <ChatbotSessionsPanel />
            ) : activeTab === 'logs' ? (
                <MessageLogPanel />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTemplates.map((template) => (
                        <motion.div
                            key={template.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={() => { setEditingTemplate(template); setIsModalOpen(true); }}
                            className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col cursor-pointer"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-orange-50 text-orange-600 rounded-md">
                                    <MessageSquare size={24} />
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleTest(template.id); }}
                                        disabled={isTesting}
                                        className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
                                        title="Enviar Teste"
                                    >
                                        <Copy size={18} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setEditingTemplate(template); setIsModalOpen(true); }}
                                        className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-md transition-colors"
                                    >
                                        <Eye size={18} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removeMessageTemplate(template.id); }}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            <h3 className="font-bold text-slate-900 text-lg mb-1">{template.title}</h3>
                            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 mb-4">
                                <span className="px-2 py-0.5 bg-slate-100 rounded-md truncate max-w-[120px]">{getTriggerName(template.triggerId)}</span>
                                {template.category && (
                                    <span className="px-2 py-0.5 bg-orange-50 text-orange-600 rounded-md border border-orange-100 truncate max-w-[100px]">{template.category}</span>
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
                                    onClick={(e) => { e.stopPropagation(); updateMessageTemplate(template.id, { active: !template.active }); }}
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
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Gatilh Selecionado</label>
                                            <select
                                                value={editingTemplate?.triggerId || ''}
                                                onChange={(e) => setEditingTemplate(prev => ({ ...prev, triggerId: e.target.value }))}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-orange-500 outline-none transition-all font-bold text-slate-700"
                                            >
                                                <option value="">Selecione um gatilho</option>
                                                {automationTriggers.map(t => (
                                                    <option key={t.id} value={t.id}>{t.name}</option>
                                                ))}
                                            </select>
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
                                                        const textarea = textareaRef.current;
                                                        if (textarea) {
                                                            textarea.focus();
                                                            // Tenta usar execCommand para preservar o histórico de desfazer (Ctrl+Z)
                                                            const inserted = document.execCommand('insertText', false, v.value);
                                                            
                                                            // Fallback caso execCommand não funcione (embora funcione na maioria dos browsers modernos para insertText)
                                                            if (!inserted) {
                                                                const start = textarea.selectionStart;
                                                                const end = textarea.selectionEnd;
                                                                const content = editingTemplate?.content || '';
                                                                const newContent = content.substring(0, start) + v.value + content.substring(end);
                                                                setEditingTemplate(prev => ({ ...prev, content: newContent }));
                                                                
                                                                // Re-posiciona o cursor após o state update (com delay para o React renderizar)
                                                                setTimeout(() => {
                                                                    textarea.selectionStart = textarea.selectionEnd = start + v.value.length;
                                                                }, 0);
                                                            }
                                                        } else {
                                                            const content = editingTemplate?.content || '';
                                                            setEditingTemplate(prev => ({ ...prev, content: content + ' ' + v.value }));
                                                        }
                                                    }}
                                                    className="px-2 py-1 bg-slate-100 hover:bg-orange-100 hover:text-orange-700 text-slate-600 rounded-md text-xs font-bold transition-colors border border-slate-200"
                                                >
                                                    {v.label}
                                                </button>
                                            ))}
                                        </div>
                                        <textarea
                                            ref={textareaRef}
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
                                            Este modelo será disparado automaticamente seguindo as regras do gatilho <strong>{getTriggerName(editingTemplate?.triggerId || '')}</strong>.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal de Gatilho */}
            <AnimatePresence>
                {isTriggerModalOpen && (
                    <div
                        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                        onClick={(e) => e.target === e.currentTarget && setIsTriggerModalOpen(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-lg w-full max-w-md overflow-hidden shadow-2xl p-8"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-slate-900">
                                    {editingTrigger?.id ? 'Editar Gatilho' : 'Novo Gatilho'}
                                </h2>
                                <button onClick={() => setIsTriggerModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                    <Plus className="rotate-45" size={24} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Nome do Gatilho</label>
                                    <input
                                        type="text"
                                        value={editingTrigger?.name || ''}
                                        onChange={(e) => setEditingTrigger({ ...editingTrigger, name: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                        placeholder="Ex: Lembrete de Agendamento"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Valor</label>
                                        <input
                                            type="number"
                                            value={editingTrigger?.value || 0}
                                            onChange={(e) => setEditingTrigger({ ...editingTrigger, value: parseInt(e.target.value) })}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-orange-500 outline-none transition-all font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Unidade</label>
                                        <select
                                            value={editingTrigger?.unit || 'hours'}
                                            onChange={(e) => setEditingTrigger({ ...editingTrigger, unit: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-orange-500 outline-none transition-all font-bold"
                                        >
                                            <option value="minutes">Minutos</option>
                                            <option value="hours">Horas</option>
                                            <option value="days">Dias</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Período de Disparo</label>
                                    <select
                                        value={editingTrigger?.period || 'before'}
                                        onChange={(e) => setEditingTrigger({ ...editingTrigger, period: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-orange-500 outline-none transition-all font-bold"
                                    >
                                        <option value="immediate">Imediato (ao agendar)</option>
                                        <option value="before">Antes do horário</option>
                                        <option value="after">Após o horário</option>
                                    </select>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        onClick={() => setIsTriggerModalOpen(false)}
                                        className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-md font-bold hover:bg-slate-200 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleTriggerSave}
                                        className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-md font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-200"
                                    >
                                        Salvar
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

const ChatbotSessionsPanel: React.FC = () => {
    const { shop } = useShop();
    const { showToast } = useToast();
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadSessions = async () => {
        if (!shop?.id) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('whatsapp_chat_sessions')
                .select('*')
                .eq('shop_id', shop.id)
                .eq('bot_paused', true)
                .order('last_message_at', { ascending: false });
            
            if (error) throw error;
            setSessions(data || []);
        } catch (err) {
            console.error('Erro ao carregar sessões:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSessions();
    }, [shop?.id]);

    const handleReactivate = async (sessionId: string) => {
        const { error } = await supabase
            .from('whatsapp_chat_sessions')
            .update({ bot_paused: false })
            .eq('id', sessionId);

        if (error) {
            showToast('Erro ao reativar bot', 'error');
        } else {
            showToast('Chatbot reativado com sucesso!');
            setSessions(prev => prev.filter(s => s.id !== sessionId));
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center py-20 bg-white border border-slate-200 rounded-lg shadow-sm">
                <Loader2 size={40} className="text-orange-500 animate-spin mb-4" />
                <p className="text-slate-400 font-medium font-montserrat uppercase text-[10px] tracking-widest">Buscando atendimentos pendentes...</p>
            </div>
        );
    }

    return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-900 font-montserrat">Atendimentos Humanos Pendentes</h2>
                <p className="text-sm text-slate-500">Clientes que solicitaram falar com um atendente e estão com a IA pausada.</p>
            </div>

            {sessions.length === 0 ? (
                <div className="p-20 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                        <UserCheck size={32} className="text-slate-300" />
                    </div>
                    <p className="text-slate-400 font-medium">Nenhum atendimento humano pendente no momento.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.1em]">
                            <tr>
                                <th className="px-8 py-4">Cliente</th>
                                <th className="px-8 py-4">Última Mensagem</th>
                                <th className="px-8 py-4">Pausado em</th>
                                <th className="px-8 py-4 text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sessions.map(session => (
                                <tr key={session.id} className="hover:bg-slate-50/30 transition-all">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold">
                                                {session.remote_jid?.charAt(0) || 'C'}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-700">+{session.remote_jid?.split('@')[0]}</div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Sessão Ativa</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 max-w-xs">
                                        <div className="text-sm text-slate-600 truncate italic">
                                            "{session.messages?.[session.messages.length - 2]?.content || 'Mensagem não disponível'}"
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2 text-slate-600 font-medium">
                                            <Clock size={14} className="text-slate-400" />
                                            {new Date(session.last_message_at).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <button
                                            onClick={() => handleReactivate(session.id)}
                                            className="px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg font-bold text-xs transition-all border border-emerald-100 flex items-center gap-2 ml-auto shadow-sm"
                                        >
                                            <RefreshCw size={14} />
                                            REATIVAR BOT
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

const NotificationToggle: React.FC<{ title: string, desc: string, active: boolean, onToggle: (active: boolean) => void }> = ({ title, desc, active, onToggle }) => {
    return (
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
            <div className="pr-8">
                <h4 className="text-slate-900 font-bold text-sm mb-1">{title}</h4>
                <p className="text-xs text-slate-500">{desc}</p>
            </div>
            <button
                onClick={() => onToggle(!active)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${active ? 'bg-orange-500' : 'bg-slate-300'}`}
            >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${active ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
        </div>
    );
};

const MessageLogPanel: React.FC = () => {
    const { shop } = useShop();
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLogs = async () => {
        if (!shop?.id) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('automated_messages_log')
            .select('*')
            .eq('shop_id', shop.id)
            .order('sent_at', { ascending: false })
            .limit(100); // Aumentado para 100 para ter mais histórico
        
        if (!error && data) {
            // Remove duplicatas que tenham o mesmo Telefone, Tipo e Data/Hora (mesmo se IDs forem diferentes)
            const seen = new Set();
            const uniqueLogs = data.filter(item => {
                const timestamp = new Date(item.sent_at).getTime();
                // Criamos uma chave baseada em Telefone + Gatilho + Hora (arredondada para segundos)
                const key = `${item.client_phone}-${item.trigger_type}-${Math.floor(timestamp / 1000)}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
            setLogs(uniqueLogs);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchLogs();
    }, [shop?.id]);

    return (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                    <h2 className="text-lg font-bold text-slate-900">Histórico de Mensagens</h2>
                    <p className="text-sm text-slate-500">Acompanhe as mensagens automáticas enviadas pelo sistema.</p>
                </div>
                <button 
                    onClick={fetchLogs}
                    className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all"
                    title="Atualizar"
                >
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.1em]">
                        <tr>
                            <th className="px-8 py-4">Data/Hora</th>
                            <th className="px-8 py-4">Cliente</th>
                            <th className="px-8 py-4">Gatilho</th>
                            <th className="px-8 py-4">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="px-8 py-12 text-center text-slate-400">
                                    <Loader2 className="animate-spin mx-auto mb-2" />
                                    Carregando histórico...
                                </td>
                            </tr>
                        ) : logs.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-8 py-12 text-center text-slate-400">
                                    Nenhuma mensagem registrada ainda.
                                </td>
                            </tr>
                        ) : (
                            logs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-5 text-sm text-slate-600">
                                        {new Date(log.sent_at).toLocaleString('pt-BR')}
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="font-bold text-slate-700">{log.client_name}</div>
                                        <div className="text-xs text-slate-400">{log.client_phone}</div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                            {log.trigger_type}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        {log.status === 'sent' ? (
                                            <span className="flex items-center gap-1.5 text-green-600 text-xs font-bold">
                                                <CheckCircle size={14} /> Enviada
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1.5 text-red-600 text-xs font-bold">
                                                <AlertCircle size={14} /> Falhou
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
