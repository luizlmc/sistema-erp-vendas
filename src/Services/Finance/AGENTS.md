# AGENTS - Service Finance

## Escopo
Contas a receber e liquidacao.

## Objetivo
Controlar titulos, saldos e pagamentos com integridade.

## Regras de Implementacao
- Venda a prazo gera titulos automaticamente.
- Baixas parciais e totais devem atualizar status/saldo.
- Cancelamento de operacao de origem deve refletir em titulos conforme regra.
- Parcela deve manter vinculo com origem (pedido/faturamento/fiscal quando aplicavel).

## Checklist
- Fluxo de faturamento -> receber consistente.
- Status financeiros corretos.
- Cenarios:
  - gerar titulos no faturamento
  - baixa parcial
  - baixa total
  - cancelamento com reflexo financeiro
