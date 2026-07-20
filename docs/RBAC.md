# RBAC da Plataforma CELULARS

## Papeis

| Papel | Uso |
| --- | --- |
| `ADMIN` | administracao, configuracoes, usuarios, aprovacoes e auditoria |
| `EMPLOYEE` | operacao de catalogo, precos, inventario, CRM, cotacoes, pedidos e mensagens |
| `WHOLESALE` | consulta de catalogo/precos e operacao restrita da propria empresa, cotacoes, pedidos e mensagens |

## Permissoes

As permissoes sao granulares (`catalog.read`, `inventory.write`, `companies.approve`, `audit.read` etc.) e relacionadas aos papeis pelas tabelas `permissions` e `role_permissions`.

## Regra de aplicacao

Cada rota protegida chama `requirePermission`. A API retorna `403` sem revelar dados quando a permissao estiver ausente. Consultas de escopo empresarial devem tambem restringir `company_id`; essa regra e aplicada nos modulos de atacado, cotacoes e pedidos.

## Matriz resumida

| Dominio | ADMIN | EMPLOYEE | WHOLESALE |
| --- | --- | --- | --- |
| Catalogo e precos | leitura/escrita | leitura/escrita | leitura |
| Inventario | leitura/escrita | leitura/escrita | sem acesso direto |
| Clientes e empresas | leitura/escrita/aprovacao | leitura/escrita | propria empresa |
| Cotacoes e pedidos | todos | todos operacionais | proprios registros |
| Mensagens | todas | todas operacionais | proprias conversas |
| Usuarios/configuracoes/auditoria | completo | sem acesso | sem acesso |

## Permissoes semeadas

- `catalog.read`, `catalog.write`;
- `prices.read`, `prices.write`;
- `inventory.read`, `inventory.write`;
- `customers.read`, `customers.write`;
- `companies.read`, `companies.approve`;
- `quotes.read`, `quotes.write`;
- `orders.read`, `orders.write`;
- `requests.read`, `requests.write`;
- `messages.read`, `messages.write`;
- `users.read`, `users.write`;
- `settings.read`, `settings.write`;
- `audit.read`, `reports.read`.

## Escopo por empresa

O papel `WHOLESALE` recebe `company_id` pela sessao. Toda consulta de empresa, cliente, solicitacao, conversa, cotacao, pedido, documento e notificacao deve combinar permissao com esse identificador. A tentativa de trocar um ID na URL nao amplia o escopo.

## Auditoria

O administrador ve a trilha completa. Funcionarios nao recebem `audit.read` no seed padrao. Atacadistas nunca visualizam auditoria interna. Alteracoes de permissao devem gerar evento `PERMISSION_CHANGE`.

## Relatorios

`reports.read` permite abrir relatorios, mas o servico continua aplicando o escopo do usuario. Um atacadista pode receber apenas dados da propria empresa.

## Verificacao

Os testes devem provar `401` sem sessao, `403` sem permissao, acesso administrativo esperado e bloqueio de registros de outra empresa. Esconder um botao e apenas conveniencia visual, nunca controle de seguranca.
