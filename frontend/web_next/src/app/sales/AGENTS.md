# AGENTS - Vendas / Comercial

## Escopo
Fluxo comercial de orcamentos, pedidos, faturamento e emissao fiscal por origem.

## Objetivo
Garantir rastreabilidade e regras de status em todo o ciclo comercial.

## Dependencias e Fontes
- Pedidos: create/list/get/update/confirm/invoice/cancel/emit
- Orcamentos: create/list/get/update/approve/reject/convert/cancel
- Historicos: order/quote history

## Regras de Implementacao
- Acoes habilitadas conforme status.
- Timeline mostra apenas eventos reais.
- Conversao orcamento -> pedido com rastreio.

## Checklist
- Cenarios comerciais principais funcionando.
- Detalhamento consistente (timeline/anexos/obs).
- Sem regressao em filtros e paginacao.
