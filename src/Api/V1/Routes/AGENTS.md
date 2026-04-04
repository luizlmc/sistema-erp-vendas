# AGENTS - API V1 Routes

## Escopo
Rotas da versao v1 por modulo.

## Objetivo
Manter contrato estável entre frontend e backend.

## Regras de Implementacao
- Filtros/paginacao/sort uniformes.
- Validacoes basicas de request na camada de rota.
- Encaminhar logica de dominio para Services.
- Erros de dominio devem manter semantica HTTP clara (400/409/422).
- Rotas de status devem bloquear transicoes invalidas antes de efeitos colaterais.
- Contratos de timeline/history devem retornar apenas eventos reais persistidos.

## Checklist
- Parametros coerentes com frontend.
- Erros de validacao claros.
- Sem acoplamento indevido com UI.
- Cenarios etapa 1 cobertos por endpoint:
  - orcamento -> pedido
  - pedido -> faturamento
  - pedido -> emissao fiscal
  - emissao fiscal direta
