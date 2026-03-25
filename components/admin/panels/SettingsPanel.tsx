import React, { useState, useRef, useEffect } from 'react';
import { useShop } from '../../../store';
import { supabase } from '../../../supabaseClient';
import { Upload, Edit2, Loader2, Store, User, Clock, MessageSquare, Bell, CreditCard, Shield, Smartphone, Globe, CheckCircle2 } from 'lucide-react';
import { useToast } from '../../ui/ToastContext';

type SettingsTab = 'profile' | 'account' | 'hours' | 'automation' | 'notifications' | 'billing' | 'security' | 'integrations' | 'booking_page';

export const SettingsPanel: React.FC = () => {
    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

    return (
        <div className="flex flex-col md:flex-row gap-8 h-full">
            {/* Settings Sidebar */}
            <div className="w-full md:w-64 shrink-0 space-y-1">
                <SettingsTabItem 
                    icon={<Store size={18} />} 
                    label="Perfil da Barbearia" 
                    active={activeTab === 'profile'} 
                    onClick={() => setActiveTab('profile')} 
                />
                <SettingsTabItem 
                    icon={<User size={18} />} 
                    label="Minha Conta" 
                    active={activeTab === 'account'} 
                    onClick={() => setActiveTab('account')} 
                />
                <SettingsTabItem 
                    icon={<Clock size={18} />} 
                    label="Horários de Funcionamento" 
                    active={activeTab === 'hours'} 
                    onClick={() => setActiveTab('hours')} 
                />
                <SettingsTabItem 
                    icon={<MessageSquare size={18} />} 
                    label="Automação de Mensagens" 
                    active={activeTab === 'automation'} 
                    onClick={() => setActiveTab('automation')} 
                />
                <SettingsTabItem 
                    icon={<Bell size={18} />} 
                    label="Notificações" 
                    active={activeTab === 'notifications'} 
                    onClick={() => setActiveTab('notifications')} 
                />
                <SettingsTabItem 
                    icon={<CreditCard size={18} />} 
                    label="Pagamentos e Assinatura" 
                    active={activeTab === 'billing'} 
                    onClick={() => setActiveTab('billing')} 
                />
                <SettingsTabItem 
                    icon={<Shield size={18} />} 
                    label="Privacidade e Segurança" 
                    active={activeTab === 'security'} 
                    onClick={() => setActiveTab('security')} 
                />
                <SettingsTabItem 
                    icon={<Smartphone size={18} />} 
                    label="Integrações" 
                    active={activeTab === 'integrations'} 
                    onClick={() => setActiveTab('integrations')} 
                />
                <SettingsTabItem 
                    icon={<Globe size={18} />} 
                    label="Página de Agendamento" 
                    active={activeTab === 'booking_page'} 
                    onClick={() => setActiveTab('booking_page')} 
                />
            </div>

            {/* Settings Content */}
            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-6 overflow-y-auto">
                {activeTab === 'profile' && <ProfileSettings />}
                {activeTab === 'automation' && <AutomationSettings />}
                {activeTab !== 'profile' && activeTab !== 'automation' && (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                        <p>Configurações em desenvolvimento.</p>
                    </div>
                )}
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
                <h3 className="text-xl font-bold text-white mb-2">Perfil da Barbearia</h3>
                <p className="text-slate-400">Personalize a identidade visual da sua barbearia.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-6">
                    {/* Logo Upload */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Logotipo</label>
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
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Nome da Barbearia</label>
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
