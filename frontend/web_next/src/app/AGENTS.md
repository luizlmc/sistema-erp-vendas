# AGENTS - Frontend App

## Escopo
Diretrizes globais do frontend Next.js (App Router).

## Objetivo
Garantir padrao unico de UI/UX, dados, navegacao e manutencao entre todas as paginas.

## Dependencias e Fontes
- `src/lib/api.ts` (contratos HTTP)
- `src/components/ErpShell.tsx` (shell/layout)
- React Query (cache, invalidacao e reuso de catalogos)

## Regras de Implementacao
- Header/sidebar fixos e conteudo com scroll controlado.
- Tema claro/escuro consistente e persistente.
- Padronizar botoes, badges, toasts, filtros, busca, ordenacao e paginacao.
- Evitar hydration mismatch e nested button.

## Checklist
- Sem regressao visual entre modulos.
- Sem erro de build/typecheck.
- Sem quebrar padrao global de layout.
