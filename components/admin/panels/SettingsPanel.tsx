import React, { useState, useRef, useEffect } from 'react';
import { useShop } from '../../../store';
import { supabase } from '../../../supabaseClient';
import { Upload, Edit2, Loader2, Store, User, Clock, MessageSquare, Bell, CreditCard, Shield, Smartphone, Globe, CheckCircle2, Info } from 'lucide-react';
import { useToast } from '../../ui/ToastContext';

export type SettingsTab = 'profile' | 'account' | 'hours' | 'automation' | 'notifications' | 'billing' | 'security' | 'integrations' | 'booking_page';

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

    return (
        <div className="h-full">
            {/* Settings Content */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 overflow-y-auto h-full">
                {activeTab === 'profile' && <ProfileSettings />}
                {activeTab === 'account' && <AccountSettings />}
                {activeTab === 'hours' && <HoursSettings />}
                {activeTab === 'automation' && <AutomationSettings />}
                {activeTab === 'notifications' && <NotificationSettings />}
                {activeTab === 'billing' && <BillingSettings />}
                {activeTab === 'security' && <SecuritySettings />}
                {activeTab === 'integrations' && <IntegrationsSettings />}
                {activeTab === 'booking_page' && <BookingPageSettings />}
            </div>
        </div>
    );
};

const SettingsTabItem: React.FC<{ icon: React.ReactNode, label: string, active: boolean, onClick: () => void }> = ({ icon, label, active, onClick }) => {
    return (
        <button 
            onClick={onClick}
            className={`flex items-center gap-3 px-4 py-3 w-full rounded-lg text-sm font-medium transition-colors ${active ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'}`}
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
                <h3 className="text-xl font-bold text-white mb-2">Minha Conta</h3>
                <p className="text-slate-400">Gerencie as informações básicas da sua barbearia.</p>
            </div>

            <div className="space-y-6">
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">E-mail do Proprietário</label>
                    <input disabled value={session?.user.email} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-500 cursor-not-allowed" />
                </div>

                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">URL da Barbearia (Slug)</label>
                    <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-xl p-4">
                        <span className="text-slate-500 text-sm">cutflow.com/</span>
                        <input 
                            value={slug} 
                            onChange={e => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))} 
                            className="flex-1 bg-transparent text-white focus:outline-none font-bold" 
                            placeholder="nome-da-sua-barbearia"
                        />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Este é o link que você enviará para seus clientes agendarem.</p>
                </div>

                <div className="pt-6 border-t border-slate-800">
                    <button onClick={handleSave} className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-all flex items-center gap-2" disabled={isSaving}>
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
                    <div key={day.id} className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl">
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
                                    className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-green-500"
                                />
                                <span className="text-slate-500">até</span>
                                <input 
                                    type="time" 
                                    value={hours[day.id as keyof typeof hours].end} 
                                    onChange={e => setHours({...hours, [day.id]: {...hours[day.id as keyof typeof hours], end: e.target.value}})}
                                    className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-green-500"
                                />
                            </div>
                        ) : (
                            <span className="text-slate-600 text-sm font-bold uppercase tracking-widest italic">Fechado</span>
                        )}
                    </div>
                ))}

                <div className="pt-6 border-t border-slate-800">
                    <button onClick={handleSave} className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-all flex items-center gap-2" disabled={isSaving}>
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
                    <button onClick={handleSave} className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-all">
                        Salvar Preferências
                    </button>
                </div>
            </div>
        </div>
    );
};

