import React, { useState } from 'react';
import { User, Store, Shield, Clock } from 'lucide-react';

type ProfileTab = 'cadastro' | 'barbearia' | 'conta' | 'horarios';

export const ProfilePanel = () => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('cadastro');

  return (
    <div className="animate-in fade-in zoom-in-95 duration-200">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Perfil</h2>
        <p className="text-[#6b7d99] text-sm font-medium">Gerencie suas informações, dados da barbearia, conta e plano.</p>
      </div>

      <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-fit mb-8 overflow-x-auto no-scrollbar max-w-full">
        <button
          onClick={() => setActiveTab('cadastro')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'cadastro'
              ? 'bg-white text-orange-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <User size={18} />
          Dados de Cadastro
        </button>
        <button
          onClick={() => setActiveTab('barbearia')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'barbearia'
              ? 'bg-white text-orange-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Store size={18} />
          Dados da Barbearia
        </button>
        <button
          onClick={() => setActiveTab('conta')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'conta'
              ? 'bg-white text-orange-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Shield size={18} />
          Dados da Conta
        </button>
        <button
          onClick={() => setActiveTab('horarios')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'horarios'
              ? 'bg-white text-orange-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Clock size={18} />
          Horários de Funcionamento
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 min-h-[400px]">
        {activeTab === 'cadastro' && (
          <div className="max-w-xl">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Dados de Cadastro</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nome do Dono</label>
                <input type="text" className="w-full border border-slate-300 rounded-lg px-4 py-2.5 outline-none focus:border-orange-500 transition-all font-medium" placeholder="Ex: João da Silva" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">E-mail</label>
                <input type="email" className="w-full border border-slate-300 rounded-lg px-4 py-2.5 outline-none focus:border-orange-500 transition-all font-medium" placeholder="joao@exemplo.com" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Celular</label>
                <input type="text" className="w-full border border-slate-300 rounded-lg px-4 py-2.5 outline-none focus:border-orange-500 transition-all font-medium" placeholder="(11) 99999-9999" />
              </div>
              <button className="bg-slate-900 text-white font-bold py-2.5 px-6 rounded-lg mt-4 hover:bg-slate-800 transition-colors">Salvar Alterações</button>
            </div>
          </div>
        )}
        {activeTab === 'barbearia' && (
          <div className="max-w-xl">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Dados da Barbearia</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nome da Barbearia</label>
                <input type="text" className="w-full border border-slate-300 rounded-lg px-4 py-2.5 outline-none focus:border-orange-500 transition-all font-medium" placeholder="Ex: Insight Barber" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Endereço Completo</label>
                <input type="text" className="w-full border border-slate-300 rounded-lg px-4 py-2.5 outline-none focus:border-orange-500 transition-all font-medium" placeholder="Rua Exemplo, 123 - Centro" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Redes Sociais (Instagram, etc)</label>
                <input type="text" className="w-full border border-slate-300 rounded-lg px-4 py-2.5 outline-none focus:border-orange-500 transition-all font-medium" placeholder="@insightbarber" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Link da Agenda</label>
                <input type="text" className="w-full border border-slate-300 rounded-lg px-4 py-2.5 outline-none focus:border-orange-500 transition-all font-medium text-slate-500" value="https://cutflow.app/insightbarber" readOnly />
                <p className="text-xs text-slate-500 mt-1 font-medium">Este é o link público que seus clientes acessam.</p>
              </div>
              <button className="bg-slate-900 text-white font-bold py-2.5 px-6 rounded-lg mt-4 hover:bg-slate-800 transition-colors">Salvar Barbearia</button>
            </div>
          </div>
        )}
        {activeTab === 'conta' && (
          <div className="max-w-xl">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Dados da Conta</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Login (Usuário)</label>
                <input type="text" className="w-full border border-slate-300 rounded-lg px-4 py-2.5 outline-none focus:border-orange-500 transition-all font-medium text-slate-500" value="joaosilva" readOnly />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Senha Atual</label>
                <input type="password" className="w-full border border-slate-300 rounded-lg px-4 py-2.5 outline-none focus:border-orange-500 transition-all font-medium" placeholder="••••••••" />
              </div>
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-md font-bold text-slate-900 mb-4">Alterar Senha</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Nova Senha</label>
                    <input type="password" className="w-full border border-slate-300 rounded-lg px-4 py-2.5 outline-none focus:border-orange-500 transition-all font-medium" placeholder="Nova senha" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Confirmar Nova Senha</label>
                    <input type="password" className="w-full border border-slate-300 rounded-lg px-4 py-2.5 outline-none focus:border-orange-500 transition-all font-medium" placeholder="Confirme a nova senha" />
                  </div>
                </div>
              </div>
              <button className="bg-slate-900 text-white font-bold py-2.5 px-6 rounded-lg mt-4 hover:bg-slate-800 transition-colors">Atualizar Senha</button>
            </div>
          </div>
        )}
        {activeTab === 'horarios' && (
          <div className="max-w-xl">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Horários de Funcionamento</h3>
            <p className="text-slate-500 font-medium mb-6">Defina os dias e horários que a barbearia está aberta.</p>
            <div className="space-y-4">
              {['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'].map(dia => (
                <div key={dia} className="flex items-center gap-4 justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-700 w-32">{dia}</span>
                  <div className="flex items-center gap-2">
                    <input type="time" defaultValue="09:00" className="border border-slate-300 rounded-md p-1.5 outline-none text-sm font-medium focus:border-orange-500" />
                    <span className="text-slate-500 font-bold text-sm">às</span>
                    <input type="time" defaultValue="19:00" className="border border-slate-300 rounded-md p-1.5 outline-none text-sm font-medium focus:border-orange-500" />
                  </div>
                </div>
              ))}
              <button className="bg-slate-900 text-white font-bold py-2.5 px-6 rounded-lg mt-4 hover:bg-slate-800 transition-colors w-full">Salvar Horários</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
