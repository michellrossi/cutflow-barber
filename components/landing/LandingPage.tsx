import React, { useEffect, useState, useRef } from 'react';
import { CheckCircle, ArrowRight, Calendar, Bell, BarChart3, Smartphone, Scissors, TrendingUp, Clock, Check, Link as LinkIcon, Palette, Users, UserPlus, Settings, Share2 } from 'lucide-react';

// Hook para detectar quando o elemento entra na tela
const useIntersectionObserver = () => {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1 } // 10% do elemento visível dispara a animação
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => observer.disconnect();
    }, []);

    return { ref, isVisible };
};

export const LandingPage: React.FC<{ onStart: () => void, onLogin: () => void }> = ({ onStart, onLogin }) => {
  // Refs for Scroll Animations
  const featuresSection = useIntersectionObserver();
  const howItWorksSection = useIntersectionObserver();

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 font-sans selection:bg-orange-500/30 overflow-x-hidden relative">
      
      {/* 1. TEXTURA DE FUNDO (+) - Aplicada globalmente via CSS no index.html */}
      <div className="absolute inset-0 bg-grid-pattern pointer-events-none z-0 opacity-100 mix-blend-overlay"></div>

      {/* 1. ÁREA DE LUZ (GLOW RADIAL INTENSO) - LADO ESQUERDO */}
      <div 
        className="absolute top-0 left-0 w-[60vw] h-[60vw] md:w-[800px] md:h-[800px] rounded-full pointer-events-none z-0"
        style={{
            background: 'radial-gradient(circle at center, rgba(245, 166, 35, 0.4) 0%, rgba(249, 115, 22, 0.15) 40%, transparent 70%)',
            filter: 'blur(80px)',
            transform: 'translate(-30%, -30%)'
        }}
      ></div>

      {/* Hero Section - Padding ajustado pois removemos a Navbar */}
      <section className="relative pt-20 pb-20 md:pt-32 md:pb-32 px-6">
        {/* Botão de Login Flutuante (Opcional, para não perder acesso total ao login) */}
        <div className="absolute top-6 right-6 z-50">
            <button onClick={onLogin} className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
              Já tenho conta? Entrar
            </button>
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
          
          {/* LADO ESQUERDO: TEXTO & CTA */}
          <div className="space-y-8 relative z-20">
            
            {/* Logo & Nome */}
            <div className="flex items-center gap-3 opacity-0 animate-fade-in" style={{ animationDelay: '0s' }}>
                <img src="https://iili.io/q2iUbkl.md.png" alt="CutFlow Logo" className="w-10 h-10 object-contain" />
                <span className="text-2xl font-bold text-white tracking-tight">CutFlow</span>
            </div>

            <div 
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold uppercase tracking-wide opacity-0 animate-fade-in"
              style={{ animationDelay: '0.2s' }}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
              </span>
              Sistema de Alta Performance
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold leading-[1.1] tracking-tight">
              <span className="block opacity-0 animate-slide-up" style={{ animationDelay: '0.4s' }}>Sua barbearia</span>
              <span className="block opacity-0 animate-slide-up" style={{ animationDelay: '0.6s' }}>no <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-400 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]">próximo nível</span></span>
            </h1>
            
            <p 
              className="text-lg text-slate-400 max-w-xl leading-relaxed opacity-0 animate-slide-up" 
              style={{ animationDelay: '0.8s' }}
            >
              Sistema completo de agendamento online. Seus clientes marcam horário 24h por dia, você só se preocupa em cortar.
            </p>

            <div 
              className="flex flex-col sm:flex-row gap-4 opacity-0 animate-slide-up"
              style={{ animationDelay: '1s' }}
            >
              <button 
                onClick={onStart}
                className="px-8 py-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg transition-all hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/30 flex items-center justify-center gap-2 group"
              >
                Começar Grátis <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform"/>
              </button>
            </div>
          </div>

          {/* LADO DIREITO: MOCKUP FLUTUANTE 3D */}
          {/* Wrap animations properly to avoid conflicts: Parent handles entry (Fade/Slide), Child handles Float */}
          <div 
            className="relative hidden lg:block perspective-1000 opacity-0 animate-slide-in-right z-10"
            style={{ animationDelay: '0.8s' }}
          >
            {/* Phone Container with Float Animation */}
            <div 
                className="relative mx-auto w-[320px] h-[640px] bg-[#121212] rounded-[3.5rem] border-[10px] border-[#1a1a1a] shadow-2xl animate-float"
                style={{ 
                    boxShadow: '0 50px 100px -20px rgba(0, 0, 0, 0.7), 0 0 40px rgba(249, 115, 22, 0.15)',
                    transformStyle: 'preserve-3d',
                    transform: 'rotateY(-12deg) rotateX(5deg)'
                }}
            >
                {/* Gloss/Reflection Effect */}
                <div className="absolute inset-0 rounded-[3rem] bg-gradient-to-tr from-white/5 to-transparent pointer-events-none z-30"></div>

                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 h-7 w-36 bg-[#1a1a1a] rounded-b-2xl z-20"></div>

                {/* --- 5. INTERFACE DENTRO DO CELULAR --- */}
                <div className="w-full h-full bg-[#18181b] rounded-[3rem] overflow-hidden flex flex-col relative z-10">
                    
                    {/* App Header */}
                    <div className="bg-[#27272a] p-6 pt-12 pb-6 rounded-b-3xl shadow-lg border-b border-white/5">
                        <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-full bg-orange-500 text-white font-bold flex items-center justify-center text-lg border-2 border-[#18181b] shadow-md">MK</div>
                             <div>
                                 <h3 className="font-bold text-white leading-tight">Mustache King</h3>
                                 <p className="text-orange-500 text-xs font-medium flex items-center gap-1">
                                     <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                     Aberto agora
                                 </p>
                             </div>
                        </div>
                    </div>

                    {/* App Body */}
                    <div className="p-5 space-y-4">
                        {/* Service Card 1 */}
                        <div className="bg-[#27272a] p-4 rounded-2xl border border-white/5 flex items-center justify-between group cursor-default hover:bg-[#323236] transition-colors">
                             <div>
                                 <p className="font-medium text-white text-sm">Corte Degradê</p>
                                 <p className="text-xs text-slate-500">45 min</p>
                             </div>
                             <span className="text-orange-500 font-bold text-sm">R$ 35</span>
                        </div>
                         {/* Service Card 2 */}
                         <div className="bg-[#27272a] p-4 rounded-2xl border border-white/5 flex items-center justify-between cursor-default hover:bg-[#323236] transition-colors">
                             <div>
                                 <p className="font-medium text-white text-sm">Barba Completa</p>
                                 <p className="text-xs text-slate-500">30 min</p>
                             </div>
                             <span className="text-orange-500 font-bold text-sm">R$ 50</span>
                        </div>
                        {/* Service Card 3 (Active Style) */}
                        <div className="bg-gradient-to-r from-slate-800 to-slate-800 p-4 rounded-2xl border border-orange-500/50 shadow-[0_0_20px_rgba(249,115,22,0.15)] flex items-center justify-between cursor-default relative overflow-hidden">
                             <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500"></div>
                             <div>
                                 <p className="font-medium text-white text-sm">Corte + Barba</p>
                                 <p className="text-xs text-slate-500">60 min</p>
                             </div>
                             <span className="text-orange-500 font-bold text-sm">R$ 65</span>
                        </div>

                        {/* Time Slots */}
                        <div className="pt-4">
                             <p className="text-xs text-slate-500 mb-3 font-medium">Horários disponíveis hoje</p>
                             <div className="flex gap-2">
                                 <div className="px-3 py-2 rounded-xl bg-[#27272a] text-slate-400 text-xs font-medium border border-white/5">09:00</div>
                                 <div className="px-3 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold shadow-lg shadow-orange-500/30 scale-105 border border-orange-400">10:00</div>
                                 <div className="px-3 py-2 rounded-xl bg-[#27272a] text-slate-400 text-xs font-medium border border-white/5">14:00</div>
                                 <div className="px-3 py-2 rounded-xl bg-[#27272a] text-slate-400 text-xs font-medium border border-white/5 opacity-50 line-through">15:00</div>
                             </div>
                        </div>
                    </div>

                    {/* Bottom Nav Simulation */}
                    <div className="mt-auto p-6 bg-[#27272a] flex justify-around items-center border-t border-white/5">
                         <div className="w-6 h-6 rounded bg-slate-700/50"></div>
                         <div className="w-6 h-6 rounded bg-orange-500/20"></div>
                         <div className="w-6 h-6 rounded bg-slate-700/50"></div>
                    </div>
                </div>

                {/* --- 6. ELEMENTOS FLUTUANTES ANIMADOS (Fora do celular, mas dentro do container 3D) --- */}
                
                {/* Card 1: New Appointment (Left) - Adjusted position to avoid overlap */}
                <div 
                    className="absolute top-24 -left-36 bg-[#1e293b]/95 backdrop-blur-md p-4 rounded-2xl border border-slate-700/50 shadow-2xl flex items-center gap-3 animate-float-delayed opacity-0 animate-scale-in w-56 z-50"
                    style={{ 
                        animationDelay: '1.2s',
                        transform: 'translateZ(50px)' // Pops out more
                    }}
                >
                    <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center shrink-0">
                        <Calendar size={18} />
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Novo agendamento</p>
                        <p className="font-bold text-sm text-white">Corte + Barba às 14h</p>
                    </div>
                </div>

                {/* Card 2: Stats (Right) - Adjusted position to avoid overlap */}
                <div 
                    className="absolute bottom-32 -right-36 bg-[#1e293b]/95 backdrop-blur-md p-4 rounded-2xl border border-slate-700/50 shadow-2xl flex items-center gap-3 animate-float opacity-0 animate-scale-in w-56 z-50"
                    style={{ 
                        animationDelay: '1.5s',
                        transform: 'translateZ(70px)' // Stronger pop out
                    }}
                >
                    <div className="w-10 h-10 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center shrink-0">
                        <TrendingUp size={18} />
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Crescimento</p>
                        <p className="font-bold text-sm text-white flex items-center gap-1">
                            +32% <span className="text-[10px] text-green-500 bg-green-500/10 px-1 rounded">HOJE</span>
                        </p>
                    </div>
                </div>

            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 relative border-t border-white/5 bg-[#0B0F19]">
         <div className="max-w-7xl mx-auto px-6 relative z-10" ref={featuresSection.ref}>
           
           {/* Header */}
           <div className="text-center mb-16">
               <span className="text-orange-500 font-bold tracking-widest text-xs uppercase mb-4 block">Funcionalidades</span>
               <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
                  Tudo que você precisa para <br className="hidden md:block"/>
                  <span className="text-orange-500">crescer seu negócio</span>
               </h2>
               <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                  Ferramentas profissionais desenvolvidas especialmente para barbearias modernas.
               </p>
           </div>

           {/* Grid Cards */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Row 1 */}
              <FeatureCard 
                icon={<LinkIcon size={24} className="text-orange-500" />}
                title="Link Exclusivo"
                description="Seu link personalizado para compartilhar nas redes sociais e WhatsApp."
                delay={0}
                isVisible={featuresSection.isVisible}
              />

              <FeatureCard 
                icon={<Calendar size={24} className="text-orange-500" />}
                title="Agenda Online 24h"
                description="Clientes agendam a qualquer momento. Sem ligações, sem espera."
                delay={150}
                isVisible={featuresSection.isVisible}
              />

              <FeatureCard 
                icon={<Palette size={24} className="text-orange-500" />}
                title="Personalização Total"
                description="Cores, logo e serviços. Deixe a cara da sua barbearia."
                delay={300}
                isVisible={featuresSection.isVisible}
              />

              <FeatureCard 
                icon={<Bell size={24} className="text-orange-500" />}
                title="Notificações Automáticas"
                description="Lembretes por WhatsApp para reduzir faltas."
                delay={450}
                isVisible={featuresSection.isVisible}
              />

              {/* Row 2 */}
              <FeatureCard 
                icon={<BarChart3 size={24} className="text-orange-500" />}
                title="Relatórios Inteligentes"
                description="Acompanhe faturamento, serviços mais pedidos e horários de pico."
                delay={600}
                isVisible={featuresSection.isVisible}
              />

              <FeatureCard 
                icon={<Smartphone size={24} className="text-orange-500" />}
                title="100% Responsivo"
                description="Funciona perfeitamente no celular dos seus clientes."
                delay={750}
                isVisible={featuresSection.isVisible}
              />

              <FeatureCard 
                icon={<Clock size={24} className="text-orange-500" />}
                title="Gestão de Horários"
                description="Configure folgas, horários de almoço e dias especiais."
                delay={900}
                isVisible={featuresSection.isVisible}
              />

              <FeatureCard 
                icon={<Users size={24} className="text-orange-500" />}
                title="Multi-Barbeiros"
                description="Cadastre sua equipe e gerencie agendas individuais."
                delay={1050}
                isVisible={featuresSection.isVisible}
              />

           </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-[#0B0F19] relative border-t border-white/5">
         <div className="max-w-7xl mx-auto px-6 relative z-10" ref={howItWorksSection.ref}>
            <div className="text-center mb-16">
               <span className="text-orange-500 font-bold tracking-widest text-xs uppercase mb-4 block">Como Funciona</span>
               <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Simples assim</h2>
               <p className="text-slate-400 text-lg max-w-2xl mx-auto">Comece a receber agendamentos online em poucos minutos.</p>
            </div>

            <div className="relative grid grid-cols-1 md:grid-cols-4 gap-8">
               {/* Connecting Line (Desktop) */}
               <div className="hidden md:block absolute top-[4rem] left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent z-0"></div>

               {/* Step 1 */}
               <div 
                 className={`relative z-10 flex flex-col items-center text-center group transition-all duration-700 ${howItWorksSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                 style={{ transitionDelay: '0ms' }}
               >
                  <div className="w-32 h-32 rounded-3xl bg-[#1A1F2E] border-2 border-slate-700 flex items-center justify-center mb-6 relative shadow-2xl group-hover:-translate-y-2 transition-transform duration-300 group-hover:border-orange-500/50">
                     <div className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-orange-500 text-white font-bold text-base flex items-center justify-center border-4 border-[#0B0F19] shadow-lg z-20">01</div>
                     <UserPlus className="text-orange-500 drop-shadow-lg" size={48} strokeWidth={1.5} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">Cadastre sua barbearia</h3>
                  <p className="text-slate-300 text-sm leading-relaxed px-4">Em menos de 2 minutos você cria sua conta gratuitamente.</p>
               </div>

               {/* Step 2 */}
               <div 
                 className={`relative z-10 flex flex-col items-center text-center group transition-all duration-700 ${howItWorksSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                 style={{ transitionDelay: '300ms' }}
               >
                  <div className="w-32 h-32 rounded-3xl bg-[#1A1F2E] border-2 border-slate-700 flex items-center justify-center mb-6 relative shadow-2xl group-hover:-translate-y-2 transition-transform duration-300 delay-75 group-hover:border-orange-500/50">
                     <div className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-orange-500 text-white font-bold text-base flex items-center justify-center border-4 border-[#0B0F19] shadow-lg z-20">02</div>
                     <Settings className="text-orange-500 drop-shadow-lg" size={48} strokeWidth={1.5} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">Configure seus serviços</h3>
                  <p className="text-slate-300 text-sm leading-relaxed px-4">Adicione serviços, preços, horários e personalize seu perfil.</p>
               </div>

               {/* Step 3 */}
               <div 
                 className={`relative z-10 flex flex-col items-center text-center group transition-all duration-700 ${howItWorksSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                 style={{ transitionDelay: '600ms' }}
               >
                  <div className="w-32 h-32 rounded-3xl bg-[#1A1F2E] border-2 border-slate-700 flex items-center justify-center mb-6 relative shadow-2xl group-hover:-translate-y-2 transition-transform duration-300 delay-150 group-hover:border-orange-500/50">
                     <div className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-orange-500 text-white font-bold text-base flex items-center justify-center border-4 border-[#0B0F19] shadow-lg z-20">03</div>
                     <Share2 className="text-orange-500 drop-shadow-lg" size={48} strokeWidth={1.5} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">Compartilhe seu link</h3>
                  <p className="text-slate-300 text-sm leading-relaxed px-4">Divulgue seu link exclusivo nas redes sociais e WhatsApp.</p>
               </div>

               {/* Step 4 */}
               <div 
                 className={`relative z-10 flex flex-col items-center text-center group transition-all duration-700 ${howItWorksSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                 style={{ transitionDelay: '900ms' }}
               >
                  <div className="w-32 h-32 rounded-3xl bg-[#1A1F2E] border-2 border-slate-700 flex items-center justify-center mb-6 relative shadow-2xl group-hover:-translate-y-2 transition-transform duration-300 delay-200 group-hover:border-orange-500/50">
                     <div className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-orange-500 text-white font-bold text-base flex items-center justify-center border-4 border-[#0B0F19] shadow-lg z-20">04</div>
                     <TrendingUp className="text-orange-500 drop-shadow-lg" size={48} strokeWidth={1.5} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">Veja os resultados</h3>
                  <p className="text-slate-300 text-sm leading-relaxed px-4">Receba agendamentos automaticamente e foque no que importa.</p>
               </div>
            </div>
         </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="max-w-5xl mx-auto bg-gradient-to-r from-orange-600 to-orange-500 rounded-3xl p-12 text-center relative overflow-hidden shadow-2xl shadow-orange-900/50 group">
           <div className="absolute inset-0 bg-grid-pattern opacity-10 group-hover:opacity-20 transition-opacity"></div>
           <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
           
           <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 relative z-10">Pronto para modernizar?</h2>
           <p className="text-orange-100 text-lg mb-8 max-w-2xl mx-auto relative z-10">Crie sua conta gratuitamente agora mesmo e comece a receber agendamentos online em menos de 5 minutos.</p>
           <button 
             onClick={onStart}
             className="px-10 py-4 bg-white text-orange-600 font-bold rounded-full text-lg shadow-2xl hover:bg-slate-50 transition-all relative z-10 hover:scale-105 active:scale-95"
           >
             Criar Minha Conta Grátis
           </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-white/5 text-center text-slate-500 text-sm bg-[#0B0F19]">
        <p>© 2024 CutFlow. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};

const FeatureCard: React.FC<{ icon: React.ReactNode, title: string, description: string, delay?: number, isVisible?: boolean }> = ({ icon, title, description, delay = 0, isVisible = true }) => (
  <div 
    className={`bg-[#1A1F2E] p-8 rounded-2xl border border-slate-700 hover:border-orange-500/50 transition-all duration-700 group hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-500/5 flex flex-col items-start text-left ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
    style={{ transitionDelay: `${delay}ms` }}
  >
    <div className="mb-6 w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/10 group-hover:bg-orange-500/20 transition-colors">
      {icon}
    </div>
    <h3 className="text-lg font-bold mb-3 text-white group-hover:text-orange-500 transition-colors">{title}</h3>
    <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
  </div>
);