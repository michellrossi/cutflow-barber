import React, { useState } from 'react';
import { User, Store, Shield, Clock, Save, Link as LinkIcon, MapPin, Instagram, Mail, Phone, Lock } from 'lucide-react';
import { useShop } from '../../../store';

type ProfileTab = 'cadastro' | 'barbearia' | 'conta' | 'horarios';

export const ProfilePanel = () => {
  const { shop, session, settings } = useShop();
  const [activeTab, setActiveTab] = useState<ProfileTab>('cadastro');

  const inputClass = "w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all font-medium placeholder:text-slate-400";
  const labelClass = "block text-sm font-bold text-slate-700 mb-2 uppercase tracking-tight";
  const btnClass = "bg-orange-600 text-white font-bold px-8 py-3 rounded-[2rem] flex items-center justify-center gap-2 transition-all shadow-[0px_4px_10px_rgba(234,88,12,0.2)] hover:bg-orange-700 mt-6";

  return (
    <div className="animate-in fade-in zoom-in-95 duration-200">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Perfil</h2>
        <p className="text-[#6b7d99] text-sm font-medium">Gerencie suas informações pessoais, dados da barbearia, conta e funcionamento.</p>
      </div>

      <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-fit mb-8 overflow-x-auto no-scrollbar max-w-full">
        <button
          onClick={() => setActiveTab('cadastro')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'cadastro'
              ? 'bg-white text-orange-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
            }`}
        >
          <User size={18} />
          Dados de Cadastro
        </button>
        <button
          onClick={() => setActiveTab('barbearia')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'barbearia'
              ? 'bg-white text-orange-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
            }`}
        >
          <Store size={18} />
          Dados da Barbearia
        </button>
        <button
          onClick={() => setActiveTab('conta')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'conta'
              ? 'bg-white text-orange-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
            }`}
        >
          <Shield size={18} />
          Dados da Conta
        </button>
        <button
          onClick={() => setActiveTab('horarios')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'horarios'
              ? 'bg-white text-orange-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
            }`}
        >
          <Clock size={18} />
          Horários de Funcionamento
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 min-h-[400px]">
        {activeTab === 'cadastro' && (
          <div className="max-w-xl animate-fade-in">
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2"><User className="text-orange-500"/> Suas Informações</h3>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Nome Completo do Dono</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input type="text" placeholder="Seu nome" className={inputClass} defaultValue={session?.user?.user_metadata?.full_name || 'Usuário Principal'} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>E-mail Pessoal</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input type="email" placeholder="seuemail@exemplo.com" className={inputClass} defaultValue={session?.user?.email || ''} readOnly />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Celular (WhatsApp)</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input type="tel" placeholder="(00) 00000-0000" className={inputClass} defaultValue={settings?.phone || ''} />
                  </div>
                </div>
              </div>
              <button className={btnClass}>
                <Save size={18} /> Salvar Alterações
              </button>
            </div>
          </div>
        )}

        {activeTab === 'barbearia' && (
          <div className="max-w-2xl animate-fade-in">
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2"><Store className="text-orange-500"/> Dados do Estabelecimento</h3>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Nome da Barbearia</label>
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input type="text" placeholder="Nome oficial" className={inputClass} defaultValue={settings?.name || 'CutFlow Barber Shop'} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Endereço Físico</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input type="text" placeholder="Rua, Número, Bairro, Cidade - UF" className={inputClass} defaultValue={settings?.address || ''} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Instagram (@)</label>
                  <div className="relative">
                    <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input type="text" placeholder="@suabarbearia" className={inputClass} defaultValue={settings?.instagram || ''} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Link Público (Agenda)</label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input type="text" placeholder="cutflow.com.br/suabarbearia" className={inputClass} defaultValue={`cutflow.com.br/b/${shop?.slug || ''}`} readOnly />
                  </div>
                </div>
              </div>
              <button className={btnClass}>
                <Save size={18} /> Salvar Barbearia
              </button>
            </div>
          </div>
        )}

        {activeTab === 'conta' && (
          <div className="max-w-xl animate-fade-in">
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2"><Shield className="text-orange-500"/> Login e Segurança</h3>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Login Principal</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input type="text" placeholder="Seu nome de usuário" className={inputClass} defaultValue={session?.user?.email || ''} readOnly />
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
              <button className={btnClass}>
                <Save size={18} /> Atualizar Segurança
              </button>
            </div>
          </div>
        )}

        {activeTab === 'horarios' && (
          <div className="max-w-3xl animate-fade-in">
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2"><Clock className="text-orange-500"/> Horários de Funcionamento</h3>
            <p className="text-slate-500 mb-6">Defina os horários em que os clientes podem agendar através do seu link público.</p>
            
            <div className="space-y-3">
              {[
                { dia: 'Segunda-feira', start: '09:00', end: '19:00', active: true },
                { dia: 'Terça-feira', start: '09:00', end: '19:00', active: true },
                { dia: 'Quarta-feira', start: '09:00', end: '19:00', active: true },
                { dia: 'Quinta-feira', start: '09:00', end: '20:00', active: true },
                { dia: 'Sexta-feira', start: '09:00', end: '20:00', active: true },
                { dia: 'Sábado', start: '08:00', end: '17:00', active: true },
                { dia: 'Domingo', start: '', end: '', active: false },
              ].map((h, i) => (
                <div key={i} className={`flex items-center gap-4 p-4 rounded-xl border ${h.active ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-transparent opacity-60'}`}>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked={h.active} />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                  </label>
                  <span className="w-24 font-bold text-slate-700 text-sm">{h.dia}</span>
                  
                  {h.active ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input type="time" defaultValue={h.start} className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 font-bold focus:outline-none focus:border-orange-500" />
                      <span className="text-slate-400 text-sm font-medium">às</span>
                      <input type="time" defaultValue={h.end} className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 font-bold focus:outline-none focus:border-orange-500" />
                    </div>
                  ) : (
                    <div className="text-sm font-bold text-slate-400 uppercase tracking-widest flex-1">Fechado</div>
                  )}
                </div>
              ))}
            </div>

            <button className={btnClass}>
              <Save size={18} /> Salvar Horários
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
