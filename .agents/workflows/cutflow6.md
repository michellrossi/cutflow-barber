---
description: Data Ranger 2
---

Objetivo
Um componente interativo que permite ao usuário selecionar um intervalo de datas (data de início até data de término).
Elementos Principais
1. Header com Datas Selecionadas

Dois campos com datas: 01/04/2026 (data inicial) e 30/04/2026 (data final)
Texto "até" entre os campos
Campo inicial com fundo laranja sólido e texto branco
Campo final com borda laranja e fundo transparente
Ícones de calendário em cada campo

2. Navegação de Mês

Setas < e > em ambos os lados para navegar entre meses
Texto central exibindo o mês e ano: "abril 2026"

3. Calendário

Grade de 7 colunas (dom, seg, ter, qua, qui, sex, sab)
Dias do mês organizados em linhas
Dias do mês anterior/posterior em cinza (desativados)
Dia atual (1) destacado com fundo laranja e texto branco
Dias selecionados no intervalo com fundo laranja claro/pastel
Dias disponíveis em cinza escuro

Comportamento

Ao clicar em uma data, ela se torna o início do intervalo
Ao clicar em uma segunda data, ela se torna o fim do intervalo
Todas as datas entre o início e fim são destacadas
Navegação mensal permite visualizar diferentes períodos
Os campos superiores atualizam conforme as datas são selecionadas

Paleta de Cores

Cor Primária (Laranja): #FF8C42 ou similar para CTA, seleções e destaque
Texto: Branco sobre laranja, cinza escuro em fundo claro
Fundo: Branco/cinza bem claro
Bordas: Laranja para campos de entrada
