# AGENTS - Infra DB

## Escopo
Conexao, pool, migracoes e schema do banco.

## Objetivo
Assegurar estabilidade de acesso ao PostgreSQL e evolucao segura de schema.

## Regras de Implementacao
- Toda alteracao estrutural passa por migracao.
- Preservar seguranca e performance do pool.
- Evitar SQL duplicado/desorganizado.

## Checklist
- Migracao aplicada e validada.
- Compatibilidade com services existentes.
- Sem regressao de conexao/pool.
