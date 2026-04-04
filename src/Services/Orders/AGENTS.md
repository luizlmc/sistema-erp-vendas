# AGENTS - Service Orders

## Escopo
Fluxo de pedidos de venda.

## Objetivo
Controlar ciclo: aberto -> aprovado -> faturado -> fiscal/cancelado.

## Regras de Implementacao
- Pedido cancelado nao fatura.
- Pedido faturado nao volta para estado anterior.
- Integracao com fiscal e receber obrigatoria quando aplicavel.

## Checklist
- Status/transicoes validas.
- Historico de alteracoes preenchido.
