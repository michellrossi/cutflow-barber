---
description: Filtros
---

1. Estrutura e Layout:
•	Container: Lista horizontal com rolagem lateral oculta (flex, gap-2, overflow-x-auto).
•	Item (Botão): Deve conter o nome do filtro.
•	Base: Todos os botões devem ter fundo branco fixo (bg-white) e uma transição suave para mudanças de estado.
2. Estados Visual (CSS/Tailwind):
•	Estado Inativo (Não selecionado):
o	Borda fina em cinza claro (border-slate-200).
o	Cantos levemente arredondados (rounded-md).
o	Texto em cinza médio (text-slate-500).
•	Estado Ativo (Selecionado):
o	Sem preenchimento de cor: O fundo deve permanecer branco.
o	Borda de destaque: Aumentar a espessura da borda (border-2) e aplicar a cor laranja
o	Cor do Texto: O texto deve mudar para a cor laranja
o	Formato: deve manter o mesmo formato com cantos levemente arredondados
o	Sombra: Adicionar uma sombra leve (shadow-sm) para profundidade.
