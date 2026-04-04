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
- Documento fiscal pode ter origem em pedido ou ser emissao direta.
- Cancelamento fiscal deve publicar reflexo para comercial/financeiro quando aplicavel.
- Status fiscal deve ser coerente com evento de provider (emitido/rejeitado/cancelado/contingencia).

## Checklist
- Emissao e consulta de status funcionando.
- Tratamento de rejeicao/cancelamento consistente.
- Cenarios:
  - pedido-fiscal
  - nota-fiscal-sem-origem
  - cancelamento fiscal com rastreabilidade
