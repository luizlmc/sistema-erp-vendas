# PROJECT_CONTEXT.md

Última atualização: 04/04/2026

## 1) Visão geral do projeto

`sistema-erp-vendas` é um ERP com backend em Delphi (Horse + FireDAC + PostgreSQL) e frontend web em Next.js.

Objetivo principal:
- Cobrir ciclo comercial e fiscal: cadastro, venda, PDV, pedidos/orçamentos, faturamento, fiscal e contas a receber.

Stack atual:
- Backend: Delphi 11.4, Horse, FireDAC, PostgreSQL.
- Frontend: Next.js (App Router), TypeScript, Tailwind, React Query.

## 2) Estrutura de pastas (atual)

Raiz:
- `C:\Dev\delphi\Projetos\sistema-erp-vendas\src` → backend Delphi
- `C:\Dev\delphi\Projetos\sistema-erp-vendas\frontend\web_next` → frontend Next.js
- `C:\Dev\delphi\Projetos\sistema-erp-vendas\postman` → coleções/testes de API
- `C:\Dev\delphi\Projetos\sistema-erp-vendas\modules`, `libs`, `tools` → apoio

Backend (`src`) – principais módulos:
- `Api\V1\Routes` (rotas REST)
- `Services\Products`, `Services\Clients`, `Services\Companies`
- `Services\Orders`, `Services\Quotes`
- `Services\Finance` (recebíveis)
- `Services\Fiscal` (NFe/NFCe/NFSe + providers)
- `Services\Dashboard`, `Services\Auth`, `Services\Audit`
- `Infra\DB` (pool, migrator, bootstrap, schema)

Frontend (`frontend\web_next\src`) – principais páginas:
- `/dashboard`
- `/companies`
- `/products`
- `/clients`
- `/sales` (comercial: pedidos + orçamentos)
- `/receivables`
- `/fiscal`
- `/pdv`

## 3) Funcionalidades já implementadas (resumo)

### 3.1 Cadastros
- CRUD de Empresas, Produtos e Clientes.
- Inativação/reativação por seletor de status.
- Modais padronizados com validação e toasts.

### 3.2 Comercial
- Pedidos e Orçamentos.
- Conversão orçamento → pedido.
- Ações por status (aprovar, faturar, cancelar, emitir fiscal).
- Modal de detalhamento com timeline, anexos e observações.

### 3.3 Financeiro
- Contas a receber com listagem e detalhe.
- Geração de títulos via faturamento (quando aplicável pela API).

### 3.4 Fiscal
- Emissão a partir do pedido.
- Emissão direta (sem origem de pedido), conforme endpoint disponível.
- Listagem de documentos fiscais.

### 3.5 PDV
- Catálogo de produtos, carrinho e fechamento de venda.
- Fluxo de fechamento com:
  - escolha de cliente,
  - pagamento,
  - opção de fiscal (sem fiscal / NFC-e / NF-e),
  - opção à vista / a prazo (parcelas).
- Salvar venda para retomada posterior (persistência local no browser).

## 4) API consumida no frontend (arquivo fonte)

Arquivo central:
- `C:\Dev\delphi\Projetos\sistema-erp-vendas\frontend\web_next\src\lib\api.ts`

Principais grupos:
- Auth: login
- Dashboard: resumo
- Cadastros: products, clients, companies
- Comercial: orders, quotes + history
- Fiscal: documents e emissão
- Financeiro: receivables + pagamentos

## 5) Padrões de UI/UX adotados

- Tema claro/escuro global com persistência de preferência.
- Header e sidebar fixos; scroll no conteúdo.
- KPIs com visual/spacing/animação padronizados.
- Botões padronizados:
  - primário (ação principal),
  - secundário,
  - destrutivo.
- Toasts padronizados para feedback de CRUD e validações.
- Listagens com:
  - busca,
  - filtros,
  - ordenação,
  - paginação,
  - ações consistentes.

## 6) Regras de negócio importantes (vigentes)

- Nem toda venda gera fiscal.
- Pedido pode existir sem documento fiscal.
- Documento fiscal pode ser emitido:
  - a partir de pedido,
  - diretamente no módulo fiscal.
- Vendas a prazo devem gerar títulos no financeiro (via fluxo de faturamento).
- Rastreabilidade entre pedido/orçamento/fiscal/recebível é obrigatória.

## 7) Execução local

### Frontend (Next)
Pasta:
- `C:\Dev\delphi\Projetos\sistema-erp-vendas\frontend\web_next`

Comandos:
- `npm install`
- `npm run dev`
- build: `npm run build`

### Backend (Delphi)
Projeto principal:
- `C:\Dev\delphi\Projetos\sistema-erp-vendas\src\SistemaERPVendas.dproj`

Executável debug (quando compilado):
- `C:\Dev\delphi\Projetos\sistema-erp-vendas\src\Win64\Debug\SistemaERPVendas.exe`

Config:
- `C:\Dev\delphi\Projetos\sistema-erp-vendas\src\appsettings.ini`

## 8) Convenções de manutenção

- Centralizar contratos HTTP em `src/lib/api.ts`.
- Evitar duplicar regras de status no frontend; preferir utilitários.
- Qualquer ajuste de layout global deve passar por componentes base (`ErpShell`, estilos globais, botões padronizados).
- Em modais:
  - separar estado de visualização x edição,
  - validar antes de persistir,
  - manter feedback via toast.

## 9) Próximos passos recomendados

1. Consolidar persistência de “vendas salvas para retomada” do PDV em backend (hoje local no navegador).
2. Fechar ciclo completo de títulos a receber no fluxo PDV a prazo (auditoria e rastreio fim a fim).
3. Expandir auditoria de ações críticas por entidade (quem/quando/o quê).
4. Adicionar testes de integração para fluxos:
   - orçamento → pedido → faturamento,
   - pedido sem fiscal,
   - pedido com fiscal,
   - emissão fiscal direta.
5. Criar `CHECKLIST_RELEASE.md` para homologação por módulo.

## 10) Arquivos-chave para onboarding rápido

- Backend:
  - `C:\Dev\delphi\Projetos\sistema-erp-vendas\src\Api\V1\Routes`
  - `C:\Dev\delphi\Projetos\sistema-erp-vendas\src\Services`
  - `C:\Dev\delphi\Projetos\sistema-erp-vendas\src\Infra\DB`
- Frontend:
  - `C:\Dev\delphi\Projetos\sistema-erp-vendas\frontend\web_next\src\components\ErpShell.tsx`
  - `C:\Dev\delphi\Projetos\sistema-erp-vendas\frontend\web_next\src\lib\api.ts`
  - `C:\Dev\delphi\Projetos\sistema-erp-vendas\frontend\web_next\src\app`

