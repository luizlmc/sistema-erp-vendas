# AGENTS - Backend

## Escopo
Diretrizes globais do backend Delphi (Horse + FireDAC + PostgreSQL).

## Objetivo
Manter separacao de responsabilidades, estabilidade de regras de negocio e consistencia de API.

## Dependencias e Fontes
- `Api` (rotas/middlewares)
- `Services` (dominio)
- `Infra\DB` (pool/migracoes/schema)
- `Core` (config/contexto)

## Regras de Implementacao
- Rota delega para service.
- Service concentra regra de negocio.
- Infra concentra acesso a dados.

## Checklist
- Sem regressao de contratos de API.
- Regras de status e rastreabilidade preservadas.
- Migracoes de schema versionadas.
