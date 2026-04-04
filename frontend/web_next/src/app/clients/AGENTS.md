# AGENTS - Clientes

## Escopo
Cadastro e manutencao de clientes PF/PJ com dados comerciais.

## Objetivo
Manter base de clientes consistente para vendas, fiscal e financeiro.

## Dependencias e Fontes
- `listClientsRequest`, `createClientRequest`, `updateClientRequest`, `deleteClientRequest`

## Regras de Implementacao
- CRUD persistente (nao apenas estado local).
- Cancelar edicao restaura snapshot original.
- Validacoes e toasts no padrao global.

## Checklist
- Insert/update refletem apos reload.
- Lista abre modal ao clicar no item.
- Busca/filtros/paginacao padronizados.
