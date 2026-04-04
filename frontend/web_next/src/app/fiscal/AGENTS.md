# AGENTS - Fiscal

## Escopo
Emissao e acompanhamento de documentos fiscais.

## Objetivo
Controlar notas fiscais com origem por pedido ou emissao direta, sem misturar vendas nao fiscais.

## Dependencias e Fontes
- `listFiscalDocumentsRequest`, `emitOrderFiscalRequest`, `emitDirectFiscalRequest`

## Regras de Implementacao
- Modulo fiscal lista apenas documentos fiscais.
- Status e acoes devem refletir retorno real da API.
- Filtros de data/status/pesquisa no padrao global.

## Checklist
- Emissao por pedido e direta funcionando.
- Listagem correta por status/origem.
- Paginacao e acoes padronizadas.
