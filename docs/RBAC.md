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
