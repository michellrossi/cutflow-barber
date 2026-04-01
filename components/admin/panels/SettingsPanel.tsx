import React, { useState, useRef, useEffect } from 'react';
import { useShop } from '../../../store';
import { supabase } from '../../../supabaseClient';
import { Upload, Edit2, Loader2, Store, User, Clock, MessageSquare, Bell, CreditCard, Shield, Smartphone, Globe, CheckCircle2, Info } from 'lucide-react';
import { useToast } from '../../ui/ToastContext';

export type SettingsTab = 'profile' | 'account' | 'hours' | 'billing' | 'security' | 'booking_page';

interface SettingsPanelProps {
    initialTab?: SettingsTab;
    onTabChange?: (tab: SettingsTab) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ initialTab, onTabChange }) => {
    const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab || 'profile');

    useEffect(() => {
        if (initialTab && initialTab !== activeTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab]);

    const handleTabChange = (tab: SettingsTab) => {
        setActiveTab(tab);
        if (onTabChange) {
            onTabChange(tab);
        }
    };

    const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
        { id: 'profile', label: 'Perfil', icon: <Store size={18} /> },
        { id: 'account', label: 'Conta', icon: <User size={18} /> },
        { id: 'hours', label: 'Horários', icon: <Clock size={18} /> },
        { id: 'billing', label: 'Assinatura', icon: <CreditCard size={18} /> },
        { id: 'security', label: 'Segurança', icon: <Shield size={18} /> },
        { id: 'booking_page', label: 'Link de Agendamento', icon: <Globe size={18} /> },
    ];

    return (
    <div className="space-y-6"> {/* REMOVIDO: max-w-4xl e mx-auto para alinhar à esquerda */}
        
        {/* Cabeçalho Padronizado */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Configurações</h2>
                <p className="text-[#6b7d99] text-sm font-medium">
                    Gerencie as informações da sua barbearia, horários e preferências do sistema.
                </p>
            </div>
        </div>

        {/* Sub-menus Estilo "Interruptor" */}
        <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-fit mb-8 overflow-x-auto no-scrollbar max-w-full">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-bold transition-all whitespace-nowrap ${
                        activeTab === tab.id 
                        ? 'bg-white text-orange-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    {tab.icon}
                    {tab.label}
                </button>
            ))}
        </div>

            {/* Settings Content */}
            <div className="bg-white border border-slate-200 rounded-lg p-8 shadow-sm">
                {activeTab === 'profile' && <ProfileSettings />}
                {activeTab === 'account' && <AccountSettings />}
                {activeTab === 'hours' && <HoursSettings />}
                {activeTab === 'billing' && <BillingSettings />}
                {activeTab === 'security' && <SecuritySettings />}
                {activeTab === 'booking_page' && <BookingPageSettings />}
            </div>
        </div>
    );
};

const SettingsTabItem: React.FC<{ icon: React.ReactNode, label: string, active: boolean, onClick: () => void }> = ({ icon, label, active, onClick }) => {
    return (
        <button 
            onClick={onClick}
            className={`flex items-center gap-3 px-4 py-3 w-full rounded-md text-sm font-medium transition-colors ${active ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'}`}
        >
            {icon}
            <span>{label}</span>
        </button>
    );
};

const AccountSettings: React.FC = () => {
    const { shop, session } = useShop();
    const { showToast } = useToast();
    const [slug, setSlug] = useState(shop?.slug || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        // Em um cenário real, aqui chamaríamos uma função para atualizar o slug da loja
        setTimeout(() => {
            setIsSaving(false);
            showToast('Configurações da conta atualizadas!');
        }, 1000);
    };

    return (
        <div className="max-w-2xl">
            <div className="mb-8">
                <h3 className="text-xl font-bold text-slate-900 mb-2">Minha Conta</h3>
                <p className="text-slate-500">Gerencie as informações básicas da sua barbearia.</p>
            </div>

            <div className="space-y-6">
                <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">E-mail do Proprietário</label>
                    <input disabled value={session?.user.email} className="w-full bg-slate-50 border border-slate-200 rounded-md p-4 text-slate-400 cursor-not-allowed" />
                </div>

                <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">URL da Barbearia (Slug)</label>
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-md p-4">
                        <span className="text-slate-500 text-sm">cutflow.com/</span>
                        <input 
                            value={slug} 
                            onChange={e => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))} 
                            className="flex-1 bg-transparent text-slate-900 focus:outline-none font-bold" 
                            placeholder="nome-da-sua-barbearia"
                        />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Este é o link que você enviará para seus clientes agendarem.</p>
                </div>

                <div className="pt-6 border-t border-slate-100">
                    <button onClick={handleSave} className="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-md font-bold transition-all flex items-center gap-2 shadow-lg shadow-orange-100" disabled={isSaving}>
                        {isSaving && <Loader2 size={18} className="animate-spin" />}
                        Salvar Alterações
                    </button>
                </div>
            </div>
        </div>
    );
};

