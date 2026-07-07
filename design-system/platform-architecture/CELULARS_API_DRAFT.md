# CELULARS API Draft

## Objetivo

Planejar uma API futura para servir o site, a área B2B, o painel administrativo e o app iOS/Android.

Este documento é rascunho. Nenhuma rota foi implementada nesta etapa.

## Princípios

- API deve validar dados no servidor.
- Rotas protegidas devem exigir autenticação.
- Permissões devem ser aplicadas por role.
- Dados públicos devem ser separados de dados internos.
- A API deve ser versionada no futuro.

## Rotas públicas

### GET /api/public/products

Lista produtos públicos aprovados.

Uso:
- site público;
- catálogo simples;
- app sem login.

Não deve retornar:
- estoque real;
- custo;
- margem;
- preços atacado.

### GET /api/public/iphone-17-prices

Retorna preços públicos da linha iPhone 17.

Campos possíveis:
- modelo;
- capacidade;
- cores públicas;
- preço Apple USD;
- taxa estimada;
- preço CELULARS USD;
- preço CELULARS BRL;
- data da cotação.

### GET /api/public/exchange-rate

Retorna Cotação CELULARS pública.

Campos possíveis:
- PTAX Banco Central;
- ajuste operacional;
- cotação final;
- data da cotação;
- fonte.

## Rotas protegidas B2B

### GET /api/b2b/inventory

Lista estoque liberado para o cliente autenticado.

Deve respeitar:
- aprovação do cliente;
- price tier;
- permissões por conta;
- visibilidade por produto.

### GET /api/b2b/prices

Lista preços atacado permitidos ao cliente.

Não deve retornar:
- custo interno;
- margem;
- preços de outros tiers não autorizados.

### POST /api/b2b/quote-request

Cria solicitação de cotação.

Campos possíveis:
- produto;
- capacidade;
- cor;
- condição;
- quantidade;
- mensagem;
- contato preferido.

## Rotas admin

### GET /api/admin/customers

Lista clientes conforme permissão do usuário interno.

### POST /api/admin/products

Cria produto.

### PATCH /api/admin/inventory

Atualiza estoque.

### PATCH /api/admin/prices

Atualiza preço público ou atacado.

### GET /api/admin/audit-logs

Lista logs de auditoria.

## Rotas de autenticação

### POST /api/auth/login

Login futuro.

Observação: não implementar senha no front-end público.

### POST /api/auth/logout

Encerra sessão.

### POST /api/auth/request-access

Solicita acesso B2B.

### POST /api/auth/reset-password

Fluxo futuro de recuperação.

## Stack recomendado para API

Fase inicial:
- Cloudflare Pages Functions ou Workers.

Dados:
- D1 para dados relacionais;
- KV para cache/configurações simples;
- R2 para mídia/documentos.

Segurança:
- variáveis sensíveis no ambiente Cloudflare;
- validação server-side;
- logs;
- roles;
- rate limiting quando necessário.

## Preparação para app

A API deve evitar depender de HTML. O app futuro deve consumir os mesmos contratos:
- catálogo;
- autenticação;
- estoque B2B;
- pedidos;
- notificações;
- perfil do cliente.

## Observação

Nenhuma rota deste documento deve ser considerada existente até implementação formal e validação de segurança.
