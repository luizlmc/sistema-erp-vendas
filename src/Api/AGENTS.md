# AGENTS - API

## Escopo
Servidor HTTP, middlewares e roteamento.

## Objetivo
Expor contratos REST claros e consistentes para o frontend.

## Dependencias e Fontes
- `ApiServer.pas`
- `Middlewares` (auth/audit/contexto)
- `V1\Routes`

## Regras de Implementacao
- Nao colocar regra de negocio complexa na rota.
- Padronizar respostas e erros.
- Aplicar middleware de auth/audit quando necessario.

## Checklist
- Endpoint documentado e testavel.
- Retornos padronizados.
- Sem quebra de backward compatibility sem alinhamento.
