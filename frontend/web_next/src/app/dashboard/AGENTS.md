# AGENTS - Dashboard

## Escopo
Pagina de indicadores executivos e acompanhamento operacional.

## Objetivo
Exibir KPIs, grafico e listas de apoio com dados reais por periodo.

## Dependencias e Fontes
- `dashboardSummaryRequest(...)` em `src/lib/api.ts`

## Regras de Implementacao
- Filtro de periodo deve impactar KPIs e grafico.
- Botao atualizar recarrega dados e invalida cache necessario.
- Nao usar mock quando houver endpoint real.

## Checklist
- KPIs conferem com API por periodo.
- Grafico renderiza em tema claro/escuro.
- Sem hydration error/scroll indevido.
