import React, { useState } from 'react';
import { User, Store, Shield, Clock, Save, Link as LinkIcon, MapPin, Instagram, Mail, Phone, Lock } from 'lucide-react';
import { useShop } from '../../../store';
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
                                    <input type="text" placeholder="Seu nome" className={inputClass} defaultValue={session?.user?.user_metadata?.full_name || ''} readOnly />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>E-mail Pessoal</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input type="email" className={inputClass} defaultValue={session?.user?.email || ''} readOnly />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>Celular (WhatsApp)</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input type="tel" placeholder="(00) 00000-0000" className={inputClass} defaultValue={(settings as any)?.phone || ''} readOnly />
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-slate-400 mt-2">Os dados de cadastro estão vinculados ao seu login. Para alterá-los, use a aba "Dados da Conta".</p>
                        </div>
                    </div>
                )}

                {/* ---- BARBEARIA ---- */}
                {activeTab === 'barbearia' && (
                    <div className="max-w-2xl animate-fade-in">
                        <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2"><Store className="text-orange-500" /> Dados do Estabelecimento</h3>
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Instagram (@)</label>
                                    <div className="relative">
                                        <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input type="text" placeholder="@suabarbearia" className={inputClass} value={barbInstagram} onChange={e => setBarbInstagram(e.target.value)} />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>Link Público (Agenda)</label>
                                    <div className="relative">
                                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input type="text" className={inputClass} value={`cutflow.com.br/b/${shop?.slug || ''}`} readOnly />
                                    </div>
                                </div>
                            </div>
                            <button
                                disabled={saving}
                                onClick={() => save({ name: barbName, address: barbAddress, instagram: barbInstagram }, 'Dados da barbearia salvos!')}
                                className={btnClass}
                            >
                                <Save size={18} /> {saving ? 'Salvando...' : 'Salvar Barbearia'}
                            </button>
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
