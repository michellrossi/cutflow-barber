---
description: Date Range Picker
---

1. Estrutura Superior (Inputs de Data)
- Container de Seleção: Dois campos de entrada (inputs) posicionados lado a lado, conectados pela palavra "até" em cinza.
- Estilo do Input Ativo: Um botão com cantos arredondados, fundo laranja vibrante, texto branco exibindo a data inicial (ex: 01/04/2026) e um ícone de calendário à esquerda.
- Estilo do Input Inativo: Um botão com borda laranja, fundo branco e texto em laranja exibindo a data final.

2. Calendário Popover (Interface de Seleção)
- Janela Flutuante: Um card branco com bordas arredondadas e uma sombra suave (drop shadow) para efeito de elevação.
- Cabeçalho do Calendário: * Setas de navegação (esquerda/direita) circulares com contorno laranja claro.
     - Mês e ano centralizados (ex: abril 2026) em fonte sem serifa e peso médio.
- Grade de Dias:
     - Dias da semana (dom a sab) em cinza claro, fonte pequena e em negrito.
     - Dia Selecionado: Um círculo preenchido em laranja vibrante com o número em branco.
     - Intervalo Selecionado: Os dias entre a data inicial e final devem ter um fundo laranja muito claro (substituindo o verde água da imagem) para indicar a continuidade do período.
     - Dias Fora do Mês: Números em cinza muito claro para dias pertencentes ao mês anterior ou posterior.

3. Comportamento e Lógica 
- Estado: O componente deve gerenciar uma data de início (startDate) e uma data de fim (endDate).
- Interação: Ao clicar no primeiro input, o calendário abre; o primeiro clique no calendário define o início e o segundo define o fim do intervalo.
- Responsividade: Em dispositivos móveis, o calendário deve ocupar a largura total da tela ou alternar para uma visualização simplificada.