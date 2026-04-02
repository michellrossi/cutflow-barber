---
description: Card Ranking
---

1. Estrutura Geral e Layout
- Container Principal: Um card retangular com fundo branco, bordas levemente arredondadas e um contorno (stroke) cinza muito fino. 
-Cabeçalho: No topo à esquerda, um ícone de "usuários" seguido pelo título "Top Clientes" em negrito, cor azul marinho escuro.
- Lista de Itens: Uma lista vertical de 5 linhas separadas por divisores horizontais cinzas muito claros.

2. Elementos de cada Linha (Ranking)
Cada linha deve conter os seguintes elementos distribuídos horizontalmente:
- Badge de Posição (Esquerda): Um quadrado com cantos arredondados contendo o número da posição (1º, 2º, etc.). As cores variam por posição:
     - 1º: Fundo dourado/amarelo vibrante.
     - 2º: Fundo cinza azulado médio.
     - 3º: Fundo laranja queimado/terroso.
     - 4º e demais: Fundo cinza azulado claro.

Informações Centrais:
- Nome do Cliente: Texto em peso médio, cor azul marinho.
- Barra de Progresso: Logo abaixo do nome, uma barra horizontal fina. A parte preenchida é laranja e o comprimento representa proporcionalmente o valor gasto (o 1º colocado tem a barra mais longa).
- Contagem de Visitas: Texto pequeno, cor cinza, posicionado abaixo da barra de progresso à direita (ex: "23 visitas"). 

Valor Monetário (Direita): O valor total em Reais (ex: R$ 1.369,00) em negrito e cor laranja, alinhado à direita no topo da linha. 

3. Especificações de Estilo (CSS/Tailwind)
- Cores principais: Laranja (#F16A1B para valores e barras), Azul Marinho (#1E293B para textos), Cinza Claro (#F1F5F9 para fundos e divisores). 
- Tipografia: Sans-serif moderna (Inter ou similar). 
- Espaçamento: Padding interno generoso no card; gap entre o badge e o conteúdo de texto. 
- Sombra: O card possui uma sombra (drop shadow) suave para dar profundidade.