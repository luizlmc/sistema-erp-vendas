# AGENTS - Service Quotes

## Escopo
Fluxo de orcamentos comerciais.

## Objetivo
Permitir aprovacao/reprovacao/cancelamento e conversao para pedido.

## Regras de Implementacao
- Orcamento nao fatura direto no fluxo padrao.
- Conversao deve manter vinculo com pedido gerado.
- Orcamento convertido nao pode ser reconvertido.
- Aprovacao/reprovacao/cancelamento devem gerar historico consistente.
- Conversao deve copiar itens validos e manter rastreio quote_id -> order_id.

## Checklist
- Status e transicoes corretos.
- Conversao para pedido rastreavel.
- Cenarios:
  - orcamento-pedido-sem-fiscal
  - orcamento-pedido-nota-fiscal
