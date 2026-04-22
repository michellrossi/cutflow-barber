import React, { useState } from 'react';
import { User, Store, Shield, Clock, Save, Link as LinkIcon, MapPin, Instagram, Mail, Phone, Lock, Facebook, MessageCircle, FileText, QrCode, Globe, Download, Copy, Check } from 'lucide-react';
import { useShop } from '../../../store';
import { supabase } from '../../../supabaseClient';
import { useToast } from '../../ui/ToastContext';

type ProfileTab = 'cadastro' | 'barbearia' | 'conta' | 'horarios';

const DAYS = [
    { key: 'monday', label: 'Segunda-feira' },
    { key: 'tuesday', label: 'Terça-feira' },
    { key: 'wednesday', label: 'Quarta-feira' },
    { key: 'thursday', label: 'Quinta-feira' },
    { key: 'friday', label: 'Sexta-feira' },
    { key: 'saturday', label: 'Sábado' },
    { key: 'sunday', label: 'Domingo' },
];

const DEFAULT_HOURS: Record<string, { active: boolean; start: string; end: string }> = {
    monday:    { active: true,  start: '09:00', end: '19:00' },
    tuesday:   { active: true,  start: '09:00', end: '19:00' },
    wednesday: { active: true,  start: '09:00', end: '19:00' },
    thursday:  { active: true,  start: '09:00', end: '20:00' },
    friday:    { active: true,  start: '09:00', end: '20:00' },
    saturday:  { active: true,  start: '08:00', end: '17:00' },
    sunday:    { active: false, start: '',       end: ''       },
};

