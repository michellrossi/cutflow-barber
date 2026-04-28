import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useSpring, useTransform, useInView } from 'framer-motion';
import {
  Scissors, ArrowRight, Play, Check, CheckCircle2,
  MessageSquare, Calendar, Sparkles, TrendingUp,
  Target, Users, BarChart3, Palette, ShieldCheck,
  Ticket, LayoutDashboard, Share2, Star, Zap,
  Smartphone, Briefcase, Award, Plus, UserPlus as UserPlusIcon,
  ChevronRight, Instagram, Facebook, Twitter, Shield, ZapIcon
} from 'lucide-react';

export const LandingPage: React.FC<{ onStart: () => void, onLogin: () => void }> = ({ onStart, onLogin }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const logoUrl = "https://iili.io/BRAwKWg.md.png";

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#ff6a00]/30 overflow-x-hidden">
      {/* Navbar Fixa Premium */}
      <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 border-b ${isScrolled ? 'bg-black/90 backdrop-blur-xl py-4 border-white/10' : 'bg-transparent py-6 border-transparent'
        }`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="Logo" className="h-10 w-auto brightness-0 invert" />
            <span className="text-xl font-black tracking-tighter uppercase">CutFlow</span>
          </div>

          <div className="hidden lg:flex items-center gap-10">
            {['Funcionalidades', 'Benefícios', 'Preços', 'FAQ'].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60 hover:text-[#ff6a00] transition-colors">
                {item}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-6">
            <button onClick={onLogin} className="text-[11px] font-bold uppercase tracking-[0.2em] text-white hover:text-[#ff6a00] transition-colors">
              Entrar
            </button>
            <button
              onClick={onStart}
              className="px-8 py-3 bg-[#ff6a00] text-black font-black text-[11px] uppercase tracking-widest rounded-sm hover:bg-[#e55f00] transition-all"
            >
              Começar Agora
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section Dramática */}
      <section className="relative h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://i.freeimage.host/Bi588ss.png"
            alt="Luxury Barbershop"
            className="w-full h-full object-cover scale-105 animate-slow-zoom grayscale opacity-50"
          />
          <div className="absolute inset-0 bg-black/75"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/60 to-transparent"></div>
        </div>

        <div className="relative z-10 container mx-auto px-6 md:px-12 lg:px-24">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#ff6a00]/10 border border-[#ff6a00]/20 rounded-full mb-8">
              <Zap size={14} className="text-[#ff6a00] fill-[#ff6a00]" />
              <span className="text-[10px] font-black text-[#ff6a00] uppercase tracking-[0.2em]">O Futuro da Gestão</span>
            </div>

            <h1 className="text-6xl md:text-8xl lg:text-9xl font-black text-white leading-[0.85] mb-8 tracking-tighter uppercase">
              DOMINE SUA <br />
              <span className="text-[#ff6a00] italic">BARBEARIA.</span>
            </h1>

            <p className="text-[#b3b3b3] text-xl md:text-2xl max-w-2xl mb-12 font-medium leading-relaxed">
              Agendamento Inteligente, Gestão Financeira e Automação de WhatsApp. <br />
              Tudo o que você precisa para escalar seu negócio de luxo.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              <button
                onClick={onStart}
                className="group w-full sm:w-auto px-12 py-6 bg-[#ff6a00] text-black font-black text-xs uppercase tracking-[0.2em] rounded-sm transition-all hover:shadow-[0_0_50px_rgba(255,106,0,0.3)] flex items-center justify-center gap-3"
              >
                TESTAR GRÁTIS <ArrowRight size={18} />
              </button>
              <button className="w-full sm:w-auto px-12 py-6 bg-transparent border border-white/20 text-white font-black text-xs uppercase tracking-[0.2em] rounded-sm hover:bg-white hover:text-black transition-all">
                CONHECER FLUXO
              </button>
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30">
          <span className="text-[10px] font-black uppercase tracking-[0.5em] rotate-90 mb-4">Scroll</span>
          <div className="w-[1px] h-12 bg-gradient-to-b from-[#ff6a00] to-transparent"></div>
        </div>
      </section>

      {/* Seção de Funcionalidades - Grid Dark */}
      <section id="funcionalidades" className="py-32 bg-[#050505] relative border-y border-white/5">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-end justify-between mb-24 gap-8">
            <div className="max-w-2xl">
              <h2 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tighter uppercase leading-none">
                Garantia de <br /><span className="text-[#ff6a00]">Performance Total.</span>
              </h2>
              <p className="text-[#b3b3b3] text-lg font-medium">
                Sincronização em tempo real entre sua agenda, o WhatsApp dos clientes e o seu financeiro.
              </p>
            </div>
            <div className="hidden lg:block w-32 h-[1px] bg-white/10 mb-6"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-1px bg-white/5 border border-white/5">
            {[
              { icon: Smartphone, title: 'Chatbot AI', desc: 'Sua barbearia agendando sozinha pelo WhatsApp 24h por dia.' },
              { icon: BarChart3, title: 'Financeiro', desc: 'Fluxo de caixa, comissões automáticas e métricas de lucro real.' },
              { icon: Target, title: 'Metas', desc: 'Defina e acompanhe metas de faturamento para seus barbeiros.' },
              { icon: Ticket, title: 'Fidelidade', desc: 'Cartão fidelidade digital e cupons automáticos para retenção.' },
              { icon: ShieldCheck, title: 'Gestão SaaS', desc: 'Painel completo para gerenciar múltiplas unidades com facilidade.' },
              { icon: Star, title: 'Branding', desc: 'Uma agenda com o SEU visual, elevando o valor percebido da sua marca.' },
            ].map((feature, i) => (
              <div key={i} className="p-12 bg-[#050505] hover:bg-white/[0.02] transition-all group">
                <feature.icon className="text-[#ff6a00] mb-8 group-hover:scale-110 transition-transform" size={40} />
                <h3 className="text-xl font-black text-white mb-4 uppercase tracking-tight">{feature.title}</h3>
                <p className="text-[#b3b3b3] text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-32 bg-[#ff6a00] relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="container mx-auto px-6 text-center relative z-10">
          <h2 className="text-6xl md:text-8xl font-black text-black mb-12 tracking-tighter uppercase leading-[0.85]">
            PRONTO PARA O <br />PRÓXIMO NÍVEL?
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
            <button
              onClick={onStart}
              className="px-16 py-7 bg-black text-[#ff6a00] font-black text-sm uppercase tracking-[0.3em] rounded-sm hover:scale-105 transition-all shadow-2xl"
            >
              ASSINAR AGORA
            </button>
            <button className="px-16 py-7 bg-transparent border-2 border-black text-black font-black text-sm uppercase tracking-[0.3em] rounded-sm hover:bg-black hover:text-[#ff6a00] transition-all">
              FALAR COM VENDAS
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 bg-black border-t border-white/5">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="Logo" className="h-8 w-auto brightness-0 invert" />
            <span className="text-lg font-black tracking-tighter uppercase">CutFlow</span>
          </div>

          <div className="flex gap-12">
            {['Privacidade', 'Termos', 'Suporte', 'Instagram'].map(item => (
              <a key={item} href="#" className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-[#ff6a00] transition-colors">{item}</a>
            ))}
          </div>

          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">© 2026 CutFlow Solutions.</p>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes slow-zoom {
            0% { transform: scale(1); }
            100% { transform: scale(1.1); }
        }
        .animate-slow-zoom {
            animation: slow-zoom 20s ease-in-out infinite alternate;
        }
      `}} />
    </div>
  );
};

