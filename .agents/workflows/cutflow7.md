---
description: Data Ranger 3
---

Crie um componente de seletor de intervalo de datas (date range picker) moderno para aplicação web.

🎯 Objetivo

Permitir que o usuário selecione uma data inicial e uma data final, com feedback visual claro e interação simples.

🧩 Estrutura do componente
1. Campos principais (input range)
Dois campos lado a lado:
Data inicial
Data final
Entre eles, exibir o texto: "até"
Estilo:
Borda arredondada (border-radius: 12px)
Altura média (40–48px)
Ícone de calendário à esquerda dentro do input
Texto centralizado verticalmente
Cor principal: laranja
Fundo branco ou cinza muito claro
Borda:
Normal: cinza claro
Ativo/focado: laranja
Formato da data: dd/mm/yyyy

📅 2. Comportamento ao clicar
Ao clicar em qualquer campo:
Abrir um dropdown com calendário (datepicker)
Posicionado abaixo do input
Com sombra suave (box-shadow)
Cantos arredondados

📆 3. Calendário (Datepicker)
Header:
Exibir: mês + ano (ex: "abril 2026")
Botões:
Esquerda: voltar mês
Direita: avançar mês
Grade de dias:
7 colunas (dom → sab)
Nomes abreviados no topo:
dom, seg, ter, qua, qui, sex, sab

🎨 4. Estados visuais (CRÍTICO)
A. Dias não selecionados (estado padrão)
Sem cor de fundo
Fundo: transparente
Texto: cinza médio (#6B7280)
Sem borda
Hover:
Fundo: laranja bem claro (opacity baixa, tipo #F59E0B20)

B. Dia atual (hoje)
Fundo: laranja muito suave (#F59E0B20 ou similar)
Texto: laranja mais escuro (#F59E0B)
Formato: levemente arredondado
Não deve parecer selecionado

C. Dias selecionados (início e fim do range)
Fundo: laranja sólido (#F59E0B)
Texto: branco
Formato: circular ou arredondado
Destaque forte (prioridade visual máxima)

4. Intervalo entre datas
Fundo: laranja claro (ex: #F59E0B30)
Texto: padrão (escuro)
Sem borda
Não usar o mesmo laranja do selecionado
⚠️ Regra crítica de prioridade visual

Se um dia for:

Hoje E selecionado → usar estilo de selecionado, não de hoje
Nunca aplicar múltiplos estilos ao mesmo tempo
🧩 Correção comportamental
Apenas:
Data inicial
Data final
Intervalo entre elas

👉 Todo o resto deve parecer neutro

🧠 5. Lógica de seleção
Primeiro clique → define data inicial
Segundo clique → define data final
Intervalo entre elas deve ser destacado automaticamente

Regras:

Se o usuário clicar novamente após selecionar o range:
Reinicia seleção
Não permitir data final menor que inicial

⚡ 6. Feedback visual imediato
Atualizar inputs assim que datas forem escolhidas
Exemplo:
03/04/2026 até 30/04/2026

🎯 7. Diretrizes de design
Cor principal: laranja (#F59E0B ou similar)
Estilo moderno, clean
Espaçamento confortável
Microinterações suaves (hover, clique)