# CELULARS B2B Customer Portal Plan

## Objetivo

Planejar a futura área do atacadista/cliente B2B da CELULARS.

Este documento não implementa login, estoque real ou preços atacado.

## Recursos futuros

### Login

Cliente aprovado acessa com conta própria.

Requisitos:
- autenticação server-side;
- sessão segura;
- expiração;
- recuperação de acesso.

### Cadastro/solicitação de acesso

Fluxo:
1. cliente solicita acesso;
2. CELULARS analisa;
3. cliente é aprovado ou recusado;
4. vendedor responsável é associado.

### Dados comerciais

Possíveis campos:
- nome da empresa;
- contato principal;
- telefone;
- e-mail;
- país/estado;
- tipo de comprador;
- documentos, se necessário.

### Tabela de atacado

Deve mostrar apenas dados autorizados.

Pode incluir:
- modelo;
- capacidade;
- cor;
- condição;
- lote;
- preço por tier;
- quantidade mínima;
- status.

Não deve mostrar:
- custo;
- margem;
- dados de outros clientes;
- estoque interno completo.

### Filtros

Filtros futuros:
- modelo;
- capacidade;
- cor;
- condição;
- disponibilidade;
- quantidade;
- faixa de preço.

### Consulta de lote

Cliente pode solicitar detalhes de lote.

Resultado deve gerar:
- quote request;
- notificação interna;
- histórico.

### Solicitação de cotação

Campos:
- produto;
- quantidade;
- observação;
- prazo desejado;
- forma de contato.

### Histórico

Cliente deve ver:
- solicitações abertas;
- solicitações respondidas;
- pedidos anteriores;
- documentos vinculados.

### Documentos

Possíveis usos:
- proposta;
- invoice;
- comprovantes;
- termos comerciais.

Armazenamento futuro recomendado:
- R2 para arquivos;
- banco para metadados.

### Contato com vendedor

Cliente deve ter canal direto:
- WhatsApp;
- e-mail;
- responsável comercial.

## Modelo de acesso

Role:
- `b2b_customer`

Regras:
- acesso apenas após aprovação;
- dados por cliente;
- preços por tier;
- logs de acesso;
- bloqueio quando conta estiver inativa.

## Fase inicial recomendada

1. Proteger página Atacado com Cloudflare Access.
2. Não exibir inventário real.
3. Coletar solicitações via WhatsApp/formulário.
4. Planejar API B2B.
5. Só depois exibir dados dinâmicos reais.
