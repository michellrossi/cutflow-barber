---
description: Nova Aba
---

Sempre que gerar ou editar componentes de painel (Panels), siga rigorosamente este padrão de layout e estilo:

1. Cabeçalho e Descrição (Alinhamento à Esquerda)
Estrutura: O título e a descrição devem estar no topo, alinhados à esquerda.

Título: Use a tag h2 com as classes text-2xl font-bold text-slate-900 mb-1.

Descrição: Use a tag p com as classes text-[#6b7d99] text-sm font-medium.

Container: Envolva o cabeçalho em uma div com mb-8. Nunca use mx-auto ou text-center no container principal.

2. Sub-menu Estilo 'Interruptor' (Tabs)
Container do Menu: Deve possuir as classes flex gap-2 p-1 bg-slate-100 rounded-lg w-fit mb-8 overflow-x-auto no-scrollbar max-w-full.

Botões (Tabs):

Classes Base: flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-bold transition-all whitespace-nowrap.

Estado Ativo: bg-white text-orange-600 shadow-sm.

Estado Inativo: text-slate-500 hover:text-slate-700.

Ícones: Sempre utilize ícones da biblioteca lucide-react com size={18} dentro dos botões.

3. Bordas e Arredondamento
Padrão: Utilize rounded-xl para containers de conteúdo e cards.

Exceção: Evite rounded-full em botões retangulares ou filtros; use rounded-lg ou rounded-md para manter o aspecto 'quadrado com pontas suaves'."

4. Cards
a. Estrutura e Container:

Fundo e Borda: Fundo branco sólido (bg-white), bordas arredondadas amplas (rounded-2xl) e uma borda cinza muito sutil (border-slate-200).

Sombra: Sombra suave e difusa (shadow-sm).

Espaçamento: Padding generoso e uniforme em todos os lados (p-6).

b. Cabeçalho do Card (Linha Superior):

Alinhamento: O ícone e o título (label) devem estar posicionados lado a lado, na mesma linha, com alinhamento vertical centralizado entre eles (flex items-center gap-3).

Ícone: Deve estar centralizado dentro de um círculo perfeito (rounded-full). O círculo deve ter um fundo colorido muito suave (tonalidade 50, ex: bg-orange-50) e o ícone deve ter a cor correspondente em tom forte (tonalidade 600, ex: text-orange-600).

Título (Label): Posicionado ao lado do ícone, em cinza médio, fonte pequena, negrito e todo em maiúsculas com leve espaçamento entre letras (text-sm font-bold text-slate-500 uppercase tracking-wider).

c. Conteúdo de Texto (Alinhado à Esquerda):

Valor Principal: Posicionado abaixo da linha do cabeçalho, deve ser o elemento de maior destaque, usando uma fonte extra negrita/preta e tamanho grande (text-3xl font-black text-slate-900).

Subtítulo/Descrição: Logo abaixo do valor, uma linha de texto pequena, em fonte padrão (sem caixa alta) e na cor cinza claro (text-sm text-slate-500).