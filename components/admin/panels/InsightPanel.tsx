
import React, { useState, useRef, useEffect } from 'react';
import { useShop } from '../../../store';
import { Send, Bot, User, Loader2, Sparkles, TrendingUp, Users, Scissors, DollarSign } from 'lucide-react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export const InsightPanel: React.FC = () => {
    const { appointments, professionals, clients, services, settings, shop } = useShop();
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: `Olá! Sou seu assistente de inteligência de negócios. Posso analisar os dados da sua barbearia (${settings.name}) e te dar insights sobre performance, finanças e clientes. O que gostaria de saber hoje?` }
    ]);
    const [input] = useState('Por favor, faça uma análise gerencial e estratégica da minha barbearia com base nos meus dados reais. Destaque pontos fortes, pontos de atenção e sugira ações práticas (em no máximo 3 tópicos curtos). Nunca inicie com "Claro", vá direto ao ponto.');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleGenerateInsight = async () => {
        if (isLoading) return;

        setMessages(prev => [...prev, { role: 'user', content: "Gerar Insights Estratégicos" }]);
        setIsLoading(true);

        try {
            // Prepara os dados para o contexto da IA
            const contextData = {
                shopName: settings.name,
                totalAppointments: appointments.length,
                totalClients: clients.length,
                totalProfessionals: professionals.length,
                totalServices: services.length,
                last15Days: appointments.filter(a => {
                    const date = new Date(a.date);
                    const now = new Date();
                    const diff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
                    return diff <= 15;
                }).length,
                last30Days: appointments.filter(a => {
                    const date = new Date(a.date);
                    const now = new Date();
                    const diff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
                    return diff <= 30;
                }).length,
                barberRanking: professionals.map(p => ({
                    name: p.name,
                    appointments: appointments.filter(a => a.professionalId === p.id).length
                })).sort((a, b) => b.appointments - a.appointments),
                revenue: appointments.filter(a => a.status === 'completed').reduce((acc, curr) => acc + curr.totalValue, 0),
                appointmentsByStatus: {
                    completed: appointments.filter(a => a.status === 'completed').length,
                    cancelled: appointments.filter(a => a.status === 'cancelled').length,
                    noshow: appointments.filter(a => a.status === 'noshow').length,
                    scheduled: appointments.filter(a => a.status === 'scheduled' || a.status === 'confirmed').length,
                }
            };

            const response = await fetch('/api/admin/insights', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: userMessage,
                    context: contextData,
                    history: messages.slice(-6),
                    shopId: shop?.id
                })
            });

            const data = await response.json();
            if (data.success) {
                setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: "Desculpe, tive um problema ao processar sua solicitação. Tente novamente em instantes." }]);
            }
        } catch (error) {
            console.error("Erro ao buscar insights:", error);
            setMessages(prev => [...prev, { role: 'assistant', content: "Erro de conexão com o servidor de inteligência." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-12rem)] bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
            {/* Header com Stats Rápidos */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-2 text-orange-600">
                    <Sparkles size={20} />
                    <span className="font-bold">Business Intelligence AI</span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 md:pb-0">
                    <StatBadge icon={<CalendarCheck size={14}/>} label="Cortes (15d)" value={appointments.filter(a => {
                        const date = new Date(a.date);
                        const now = new Date();
                        const diff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
                        return diff <= 15;
                    }).length} />
                    <StatBadge icon={<DollarSign size={14}/>} label="Receita Total" value={`R$ ${appointments.filter(a => a.status === 'completed').reduce((acc, curr) => acc + curr.totalValue, 0).toFixed(0)}`} />
                    <StatBadge icon={<Users size={14}/>} label="Clientes" value={clients.length} />
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-white">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                        <div className={`max-w-[85%] md:max-w-[70%] flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-orange-500' : 'bg-slate-100 border border-slate-200'}`}>
                                {msg.role === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} className="text-orange-600" />}
                            </div>
                            <div className={`p-4 rounded-lg text-sm leading-relaxed ${msg.role === 'user' ? 'bg-orange-500 text-white rounded-tr-none' : 'bg-slate-50 text-slate-700 border border-slate-200 rounded-tl-none shadow-sm'}`}>
                                {msg.content.split('\n').map((line, j) => (
                                    <p key={j} className={line.trim() === '' ? 'h-2' : 'mb-1'}>{line}</p>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start animate-pulse">
                        <div className="flex gap-3 items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <Loader2 size={16} className="animate-spin text-orange-600" />
                            <span className="text-xs text-slate-500">Analisando dados da barbearia...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col items-center justify-center">
                <button
                    onClick={handleGenerateInsight}
                    disabled={isLoading}
                    className="w-full md:w-auto px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:bg-orange-600"
                >
                    {isLoading ? <Loader2 size={24} className="animate-spin" /> : <TrendingUp size={24} />}
                    {isLoading ? 'Analisando dados...' : 'Gerar Novo Insight Estratégico'}
                </button>
                <p className="text-xs text-slate-400 mt-3 text-center max-w-lg">
                    Com apenas um clique, a inteligência artificial cruzará todos os seus dados de agendamentos, clientes e finanças para entregar orientações automáticas e acionáveis.
                </p>
            </div>
        </div>
    );
};

const StatBadge: React.FC<{ icon: React.ReactNode, label: string, value: string | number }> = ({ icon, label, value }) => (
    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs shadow-sm">
        <span className="text-slate-400">{icon}</span>
        <span className="text-slate-500">{label}:</span>
        <span className="text-slate-900 font-bold">{value}</span>
    </div>
);

const CalendarCheck: React.FC<{size?: number}> = ({size = 16}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><path d="M16 2v4"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/><path d="M8 2v4"/></svg>
);
