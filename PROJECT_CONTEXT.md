# PROJECT_CONTEXT.md

Ultima atualizacao: 04/04/2026

## 1) Visao geral

`sistema-erp-vendas` e um ERP com backend Delphi (Horse + FireDAC + PostgreSQL) e frontend Next.js.

Foco atual do desenvolvimento:
- Consolidar ciclo comercial completo com regras de status e rastreabilidade:
  - Orcamento -> Pedido -> Faturamento -> Fiscal -> Receber
  - Fluxos alternativos:
    - Pedido sem fiscal
    - Pedido com fiscal
    - Emissao fiscal direta (sem pedido)

Stack:
- Backend: Delphi 11.4, Horse, FireDAC, PostgreSQL.
- Frontend: Next.js App Router, TypeScript, Tailwind, React Query.

## 2) Estrutura principal

- Backend: `C:\Dev\delphi\Projetos\sistema-erp-vendas\src`
  - `Api\V1\Routes`
  - `Services\Orders`, `Services\Quotes`, `Services\Fiscal`, `Services\Finance`
  - `Services\Products`, `Services\Clients`, `Services\Companies`
  - `Infra\DB`
- Frontend: `C:\Dev\delphi\Projetos\sistema-erp-vendas\frontend\web_next`
  - Paginas: `/dashboard`, `/companies`, `/products`, `/clients`, `/sales`, `/fiscal`, `/receivables`, `/pdv`
  - API client: `src\lib\api.ts`

## 3) Estado atual (resumo)

### Cadastros
- CRUD funcional para empresas, produtos e clientes.
- Padrao visual unificado (filtros, paginacao, toasts, botoes, modais).

### Comercial
- Orcamentos e pedidos ativos no front/back.
- Conversao de orcamento para pedido implementada.
- Acoes por status em andamento (etapa 1 de consolidacao).
- Modal de detalhe com timeline e observacoes.

### Fiscal
- Emissao fiscal por origem (pedido) e emissao direta.
- Listagem de documentos fiscais.

### Financeiro
- Contas a receber com listagem/detalhe.
- Baixas e status principais implementados.

### PDV
- Carrinho + fechamento de venda.
- Salvar venda para retomada (local no browser).
- Fluxo de fechamento sendo refinado para aderir ao comercial/fiscal/receber.

## 4) Contratos e integracao

Arquivo central de consumo da API:
- `C:\Dev\delphi\Projetos\sistema-erp-vendas\frontend\web_next\src\lib\api.ts`

Observacao operacional:
- Front usa proxy interno Next em `/api/proxy/...` para reduzir problemas de ambiente local.

## 5) Regras de negocio prioritarias (etapa 1)

- Orcamento nao deve faturar direto sem conversao para pedido (fluxo padrao).
- Pedido cancelado nao pode:
  - aprovar,
  - faturar,
  - emitir fiscal.
- Pedido faturado:
  - nao pode voltar para aberto/aprovado.
- Faturamento parcial:
  - pedido permanece com saldo restante.
- Venda a prazo:
  - deve gerar contas a receber.
- Fiscal:
  - pode existir com origem de pedido ou emissao direta.
- Timeline:
  - exibir somente eventos reais, com data/hora/usuario quando houver.

## 6) Execucao local

### Backend
- Executavel preferencial atual:
  - `C:\Dev\delphi\Projetos\sistema-erp-vendas\src\SistemaERPVendas.exe`
- Config:
  - `C:\Dev\delphi\Projetos\sistema-erp-vendas\src\appsettings.ini`

### Frontend
- Pasta:
  - `C:\Dev\delphi\Projetos\sistema-erp-vendas\frontend\web_next`
- Comandos:
  - `npm install`
  - `npm run dev`
  - `npm run build`

## 7) Proximo ciclo recomendado apos etapa 1

1. Fechar transicoes de status com matriz unica front/back.
2. Garantir reflexo financeiro/fiscal/estoque em cancelamentos.
3. Expandir auditoria por entidade (quem/quando/o que mudou).
4. Cobrir cenarios E2E:
   - orcamento -> pedido -> sem fiscal
   - orcamento -> pedido -> fiscal
   - pedido direto -> sem fiscal
   - pedido direto -> fiscal
   - fiscal direto (sem pedido)
