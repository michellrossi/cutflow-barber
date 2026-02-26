✂️ CutFlow Barber
O CutFlow Barber é uma solução completa de Software as a Service (SaaS) para gestão de barbearias. A plataforma permite que donos de barbearias gerenciem suas equipes, serviços e cupons, enquanto oferece aos clientes um fluxo de agendamento online fluido e intuitivo.

🚀 Funcionalidades
Agendamento Online 24h: Fluxo de reserva para clientes com seleção de serviço, profissional, data e horário.

Painel Administrativo: Gestão completa de profissionais, catálogo de serviços e configurações de design.

Painel do Barbeiro: Visão simplificada da agenda e ganhos diários para os colaboradores.

Sistema de Cupons: Criação e validação de descontos fixos ou percentuais.

Gestão de Bloqueios: Permite bloquear horários específicos para folgas ou compromissos médicos.

Customização Visual: Alteração de cores primárias, secundárias e logotipo diretamente pelo painel.

🛠️ Tecnologias Utilizadas
Frontend: React 19 com TypeScript.

Build Tool: Vite.

Backend & Auth: Supabase (PostgreSQL + GoTrue).

Estilização: Tailwind CSS.

Ícones: Lucide React.

📦 Configuração Local
Pré-requisitos: Node.js instalado.

Clone o repositório:

Bash
git clone [url-do-seu-repositorio]
cd cutflow-barber
Instale as dependências:

Bash
npm install
Configure as variáveis de ambiente:
Crie um arquivo .env.local na raiz do projeto e adicione suas credenciais do Supabase:

Snippet de código
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anon_do_supabase
Inicie o servidor de desenvolvimento:

Bash
npm run dev
🌐 Deploy na Vercel
O projeto está configurado para deploy automático na Vercel utilizando o arquivo vercel.json para garantir o correto funcionamento das rotas do React Router.

Importante: Ao realizar o deploy, certifique-se de configurar as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no painel da Vercel para evitar erros de inicialização.

📄 Licença
Este projeto é privado. Todos os direitos reservados.