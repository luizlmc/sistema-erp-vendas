# AGENTS - API V1 Routes

## Escopo
Rotas da versao v1 por modulo.

## Objetivo
Manter contrato estável entre frontend e backend.

## Regras de Implementacao
- Filtros/paginacao/sort uniformes.
- Validacoes basicas de request na camada de rota.
- Encaminhar logica de dominio para Services.

## Checklist
- Parametros coerentes com frontend.
- Erros de validacao claros.
- Sem acoplamento indevido com UI.