const NotificationToggle: React.FC<{ title: string, desc: string, active: boolean, onChange: () => void }> = ({ title, desc, active, onChange }) => (
    <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl">
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

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8">
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
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
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

                <button className="w-full py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2">
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
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-6">
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
                        className="w-full sm:w-auto px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                    >
                        {loading && <Loader2 size={18} className="animate-spin" />}
                        Enviar Link de Redefinição
                    </button>
                </div>

                <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-6">
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
    <div className="p-6 bg-slate-950 border border-slate-800 rounded-2xl hover:border-slate-700 transition-all group">
        <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center group-hover:bg-slate-800 transition-colors">
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
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Seu Link de Agendamento</p>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <div className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-300 font-mono text-sm truncate">
                            {bookingUrl}
                        </div>
                        <button 
                            onClick={copyToClipboard}
                            className="px-6 py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold shadow-lg transition-all whitespace-nowrap"
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
                    <div className="p-6 bg-slate-950 border border-slate-800 rounded-xl">
                        <h4 className="text-white font-bold mb-2">QR Code da Loja</h4>
                        <p className="text-xs text-slate-500 mb-4">Gere um QR Code para imprimir e colocar no seu balcão.</p>
                        <button className="text-green-500 text-sm font-bold hover:underline">Baixar QR Code (PNG)</button>
                    </div>
                    <div className="p-6 bg-slate-950 border border-slate-800 rounded-xl">
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
    const [priceColor, setPriceColor] = useState(settings.priceColor || '#f97316');
    const [logo, setLogo] = useState<string | null>(settings.logoUrl);
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
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
            priceColor,
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
        <div className="max-w-4xl">
            <div className="mb-8">
                <h3 className="text-xl font-bold text-white mb-2">Personalização da Agenda Digital</h3>
                <p className="text-slate-400">Personalize a identidade visual que seus clientes verão ao agendar.</p>
                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center gap-3 text-blue-400 text-xs">
                    <Info size={16} />
                    <span>O painel administrativo e do barbeiro possuem identidade visual fixa (INSIGHT BARBER).</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-6">
                    {/* Logo Upload */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Logotipo da Barbearia (Página do Cliente)</label>
                        <div className="flex items-center gap-4">
                            <div onClick={() => !isUploading && fileInputRef.current?.click()} className={`w-24 h-24 bg-slate-950 rounded-2xl border border-dashed border-slate-700 flex items-center justify-center cursor-pointer hover:border-orange-500 overflow-hidden relative group ${isUploading ? 'cursor-not-allowed opacity-50' : ''}`}>
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

                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Nome da Barbearia (Página do Cliente)</label>
                        <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white focus:outline-none focus:border-orange-500 font-bold" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <ColorPicker label="Cor dos Botões" value={primary} onChange={setPrimary} />
                        <ColorPicker label="Cor de Fundo" value={backgroundColor} onChange={setBackgroundColor} />
                        <ColorPicker label="Cor dos Títulos" value={titleColor} onChange={setTitleColor} />
                        <ColorPicker label="Cor do Texto" value={textColor} onChange={setTextColor} />
                        <ColorPicker label="Cor dos Preços" value={priceColor} onChange={setPriceColor} />
                        <ColorPicker label="Cor Secundária" value={secondary} onChange={setSecondary} />
                    </div>
                    
                    <div className="pt-6 border-t border-slate-800">
                        <button onClick={handleSave} className="w-full sm:w-auto px-10 py-4 rounded-xl text-white font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2" style={{ backgroundColor: primary }} disabled={isUploading || isSaving}>
                            {(isUploading || isSaving) && <Loader2 size={20} className="animate-spin" />}
                            Salvar Alterações
                        </button>
                    </div>
                </div>

                {/* Live Preview Card */}
                <div className="space-y-6">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Pré-visualização em Tempo Real</label>
                    <div className="rounded-3xl p-8 border border-slate-700 shadow-2xl overflow-hidden" style={{ backgroundColor: backgroundColor }}>
                        <div className="flex flex-col items-center text-center mb-8">
                            {logo ? (
                                <img src={logo} alt="Preview Logo" className="w-16 h-16 rounded-2xl object-cover mb-4" />
                            ) : (
                                <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
                                    <Store size={32} className="text-slate-600" />
                                </div>
                            )}
                            <h4 className="text-2xl font-bold mb-2" style={{ color: titleColor }}>{name || 'Nome da Barbearia'}</h4>
                            <p className="text-sm max-w-xs" style={{ color: textColor }}>Sua barbearia com o melhor estilo e atendimento da região.</p>
                        </div>

                        <div className="bg-slate-800/50 rounded-2xl p-4 border border-white/5 mb-6">
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-bold" style={{ color: titleColor }}>Corte Masculino</span>
                                <span className="font-bold" style={{ color: priceColor }}>R$ 45,00</span>
                            </div>
                            <p className="text-xs" style={{ color: textColor }}>Corte degradê moderno com finalização.</p>
                        </div>

                        <button className="w-full py-4 rounded-xl text-white font-bold shadow-lg transition-all" style={{ backgroundColor: primary }}>
                            Agendar Horário
                        </button>

                        <div className="mt-6 flex justify-center gap-4">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: secondary }}>
                                <Smartphone size={14} className="text-white" />
                            </div>
                            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: secondary }}>
                                <Globe size={14} className="text-white" />
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

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 text-center">
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
                            className="px-8 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl font-bold hover:bg-red-500 hover:text-white transition-all"
                        >
                            Desconectar WhatsApp
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center py-12">
                        {qrCode ? (
                            <div className="space-y-6">
                                <div className="bg-white p-4 rounded-2xl inline-block shadow-2xl">
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
                                    className="px-12 py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold shadow-lg shadow-green-900/20 transition-all flex items-center gap-2"
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
            <div className="flex items-center gap-3 p-2 bg-slate-950 border border-slate-700 rounded-xl">
                <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-700 shrink-0">
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
