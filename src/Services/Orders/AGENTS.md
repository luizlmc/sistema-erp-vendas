# AGENTS - Service Orders

## Escopo
Fluxo de pedidos de venda.

## Objetivo
Controlar ciclo: aberto -> aprovado -> faturado -> fiscal/cancelado.

## Regras de Implementacao
- Pedido cancelado nao fatura.
- Pedido faturado nao volta para estado anterior.
- Integracao com fiscal e receber obrigatoria quando aplicavel.
- Pedido com faturamento parcial deve manter saldo aberto.
- Aprovacao e faturamento devem gravar historico com data/hora e usuario.
- Acoes invalidas por status devem responder erro de dominio claro.

## Checklist
- Status/transicoes validas.
- Historico de alteracoes preenchido.
- Cenarios:
  - pedido-sem-fiscal
  - pedido-com-fiscal
  - pedido-faturado-parcial
