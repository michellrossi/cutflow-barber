---
description: Date Range Picker
---

Crie um componente de Seleção de Período de Datas (Date Range Picker) focado em um design extremamente limpo e minimalista, evitando poluição visual.

Estrutura Geral:

O calendário deve ter controles para avançar e retroceder os meses e exibir o Mês e Ano por extenso no topo.

Abaixo do controle de meses, deve haver um cabeçalho com os dias da semana (D, S, T, Q, Q, S, S) usando uma fonte pequena, em negrito e na cor cinza claro.

A grade de dias deve ter 7 colunas, e os botões de cada dia devem ter bordas levemente arredondadas (ex: 8px) e proporção quadrada (aspect-square).

Lógica de Cores e Estados dos Dias (MUITO IMPORTANTE):
A cor primária do sistema é Laranja (ex: #F59E0B). Siga rigorosamente as regras abaixo para a renderização dos dias na grade para evitar poluição visual:

Dias de meses anteriores/posteriores: Fundo transparente, texto cinza muito claro (ex: #CBD5E1), cursor default (sem interação).

Dias comuns (não selecionados): Fundo transparente, texto em cinza médio (ex: #64748B). Devem receber um efeito de hover sutil com fundo cinza claro (ex: bg-slate-100).

Dia Atual (Hoje): Não deve ter cor de preenchimento. Fundo deve ser "transparent". O texto deve receber a cor primária, e o contorno do botão deve ter uma borda de 1px sólida na cor primária.

Dias Selecionados (Data de Início e Data Final): Devem ser os únicos elementos com peso visual forte. Fundo preenchido com a cor primária sólida e o texto na cor branca.

Dias no Intervalo (In-between): Dias que caem entre a data de início e a data final devem ter um fundo de preenchimento ultra leve na cor primária (cerca de 10% a 15% de opacidade máxima) e o texto deve ser cinza escuro (ex: #334155) para contraste.

A prioridade de renderização deve garantir que, se o "Dia Atual (Hoje)" for clicado, ele assuma o estado de "Dia Selecionado" (fundo sólido laranja e texto branco).