export const ProfilePanel = () => {
    const { shop, session, settings, updateSettings } = useShop();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<ProfileTab>('cadastro');
    const [saving, setSaving] = useState(false);

    // ---- Dados da Barbearia ----
    const [barbName, setBarbName]       = useState(settings?.name || '');
    const [barbAddress, setBarbAddress] = useState(settings?.address || '');
    const [barbInstagram, setBarbInstagram] = useState(settings?.instagram || '');
    const [barbFacebook, setBarbFacebook] = useState(settings?.facebook || '');
    const [barbWhatsapp, setBarbWhatsapp] = useState(settings?.whatsapp || '');
    const [barbDescription, setBarbDescription] = useState(settings?.description || '');
    const [slug, setSlug] = useState(shop?.slug || '');
    const [slugSaving, setSlugSaving] = useState(false);

    // ---- Dados do Dono ----
    const [ownerName, setOwnerName]   = useState(session?.user?.user_metadata?.full_name || '');
    const [ownerEmail, setOwnerEmail] = useState(session?.user?.email || '');
    const [ownerPhone, setOwnerPhone] = useState(settings?.phone || '');
    const [ownerSaving, setOwnerSaving] = useState(false);

    // ---- Horários ----
    const [hours, setHours] = useState<Record<string, { active: boolean; start: string; end: string }>>(
        settings?.businessHours || DEFAULT_HOURS
    );

    const inputClass = "w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all font-medium placeholder:text-slate-400";
    const labelClass = "block text-sm font-bold text-slate-700 mb-2 uppercase tracking-tight";
    const btnClass   = "bg-orange-600 text-white font-bold px-8 py-3 rounded-[2rem] flex items-center justify-center gap-2 transition-all shadow-[0px_4px_10px_rgba(234,88,12,0.2)] hover:bg-orange-700 mt-6 disabled:opacity-50";

    const save = async (data: Record<string, any>, msg: string) => {
        setSaving(true);
        const result = await updateSettings(data);
        setSaving(false);
        if (result?.success) showToast(msg, 'success');
        else showToast(result?.error || 'Erro ao salvar.', 'error');
    };

    const handleUpdateSlug = async () => {
        if (!slug || slug === shop?.slug) return;
        setSlugSaving(true);
        const result = await updateSettings({ slug: slug.toLowerCase().trim() });
        setSlugSaving(false);
        if (result?.success) showToast('Link da agenda atualizado!', 'success');
        else showToast(result?.error || 'Erro ao atualizar link.', 'error');
    };

    return (
        <div className="animate-in fade-in zoom-in-95 duration-200">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Perfil</h2>
                <p className="text-[#6b7d99] text-sm font-medium">Gerencie suas informações pessoais, dados da barbearia, conta e funcionamento.</p>
            </div>

            <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-fit mb-8 overflow-x-auto no-scrollbar max-w-full">
                {([
                    { key: 'cadastro', label: 'Dados de Cadastro', Icon: User },
                    { key: 'barbearia', label: 'Dados da Barbearia', Icon: Store },
                    { key: 'conta', label: 'Dados da Conta', Icon: Shield },
                    { key: 'horarios', label: 'Horários', Icon: Clock },
                ] as const).map(({ key, label, Icon }) => (
                    <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === key ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Icon size={18} /> {label}
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 min-h-[400px]">

                {/* ---- CADASTRO ---- */}
                {activeTab === 'cadastro' && (
                    <div className="max-w-xl animate-fade-in">
                        <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2"><User className="text-orange-500" /> Suas Informações</h3>
                        <div className="space-y-4">
                            <div>
                                <label className={labelClass}>Nome Completo do Dono</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input type="text" placeholder="Seu nome" className={inputClass} value={ownerName} onChange={e => setOwnerName(e.target.value)} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>E-mail Pessoal</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input type="email" className={inputClass} value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)} />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>Celular (Sua Conta)</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input type="tel" placeholder="(00) 00000-0000" className={inputClass} value={ownerPhone} onChange={e => setOwnerPhone(e.target.value)} />
                                    </div>
                                </div>
                            </div>
                            <button
                                disabled={ownerSaving}
                                onClick={async () => {
                                    setOwnerSaving(true);
                                    try {
                                        // Update Auth Metadata (Name)
                                        const { error: authError } = await supabase.auth.updateUser({ 
                                            email: ownerEmail !== session?.user?.email ? ownerEmail : undefined,
                                            data: { full_name: ownerName } 
                                        });
                                        if (authError) throw authError;

                                        // Update Shop Settings (Phone)
                                        const { success, error: settingsError } = await updateSettings({ phone: ownerPhone });
                                        if (!success) throw new Error(settingsError);

                                        showToast('Informações atualizadas com sucesso!', 'success');
                                    } catch (e: any) {
                                        showToast(e.message || 'Erro ao atualizar dados.', 'error');
                                    } finally {
                                        setOwnerSaving(false);
                                    }
                                }}
                                className={btnClass}
                            >
                                <Save size={18} /> {ownerSaving ? 'Salvando...' : 'Salvar Minhas Informações'}
                            </button>
                            <p className="text-xs text-slate-400 mt-2">Dica: O e-mail e nome são usados para seu login administrativo.</p>
                        </div>
                    </div>
                )}

                {/* ---- BARBEARIA ---- */}
                {activeTab === 'barbearia' && (
                    <div className="max-w-4xl animate-fade-in space-y-8">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2"><Store className="text-orange-500" /> Dados do Estabelecimento</h3>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div>
                                        <label className={labelClass}>Nome da Barbearia</label>
                                        <div className="relative">
                                            <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                            <input type="text" placeholder="Nome oficial" className={inputClass} value={barbName} onChange={e => setBarbName(e.target.value)} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Endereço Físico</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                            <input type="text" placeholder="Rua, Número, Bairro, Cidade - UF" className={inputClass} value={barbAddress} onChange={e => setBarbAddress(e.target.value)} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Descrição (Quem Somos)</label>
                                        <div className="relative">
                                            <FileText className="absolute left-3 top-4 w-5 h-5 text-slate-400" />
                                            <textarea 
                                                placeholder="Conte um pouco sobre sua barbearia para seus clientes..." 
                                                className={`${inputClass} !pl-10 h-32 resize-none pt-3`}
                                                value={barbDescription}
                                                onChange={e => setBarbDescription(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className={labelClass}>Link Público (Agenda)</label>
                                        <div className="relative flex gap-2">
                                            <div className="relative flex-1">
                                                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
                                                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 h-[50px]">
                                                    <span className="text-slate-400 text-sm font-medium shrink-0">insightbarber.com.br/</span>
                                                    <input 
                                                        type="text" 
                                                        className="bg-transparent border-none p-0 focus:ring-0 text-slate-700 font-bold flex-1 text-sm lowercase" 
                                                        value={slug} 
                                                        onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} 
                                                    />
                                                </div>
                                            </div>
                                            <button 
                                                onClick={handleUpdateSlug}
                                                disabled={slugSaving || slug === shop?.slug}
                                                className="bg-slate-900 text-white px-4 rounded-xl font-bold hover:bg-slate-800 transition-all text-xs h-[50px] disabled:opacity-50 shrink-0"
                                            >
                                                {slugSaving ? '...' : 'Alterar'}
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1 ml-1">Cuidado: Alterar o link invalidará links antigos compartilhados.</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className={labelClass}>WhatsApp (Comercial)</label>
                                            <div className="relative">
                                                <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                <input type="tel" placeholder="(00) 00000-0000" className={inputClass} value={barbWhatsapp} onChange={e => setBarbWhatsapp(e.target.value)} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className={labelClass}>Instagram (@)</label>
                                            <div className="relative">
                                                <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                <input type="text" placeholder="@suabarbearia" className={inputClass} value={barbInstagram} onChange={e => setBarbInstagram(e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Facebook (Username)</label>
                                        <div className="relative">
                                            <Facebook className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                            <input type="text" placeholder="facebook.com/suabarbearia" className={inputClass} value={barbFacebook} onChange={e => setBarbFacebook(e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <button
                                disabled={saving}
                                onClick={() => save({ 
                                    name: barbName, 
                                    address: barbAddress, 
                                    instagram: barbInstagram,
                                    facebook: barbFacebook,
                                    whatsapp: barbWhatsapp,
                                    description: barbDescription
                                }, 'Dados da barbearia salvos!')}
                                className={btnClass}
                            >
                                <Save size={18} /> {saving ? 'Salvando...' : 'Salvar Dados da Barbearia'}
                            </button>
                        </div>

                        <hr className="border-slate-100" />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
                            {/* Card QR Code */}
                            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                                        <QrCode size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold text-slate-900">QR Code para Divulgação</h4>
                                        <p className="text-xs text-slate-500">Imprima para seus clientes agendarem</p>
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-6 rounded-xl flex flex-col items-center gap-4 border border-slate-100 mb-4">
                                    <div className="w-40 h-40 bg-white p-2 rounded-lg shadow-sm border border-slate-200 flex items-center justify-center">
                                       <img src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=https://insightbarber.com.br/${shop?.slug}`} alt="QR Code" className="w-full h-full" />
                                    </div>
                                    <button 
                                        onClick={() => {
                                            window.open(`https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=https://insightbarber.com.br/${shop?.slug}`, '_blank')
                                            showToast('QR Code aberto para impressão!');
                                        }}
                                        className="text-orange-600 font-bold text-sm flex items-center gap-2 hover:underline"
                                    >
                                        <Download size={16} /> Baixar Versão Impressão
                                    </button>
                                </div>
                            </div>

                            {/* Card Botão Site */}
                            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                                        <Globe size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold text-slate-900">Botão para seu Site</h4>
                                        <p className="text-xs text-slate-500">Integre a agenda no seu site oficial</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="p-4 bg-slate-950 rounded-xl font-mono text-[10px] text-slate-400 break-all leading-relaxed relative group overflow-hidden h-32 flex items-center">
                                        <code>
                                            {`<a href="https://insightbarber.com.br/${shop?.slug}" style="display:inline-flex;align-items:center;padding:12px 24px;background:#f97316;color:#fff;text-decoration:none;border-radius:12px;font-weight:bold;font-family:sans-serif;">Agendar na ${shop?.name}</a>`}
                                        </code>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(`<a href="https://insightbarber.com.br/${shop?.slug}" style="display:inline-flex;align-items:center;padding:12px 24px;background:#f97316;color:#fff;text-decoration:none;border-radius:12px;font-weight:bold;font-family:sans-serif;">Agendar na ${shop?.name}</a>`);
                                            showToast('Código HTML copiado!', 'success');
                                        }}
                                        className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Copy size={18} /> Copiar Código HTML
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ---- CONTA ---- */}
                {activeTab === 'conta' && (
                    <div className="max-w-xl animate-fade-in">
                        <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2"><Shield className="text-orange-500" /> Login e Segurança</h3>
                        <div className="space-y-4">
                            <div>
                                <label className={labelClass}>Login Principal</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input type="text" className={inputClass} defaultValue={session?.user?.email || ''} readOnly />
                                </div>
                            </div>
                            <hr className="my-6 border-slate-100" />
                            <div>
                                <label className={labelClass}>Nova Senha</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input type="password" placeholder="Digite a nova senha" className={inputClass} />
                                </div>
                                <p className="text-xs text-slate-400 mt-2 ml-1">Para manter a senha atual, deixe em branco.</p>
                            </div>
                            <div>
                                <label className={labelClass}>Confirmar Nova Senha</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input type="password" placeholder="Repita a nova senha" className={inputClass} />
                                </div>
                            </div>
                            <p className="text-xs text-slate-400">A alteração de senha é gerenciada diretamente pelo seu provedor de autenticação.</p>
                        </div>
                    </div>
                )}

                {/* ---- HORÁRIOS ---- */}
                {activeTab === 'horarios' && (
                    <div className="max-w-3xl animate-fade-in">
                        <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2"><Clock className="text-orange-500" /> Horários de Funcionamento</h3>
                        <p className="text-slate-500 mb-6">Defina os horários exibidos na página de agendamento dos clientes.</p>

                        <div className="space-y-3">
                            {DAYS.map(({ key, label }) => {
                                const h = hours[key] || { active: false, start: '', end: '' };
                                return (
                                    <div key={key} className={`flex items-center gap-4 p-4 rounded-xl border ${h.active ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-transparent opacity-60'}`}>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={h.active}
                                                onChange={e => setHours(prev => ({ ...prev, [key]: { ...h, active: e.target.checked } }))}
                                            />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                                        </label>
                                        <span className="w-28 font-bold text-slate-700 text-sm">{label}</span>
                                        {h.active ? (
                                            <div className="flex items-center gap-2 flex-1">
                                                <input type="time" value={h.start} onChange={e => setHours(prev => ({ ...prev, [key]: { ...h, start: e.target.value } }))} className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 font-bold focus:outline-none focus:border-orange-500" />
                                                <span className="text-slate-400 text-sm font-medium">às</span>
                                                <input type="time" value={h.end} onChange={e => setHours(prev => ({ ...prev, [key]: { ...h, end: e.target.value } }))} className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 font-bold focus:outline-none focus:border-orange-500" />
                                            </div>
                                        ) : (
                                            <div className="text-sm font-bold text-slate-400 uppercase tracking-widest flex-1">Fechado</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <button
                            disabled={saving}
                            onClick={() => save({ businessHours: hours }, 'Horários salvos com sucesso!')}
                            className={btnClass}
                        >
                            <Save size={18} /> {saving ? 'Salvando...' : 'Salvar Horários'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
