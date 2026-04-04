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
- Acoes sempre habilitadas por matriz de estado (nunca por regra solta na tela).
- Timeline mostra apenas eventos reais com data/hora e usuario quando houver.
- Conversao orcamento -> pedido com rastreio de origem obrigatorio.
- Pedido cancelado nao pode aprovar/faturar/emitir.
- Pedido faturado nao pode aprovar novamente.
- Orcamento convertido nao pode ser convertido novamente.

## Matriz minima de acoes
- Orcamento:
  - DRAFTING/PENDING: abrir, editar, aprovar, reprovar, cancelar, converter
  - APPROVED: abrir, converter, cancelar
  - REJECTED/CANCELED/CONVERTED: abrir
- Pedido:
  - OPEN/AWAITING_APPROVAL: abrir, editar, aprovar, cancelar
  - APPROVED/PARTIALLY_FULFILLED: abrir, faturar, emitir fiscal, cancelar (quando permitido)
  - INVOICED/PARTIALLY_INVOICED: abrir, emitir fiscal
  - CANCELED: abrir

## Checklist
- Cenarios comerciais principais funcionando.
- Detalhamento consistente (timeline/anexos/obs).
- Sem regressao em filtros e paginacao.
- Botoes do detalhe respeitando status atual em 100% dos casos.
