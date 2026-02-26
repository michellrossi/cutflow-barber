import React, { useState, useRef } from 'react';
import { useShop } from '../../../store';
import { supabase } from '../../../supabaseClient';
import { Upload, Edit2, Loader2, Store, User, Clock, MessageSquare, Bell, CreditCard, Shield, Smartphone, Globe } from 'lucide-react';
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
                {activeTab !== 'profile' && (
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
        const { success, error } = await updateSettings({ name, primaryColor: primary, secondaryColor: secondary, logoUrl: logo });
        setIsSaving(false);

        if (success) {
            showToast('Design atualizado com sucesso!');
        } else {
            showToast(error || 'Erro ao salvar configurações.', 'error');
        }
    };

    return (
        <div className="max-w-2xl">
            <div className="mb-8">
                <h3 className="text-xl font-bold text-white mb-2">Perfil da Barbearia</h3>
                <p className="text-slate-400">Personalize a identidade visual da sua barbearia.</p>
            </div>

            <div className="space-y-6">
                 {/* Logo Upload */}
                 <div>
                    <label className="block text-sm text-slate-400 mb-2">Logotipo</label>
                    <div className="flex items-center gap-4">
                        <div onClick={() => !isUploading && fileInputRef.current?.click()} className={`w-20 h-20 bg-slate-950 rounded-xl border border-dashed border-slate-700 flex items-center justify-center cursor-pointer hover:border-orange-500 overflow-hidden relative group ${isUploading ? 'cursor-not-allowed opacity-50' : ''}`}>
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
                             <button type="button" onClick={() => !isUploading && fileInputRef.current?.click()} className="text-sm text-slate-300 hover:text-white underline mb-1" disabled={isUploading}>
                                 {isUploading ? 'Enviando...' : 'Alterar logotipo'}
                             </button>
                             <p className="text-xs text-slate-500">Recomendado: 512x512px</p>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm text-slate-400 mb-2">Nome da Barbearia</label>
                    <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-orange-500" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                         <label className="block text-sm text-slate-400 mb-2">Cor Primária (Destaques)</label>
                         <div className="flex items-center gap-3">
                             <input type="color" value={primary} onChange={e => setPrimary(e.target.value)} className="w-12 h-12 rounded bg-transparent cursor-pointer" />
                             <input value={primary} onChange={e => setPrimary(e.target.value)} className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-3 text-white uppercase" />
                         </div>
                    </div>
                    <div>
                         <label className="block text-sm text-slate-400 mb-2">Cor Secundária (Fundo)</label>
                         <div className="flex items-center gap-3">
                             <input type="color" value={secondary} onChange={e => setSecondary(e.target.value)} className="w-12 h-12 rounded bg-transparent cursor-pointer" />
                             <input value={secondary} onChange={e => setSecondary(e.target.value)} className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-3 text-white uppercase" />
                         </div>
                    </div>
                </div>
                
                <div className="pt-6 border-t border-slate-800">
                    <button onClick={handleSave} className="px-8 py-3 rounded-lg text-white font-bold transition-transform active:scale-95 flex items-center gap-2" style={{ backgroundColor: primary }} disabled={isUploading || isSaving}>
                        {(isUploading || isSaving) && <Loader2 size={16} className="animate-spin" />}
                        Salvar Alterações
                    </button>
                </div>
            </div>
            
            <div className="mt-8 p-6 bg-slate-950 rounded-xl border border-dashed border-slate-700 text-center">
                 <h4 className="text-slate-400 mb-2">Pré-visualização do Botão</h4>
                 <button className="px-6 py-2 rounded-lg text-white font-medium" style={{ backgroundColor: primary }}>
                     Agendar Horário
                 </button>
            </div>
        </div>
    );
};
