# AGENTS - Service Fiscal

## Escopo
Emissao e gestao de documentos fiscais.

## Objetivo
Suportar emissao por origem (pedido) e emissao direta, com status fiscal rastreavel.

## Dependencias e Fontes
- `FiscalDocumentService`
- Providers ACBR/Mock

## Regras de Implementacao
- Refletir cancelamentos e falhas com rastreio.
- Integrar com comercial e financeiro conforme regra.

## Checklist
- Emissao e consulta de status funcionando.
- Tratamento de rejeicao/cancelamento consistente.
