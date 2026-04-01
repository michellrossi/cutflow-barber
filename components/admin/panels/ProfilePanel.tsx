import React, { useState } from 'react';
import { User, Store, Shield, CreditCard } from 'lucide-react';

type ProfileTab = 'cadastro' | 'barbearia' | 'conta' | 'plano';

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
          onClick={() => setActiveTab('plano')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'plano'
              ? 'bg-white text-orange-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <CreditCard size={18} />
          Dados do Plano
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 min-h-[400px]">
        {activeTab === 'cadastro' && (
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Dados de Cadastro</h3>
            <p className="text-slate-500">Formulário de dados de cadastro do usuário.</p>
            {/* TODO: Add forms and inputs */}
          </div>
        )}
        {activeTab === 'barbearia' && (
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Dados da Barbearia</h3>
            <p className="text-slate-500">Formulário de dados da barbearia / salão.</p>
            {/* TODO: Add forms and inputs */}
          </div>
        )}
        {activeTab === 'conta' && (
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Dados da Conta</h3>
            <p className="text-slate-500">Configurações de senha, segurança e integrações.</p>
            {/* TODO: Add forms and inputs */}
          </div>
        )}
        {activeTab === 'plano' && (
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Dados do Plano</h3>
            <p className="text-slate-500">Informações sobre sua assinatura atual e histórico.</p>
            {/* TODO: Add forms and inputs */}
          </div>
        )}
      </div>
    </div>
  );
};
