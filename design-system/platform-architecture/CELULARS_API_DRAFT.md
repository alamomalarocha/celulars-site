# CELULARS API Draft

## Objetivo

Planejar uma API futura para servir o site, a area B2B, o painel administrativo e o app iOS/Android.

Este documento e rascunho. Nenhuma rota foi implementada nesta etapa.

## Principios

- API deve validar dados no servidor.
- Rotas protegidas devem exigir autenticacao.
- Permissoes devem ser aplicadas por role.
- Dados publicos devem ser separados de dados internos.
- A API deve ser versionada no futuro.
- O app iOS/Android deve consumir as mesmas rotas conforme permissao.

## Rotas Publicas

### GET /api/public/products

Lista produtos publicos aprovados.

Uso:

- site publico;
- catalogo simples;
- app sem login.

Nao deve retornar:

- estoque real;
- custo;
- margem;
- precos atacado.

### GET /api/public/iphones/new

Retorna iPhones novos publicos.

Campos possiveis:

- modelo;
- capacidade;
- cores publicas;
- preco Apple USD;
- taxa estimada;
- preco CELULARS USD;
- preco CELULARS BRL;
- data da cotacao.

### GET /api/public/iphones/ecpo

Retorna iPhones eCPO publicos conforme politica comercial.

Regra atual:

- pode listar modelos, capacidades e cores;
- nao deve exibir preco publico enquanto a CELULARS nao aprovar;
- deve retornar status claro de consulta.

### GET /api/public/exchange-rate

Retorna Cotacao CELULARS publica.

Campos possiveis:

- PTAX Banco Central;
- ajuste operacional;
- cotacao final;
- data da cotacao;
- fonte.

## Rotas Admin

### GET /api/admin/tables

Lista tabelas administraveis, origem dos dados e permissoes.

### GET /api/admin/products

Lista produtos para administracao.

### POST /api/admin/products

Cria produto.

### PATCH /api/admin/products/:id

Atualiza produto.

### GET /api/admin/variants

Lista variantes.

### POST /api/admin/variants

Cria variante.

### PATCH /api/admin/variants/:id

Atualiza variante.

### GET /api/admin/prices/retail

Lista precos publicos/varejo.

### PATCH /api/admin/prices/retail/:id

Atualiza preco publico/varejo.

### GET /api/admin/prices/ecpo

Lista precos eCPO internos ou publicos conforme permissao.

### PATCH /api/admin/prices/ecpo/:id

Atualiza preco eCPO.

### GET /api/admin/inventory

Lista estoque interno.

### PATCH /api/admin/inventory/:id

Atualiza estoque.

### GET /api/admin/customers

Lista clientes conforme permissao do usuario interno.

### GET /api/admin/audit-logs

Lista logs de auditoria.

## Rotas Protegidas B2B

### GET /api/b2b/inventory

Lista estoque liberado para o cliente autenticado.

Deve respeitar:

- aprovacao do cliente;
- price tier;
- permissoes por conta;
- visibilidade por produto.

### GET /api/b2b/wholesale-prices

Lista precos atacado permitidos ao cliente.

Nao deve retornar:

- custo interno;
- margem;
- precos de outros tiers nao autorizados.

### GET /api/b2b/inventory

Alias planejado para estoque B2B autorizado.

### POST /api/b2b/quote-request

Cria solicitacao de cotacao.

Campos possiveis:

- produto;
- capacidade;
- cor;
- condicao;
- quantidade;
- mensagem;
- contato preferido.

## Rotas de Autenticacao

### POST /api/auth/login

Login futuro.

Observacao: nao implementar senha no front-end publico.

### POST /api/auth/logout

Encerra sessao.

### POST /api/auth/request-access

Solicita acesso B2B.

### POST /api/auth/reset-password

Fluxo futuro de recuperacao.

## Stack Recomendada para API

Fase inicial:

- Cloudflare Pages Functions ou Workers.

Dados:

- D1 para dados relacionais;
- KV para cache/configuracoes simples;
- R2 para midia/documentos.

Seguranca:

- variaveis sensiveis no ambiente Cloudflare;
- validacao server-side;
- logs;
- roles;
- rate limiting quando necessario.

## Preparacao para App

A API deve evitar depender de HTML. O app futuro deve consumir os mesmos contratos:

- catalogo;
- autenticacao;
- estoque B2B;
- pedidos;
- notificacoes;
- perfil do cliente;
- rotas publicas, B2B ou admin conforme permissao.

## Observacao

Nenhuma rota deste documento deve ser considerada existente ate implementacao formal e validacao de seguranca.
