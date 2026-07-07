# CELULARS Admin Panel Plan

## Objetivo

Planejar o futuro painel administrativo interno da CELULARS.

Este documento não implementa painel, login ou banco de dados.

## Seções do painel

### Dashboard

Função:
- visão geral da operação;
- cotações recentes;
- produtos mais consultados;
- pedidos/cotações abertas;
- alertas de estoque.

Permissões:
- `super_admin`
- `admin`
- `sales`
- `viewer` limitado

### Produtos

Função:
- criar e editar modelos;
- capacidades;
- cores;
- condições;
- status público/B2B.

Permissões:
- `super_admin`
- `admin`
- `inventory` limitado

### Estoque

Função:
- quantidade disponível;
- quantidade reservada;
- lote;
- condição;
- localização;
- status.

Permissões:
- `super_admin`
- `admin`
- `inventory`
- `sales` leitura

### Preços

Função:
- preços varejo;
- preços atacado;
- tiers;
- validade;
- fontes;
- histórico.

Permissões:
- `super_admin`
- `admin`
- `sales` leitura/solicitação

### Clientes

Função:
- dados comerciais;
- status;
- aprovação B2B;
- vendedor responsável;
- histórico.

Permissões:
- `super_admin`
- `admin`
- `sales`

### Atacado

Função:
- configurar visibilidade B2B;
- tabelas permitidas;
- lotes;
- regras por cliente.

Permissões:
- `super_admin`
- `admin`
- `sales`

### Pedidos/Consultas

Função:
- acompanhar solicitações;
- responder cotações;
- vincular vendedor;
- mudar status.

Permissões:
- `super_admin`
- `admin`
- `sales`

### PTAX/Cotação

Função:
- visualizar PTAX;
- visualizar ajuste operacional;
- histórico de cotação;
- auditoria de alterações.

Permissões:
- `super_admin`
- `admin`
- `viewer` leitura

### Conteúdo do site

Função:
- textos;
- banners;
- avisos;
- páginas públicas.

Permissões:
- `super_admin`
- `admin`
- `content`

### Mídia/imagens

Função:
- uploads;
- organização;
- alt text;
- uso por página.

Permissões:
- `super_admin`
- `admin`
- `content`

### Usuários

Função:
- criar usuários;
- alterar roles;
- desativar acesso.

Permissões:
- `super_admin`
- `admin` limitado

### Permissões

Função:
- gerenciar matriz de acesso;
- revisar roles.

Permissões:
- `super_admin`

### Logs

Função:
- auditar alterações;
- rastrear login;
- verificar preço/estoque.

Permissões:
- `super_admin`
- `admin` leitura limitada

### Configurações

Função:
- parâmetros globais;
- integrações;
- variáveis operacionais.

Permissões:
- `super_admin`

## Ordem ideal de implementação

1. Autenticação segura.
2. Roles e permissões.
3. Produtos.
4. Clientes.
5. Estoque.
6. Preços.
7. Cotações/pedidos.
8. Conteúdo do site.
9. Logs.
10. Relatórios.

## Riscos de segurança

- Painel sem autenticação server-side.
- Acesso admin baseado apenas em JS.
- Dados sensíveis no front-end.
- Falta de logs.
- Permissões amplas demais.
- Falta de validação no backend.

## Recomendação

Não iniciar o painel com dados reais antes de autenticação, roles, API protegida e banco de dados definidos.
