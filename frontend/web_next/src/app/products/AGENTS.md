# AGENTS - Produtos

## Escopo
Cadastro e manutencao de produtos com dados comerciais e fiscais.

## Objetivo
Garantir CRUD completo, validacao consistente e persistencia correta de todos os campos.

## Dependencias e Fontes
- `listProductsRequest`, `createProductRequest`, `updateProductRequest`, `deleteProductRequest`
- Tipos `Product` e payloads em `src/lib/api.ts`

## Regras de Implementacao
- Modal com estados de visualizacao/edicao.
- Campos obrigatorios com destaque sem quebrar grid.
- Lista com busca/filtro/ordenacao/paginacao padronizados.

## Checklist
- Criar/editar/salvar/cancelar/excluir funcionando.
- Campos fiscais persistem corretamente.
- Sem erro visual/hydration na listagem e modal.