const HoursSettings: React.FC = () => {
    const { showToast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    
    // Mock de horários (em um cenário real viria do banco)
    const [hours, setHours] = useState({
        monday: { active: true, start: '09:00', end: '19:00' },
        tuesday: { active: true, start: '09:00', end: '19:00' },
        wednesday: { active: true, start: '09:00', end: '19:00' },
        thursday: { active: true, start: '09:00', end: '19:00' },
        friday: { active: true, start: '09:00', end: '19:00' },
        saturday: { active: true, start: '08:00', end: '18:00' },
        sunday: { active: false, start: '09:00', end: '12:00' },
    });

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => {
            setIsSaving(false);
            showToast('Horários de funcionamento salvos!');
        }, 1000);
    };

    const days = [
        { id: 'monday', label: 'Segunda-feira' },
        { id: 'tuesday', label: 'Terça-feira' },
        { id: 'wednesday', label: 'Quarta-feira' },
        { id: 'thursday', label: 'Quinta-feira' },
        { id: 'friday', label: 'Sexta-feira' },
        { id: 'saturday', label: 'Sábado' },
        { id: 'sunday', label: 'Domingo' },
    ];

    return (
        <div className="max-w-3xl">
            <div className="mb-8">
                <h3 className="text-xl font-bold text-white mb-2">Horários de Funcionamento</h3>
                <p className="text-slate-400">Defina os horários em que sua barbearia está aberta para agendamentos.</p>
            </div>

            <div className="space-y-4">
                {days.map(day => (
                    <div key={day.id} className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-md">
                        <div className="flex items-center gap-4">
                            <div 
                                onClick={() => setHours({...hours, [day.id]: {...hours[day.id as keyof typeof hours], active: !hours[day.id as keyof typeof hours].active}})}
                                className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${hours[day.id as keyof typeof hours].active ? 'bg-green-600' : 'bg-slate-800'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${hours[day.id as keyof typeof hours].active ? 'left-7' : 'left-1'}`} />
                            </div>
                            <span className={`font-medium ${hours[day.id as keyof typeof hours].active ? 'text-white' : 'text-slate-500'}`}>{day.label}</span>
                        </div>

                        {hours[day.id as keyof typeof hours].active ? (
                            <div className="flex items-center gap-3">
                                <input 
                                    type="time" 
                                    value={hours[day.id as keyof typeof hours].start} 
                                    onChange={e => setHours({...hours, [day.id]: {...hours[day.id as keyof typeof hours], start: e.target.value}})}
                                    className="bg-slate-900 border border-slate-700 rounded-md p-2 text-sm text-white focus:outline-none focus:border-green-500"
                                />
                                <span className="text-slate-500">até</span>
                                <input 
                                    type="time" 
                                    value={hours[day.id as keyof typeof hours].end} 
                                    onChange={e => setHours({...hours, [day.id]: {...hours[day.id as keyof typeof hours], end: e.target.value}})}
                                    className="bg-slate-900 border border-slate-700 rounded-md p-2 text-sm text-white focus:outline-none focus:border-green-500"
                                />
                            </div>
                        ) : (
                            <span className="text-slate-600 text-sm font-bold uppercase tracking-widest italic">Fechado</span>
                        )}
                    </div>
                ))}

                <div className="pt-6 border-t border-slate-800">
                    <button onClick={handleSave} className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-md font-bold transition-all flex items-center gap-2" disabled={isSaving}>
                        {isSaving && <Loader2 size={18} className="animate-spin" />}
                        Salvar Horários
                    </button>
                </div>
            </div>
        </div>
    );
};

const NotificationSettings: React.FC = () => {
    const { showToast } = useToast();
    const [notifs, setNotifs] = useState({
        confirmation: true,
        reminder24h: true,
        reminder1h: true,
        cancellation: true,
        marketing: false
    });

    const handleSave = () => {
        showToast('Preferências de notificação salvas!');
    };

    return (
        <div className="max-w-2xl">
            <div className="mb-8">
                <h3 className="text-xl font-bold text-white mb-2">Notificações</h3>
                <p className="text-slate-400">Escolha quais mensagens automáticas você deseja enviar para seus clientes.</p>
            </div>

            <div className="space-y-6">
                <NotificationToggle 
                    title="Confirmação de Agendamento" 
                    desc="Enviada assim que o cliente realiza um agendamento." 
                    active={notifs.confirmation} 
                    onChange={() => setNotifs({...notifs, confirmation: !notifs.confirmation})} 
                />
                <NotificationToggle 
                    title="Lembrete de 24 Horas" 
                    desc="Enviado um dia antes do horário marcado." 
                    active={notifs.reminder24h} 
                    onChange={() => setNotifs({...notifs, reminder24h: !notifs.reminder24h})} 
                />
                <NotificationToggle 
                    title="Lembrete de 1 Hora" 
                    desc="Enviado uma hora antes do atendimento." 
                    active={notifs.reminder1h} 
                    onChange={() => setNotifs({...notifs, reminder1h: !notifs.reminder1h})} 
                />
                <NotificationToggle 
                    title="Aviso de Cancelamento" 
                    desc="Enviado caso o agendamento seja cancelado." 
                    active={notifs.cancellation} 
                    onChange={() => setNotifs({...notifs, cancellation: !notifs.cancellation})} 
                />

                <div className="pt-6 border-t border-slate-800">
                    <button onClick={handleSave} className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-md font-bold transition-all">
                        Salvar Preferências
                    </button>
                </div>
            </div>
        </div>
    );
};

const NotificationToggle: React.FC<{ title: string, desc: string, active: boolean, onChange: () => void }> = ({ title, desc, active, onChange }) => (
    <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-md">
        <div>
            <h4 className="text-white font-bold mb-1">{title}</h4>
            <p className="text-xs text-slate-500">{desc}</p>
        </div>
        <div 
            onClick={onChange}
            className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${active ? 'bg-green-600' : 'bg-slate-800'}`}
        >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${active ? 'left-7' : 'left-1'}`} />
        </div>
    </div>
);

const BillingSettings: React.FC = () => {
    const { trialStatus, daysRemaining } = useShop();

    return (
        <div className="max-w-2xl">
            <div className="mb-8">
                <h3 className="text-xl font-bold text-white mb-2">Pagamentos e Assinatura</h3>
                <p className="text-slate-400">Gerencie seu plano e visualize o status da sua assinatura.</p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Plano Atual</p>
                        <h4 className="text-2xl font-bold text-white">
                            {trialStatus === 'paid' ? 'Plano Profissional' : 'Período de Teste'}
                        </h4>
                    </div>
                    <div className="px-4 py-2 bg-green-500/10 text-green-500 border border-green-500/20 rounded-full text-sm font-bold">
                        {trialStatus === 'active' ? 'Ativo' : trialStatus === 'expired' ? 'Expirado' : 'Assinado'}
                    </div>
                </div>

                {trialStatus !== 'paid' && (
                    <div className="bg-slate-900 border border-slate-800 rounded-md p-6 mb-8">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center">
                                <Clock className="text-orange-500" size={24} />
                            </div>
                            <div>
                                <p className="text-white font-bold">Restam {daysRemaining} dias de teste</p>
                                <p className="text-xs text-slate-500">Aproveite todos os recursos antes de assinar.</p>
                            </div>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div 
                                className="bg-orange-500 h-full transition-all duration-1000" 
                                style={{ width: `${(daysRemaining / 7) * 100}%` }}
                            />
                        </div>
                    </div>
                )}

                <button className="w-full py-4 bg-green-600 hover:bg-green-500 text-white rounded-md font-bold shadow-lg transition-all flex items-center justify-center gap-2">
                    <CreditCard size={20} />
                    {trialStatus === 'paid' ? 'Gerenciar Assinatura' : 'Assinar Agora - R$ 49,90/mês'}
                </button>
            </div>
        </div>
    );
};

const SecuritySettings: React.FC = () => {
    const { resetPassword, session } = useShop();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);

    const handleReset = async () => {
        if (!session?.user.email) return;
        setLoading(true);
        const { success, error } = await resetPassword(session.user.email);
        setLoading(false);
        if (success) {
            showToast('E-mail de redefinição enviado!');
        } else {
            showToast(error || 'Erro ao enviar e-mail.', 'error');
        }
    };

    return (
        <div className="max-w-2xl">
            <div className="mb-8">
                <h3 className="text-xl font-bold text-white mb-2">Privacidade e Segurança</h3>
                <p className="text-slate-400">Proteja sua conta e gerencie suas credenciais de acesso.</p>
            </div>

            <div className="space-y-6">
                <div className="bg-slate-950 border border-slate-800 rounded-md p-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center">
                            <Shield className="text-blue-500" size={24} />
                        </div>
                        <div>
                            <h4 className="text-white font-bold">Redefinir Senha</h4>
                            <p className="text-xs text-slate-500">Enviaremos um link para o seu e-mail para criar uma nova senha.</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleReset}
                        disabled={loading}
                        className="w-full sm:w-auto px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-md font-bold transition-all flex items-center justify-center gap-2"
                    >
                        {loading && <Loader2 size={18} className="animate-spin" />}
                        Enviar Link de Redefinição
                    </button>
                </div>

                <div className="bg-red-500/5 border border-red-500/10 rounded-md p-6">
                    <h4 className="text-red-500 font-bold mb-2">Zona de Perigo</h4>
                    <p className="text-xs text-slate-500 mb-4">Ao excluir sua conta, todos os dados da barbearia serão removidos permanentemente.</p>
                    <button className="text-red-500 text-sm font-bold hover:underline">Excluir minha conta e dados</button>
                </div>
            </div>
        </div>
    );
};

const IntegrationsSettings: React.FC = () => {
    return (
        <div className="max-w-2xl">
            <div className="mb-8">
                <h3 className="text-xl font-bold text-white mb-2">Integrações</h3>
                <p className="text-slate-400">Conecte a CutFlow com outras ferramentas que você já utiliza.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <IntegrationCard 
                    name="Google Calendar" 
                    desc="Sincronize seus agendamentos com sua agenda do Google." 
                    connected={false}
                />
                <IntegrationCard 
                    name="Instagram Shopping" 
                    desc="Permita agendamentos diretamente pelo seu perfil do Instagram." 
                    connected={false}
                />
                <IntegrationCard 
                    name="Mercado Pago" 
                    desc="Receba pagamentos online e antecipados via PIX ou Cartão." 
                    connected={false}
                />
            </div>
        </div>
    );
};

const IntegrationCard: React.FC<{ name: string, desc: string, connected: boolean }> = ({ name, desc, connected }) => (
    <div className="p-6 bg-slate-950 border border-slate-800 rounded-lg hover:border-slate-700 transition-all group">
        <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-slate-900 rounded-md flex items-center justify-center group-hover:bg-slate-800 transition-colors">
                <Globe size={20} className="text-slate-500" />
            </div>
            {connected ? (
                <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded uppercase tracking-widest">Conectado</span>
            ) : (
                <button className="text-[10px] font-bold text-slate-400 hover:text-white uppercase tracking-widest">Conectar</button>
            )}
        </div>
        <h4 className="text-white font-bold mb-1">{name}</h4>
        <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
    </div>
);

const BookingPageSettings: React.FC = () => {
    const { shop } = useShop();
    const { showToast } = useToast();
    const bookingUrl = `${window.location.origin}/b/${shop?.slug}`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(bookingUrl);
        showToast('Link copiado para a área de transferência!');
    };

    return (
        <div className="max-w-2xl">
            <div className="mb-8">
                <h3 className="text-xl font-bold text-white mb-2">Página de Agendamento</h3>
                <p className="text-slate-400">Configure como seus clientes visualizam sua página pública.</p>
            </div>

            <div className="space-y-6">
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-8">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Seu Link de Agendamento</p>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <div className="flex-1 bg-slate-900 border border-slate-700 rounded-md p-4 text-slate-300 font-mono text-sm truncate">
                            {bookingUrl}
                        </div>
                        <button 
                            onClick={copyToClipboard}
                            className="px-6 py-4 bg-green-600 hover:bg-green-500 text-white rounded-md font-bold shadow-lg transition-all whitespace-nowrap"
                        >
                            Copiar Link
                        </button>
                    </div>
                    <div className="mt-6 flex items-center gap-2 text-slate-500 text-xs">
                        <CheckCircle2 size={14} className="text-green-500" />
                        Página otimizada para dispositivos móveis
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-6 bg-slate-950 border border-slate-800 rounded-md">
                        <h4 className="text-white font-bold mb-2">QR Code da Loja</h4>
                        <p className="text-xs text-slate-500 mb-4">Gere um QR Code para imprimir e colocar no seu balcão.</p>
                        <button className="text-green-500 text-sm font-bold hover:underline">Baixar QR Code (PNG)</button>
                    </div>
                    <div className="p-6 bg-slate-950 border border-slate-800 rounded-md">
                        <h4 className="text-white font-bold mb-2">Botão para Site</h4>
                        <p className="text-xs text-slate-500 mb-4">Obtenha o código para inserir um botão de agendamento no seu site.</p>
                        <button className="text-green-500 text-sm font-bold hover:underline">Ver Código do Botão</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ProfileSettings: React.FC = () => {
    const { settings, updateSettings } = useShop();
    const { showToast } = useToast();
    
    const [name, setName] = useState(settings.name);
    const [primary, setPrimary] = useState(settings.primaryColor);
    const [secondary, setSecondary] = useState(settings.secondaryColor);
    const [titleColor, setTitleColor] = useState(settings.titleColor || '#ffffff');
    const [textColor, setTextColor] = useState(settings.textColor || '#94a3b8');
    const [backgroundColor, setBackgroundColor] = useState(settings.backgroundColor || '#0f172a');
    const [cardBackgroundColor, setCardBackgroundColor] = useState(settings.cardBackgroundColor || '#1e293b');
    const [buttonTextColor, setButtonTextColor] = useState(settings.buttonTextColor || '#ffffff');
    const [priceColor, setPriceColor] = useState(settings.priceColor || '#f97316');
    const [accentColor, setAccentColor] = useState(settings.accentColor || '#f97316');
    const [borderColor, setBorderColor] = useState(settings.borderColor || '#334155');
    const [inputBackgroundColor, setInputBackgroundColor] = useState(settings.inputBackgroundColor || '#0f172a');
    const [inputTextColor, setInputTextColor] = useState(settings.inputTextColor || '#ffffff');
    
    const [logo, setLogo] = useState<string | null>(settings.logoUrl);
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    const [previewScreen, setPreviewScreen] = useState<'home' | 'services' | 'professional' | 'datetime' | 'confirmation'>('home');
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setIsUploading(true);
            try {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
                const filePath = `logos/${fileName}`;
                const { error: uploadError } = await supabase.storage.from('images').upload(filePath, file);
                if (uploadError) throw uploadError;
                const { data } = supabase.storage.from('images').getPublicUrl(filePath);
                setLogo(data.publicUrl);
                showToast('Logo enviada com sucesso!');
            } catch (error) {
                console.error("Erro no upload:", error);
                showToast('Erro ao fazer upload do logotipo.', 'error');
            } finally {
                setIsUploading(false);
            }
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        const { success, error } = await updateSettings({ 
            name, 
            primaryColor: primary, 
            secondaryColor: secondary, 
            titleColor,
            textColor,
            backgroundColor,
            cardBackgroundColor,
            buttonTextColor,
            priceColor,
            accentColor,
            borderColor,
            inputBackgroundColor,
            inputTextColor,
            logoUrl: logo 
        });
        setIsSaving(false);

        if (success) {
            showToast('Design atualizado com sucesso!');
        } else {
            showToast(error || 'Erro ao salvar configurações.', 'error');
        }
    };

    return (
        <div className="max-w-6xl">
            <div className="mb-8">
                <h3 className="text-xl font-bold text-white mb-2">Personalização da Agenda Digital</h3>
                <p className="text-slate-400">Personalize a identidade visual que seus clientes verão ao agendar.</p>
                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-md flex items-center gap-3 text-blue-400 text-xs">
                    <Info size={16} />
                    <span>O painel administrativo e do barbeiro possuem identidade visual fixa (INSIGHT BARBER).</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-5 space-y-8">
                    {/* Logo Upload */}
                    <div className="bg-slate-950/50 p-6 rounded-lg border border-slate-800">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Logotipo da Barbearia</label>
                        <div className="flex items-center gap-4">
                            <div onClick={() => !isUploading && fileInputRef.current?.click()} className={`w-24 h-24 bg-slate-950 rounded-lg border border-dashed border-slate-700 flex items-center justify-center cursor-pointer hover:border-orange-500 overflow-hidden relative group ${isUploading ? 'cursor-not-allowed opacity-50' : ''}`}>
                                {isUploading ? (
                                    <Loader2 size={24} className="text-orange-500 animate-spin" />
                                ) : (
                                    logo ? <img src={logo} alt="Logo" className="w-full h-full object-cover" /> : <Upload size={24} className="text-slate-500" />
                                )}
                                {!isUploading && logo && (
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <Edit2 size={16} className="text-white"/>
                                    </div>
                                )}
                            </div>
                            <input type="file" ref={fileInputRef} onChange={handleLogoUpload} className="hidden" accept="image/*" disabled={isUploading} />
                            <div>
                                <button type="button" onClick={() => !isUploading && fileInputRef.current?.click()} className="text-sm font-bold text-slate-300 hover:text-white underline mb-1" disabled={isUploading}>
                                    {isUploading ? 'Enviando...' : 'Alterar logotipo'}
                                </button>
                                <p className="text-xs text-slate-500">Recomendado: 512x512px</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-950/50 p-6 rounded-lg border border-slate-800">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Informações Básicas</label>
                        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome da Barbearia" className="w-full bg-slate-950 border border-slate-700 rounded-md p-4 text-white focus:outline-none focus:border-orange-500 font-bold" />
                    </div>

                    <div className="bg-slate-950/50 p-6 rounded-lg border border-slate-800">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Cores do Painel</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <ColorPicker label="Cor de Fundo" value={backgroundColor} onChange={setBackgroundColor} />
                            <ColorPicker label="Cor dos Cards" value={cardBackgroundColor} onChange={setCardBackgroundColor} />
                            <ColorPicker label="Cor dos Títulos" value={titleColor} onChange={setTitleColor} />
                            <ColorPicker label="Cor do Texto" value={textColor} onChange={setTextColor} />
                            <ColorPicker label="Cor de Destaque" value={accentColor} onChange={setAccentColor} />
                            <ColorPicker label="Cor das Bordas" value={borderColor} onChange={setBorderColor} />
                        </div>
                    </div>

                    <div className="bg-slate-950/50 p-6 rounded-lg border border-slate-800">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Cores de Elementos</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <ColorPicker label="Cor do Botão" value={primary} onChange={setPrimary} />
                            <ColorPicker label="Texto do Botão" value={buttonTextColor} onChange={setButtonTextColor} />
                            <ColorPicker label="Cor dos Preços" value={priceColor} onChange={setPriceColor} />
                            <ColorPicker label="Cor Secundária" value={secondary} onChange={setSecondary} />
                        </div>
                    </div>

                    <div className="bg-slate-950/50 p-6 rounded-lg border border-slate-800">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Inputs e Formulários</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <ColorPicker label="Fundo do Input" value={inputBackgroundColor} onChange={setInputBackgroundColor} />
                            <ColorPicker label="Texto do Input" value={inputTextColor} onChange={setInputTextColor} />
                        </div>
                    </div>
                    
                    <div className="pt-6">
                        <button onClick={handleSave} className="w-full px-10 py-4 rounded-md text-white font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2" style={{ backgroundColor: primary }} disabled={isUploading || isSaving}>
                            {(isUploading || isSaving) && <Loader2 size={20} className="animate-spin" />}
                            Salvar Todas as Alterações
                        </button>
                    </div>
                </div>

                {/* Live Preview Card */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="sticky top-6">
                        <div className="flex items-center justify-between mb-4">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pré-visualização em Tempo Real</label>
                            <div className="flex bg-slate-950 p-1 rounded-md border border-slate-800">
                                <button onClick={() => setPreviewScreen('home')} className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-sm transition-all ${previewScreen === 'home' ? 'bg-orange-500 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Início</button>
                                <button onClick={() => setPreviewScreen('services')} className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-sm transition-all ${previewScreen === 'services' ? 'bg-orange-500 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Serviços</button>
                                <button onClick={() => setPreviewScreen('professional')} className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-sm transition-all ${previewScreen === 'professional' ? 'bg-orange-500 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Equipe</button>
                                <button onClick={() => setPreviewScreen('datetime')} className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-sm transition-all ${previewScreen === 'datetime' ? 'bg-orange-500 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Horário</button>
                                <button onClick={() => setPreviewScreen('confirmation')} className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-sm transition-all ${previewScreen === 'confirmation' ? 'bg-orange-500 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Fim</button>
                            </div>
                        </div>

                        <div className="rounded-[2rem] p-8 border border-slate-800 shadow-2xl overflow-hidden min-h-[600px] flex flex-col relative" style={{ backgroundColor: backgroundColor }}>
                            {/* Header Preview */}
                            <div className="flex flex-col items-center text-center mb-8">
                                {logo ? (
                                    <img src={logo} alt="Preview Logo" className="w-16 h-16 rounded-lg object-cover mb-4" />
                                ) : (
                                    <div className="w-16 h-16 rounded-lg bg-slate-800/50 flex items-center justify-center mb-4 border border-white/5">
                                        <Store size={32} className="text-slate-600" />
                                    </div>
                                )}
                                <h4 className="text-2xl font-bold mb-1" style={{ color: titleColor }}>{name || 'Nome da Barbearia'}</h4>
                                <div className="h-1 w-12 rounded-full mb-4" style={{ backgroundColor: accentColor }}></div>
                            </div>

                            {/* Content Preview based on screen */}
                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                {previewScreen === 'home' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="text-center space-y-2 mb-8">
                                            <p className="text-sm" style={{ color: textColor }}>Bem-vindo à melhor experiência de barbearia da região.</p>
                                        </div>
                                        <div className="p-6 rounded-lg border" style={{ backgroundColor: cardBackgroundColor, borderColor: borderColor }}>
                                            <h5 className="font-bold mb-4" style={{ color: titleColor }}>Próximo Passo</h5>
                                            <p className="text-xs mb-6" style={{ color: textColor }}>Escolha os serviços que deseja realizar hoje.</p>
                                            <button className="w-full py-4 rounded-md font-bold shadow-lg transition-all" style={{ backgroundColor: primary, color: buttonTextColor }}>
                                                Começar Agendamento
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 rounded-lg border text-center" style={{ backgroundColor: cardBackgroundColor, borderColor: borderColor }}>
                                                <Clock size={20} className="mx-auto mb-2" style={{ color: accentColor }} />
                                                <span className="text-[10px] font-bold uppercase" style={{ color: textColor }}>Rápido</span>
                                            </div>
                                            <div className="p-4 rounded-lg border text-center" style={{ backgroundColor: cardBackgroundColor, borderColor: borderColor }}>
                                                <Shield size={20} className="mx-auto mb-2" style={{ color: accentColor }} />
                                                <span className="text-[10px] font-bold uppercase" style={{ color: textColor }}>Seguro</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {previewScreen === 'services' && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <h5 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: textColor }}>Selecione os Serviços</h5>
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="p-4 rounded-lg border flex justify-between items-center" style={{ backgroundColor: cardBackgroundColor, borderColor: i === 1 ? accentColor : borderColor }}>
                                                <div>
                                                    <h6 className="font-bold text-sm" style={{ color: titleColor }}>{i === 1 ? 'Corte de Cabelo' : i === 2 ? 'Barba Completa' : 'Combo Premium'}</h6>
                                                    <p className="text-[10px]" style={{ color: textColor }}>{i === 1 ? '30 min' : i === 2 ? '20 min' : '50 min'}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-sm" style={{ color: priceColor }}>R$ {i === 1 ? '45,00' : i === 2 ? '30,00' : '70,00'}</p>
                                                    {i === 1 && <CheckCircle2 size={16} className="ml-auto mt-1" style={{ color: accentColor }} />}
                                                </div>
                                            </div>
                                        ))}
                                        <div className="pt-4">
                                            <button className="w-full py-4 rounded-md font-bold shadow-lg" style={{ backgroundColor: primary, color: buttonTextColor }}>
                                                Continuar (1 serviço)
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {previewScreen === 'professional' && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <h5 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: textColor }}>Escolha o Profissional</h5>
                                        <div className="grid grid-cols-2 gap-4">
                                            {[1, 2, 3, 4].map(i => (
                                                <div key={i} className="p-4 rounded-lg border text-center relative" style={{ backgroundColor: cardBackgroundColor, borderColor: i === 1 ? accentColor : borderColor }}>
                                                    <div className="w-12 h-12 rounded-full bg-slate-700 mx-auto mb-3 border-2" style={{ borderColor: i === 1 ? accentColor : 'transparent' }}></div>
                                                    <h6 className="font-bold text-xs" style={{ color: titleColor }}>{i === 1 ? 'João Silva' : i === 2 ? 'Pedro Santos' : i === 3 ? 'Marcos Lima' : 'Qualquer um'}</h6>
                                                    <p className="text-[9px]" style={{ color: textColor }}>{i === 4 ? 'O primeiro disponível' : 'Barbeiro Sênior'}</p>
                                                    {i === 1 && <div className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }}></div>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {previewScreen === 'datetime' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="p-4 rounded-lg border" style={{ backgroundColor: cardBackgroundColor, borderColor: borderColor }}>
                                            <div className="flex justify-between items-center mb-4">
                                                <h6 className="font-bold text-xs" style={{ color: titleColor }}>Março 2026</h6>
                                                <div className="flex gap-2">
                                                    <div className="w-6 h-6 rounded-md flex items-center justify-center border" style={{ borderColor: borderColor, color: textColor }}>&lt;</div>
                                                    <div className="w-6 h-6 rounded-md flex items-center justify-center border" style={{ borderColor: borderColor, color: textColor }}>&gt;</div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-7 gap-1 text-center mb-2">
                                                {['D','S','T','Q','Q','S','S'].map(d => <span key={d} className="text-[8px] font-bold" style={{ color: textColor }}>{d}</span>)}
                                            </div>
                                            <div className="grid grid-cols-7 gap-1">
                                                {Array.from({length: 31}).map((_, i) => (
                                                    <div key={i} className={`aspect-square flex items-center justify-center text-[10px] rounded-md ${i + 1 === 27 ? 'font-bold' : ''}`} style={{ 
                                                        backgroundColor: i + 1 === 27 ? accentColor : 'transparent',
                                                        color: i + 1 === 27 ? buttonTextColor : (i < 10 ? textColor : titleColor),
                                                        opacity: i < 5 ? 0.3 : 1
                                                    }}>
                                                        {i + 1}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <h6 className="text-[10px] font-bold uppercase" style={{ color: textColor }}>Horários Disponíveis</h6>
                                            <div className="grid grid-cols-3 gap-2">
                                                {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'].map(t => (
                                                    <div key={t} className="py-2 rounded-md border text-center text-[10px] font-bold" style={{ 
                                                        backgroundColor: t === '10:00' ? accentColor : cardBackgroundColor,
                                                        borderColor: t === '10:00' ? accentColor : borderColor,
                                                        color: t === '10:00' ? buttonTextColor : titleColor
                                                    }}>
                                                        {t}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {previewScreen === 'confirmation' && (
                                    <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-500">
                                        <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-4" style={{ backgroundColor: `${accentColor}20` }}>
                                            <CheckCircle2 size={40} style={{ color: accentColor }} />
                                        </div>
                                        <h5 className="text-xl font-bold" style={{ color: titleColor }}>Agendamento Confirmado!</h5>
                                        <p className="text-sm" style={{ color: textColor }}>Tudo pronto para o seu atendimento.</p>
                                        
                                        <div className="p-6 rounded-lg border text-left space-y-3" style={{ backgroundColor: cardBackgroundColor, borderColor: borderColor }}>
                                            <div className="flex justify-between border-b pb-2" style={{ borderColor: `${borderColor}40` }}>
                                                <span className="text-[10px] uppercase font-bold" style={{ color: textColor }}>Data</span>
                                                <span className="text-xs font-bold" style={{ color: titleColor }}>27/03/2026 às 10:00</span>
                                            </div>
                                            <div className="flex justify-between border-b pb-2" style={{ borderColor: `${borderColor}40` }}>
                                                <span className="text-[10px] uppercase font-bold" style={{ color: textColor }}>Serviço</span>
                                                <span className="text-xs font-bold" style={{ color: titleColor }}>Corte de Cabelo</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-[10px] uppercase font-bold" style={{ color: textColor }}>Profissional</span>
                                                <span className="text-xs font-bold" style={{ color: titleColor }}>João Silva</span>
                                            </div>
                                        </div>

                                        <button className="w-full py-4 rounded-md font-bold shadow-lg" style={{ backgroundColor: primary, color: buttonTextColor }}>
                                            Voltar ao Início
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Footer Preview */}
                            <div className="mt-8 pt-6 border-t flex justify-center gap-6" style={{ borderColor: `${borderColor}40` }}>
                                <Smartphone size={18} style={{ color: textColor }} />
                                <Globe size={18} style={{ color: textColor }} />
                                <MessageSquare size={18} style={{ color: textColor }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AutomationSettings: React.FC = () => {
    const { getWhatsAppQRCode, getWhatsAppStatus, disconnectWhatsApp } = useShop();
    const { showToast } = useToast();
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'connected' | 'disconnected' | 'loading'>('loading');

    const checkStatus = async () => {
        const res = await getWhatsAppStatus();
        if (res.connected) {
            setStatus('connected');
            setQrCode(null);
        } else {
            setStatus('disconnected');
        }
    };

    useEffect(() => {
        checkStatus();
        const interval = setInterval(checkStatus, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleConnect = async () => {
        setLoading(true);
        const res = await getWhatsAppQRCode();
        setLoading(false);
        if (res.qrcode) {
            setQrCode(res.qrcode);
        } else if (res.connected) {
            setStatus('connected');
        } else {
            showToast(res.error || 'Erro ao gerar QR Code', 'error');
        }
    };

    const handleDisconnect = async () => {
        setLoading(true);
        const res = await disconnectWhatsApp();
        setLoading(false);
        if (res.success) {
            setStatus('disconnected');
            setQrCode(null);
            showToast('WhatsApp desconectado com sucesso!');
        } else {
            showToast(res.error || 'Erro ao desconectar', 'error');
        }
    };

    return (
        <div className="max-w-4xl">
            <div className="mb-8">
                <h3 className="text-xl font-bold text-white mb-2">Automação de Mensagens</h3>
                <p className="text-slate-400">Conecte seu WhatsApp para enviar confirmações e lembretes automáticos.</p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-8 text-center">
                {status === 'loading' ? (
                    <div className="flex flex-col items-center py-12">
                        <Loader2 size={48} className="text-green-500 animate-spin mb-4" />
                        <p className="text-slate-400">Verificando conexão...</p>
                    </div>
                ) : status === 'connected' ? (
                    <div className="flex flex-col items-center py-12">
                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
                            <Smartphone size={40} className="text-green-500" />
                        </div>
                        <h4 className="text-2xl font-bold text-white mb-2">WhatsApp Conectado!</h4>
                        <p className="text-slate-400 mb-8">Sua barbearia já está enviando mensagens automáticas.</p>
                        <button 
                            onClick={handleDisconnect}
                            className="px-8 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-md font-bold hover:bg-red-500 hover:text-white transition-all"
                        >
                            Desconectar WhatsApp
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center py-12">
                        {qrCode ? (
                            <div className="space-y-6">
                                <div className="bg-white p-4 rounded-lg inline-block shadow-2xl">
                                    <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64" />
                                </div>
                                <div className="max-w-xs mx-auto">
                                    <p className="text-white font-bold mb-2">Escaneie o QR Code</p>
                                    <p className="text-slate-400 text-sm">Abra o WhatsApp no seu celular, vá em Aparelhos Conectados e escaneie o código acima.</p>
                                </div>
                                <button 
                                    onClick={() => setQrCode(null)}
                                    className="text-slate-500 hover:text-white text-sm underline"
                                >
                                    Cancelar
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mb-6 border border-slate-800">
                                    <MessageSquare size={40} className="text-slate-600" />
                                </div>
                                <h4 className="text-2xl font-bold text-white mb-2">Conectar WhatsApp</h4>
                                <p className="text-slate-400 mb-8 max-w-md mx-auto">Habilite o envio de mensagens automáticas de confirmação e lembretes para seus clientes.</p>
                                <button 
                                    onClick={handleConnect}
                                    disabled={loading}
                                    className="px-12 py-4 bg-green-600 hover:bg-green-500 text-white rounded-md font-bold shadow-lg shadow-green-900/20 transition-all flex items-center gap-2"
                                >
                                    {loading && <Loader2 size={20} className="animate-spin" />}
                                    Gerar QR Code de Conexão
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const ColorPicker: React.FC<{ label: string, value: string, onChange: (val: string) => void }> = ({ label, value, onChange }) => {
    return (
        <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{label}</label>
            <div className="flex items-center gap-3 p-2 bg-slate-950 border border-slate-700 rounded-md">
                <div className="relative w-10 h-10 rounded-md overflow-hidden border border-slate-700 shrink-0">
                    <input 
                        type="color" 
                        value={value} 
                        onChange={e => onChange(e.target.value)} 
                        className="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer" 
                    />
                </div>
                <input 
                    value={value} 
                    onChange={e => onChange(e.target.value)} 
                    className="flex-1 bg-transparent text-white text-xs font-mono uppercase focus:outline-none" 
                />
            </div>
        </div>
    );
};
