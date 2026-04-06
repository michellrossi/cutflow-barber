import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useSpring, useTransform, useInView } from 'framer-motion';
import { 
  Scissors, ArrowRight, Play, Check, CheckCircle2, 
  MessageSquare, Calendar, Sparkles, TrendingUp, 
  Target, Users, BarChart3, Palette, ShieldCheck, 
  Ticket, LayoutDashboard, Share2, Star, Zap,
  Smartphone, Briefcase, Award, Plus, UserPlus as UserPlusIcon
} from 'lucide-react';

const LandingPage: React.FC<{ onStart: () => void, onLogin: () => void }> = ({ onStart, onLogin }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const logoUrl = "https://iili.io/BRAwKWg.md.png";

  return (
    <div className="min-h-screen bg-[#0B0F19] text-[#F8FAFC] font-sans selection:bg-[#F97316]/30 overflow-x-hidden">
      {/* Custom Styles for Grid and Glow */}
      <style>{`
        .bg-grid-pattern {
          background-image: 
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        
        .hero-glow {
          background: radial-gradient(
            circle at 20% 50%,
            rgba(249, 115, 22, 0.3) 0%,
            rgba(249, 115, 22, 0.05) 35%,
            transparent 65%
          );
          filter: blur(80px);
        }

        .cta-glow {
            background: radial-gradient(
                circle at center,
                rgba(249, 115, 22, 0.4) 0%,
                rgba(26, 10, 0, 0) 70%
            );
        }

        .text-gradient {
          background: linear-gradient(135deg, #FB923C, #FBBF24);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 0 20px rgba(249, 115, 22, 0.4));
        }

        .card-premium {
          background: #1E293B;
          border: 1px solid #334155;
          border-radius: 16px;
          transition: border-color 0.3s, transform 0.3s, box-shadow 0.3s;
        }

        .card-premium:hover {
          border-color: #F97316;
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(249, 115, 22, 0.15);
        }

        .whatsapp-bubble {
          position: relative;
          max-width: 85%;
          padding: 12px 16px;
          border-radius: 12px;
          margin-bottom: 8px;
          font-size: 14px;
          line-height: 1.4;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .whatsapp-left {
          background: #202C33;
          color: white;
          border-top-left-radius: 0;
          align-self: flex-start;
        }

        .pricing-active {
            border-color: #F97316;
            box-shadow: 0 0 25px rgba(249, 115, 22, 0.2);
            transform: scale(1.05);
        }

        html {
            scroll-behavior: smooth;
        }
      `}</style>

      {/* SEÇÃO 1 — NAVBAR FIXA */}
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled ? 'bg-[#0B0F19]/80 backdrop-blur-md border-b border-[#334155] py-3' : 'bg-transparent py-6'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img src={logoUrl} alt="Insight Barber" className="h-10 w-auto" />
            <span className="text-2xl font-bold tracking-tight hidden sm:block">Insight Barber</span>
          </div>

          {/* Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-[#94A3B8] hover:text-[#F8FAFC] transition-colors">Funcionalidades</a>
            <a href="#how-it-works" className="text-sm font-medium text-[#94A3B8] hover:text-[#F8FAFC] transition-colors">Como Funciona</a>
            <a href="#pricing" className="text-sm font-medium text-[#94A3B8] hover:text-[#F8FAFC] transition-colors">Planos</a>
            <a href="#testimonials" className="text-sm font-medium text-[#94A3B8] hover:text-[#F8FAFC] transition-colors">Depoimentos</a>
          </nav>

          {/* Buttons */}
          <div className="flex items-center gap-4">
            <button 
              onClick={onLogin}
              className="px-4 py-2 text-sm font-medium text-[#F8FAFC] hover:text-white border border-transparent hover:border-white/20 rounded-lg transition-all"
            >
              Entrar
            </button>
            <button 
              onClick={onStart}
              className="px-6 py-2 bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-bold rounded-lg transition-all shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_30px_rgba(249,115,22,0.5)]"
            >
              Teste Grátis — 14 dias
            </button>
          </div>
        </div>
      </header>

      {/* SEÇÃO 2 — HERO */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 overflow-hidden">
        {/* Glow & Grid */}
        <div className="absolute inset-0 z-0 bg-grid-pattern opacity-40"></div>
        <div className="absolute top-0 left-0 w-full h-full z-0 hero-glow"></div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
          {/* Coluna Esquerda: Texto */}
          <div className="space-y-8">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F97316]/10 border border-[#F97316]/30 text-[#F97316] text-[10px] font-bold uppercase tracking-widest"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F97316] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F97316]"></span>
              </span>
              Sistema de Alta Performance
            </motion.div>

            <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.1] tracking-tight text-white">
              <motion.span 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="block"
              >
                Sua barbearia
              </motion.span>
              <motion.span 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="block text-gradient"
              >
                no próximo nível
              </motion.span>
            </h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-lg md:text-xl text-[#94A3B8] max-w-xl leading-relaxed"
            >
              Agendamento online 24h, automação de WhatsApp e inteligência artificial — tudo em um sistema feito para barbearias que querem crescer.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="flex flex-col sm:flex-row items-center gap-4"
            >
              <button 
                onClick={onStart}
                className="w-full sm:w-auto px-8 py-4 bg-[#F97316] hover:bg-[#EA580C] text-white font-bold text-lg rounded-xl transition-all hover:scale-105 shadow-xl shadow-[#F97316]/20 flex items-center justify-center gap-2 group"
              >
                Começar grátis por 14 dias
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="w-full sm:w-auto px-8 py-4 bg-transparent border border-[#334155] hover:bg-white/5 text-white font-bold text-lg rounded-xl transition-all flex items-center justify-center gap-2">
                <Play size={20} fill="currentColor" />
                Ver demonstração
              </button>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[13px] text-[#94A3B8] font-medium"
            >
              <span className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[#F97316]" /> Sem cartão de crédito
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[#F97316]" /> Configuração em 5 minutos
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[#F97316]" /> Suporte via WhatsApp
              </span>
            </motion.div>
          </div>

          {/* Coluna Direita: Visual Mockup */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8, type: 'spring' }}
            className="relative"
          >
            {/* Dashboard Mockup */}
            <motion.div 
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="relative z-10 bg-[#1E293B] border border-[#334155] rounded-2xl shadow-2xl overflow-hidden p-1 p-b-0"
            >
                <div className="bg-[#0B0F19] rounded-t-xl p-4 flex items-center justify-between border-b border-[#334155]">
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
                    </div>
                    <div className="text-[10px] text-[#94A3B8] font-mono">insightbarber.com.br/admin</div>
                </div>
                <div className="p-6 grid grid-cols-2 gap-4">
                    <div className="col-span-2 bg-[#0B0F19] p-4 rounded-xl border border-[#334155]/50">
                        <p className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider mb-2">Faturamento Hoje</p>
                        <div className="text-2xl font-bold">R$ 1.240,00</div>
                    </div>
                    <div className="bg-[#0B0F19] p-4 rounded-xl border border-[#334155]/50">
                        <p className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider mb-1">Agendamentos</p>
                        <div className="text-xl font-bold">12</div>
                    </div>
                    <div className="bg-[#0B0F19] p-4 rounded-xl border border-[#334155]/50">
                        <p className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider mb-1">Taxa Retorno</p>
                        <div className="text-xl font-bold text-green-400">82%</div>
                    </div>
                </div>
                <div className="px-6 pb-6 mt-2">
                    <div className="h-24 bg-[#0B0F19] rounded-xl border border-[#334155]/50 flex items-end gap-1 p-3">
                        {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
                            <div key={i} className="flex-1 bg-[#F97316]/20 rounded-t-sm" style={{ height: `${h}%` }}>
                                <div className="w-full bg-[#F97316] rounded-t-sm" style={{ height: `${h * 0.4}%` }}></div>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* Notification Card (WhatsApp) */}
            <motion.div 
               animate={{ y: [20, 8, 20], x: [-10, -20, -10] }}
               transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
               className="absolute -top-12 -left-8 z-20 bg-white p-4 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-200 min-w-[280px]"
            >
                <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center text-white">
                    <MessageSquare size={20} fill="currentColor" />
                </div>
                <div>
                    <div className="flex items-center justify-between gap-4">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">WhatsApp Delivery</p>
                        <span className="text-[9px] text-slate-400">agora</span>
                    </div>
                    <p className="text-xs text-slate-800 font-medium">
                        Novo agendamento: <span className="font-bold">João Silva</span> 
                        <br/>Corte Degradê · Hoje 14h
                    </p>
                </div>
            </motion.div>

            {/* Review Card */}
            <motion.div 
              animate={{ y: [-10, 2, -10], x: [10, 20, 10] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -bottom-8 -right-8 z-20 bg-[#1E293B] p-4 rounded-xl shadow-2xl border border-[#334155] flex flex-col gap-2 min-w-[200px]"
            >
                <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(i => <Star key={i} size={14} fill="#F97316" color="#F97316" />)}
                </div>
                <div>
                   <p className="text-xl font-bold">4.9</p>
                   <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider">+120 avaliações este mês</p>
                </div>
            </motion.div>

            {/* Glow Background */}
            <div className="absolute inset-0 bg-[#F97316]/10 blur-[100px] -z-10 rounded-full translate-x-1/4"></div>
          </motion.div>
        </div>
      </section>

      {/* SEÇÃO 3 — BARRA DE PROVA SOCIAL */}
      <section className="bg-[#111827] border-y border-[#334155] py-12 relative z-10 transition-opacity">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
          {[
            { label: 'Barbearias ativas', value: 1200, prefix: '+' },
            { label: 'Agendamentos/mês', value: 48000, prefix: '+' },
            { label: 'Faturamento gerenciado', value: 2.4, suffix: 'M', prefix: 'R$' },
            { label: 'Taxa de satisfação', value: 98, suffix: '%' },
          ].map((stat, i) => (
            <div key={i} className="text-center group">
               <div className="text-4xl md:text-5xl font-black text-white mb-2 flex items-center justify-center gap-1">
                   <CountUp end={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
               </div>
               <p className="text-[#94A3B8] text-sm uppercase font-bold tracking-widest">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SEÇÃO 4 — FUNCIONALIDADES PRINCIPAIS */}
      <section id="features" className="py-24 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-4">
             <h2 className="text-3xl md:text-5xl font-extrabold text-white">Tudo que sua barbearia precisa, em um só lugar</h2>
             <p className="text-[#94A3B8] text-lg max-w-2xl mx-auto">
                Do agendamento ao pós-venda. Do financeiro à fidelização. Insight Barber é o sistema que trabalha enquanto você corta.
             </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: '📅', title: 'Agendamento Online 24h', desc: 'Seus clientes agendam pelo link exclusivo da sua barbearia, escolhem o serviço, o profissional e o horário.' },
              { icon: '📱', title: 'WhatsApp Automatizado', desc: 'Instância própria por barbearia. Confirmações, lembretes, pós-venda e reativação — tudo no automático.' },
              { icon: '🤖', title: 'Inteligência Artificial', desc: 'Chatbot de insights: analise seu barbeiro mais rentável e receba relatórios semanais automáticos.' },
              { icon: '💰', title: 'Controle Financeiro', desc: 'Caixa diário, relatórios por período, comissões automáticas e todos os métodos de pagamento (PIX, Crédito).' },
              { icon: '🎯', title: 'Programa de Fidelidade', desc: 'Cartão fidelidade ou sistema de pontos. Cupons gerados e enviados automaticamente via WhatsApp.' },
              { icon: '📋', title: 'Clube de Assinaturas', desc: 'Planos mensais (ex: 4 cortes/mês). Gestão de assinantes, controle de uso e status de pagamento.' },
              { icon: '👥', title: 'Gestão de Equipe', desc: 'Perfis individuais por barbeiro, acesso restrito, agenda visual colorida e notificações de novos agendamentos.' },
              { icon: '📊', title: 'Relatórios Avançados', desc: 'Painéis de serviços mais vendidos, clientes valiosos, análise de cancelamentos e faltas.' },
              { icon: '🎨', title: 'Personalização Total', desc: 'Logo, cores e serviços com imagens geradas por IA. A página de agendamento com a sua identidade.' },
              { icon: '🔒', title: 'Login Seguro para Clientes', desc: 'Acesso via link mágico enviado no WhatsApp. Sem senhas para lembrar. Histórico e pontos num só lugar.' },
              { icon: '🎟️', title: 'Cupons e Promoções', desc: 'Crie cupons com descontos percentuais ou fixos, limites de uso e datas de validade para campanhas.' },
              { icon: '📆', title: 'Agenda Visual Semanal', desc: 'Calendário com slots por profissional, bloqueios de horário e visualização rápida da semana.' },
            ].map((f, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="card-premium p-8 group cursor-default"
              >
                <div className="text-4xl mb-6 group-hover:scale-110 transition-transform origin-left">{f.icon}</div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-[#F97316] transition-colors">{f.title}</h3>
                <p className="text-[#94A3B8] text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SEÇÃO 5 — DESTAQUE WHATSAPP */}
      <section className="py-24 px-6 relative bg-gradient-to-b from-[#0B0F19] to-[#040608] overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-extrabold text-white">Seu WhatsApp trabalha por você — 24 horas por dia</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Esquerda: Mockup Chat */}
            <div className="relative">
                <div className="bg-[#121B22] rounded-3xl p-6 border border-[#233138] shadow-2xl max-w-[450px] mx-auto overflow-hidden">
                    <div className="flex items-center gap-3 mb-8 border-b border-[#233138] pb-4">
                        <div className="w-10 h-10 rounded-full bg-slate-700"></div>
                        <div>
                            <p className="text-sm font-bold text-white uppercase tracking-tight">João Silva</p>
                            <p className="text-[10px] text-green-500">Online</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-col gap-4">
                        <motion.div 
                          className="whatsapp-bubble whatsapp-left"
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                        >
                            <div className="text-[#F97316] text-[10px] font-bold mb-1">Confirmação imediata</div>
                            "Olá João! Seu horário de Corte Degradê com Rafael no dia 15/04 às 14h está confirmado. Até lá! ✂️"
                        </motion.div>

                        <motion.div 
                          className="whatsapp-bubble whatsapp-left opacity-60"
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.2 }}
                        >
                            <div className="text-[#94A3B8] text-[10px] font-bold mb-1">24h antes</div>
                            "Olá João! Lembrando do seu horário amanhã às 14h com Rafael. Nos vemos lá! 💈"
                        </motion.div>

                        <motion.div 
                          className="whatsapp-bubble whatsapp-left border-l-2 border-[#F97316]"
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.4 }}
                        >
                            <div className="text-[#F97316] text-[10px] font-bold mb-1">Pós-venda — 2h depois</div>
                            "Olá João! O que achou do atendimento hoje? Sua opinião é muito importante pra gente! 🙏"
                        </motion.div>

                        <motion.div 
                          className="whatsapp-bubble whatsapp-left"
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.6 }}
                        >
                            <div className="text-[#FBBF24] text-[10px] font-bold mb-1">30 dias depois</div>
                            "Saudades, João! Faz um tempo que não te vemos aqui na Barbearia do Rafael. Que tal agendar? 💈"
                        </motion.div>
                    </div>
                </div>
                {/* Background glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#25D366]/5 blur-[100px] -z-10"></div>
            </div>

            {/* Direita: Bullets */}
            <div className="space-y-10">
                {[
                    'Instância própria de WhatsApp por barbearia — sem misturar mensagens',
                    'Templates 100% personalizáveis pelo dono',
                    'Máximo 3 tentativas por mensagem — sem spam',
                    'Funciona mesmo quando você está dormindo'
                ].map((item, i) => (
                    <motion.div 
                      key={i} 
                      className="flex gap-4 group"
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                    >
                        <div className="w-8 h-8 rounded-full bg-[#25D366]/10 flex items-center justify-center shrink-0 group-hover:bg-[#25D366]/20 transition-colors">
                            <Check size={18} className="text-[#25D366]" />
                        </div>
                        <p className="text-xl font-medium text-[#F8FAFC]/90">{item}</p>
                    </motion.div>
                ))}
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO 6 — COMO FUNCIONA */}
      <section id="how-it-works" className="py-24 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
             <h2 className="text-3xl md:text-5xl font-extrabold text-white">Comece hoje, receba agendamentos ainda esta semana</h2>
          </div>

          <div className="relative">
            {/* Dotted Line connector */}
            <div className="hidden lg:block absolute top-[45px] left-[10%] right-[10%] border-t-2 border-dashed border-[#334155] -z-10"></div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                {[
                    { step: '1', title: 'Crie sua conta', desc: 'Em menos de 2 minutos você cadastra sua barbearia, adiciona seus serviços e define sua agenda de horários.', icon: <UserPlusIcon className="text-[#F97316]" size={32}/> },
                    { step: '2', title: 'Compartilhe seu link', desc: 'Divulgue insightbarber.com.br/sua-barbearia no Instagram, WhatsApp, Google — seus clientes já podem agendar.', icon: <Share2 className="text-[#FBBF24]" size={32}/> },
                    { step: '3', title: 'Veja os resultados', desc: 'Acompanhe agendamentos em tempo real, ative as automações de WhatsApp e deixe o sistema trabalhar por você.', icon: <TrendingUp className="text-[#F97316]" size={32}/> }
                ].map((item, i) => (
                    <div key={i} className="text-center group">
                        <div className="w-20 h-20 bg-[#1E293B] rounded-2xl flex items-center justify-center shadow-xl border border-[#334155] mx-auto mb-8 relative group-hover:border-[#F97316] transition-all group-hover:-translate-y-2">
                            <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#F97316] text-white font-black text-sm flex items-center justify-center border-4 border-[#0B0F19]">
                                {item.step}
                            </div>
                            {item.icon}
                        </div>
                        <h3 className="text-xl font-bold text-white mb-4">{item.title}</h3>
                        <p className="text-[#94A3B8] leading-relaxed">{item.desc}</p>
                    </div>
                ))}
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO 7 — PLANOS E PREÇOS */}
      <section id="pricing" className="py-24 px-6 bg-[#0B0F19] relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-4">
             <h2 className="text-3xl md:text-5xl font-extrabold text-white">Investimento que se paga no primeiro mês</h2>
             <p className="text-[#94A3B8] text-lg">Sem taxa de adesão. Cancele quando quiser.</p>
             
             {/* Toggle */}
             <div className="flex items-center justify-center gap-4 pt-8">
                <span className={`text-sm font-bold ${billingCycle === 'monthly' ? 'text-white' : 'text-[#94A3B8]'}`}>Mensal</span>
                <button 
                  onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                  className="w-14 h-7 bg-[#1E293B] rounded-full p-1 relative transition-colors border border-[#334155]"
                >
                    <motion.div 
                      animate={{ x: billingCycle === 'monthly' ? 0 : 28 }}
                      className="w-5 h-5 bg-[#F97316] rounded-full"
                    />
                </button>
                <span className={`text-sm font-bold flex items-center gap-2 ${billingCycle === 'yearly' ? 'text-white' : 'text-[#94A3B8]'}`}>
                    Anual <span className="bg-green-500/10 text-green-500 text-[10px] px-2 py-0.5 rounded-full border border-green-500/20">2 meses grátis</span>
                </span>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-end">
            {/* ESSENCIAL */}
            <div className="card-premium p-8 h-fit">
                <div className="text-sm font-bold text-[#94A3B8] uppercase tracking-widest mb-4">ESSENCIAL</div>
                <div className="mb-6">
                    <span className="text-4xl font-black">{billingCycle === 'monthly' ? 'R$ 59,90' : 'R$ 49,90'}</span>
                    <span className="text-[#94A3B8]">/mês</span>
                </div>
                <ul className="space-y-4 mb-8">
                    <PricingItem text="Até 2 profissionais" />
                    <PricingItem text="Agendamento online 24h" />
                    <PricingItem text="Notificações WhatsApp (24h/1h)" />
                    <PricingItem text="Controle financeiro básico" />
                    <PricingItem text="Relatório de caixa" />
                    <PricingItem text="Comissão por barbeiro" />
                    <PricingItem text="Pós-venda e reativação" inactive />
                    <PricingItem text="IA de insights" inactive />
                </ul>
                <button onClick={onStart} className="w-full py-4 rounded-xl border border-[#334155] hover:bg-white/5 font-bold transition-all">
                    Começar teste grátis
                </button>
            </div>

            {/* PROFISSIONAL */}
            <div className="card-premium p-10 relative overflow-hidden border-[#F97316] transform lg:scale-110 shadow-2xl shadow-[#F97316]/10 z-20">
                <div className="absolute top-4 right-4 bg-[#F97316] text-white text-[10px] font-black px-3 py-1 rounded-full uppercase">MAIS POPULAR</div>
                <div className="text-sm font-bold text-[#F97316] uppercase tracking-widest mb-4">PROFISSIONAL</div>
                <div className="mb-6">
                    <span className="text-5xl font-black">{billingCycle === 'monthly' ? 'R$ 99,90' : 'R$ 82,90'}</span>
                    <span className="text-[#94A3B8]">/mês</span>
                </div>
                <ul className="space-y-4 mb-10">
                    <PricingItem text="Até 5 profissionais" bold />
                    <PricingItem text="Tudo do Essencial" />
                    <PricingItem text="Pós-venda automático (2h)" />
                    <PricingItem text="Reativação 30 dias inativo" />
                    <PricingItem text="Instância própria WhatsApp" />
                    <PricingItem text="Programa de Fidelidade completo" />
                    <PricingItem text="IA: Chatbot de insights" />
                    <PricingItem text="Clube de assinatura" inactive />
                </ul>
                <button onClick={onStart} className="w-full py-4 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white font-black transition-all shadow-xl shadow-[#F97316]/30">
                    Garantir este plano
                </button>
            </div>

            {/* PREMIUM */}
            <div className="card-premium p-8 h-fit">
                <div className="text-sm font-bold text-[#94A3B8] uppercase tracking-widest mb-4">PREMIUM</div>
                <div className="mb-6">
                    <span className="text-4xl font-black">{billingCycle === 'monthly' ? 'R$ 149,90' : 'R$ 124,90'}</span>
                    <span className="text-[#94A3B8]">/mês</span>
                </div>
                <ul className="space-y-4 mb-8">
                    <PricingItem text="Profissionais ILIMITADOS" bold />
                    <PricingItem text="Tudo do Profissional" />
                    <PricingItem text="Clube de assinaturas" />
                    <PricingItem text="Templates IA ilimitados" />
                    <PricingItem text="Relatório semanal WhatsApp" />
                    <PricingItem text="Suporte Prioritário VIP" />
                </ul>
                <button onClick={onStart} className="w-full py-4 rounded-xl border border-[#334155] hover:bg-white/5 font-bold transition-all">
                    Escolher Premium
                </button>
            </div>
          </div>

          <div className="mt-12 text-center text-sm font-medium text-[#94A3B8] flex flex-wrap justify-center gap-x-8 gap-y-2">
            <span className="flex items-center gap-2 italic">🔒 14 dias grátis em qualquer plano</span>
            <span className="flex items-center gap-2 italic">Sem cartão de crédito</span>
            <span className="flex items-center gap-2 italic">Suporte real via WhatsApp</span>
          </div>
        </div>
      </section>

      {/* SEÇÃO 8 — DEPOIMENTOS */}
      <section id="testimonials" className="py-24 px-6 relative bg-gradient-to-b from-[#0B0F19] to-[#111827]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
             <h2 className="text-3xl md:text-5xl font-extrabold text-white">Barbearias que já transformaram o negócio</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
                { name: 'Marcos', shop: 'Barbearia do Marcos (SP)', comment: 'Antes eu ficava respondendo WhatsApp até meia-noite confirmando horário. Hoje o sistema faz tudo. Minha agenda está cheia há 3 semanas seguidas.' },
                { name: 'Rafael Souza', shop: 'Kings Barber (RJ)', comment: 'O programa de fidelidade foi um divisor de águas. Meus clientes voltam mais porque querem bater a meta de pontos. Aumentei a frequência de visita em quase 40%.' },
                { name: 'Diego Lima', shop: 'Barbearia Premium (MG)', comment: 'Cancelamento caiu 70% desde que ativei os lembretes de WhatsApp. O valor da mensalidade eu recupero só com isso no primeiro mês.' }
            ].map((d, i) => (
                <div key={i} className="card-premium p-8 flex flex-col gap-4 group">
                    <div className="flex gap-1">
                        {[1,2,3,4,5].map(i => <Star key={i} size={16} fill="#F97316" color="#F97316" />)}
                    </div>
                    <p className="text-lg italic text-[#F8FAFC]/90">"{d.comment}"</p>
                    <div className="flex items-center gap-3 mt-4">
                        <div className="w-10 h-10 rounded-full bg-[#F97316]/20 border border-[#F97316]/20 flex items-center justify-center font-bold text-[#F97316]">
                            {d.name.charAt(0)}
                        </div>
                        <div>
                            <p className="font-bold text-white">{d.name}</p>
                            <p className="text-[11px] text-[#94A3B8] uppercase font-bold tracking-wider">{d.shop}</p>
                        </div>
                    </div>
                </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEÇÃO 9 — CTA FINAL */}
      <section className="relative h-[600px] flex items-center justify-center px-6 overflow-hidden bg-[#0B0F19]">
        {/* Background Effects */}
        <div className="absolute inset-0 z-0 cta-glow"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[#1a0a00]/30 z-0"></div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-10">
            <motion.h2 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-5xl md:text-7xl font-extrabold text-white leading-tight"
            >
                Sua barbearia merece um sistema que trabalha por você
            </motion.h2>

            <motion.p 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-xl md:text-2xl text-[#94A3B8] max-w-2xl mx-auto"
            >
                Junte-se a mais de 1.200 barbearias que já transformaram a gestão com o Insight Barber.
            </motion.p>

            <motion.button 
              onClick={onStart}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="px-10 py-6 bg-[#F97316] hover:bg-[#EA580C] text-white font-black text-2xl rounded-2xl transition-all shadow-2xl shadow-[#F97316]/40 hover:scale-105 active:scale-95 group"
            >
                Criar minha conta grátis
                <ArrowRight size={28} className="inline-block ml-3 group-hover:translate-x-2 transition-transform" />
            </motion.button>

            <div className="flex justify-center gap-8 text-[#94A3B8] font-bold uppercase tracking-widest text-[11px]">
                <span className="flex items-center gap-1.5"><ShieldCheck size={16}/> 14 dias grátis</span>
                <span className="flex items-center gap-1.5"><Zap size={16}/> Sem cartão</span>
                <span className="flex items-center gap-1.5"><Award size={16}/> Configuração em 5 min</span>
            </div>
        </div>
      </section>

      {/* SEÇÃO 10 — FOOTER */}
      <footer className="py-20 px-6 bg-[#040608] border-t border-[#334155]/30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="text-center md:text-left space-y-4">
                <div className="flex items-center justify-center md:justify-start gap-2">
                    <img src={logoUrl} alt="Insight Barber" className="h-8 w-auto" />
                    <span className="text-2xl font-black">Insight Barber</span>
                </div>
                <p className="text-[#94A3B8] text-sm max-w-xs font-medium">Gestão inteligente e automação para barbearias de alto padrão.</p>
            </div>

            <div className="flex flex-wrap justify-center gap-x-12 gap-y-6">
                {[
                    { label: 'Plataforma', links: ['Funcionalidades', 'Planos', 'Casos de sucesso'] },
                    { label: 'Acesso', links: ['Entrar', 'Cadastrar', 'Esqueci senha'] },
                    { label: 'Suporte', links: ['WhatsApp', 'Instagram', 'Dúvidas'] }
                ].map((g, i) => (
                    <div key={i} className="text-center md:text-left space-y-4">
                        <p className="text-[#F97316] text-[10px] uppercase font-black tracking-widest">{g.label}</p>
                        <div className="flex flex-col gap-2">
                            {g.links.map((l, j) => <a key={j} href="#" className="text-sm font-medium text-[#94A3B8] hover:text-white transition-colors">{l}</a>)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
        <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-[#334155]/20 flex flex-col md:flex-row items-center justify-between text-[#94A3B8] text-[11px] font-bold uppercase tracking-widest gap-4">
            <p>© 2026 Insight Barber. Todos os direitos reservados.</p>
            <div className="flex gap-6">
                <a href="#">Privacidade</a>
                <a href="#">Termos</a>
            </div>
        </div>
      </footer>
    </div>
  );
};

const PricingItem: React.FC<{ text: string, inactive?: boolean, bold?: boolean }> = ({ text, inactive, bold }) => (
    <li className={`flex items-start gap-3 text-sm ${inactive ? 'opacity-30 line-through' : 'opacity-100'}`}>
        <Check size={18} className={`${inactive ? 'text-[#94A3B8]' : 'text-[#F97316]'} shrink-0`} />
        <span className={bold ? 'font-bold text-white' : 'font-medium'}>{text}</span>
    </li>
);

const CountUp: React.FC<{ end: number, prefix?: string, suffix?: string }> = ({ end, prefix, suffix }) => {
    const [count, setCount] = useState(0);
    const [isMounted, setIsMounted] = useState(false);
    const ref = React.useRef(null);
    const isInView = useInView(ref, { once: true });

    useEffect(() => {
        setIsMounted(true);
        if (isInView) {
            let start = 0;
            const duration = 2000;
            const increment = end / (duration / 16);
            
            const timer = setInterval(() => {
                start += increment;
                if (start >= end) {
                    setCount(end);
                    clearInterval(timer);
                } else {
                    setCount(start);
                }
            }, 16);
            return () => clearInterval(timer);
        }
    }, [isInView, end]);

    if (!isMounted) return null;

    return (
        <span ref={ref}>
            {prefix}{count === end ? end : count.toLocaleString(undefined, { maximumFractionDigits: (end % 1 === 0 ? 0 : 1) })}{suffix}
        </span>
    );
};

export { LandingPage };
