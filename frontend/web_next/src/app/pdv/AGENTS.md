# AGENTS - PDV

## Escopo
Operacao de balcao com carrinho, salvamento para retomada e fechamento de venda.

## Objetivo
Viabilizar venda rapida com opcao fiscal e condicao a prazo no fechamento.

## Dependencias e Fontes
- Catalogo: clients/products
- Fechamento: createOrder, invoiceOrder, emitOrderFiscal
- Persistencia local para vendas salvas (retomada)

## Regras de Implementacao
- Tela principal sem pagamento detalhado (fica no modal de fechamento).
- Permitir salvar e retomar venda em andamento.
- A prazo deve gerar titulos via faturamento.

## Checklist
- Fechar venda sem fiscal, com fiscal e a prazo.
- Salvar/retomar funcionando.
- Sem quebra de estoque e sem erro de validacao.
