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
Dia padrão:
Fundo transparente
Texto escuro
Dia selecionado (início ou fim):
Fundo laranja sólido
Texto branco
Formato circular
Intervalo entre datas:
Fundo laranja claro (transparente)
Sem borda
Dia hover:
Fundo levemente destacado (laranja bem claro)
Dias fora do mês:
Texto cinza claro
Desabilitados

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