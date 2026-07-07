# CELULARS Mobile App Future Plan

## Objetivo

Planejar a base técnica para um futuro app iOS/Android da CELULARS.

O app não deve ser criado antes de existir API, autenticação e dados estruturados.

## Por que separar API e frontend

Hoje o site usa arquivos estáticos e JavaScript. Para app futuro, as regras importantes precisam sair do HTML e passar para uma API.

Benefícios:
- site e app usam a mesma fonte de dados;
- preços e estoque ficam protegidos;
- login pode ser reutilizado;
- manutenção fica mais simples;
- reduz retrabalho.

## Dados que o app usaria

- catálogo público;
- preços públicos;
- cotação CELULARS;
- conta B2B;
- estoque autorizado;
- preços atacado autorizados;
- solicitações de cotação;
- pedidos;
- notificações;
- dados do cliente.

## Telas futuras

### Públicas

- Home;
- catálogo;
- detalhes de produto;
- contato;
- solicitação de acesso B2B.

### B2B

- login;
- painel do cliente;
- tabela de atacado;
- filtros;
- solicitação de cotação;
- histórico;
- documentos.

### Internas, se aplicável

- dashboard comercial;
- pedidos;
- estoque;
- clientes.

## Autenticação

Requisitos:
- server-side;
- sessão/token seguro;
- expiração;
- refresh controlado;
- logout;
- bloqueio de conta;
- logs.

## Notificações

Possíveis usos:
- resposta de cotação;
- alteração de status;
- novidade de lote;
- aviso comercial.

## Preparação técnica

Antes do app:
1. criar API;
2. definir autenticação;
3. criar banco;
4. criar modelo de permissões;
5. estabilizar área B2B;
6. documentar contratos de API.

## Tecnologias possíveis

Opções futuras:
- app nativo iOS/Android;
- React Native;
- Flutter;
- PWA avançado.

Recomendação: decidir somente depois da API e área B2B estarem maduras.
