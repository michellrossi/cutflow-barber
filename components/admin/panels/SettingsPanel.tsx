import React, { useState, useRef, useEffect } from 'react';
import { useShop } from '../../../store';
import { supabase } from '../../../supabaseClient';
import { Upload, Edit2, Loader2, Store, User, Clock, MessageSquare, Bell, CreditCard, Shield, Smartphone, Globe, CheckCircle2, Info, Palette } from 'lucide-react';
import { useToast } from '../../ui/ToastContext';

export const SettingsPanel: React.FC = () => {
    return (
        <div className="animate-fade-in p-6 max-w-7xl">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Configurações da Agenda</h2>
                <p className="text-[#6b7d99] text-sm font-medium">Personalize a identidade visual e as informações que seus clientes verão ao agendar.</p>
            </div>

            {/* Settings Content */}
            <div className="bg-white border-slate-200 rounded-xl space-y-12">
                <ProfileSettings />
                
                <div className="pt-12 border-t border-slate-100 pb-12">
                    <DangerZone />
                </div>
            </div>
        </div>
    );
};

const DangerZone: React.FC = () => {
    const { deleteCurrentShop, shop } = useShop();
    const { showToast } = useToast();
    const [isDeleting, setIsDeleting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [confirmText, setConfirmText] = useState('');

    const handleDelete = async () => {
        if (confirmText !== 'EXCLUIR') return;
        
        setIsDeleting(true);
        const { success, error } = await deleteCurrentShop();
        setIsDeleting(false);

        if (success) {
            showToast('Unidade excluída com sucesso!');
        } else {
            showToast(error || 'Erro ao excluir unidade.', 'error');
        }
    };

    return (
        <div className="max-w-4xl bg-red-50/30 border border-red-100 rounded-xl p-8">
            <div className="flex items-start gap-4">
                <div className="p-3 bg-red-100 rounded-lg text-red-600">
                    <Shield size={24} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-red-900 mb-2">Zona de Perigo</h3>
                    <p className="text-red-700/70 text-sm mb-6">
                        Ao excluir esta unidade, todos os agendamentos, clientes, serviços e configurações da barbearia <strong>"{shop?.name}"</strong> serão removidos permanentemente. Esta ação não pode ser desfeita.
                    </p>
                    
                    {!showConfirm ? (
                        <button 
                            onClick={() => setShowConfirm(true)}
                            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-md font-bold transition-all shadow-sm"
                        >
                            Excluir Unidade Permanentemente
                        </button>
                    ) : (
                        <div className="space-y-4 animate-fade-in">
                            <p className="text-sm font-bold text-red-900">
                                Para confirmar, digite <span className="bg-red-100 px-2 py-0.5 rounded">EXCLUIR</span> abaixo:
                            </p>
                            <div className="flex gap-4">
                                <input 
                                    type="text" 
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                                    placeholder="EXCLUIR"
                                    className="px-4 py-3 border border-red-200 rounded-md bg-white text-red-900 font-bold focus:outline-none focus:ring-2 focus:ring-red-500 w-full max-w-[200px]"
                                />
                                <button 
                                    onClick={handleDelete}
                                    disabled={confirmText !== 'EXCLUIR' || isDeleting}
                                    className={`px-8 py-3 rounded-md font-bold text-white transition-all flex items-center gap-2 ${confirmText === 'EXCLUIR' ? 'bg-red-600 hover:bg-red-700' : 'bg-red-300 cursor-not-allowed'}`}
                                >
                                    {isDeleting && <Loader2 size={18} className="animate-spin" />}
                                    Confirmar Exclusão
                                </button>
                                <button 
                                    onClick={() => { setShowConfirm(false); setConfirmText(''); }}
                                    className="px-6 py-3 text-slate-500 hover:text-slate-800 font-bold transition-all"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};




const ProfileSettings: React.FC = () => {
    const { settings, shop, updateSettings } = useShop();
    const { showToast } = useToast();
    
    const [name, setName] = useState(settings.name);
    const [slug, setSlug] = useState(shop?.slug || '');
    const [description, setDescription] = useState(settings.description || '');
    const [phone, setPhone] = useState(settings.phone || '');
    const [instagram, setInstagram] = useState(settings.instagram || '');
    const [address, setAddress] = useState(settings.address || '');
    const [paymentMethods, setPaymentMethods] = useState(settings.paymentMethods || []);
    
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

    const handleResetColors = () => {
        setPrimary('#f97316');
        setSecondary('#3b82f6');
        setTitleColor('#ffffff');
        setTextColor('#94a3b8');
        setBackgroundColor('#0f172a');
        setCardBackgroundColor('#1e293b');
        setButtonTextColor('#ffffff');
        setPriceColor('#f97316');
        setAccentColor('#f97316');
        setBorderColor('#334155');
        setInputBackgroundColor('#0f172a');
        setInputTextColor('#ffffff');
        showToast('Cores originais restauradas! Clique em Salvar para aplicar.');
    };

    const handleSave = async () => {
        setIsSaving(true);
        const { success, error } = await updateSettings({ 
            name, 
            slug,
            description,
            phone,
            instagram,
            address,
            paymentMethods,
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
                <h3 className="text-xl font-bold text-slate-900 mb-2">Personalização da Agenda Digital</h3>
                <p className="text-slate-500">Personalize a identidade visual que seus clientes verão ao agendar.</p>
                <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-md flex items-center gap-3 text-blue-600 text-xs">
                    <Info size={16} />
                    <span>O painel administrativo e do barbeiro possuem identidade visual fixa (INSIGHT BARBER).</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-5 space-y-8">
                    {/* Logo Upload */}
                    <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                        <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-4">Logotipo da Barbearia</label>
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
                                <button type="button" onClick={() => !isUploading && fileInputRef.current?.click()} className="text-sm font-bold text-slate-600 hover:text-slate-900 underline mb-1" disabled={isUploading}>
                                    {isUploading ? 'Enviando...' : 'Alterar logotipo'}
                                </button>
                                <p className="text-xs text-slate-400">Recomendado: 512x512px</p>
                            </div>
                        </div>
                    </div>



                    <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
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

                    <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Cores de Elementos</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <ColorPicker label="Cor do Botão" value={primary} onChange={setPrimary} />
                            <ColorPicker label="Texto do Botão" value={buttonTextColor} onChange={setButtonTextColor} />
                            <ColorPicker label="Cor dos Preços" value={priceColor} onChange={setPriceColor} />
                            <ColorPicker label="Cor Secundária" value={secondary} onChange={setSecondary} />
                        </div>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Inputs e Formulários</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <ColorPicker label="Fundo do Input" value={inputBackgroundColor} onChange={setInputBackgroundColor} />
                            <ColorPicker label="Texto do Input" value={inputTextColor} onChange={setInputTextColor} />
                        </div>
                    </div>
                    
                    <div className="pt-6 flex flex-col gap-3">
                        <button onClick={handleSave} className="w-full px-10 py-4 rounded-md text-white font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2" style={{ backgroundColor: primary }} disabled={isUploading || isSaving}>
                            {(isUploading || isSaving) && <Loader2 size={20} className="animate-spin" />}
                            Salvar Todas as Alterações
                        </button>
                        <button onClick={handleResetColors} className="w-full px-10 py-3 rounded-md bg-transparent border border-slate-300 text-slate-500 hover:bg-slate-50 font-bold transition-all active:scale-95">
                            Resetar para Cores Padrão
                        </button>
                    </div>
                </div>

                {/* Live Preview Card */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="sticky top-6">
                        <div className="flex items-center justify-between mb-4">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pré-visualização em Tempo Real</label>
                            <div className="flex bg-slate-100 p-1 rounded-md border border-slate-200">
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
                                            <p className="text-xs mb-4" style={{ color: textColor }}>Exemplo de campo de preenchimento:</p>
                                            <input 
                                                type="text" 
                                                placeholder="Digite algo (exemplo)" 
                                                className="w-full border rounded-md py-3 px-3 focus:outline-none mb-6 text-sm"
                                                style={{ 
                                                    backgroundColor: inputBackgroundColor, 
                                                    borderColor: borderColor, 
                                                    color: inputTextColor 
                                                }}
                                                disabled
                                            />
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
    const [wsStatus, setWsStatus] = useState<'connected' | 'disconnected' | 'loading'>('loading');

    const checkStatus = async () => {
        const res = await getWhatsAppStatus();
        if (res.connected) {
            setWsStatus('connected');
        } else {
            setWsStatus('disconnected');
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
            setWsStatus('connected');
        } else {
            showToast(res.error || 'Erro ao gerar QR Code', 'error');
        }
    };

    const handleDisconnect = async () => {
        setLoading(true);
        const res = await disconnectWhatsApp();
        setLoading(false);
        if (res.success) {
            setWsStatus('disconnected');
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
                {wsStatus === 'loading' ? (
                    <div className="flex flex-col items-center py-12">
                        <Loader2 size={48} className="text-green-500 animate-spin mb-4" />
                        <p className="text-slate-400">Verificando conexão...</p>
                    </div>
                ) : wsStatus === 'connected' ? (
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
            <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-2">{label}</label>
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
