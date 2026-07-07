# CELULARS Access Control Model

## Objetivo

Definir o modelo inicial de usuários, roles e permissões da futura plataforma CELULARS.

Este documento é planejamento. Nenhum login real foi implementado nesta etapa.

## Princípios

- Autenticação deve acontecer no servidor, nunca apenas no front-end.
- Dados sensíveis não devem ficar em HTML, JS ou JSON público.
- Cada usuário deve ter a menor permissão necessária para sua função.
- Alterações importantes devem gerar log.
- Clientes B2B não devem ver dados internos de custo, margem ou outros clientes.

## Tipos de usuários

| Tipo | Descrição |
| --- | --- |
| Usuário interno | Funcionário ou operador da CELULARS. |
| Cliente B2B | Cliente aprovado para acessar área de atacado. |
| Visitante público | Usuário sem login, acessa apenas site público. |

## Roles sugeridas

| Role | Acesso principal |
| --- | --- |
| `super_admin` | Acesso total à plataforma. |
| `admin` | Gerencia catálogo, clientes, estoque e conteúdo. |
| `sales` | Consulta clientes, pedidos, cotações e preços permitidos. |
| `inventory` | Gerencia estoque, variantes, condição e disponibilidade. |
| `content` | Gerencia textos, banners, mídia e páginas públicas. |
| `viewer` | Apenas visualiza relatórios e dados autorizados. |
| `b2b_customer` | Acessa área de atacado aprovada. |

## Matriz de permissões inicial

| Recurso | super_admin | admin | sales | inventory | content | viewer | b2b_customer |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Produtos | total | editar | ver | ver | ver | ver | ver público/B2B |
| Estoque | total | editar | ver | editar | sem acesso | ver limitado | ver permitido |
| Preços varejo | total | editar | ver | ver | sem acesso | ver | ver público |
| Preços atacado | total | editar | ver | ver limitado | sem acesso | ver limitado | ver permitido |
| Clientes | total | editar | editar limitado | sem acesso | sem acesso | ver limitado | próprio perfil |
| Conteúdo do site | total | editar | sem acesso | sem acesso | editar | ver | sem acesso |
| Usuários | total | editar limitado | sem acesso | sem acesso | sem acesso | sem acesso | sem acesso |
| Logs | total | ver | ver limitado | ver limitado | ver limitado | ver limitado | sem acesso |
| Configurações | total | limitado | sem acesso | sem acesso | sem acesso | sem acesso | sem acesso |

## Regras por role

### super_admin

- Pode gerenciar tudo.
- Pode criar/remover usuários.
- Pode alterar permissões.
- Pode acessar logs completos.

### admin

- Pode gerenciar catálogo, estoque, clientes e conteúdo.
- Não deve alterar configurações críticas sem aprovação.

### sales

- Pode consultar clientes, preços permitidos e pedidos.
- Pode criar cotações.
- Não deve alterar estoque físico diretamente.

### inventory

- Pode atualizar quantidades, condições, lotes e disponibilidade.
- Não deve alterar preços finais sem permissão.

### content

- Pode alterar textos, banners, imagens e conteúdo público.
- Não deve acessar estoque real, custo ou dados de clientes.

### viewer

- Apenas leitura.
- Acesso limitado por área.

### b2b_customer

- Acessa apenas dados comerciais liberados para sua conta.
- Não acessa dados de outros clientes.
- Não acessa custo, margem, logs ou dados internos.

## O que nunca deve ficar no front-end público

- Senhas.
- Tokens privados.
- Chaves de API.
- Inventário real.
- Custo de compra.
- Margem de lucro.
- Dados de clientes.
- Lista de usuários.
- Preços atacado não autorizados.
- Logs internos.
- Configurações sensíveis.

## Modelo futuro de autenticação

Fase inicial:
- Cloudflare Access para proteger páginas inteiras.

Fase futura:
- autenticação server-side;
- sessão segura;
- roles no backend;
- tokens com expiração;
- logs de login;
- revisão de permissões.
