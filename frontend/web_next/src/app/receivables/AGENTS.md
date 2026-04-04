# AGENTS - Contas a Receber

## Escopo
Consulta e manutencao de titulos a receber.

## Objetivo
Acompanhar saldo, vencimento, status e pagamentos com confiabilidade.

## Dependencias e Fontes
- `listReceivablesRequest`, `getReceivableRequest`, `registerReceivablePaymentRequest`

## Regras de Implementacao
- Atualizar status/saldo apos pagamentos.
- Preservar origem do titulo (pedido/faturamento).
- UI no mesmo padrao de vendas.

## Checklist
- Filtros e paginacao corretos.
- Baixa parcial/total atualiza dados.
- Sem inconsistencias de status.
