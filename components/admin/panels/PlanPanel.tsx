
import React, { useState, useEffect } from 'react';
import { Check, Star, Zap, Crown, ShieldCheck, MessageCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useShop } from '../../../store';
import { UpgradeModal } from '../../ui/UpgradeModal';

interface PlanFeature {
  text: string;
  included: boolean;
}

interface PlanCategory {
  title: string;
  features: PlanFeature[];
}

interface Plan {
  id: string;
  name: string;
  price: string;
  description: string;
  popular?: boolean;
  categories: PlanCategory[];
  icon: React.ReactNode;
  color: string;
}

export const PlanPanel: React.FC = () => {
  const { shop } = useShop();
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(0);

  useEffect(() => {
    if (shop?.trialEndsAt) {
      const end = new Date(shop.trialEndsAt);
      const now = new Date();
      const diffTime = end.getTime() - now.getTime();
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDaysRemaining(days > 0 ? days : 0);
    }
  }, [shop]);

  const getTotalTrialDays = () => {
    if (!shop?.trialStartedAt || !shop?.trialEndsAt) return 14;
    const start = new Date(shop.trialStartedAt);
    const end = new Date(shop.trialEndsAt);
    const diff = end.getTime() - start.getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 3600 * 24)));
  };

  const totalDays = getTotalTrialDays();
  const progress = Math.max(0, Math.min(100, ((totalDays - daysRemaining) / totalDays) * 100));
  const plans: Plan[] = [
    {
      id: 'essencial',
      name: 'Essencial',
      price: '59,90',
      description: 'Até 2 profissionais • Para quem está começando ou trabalha solo com um sócio',
      icon: <Zap className="text-orange-500" size={24} />,
      color: 'orange',
      categories: [
        {
          title: 'AGENDAMENTO',
          features: [
            { text: 'Agendamento online 24h (link próprio)', included: true },
            { text: 'Agenda semanal com bloqueios', included: true },
            { text: '2 profissionais cadastrados', included: true },
            { text: 'Serviços ilimitados', included: true },
          ]
        },
        {
          title: 'FINANCEIRO',
          features: [
            { text: 'Controle de caixa e métodos de pagamento', included: true },
            { text: 'Relatório financeiro básico', included: true },
            { text: 'Cálculo de comissão por barbeiro', included: true },
          ]
        },
        {
          title: 'WHATSAPP',
          features: [
            { text: 'Confirmação imediata automática', included: true },
            { text: 'Lembrete 24h e 1h antes', included: true },
            { text: 'Pós-venda e reativação 30 dias', included: false },
            { text: 'Templates personalizados', included: false },
          ]
        },
        {
          title: 'IA & FIDELIDADE',
          features: [
            { text: 'Insights IA (chatbot)', included: false },
            { text: 'Programa de fidelidade', included: false },
            { text: 'Clube de assinatura', included: false },
          ]
        }
      ]
    },
    {
      id: 'profissional',
      name: 'Profissional',
      price: '99,90',
      description: 'Até 5 profissionais • Para barbearias em crescimento com equipe formada',
      popular: true,
      icon: <Star className="text-amber-500" size={24} />,
      color: 'amber',
      categories: [
        {
          title: 'AGENDAMENTO',
          features: [
            { text: 'Tudo do Essencial', included: true },
            { text: 'Até 5 profissionais', included: true },
            { text: 'Múltiplos serviços por agendamento', included: true },
          ]
        },
        {
          title: 'FINANCEIRO',
          features: [
            { text: 'Relatório financeiro completo por período', included: true },
            { text: 'Cupons e descontos com validade/limite', included: true },
            { text: 'Gestão de clientes com histórico', included: true },
          ]
        },
        {
          title: 'WHATSAPP',
          features: [
            { text: 'Confirmação + lembretes 24h/1h', included: true },
            { text: 'Pós-venda automático (2h após serviço)', included: true },
            { text: 'Reativação após 30 dias sem voltar', included: true },
            { text: 'Templates editáveis (5 modelos)', included: true },
          ]
        },
        {
          title: 'IA & FIDELIDADE',
          features: [
            { text: 'Chatbot de insights do negócio', included: true },
            { text: 'Programa de fidelidade (pontos ou cartão)', included: true },
            { text: 'Clube de assinatura para clientes', included: false },
            { text: 'Relatório semanal automático no WhatsApp', included: false },
          ]
        }
      ]
    },
    {
      id: 'premium',
      name: 'Premium',
      price: '149,90',
      description: 'Profissionais ilimitados • Para barbearias estabelecidas e redes em expansão',
      icon: <Crown className="text-slate-900" size={24} />,
      color: 'slate',
      categories: [
        {
          title: 'AGENDAMENTO',
          features: [
            { text: 'Tudo do Profissional', included: true },
            { text: 'Profissionais ilimitados', included: true },
          ]
        },
        {
          title: 'FINANCEIRO',
          features: [
            { text: 'Relatório por barbeiro e por serviço', included: true },
            { text: 'Exportação de dados (CSV)', included: true },
            { text: 'Clube de assinatura para clientes', included: true },
          ]
        },
        {
          title: 'WHATSAPP',
          features: [
            { text: 'Templates ilimitados e geração por IA', included: true },
            { text: 'Reagendamento automático (no-show)', included: true },
            { text: 'Relatório semanal automático no WhatsApp', included: true },
            { text: 'Confirmação bidirecional (responder 1/2)', included: true },
          ]
        },
        {
          title: 'IA & FIDELIDADE',
          features: [
            { text: 'Chatbot IA + geração de imagens de serviços', included: true },
            { text: 'Programa de fidelidade completo', included: true },
            { text: 'Suporte prioritário via WhatsApp', included: true },
          ]
        }
      ]
    }
  ];

  return (
    <div className="space-y-8 pb-12">
      <UpgradeModal isOpen={isUpgradeModalOpen} onClose={() => setIsUpgradeModalOpen(false)} />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Meu Plano</h1>
          <p className="text-slate-500">Gerencie sua assinatura e descubra novos recursos</p>
        </div>
        <div className="flex items-center gap-4">
          {daysRemaining > 0 && (
            <div className="bg-white border border-slate-100 p-4 rounded-lg shadow-sm flex items-center gap-4 min-w-[280px]">
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Período de teste</p>
                  <p className="text-sm font-bold text-slate-900">{daysRemaining} dias restantes</p>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div 
                    className="bg-orange-500 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}
          <div className="bg-orange-50 border border-orange-100 px-4 py-2 rounded-lg flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center text-white">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">Plano Atual</p>
              <p className="text-sm font-bold text-slate-900">Profissional (Trial)</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <motion.div
            key={plan.id}
            whileHover={{ y: -5 }}
            className={`relative bg-white rounded-lg border-2 transition-all duration-300 flex flex-col ${
              plan.popular ? 'border-amber-500 shadow-xl shadow-amber-100' : 'border-slate-100 hover:border-slate-200 shadow-sm'
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-4 py-1 rounded-sm text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 shadow-lg">
                <Star size={12} fill="currentColor" />
                mais popular
              </div>
            )}

            <div className="p-8 border-b border-slate-50">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-${plan.color}-50`}>
                  {plan.icon}
                </div>
                {plan.id === 'profissional' && (
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg uppercase">Ativo</span>
                )}
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">{plan.name}</h2>
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-3xl font-black text-slate-900">R${plan.price.split(',')[0]}</span>
                <span className="text-lg font-bold text-slate-900">,{plan.price.split(',')[1]}</span>
                <span className="text-slate-400 text-sm font-medium">/mês</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed min-h-[32px]">
                {plan.description}
              </p>
            </div>

            <div className="p-8 flex-1 space-y-8">
              {plan.categories.map((category, idx) => (
                <div key={idx} className="space-y-3">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                    {category.title}
                  </h3>
                  <ul className="space-y-3">
                    {category.features.map((feature, fIdx) => (
                      <li key={fIdx} className={`flex items-start gap-3 text-sm ${feature.included ? 'text-slate-800' : 'text-slate-500'}`}>
                        <div className={`mt-0.5 shrink-0 w-5 h-5 rounded-sm flex items-center justify-center ${feature.included ? 'bg-green-50 text-green-500' : 'bg-slate-50 text-slate-300'}`}>
                          {feature.included ? <Check size={12} strokeWidth={3} /> : <div className="w-1.5 h-1.5 rounded-sm bg-current" />}
                        </div>
                        <span className={feature.included ? 'font-semibold text-slate-900' : 'line-through decoration-slate-300'}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="p-8 pt-0 mt-auto">
              <button
                onClick={() => plan.id !== 'profissional' && setIsUpgradeModalOpen(true)}
                className={`w-full py-4 rounded-lg font-bold text-sm transition-all duration-300 ${
                  plan.id === 'profissional'
                    ? 'bg-slate-100 text-slate-400 cursor-default'
                    : plan.popular
                    ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-200'
                    : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-200'
                }`}
              >
                {plan.id === 'profissional' ? 'Plano Atual' : 'Fazer Upgrade'}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-slate-900 rounded-lg p-8 md:p-12 text-white relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl text-center md:text-left">
            <h2 className="text-3xl font-bold mb-4">Dúvidas sobre os planos?</h2>
            <p className="text-slate-400 mb-8">Nossa equipe está pronta para te ajudar a escolher a melhor opção para o seu negócio.</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-4">
              <button className="bg-white text-slate-900 px-8 py-4 rounded-lg font-bold hover:bg-slate-100 transition-all flex items-center gap-2">
                <MessageCircle size={20} />
                Falar no WhatsApp
              </button>
              <button className="bg-slate-800 text-white px-8 py-4 rounded-lg font-bold hover:bg-slate-700 transition-all border border-slate-700">
                Ver Comparativo Completo
              </button>
            </div>
          </div>
          <div className="hidden lg:block">
             <div className="w-64 h-64 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg blur-3xl opacity-20 absolute -right-20 -bottom-20"></div>
             <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg blur-3xl opacity-20 absolute right-40 top-0"></div>
             <img src="https://i.freeimage.host/qD9Rddv.png" alt="Insight Barber" className="w-48 h-48 object-contain opacity-20 grayscale brightness-200" />
          </div>
        </div>
      </div>
    </div>
  );
};
