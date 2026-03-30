import React, { useState, useMemo } from 'react';
import { useShop } from '../../../store';
import { MessageSquare, Plus, Save, Trash2, Bell, Clock, CheckCircle, RefreshCw, Eye, Copy, Info } from 'lucide-react';
import { MessageTemplate } from '../../../types';
import { motion, AnimatePresence } from 'framer-motion';

export const RemindersPanel: React.FC = () => {
    const { messageTemplates, addMessageTemplate, updateMessageTemplate, removeMessageTemplate, settings, professionals, services, shop } = useShop();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Partial<MessageTemplate> | null>(null);
    const [previewText, setPreviewText] = useState('');

    const variables = [
        { label: 'Nome do Cliente', value: '[CLIENTE]' },
        { label: 'Serviço', value: '[SERVICO]' },
        { label: 'Data', value: '[DATA]' },
        { label: 'Hora', value: '[HORA]' },
        { label: 'Barbeiro', value: '[BARBEIRO]' },
        { label: 'Barbearia', value: '[BARBEARIA]' },
    ];

    const defaultTemplates: Omit<MessageTemplate, 'id' | 'shopId'>[] = [
        {
            title: 'Confirmação Imediata',
            trigger: 'immediate_confirmation',
            content: 'Olá [CLIENTE]! Seu agendamento para [SERVICO] na [BARBEARIA] foi realizado com sucesso para o dia [DATA] às [HORA] com o profissional [BARBEIRO]. Te esperamos!',
            delayValue: 0,
            delayUnit: 'minutes',
            active: true
        },
        {
            title: 'Lembrete (24 horas)',
            trigger: 'appointment_reminder',
            content: 'Olá [CLIENTE], passando para lembrar do seu horário amanhã às [HORA] na [BARBEARIA] para o serviço [SERVICO]. Até logo!',
            delayValue: 24,
            delayUnit: 'hours',
            active: true
        },
        {
            title: 'Lembrete (1 hora)',
            trigger: 'appointment_reminder',
            content: 'Olá [CLIENTE], seu horário na [BARBEARIA] é daqui a pouco, às [HORA]! Estamos te aguardando. 💈✂️',
            delayValue: 1,
            delayUnit: 'hours',
            active: true
        },
        {
            title: 'Solicitação de Reagendamento',
            trigger: 'rescheduling_request',
            content: 'Olá [CLIENTE], notamos que você não conseguiu comparecer ao seu horário de [SERVICO]. Gostaria de escolher uma nova data para seu atendimento na [BARBEARIA]?',
            delayValue: 0,
            delayUnit: 'minutes',
            active: true
        },
        {
            title: 'Pós-venda e Avaliação',
            trigger: 'post_sale',
            content: 'Olá [CLIENTE]! O que achou do seu atendimento hoje com [BARBEIRO]? Sua opinião é muito importante para nós da [BARBEARIA]. Se puder, nos avalie no Google!',
            delayValue: 2,
            delayUnit: 'hours',
            active: true
        }
    ];

    const handleCreateDefaults = async () => {
        for (const t of defaultTemplates) {
            await addMessageTemplate(t);
        }
    };

    const handleSave = async () => {
        if (!editingTemplate?.title || !editingTemplate?.content) return;

        if (editingTemplate.id) {
            await updateMessageTemplate(editingTemplate.id, editingTemplate);
        } else {
            await addMessageTemplate({
                title: editingTemplate.title,
                content: editingTemplate.content,
                trigger: editingTemplate.trigger || 'custom',
                delayValue: editingTemplate.delayValue || 0,
                delayUnit: editingTemplate.delayUnit || 'minutes',
                active: editingTemplate.active ?? true
            });
        }
        setIsModalOpen(false);
        setEditingTemplate(null);
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
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Modelos de Lembretes</h1>
                    <p className="text-slate-500">Gerencie suas mensagens automáticas do WhatsApp</p>
                </div>
                <div className="flex gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-xl border border-slate-200">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Testar em:</span>
                        <input 
                            type="text" 
                            placeholder="5511999999999"
                            value={testPhone}
                            onChange={(e) => setTestPhone(e.target.value)}
                            className="bg-transparent border-none outline-none text-sm font-medium text-slate-700 w-32"
                        />
                    </div>
                    {messageTemplates.length === 0 && (
                        <button 
                            onClick={handleCreateDefaults}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium"
                        >
                            <RefreshCw size={18} />
                            Gerar Padrões
                        </button>
                    )}
                    <button 
                        onClick={() => {
                            setEditingTemplate({ trigger: 'custom', delayUnit: 'minutes', delayValue: 0, active: true });
                            setIsModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-medium shadow-lg shadow-orange-200"
                    >
                        <Plus size={18} />
                        Novo Modelo
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {messageTemplates.map((template) => (
                    <motion.div 
                        key={template.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                                <MessageSquare size={24} />
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => handleTest(template.id)}
                                    disabled={isTesting}
                                    className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Enviar Teste"
                                >
                                    <Copy size={18} />
                                </button>
                                <button 
                                    onClick={() => {
                                        setEditingTemplate(template);
                                        setIsModalOpen(true);
                                    }}
                                    className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                                >
                                    <Eye size={18} />
                                </button>
                                <button 
                                    onClick={() => removeMessageTemplate(template.id)}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>

                        <h3 className="font-bold text-slate-900 text-lg mb-1">{template.title}</h3>
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-4">
                            <span className="px-2 py-0.5 bg-slate-100 rounded-full">{getTriggerLabel(template.trigger)}</span>
                            {template.delayValue > 0 && (
                                <span className="flex items-center gap-1">
                                    <Clock size={12} />
                                    {template.delayValue} {template.delayUnit === 'minutes' ? 'min' : template.delayUnit === 'hours' ? 'h' : 'd'}
                                </span>
                            )}
                        </div>

                        <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600 line-clamp-4 flex-grow mb-4 italic">
                            "{template.content}"
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${template.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
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

            {/* Modal de Edição */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col md:flex-row"
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
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Título do Modelo</label>
                                        <input 
                                            type="text"
                                            value={editingTemplate?.title || ''}
                                            onChange={(e) => setEditingTemplate(prev => ({ ...prev, title: e.target.value }))}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                            placeholder="Ex: Lembrete 2h antes"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Gatilho</label>
                                            <select 
                                                value={editingTemplate?.trigger || 'custom'}
                                                onChange={(e) => setEditingTemplate(prev => ({ ...prev, trigger: e.target.value as any }))}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
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
                                                    className="w-20 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                                />
                                                <select 
                                                    value={editingTemplate?.delayUnit || 'minutes'}
                                                    onChange={(e) => setEditingTemplate(prev => ({ ...prev, delayUnit: e.target.value as any }))}
                                                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
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
                                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Variáveis Disponíveis</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {variables.map(v => (
                                                <button 
                                                    key={v.value}
                                                    onClick={() => {
                                                        const content = editingTemplate?.content || '';
                                                        setEditingTemplate(prev => ({ ...prev, content: content + ' ' + v.value }));
                                                    }}
                                                    className="px-2 py-1 bg-slate-100 hover:bg-orange-100 hover:text-orange-700 text-slate-600 rounded-lg text-xs font-bold transition-colors border border-slate-200"
                                                >
                                                    {v.value}
                                                </button>
                                            ))}
                                        </div>
                                        <textarea 
                                            value={editingTemplate?.content || ''}
                                            onChange={(e) => setEditingTemplate(prev => ({ ...prev, content: e.target.value }))}
                                            rows={6}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all resize-none"
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
                                            className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
                                        >
                                            Cancelar
                                        </button>
                                        <button 
                                            onClick={handleSave}
                                            className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-200 flex items-center justify-center gap-2"
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
                                        <div className="bg-white rounded-2xl p-4 shadow-xl border border-slate-100 relative max-w-full">
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
                                            <p className="text-[10px] text-slate-400 font-medium">Exemplo de como o cliente receberá</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-auto pt-6">
                                    <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
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
