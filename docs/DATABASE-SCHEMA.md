# Banco de Dados da Plataforma CELULARS DEMO

O schema inicial esta em `apps/platform/database/migrations/001_initial.sql`.

Principais dominios:

- identidade: `users`, `roles`, `permissions`, `sessions`;
- comercial: `companies`, `customers`, `leads`, `requests`;
- atendimento: `conversations`, `messages`, `message_templates`;
- catalogo: `products`, `product_variants`, `price_lists`, `prices`;
- estoque: `inventory_items`, `inventory_movements`, `reservations`;
- venda: `quotes`, `quote_items`, `orders`, `order_items`, `shipments`;
- governanca: `approvals`, `notifications`, `audit_events`, `settings`.

O saldo de estoque e calculado pelas movimentacoes. O banco usa foreign keys, constraints, indices e transacoes `BEGIN IMMEDIATE`. O arquivo mutavel fica em `apps/platform/data/platform-demo.sqlite` e nunca entra em `dist` ou no Git.


## Migrations

| Versao | Conteudo |
| --- | --- |
| `001_initial.sql` | schema operacional completo, indices e constraints |
| `002_governance.sql` | escopo e indices adicionais para auditoria e notificacoes |
| `003_identity.sql` | ciclo de contas, equipes, termos, consentimentos e MFA |
| `004_documents.sql` | documentos privados e metadados de storage |
| `005_integrations.sql` | outbox, templates e webhooks |
| `006_inbox.sql` | caixa unificada, SLA e historico |
| `007_aftersales.sql` | devolucoes e pos-venda |
| `008_operations.sql` | jobs, inventario detalhado e operacoes |
| `009_data_governance.sql` | importacao, privacidade e retencao |
| `010_user_management.sql` | permissoes customizadas e historico de usuarios |

A tabela `schema_migrations` impede reaplicacao. Novas mudancas devem ser adicionadas em arquivo posterior, nunca alterando uma migration ja homologada.

## Regras importantes

- foreign keys sao habilitadas na abertura;
- estoque e derivado de movimentos, nao de valor solto editavel;
- reservas relacionam pedido, item e expiracao;
- cotacoes e pedidos preservam itens e valores DEMO;
- auditoria guarda antes/depois sanitizados;
- notificacoes possuem usuario, empresa, entidade e chave de deduplicacao;
- configuracoes ficam isoladas na tabela `settings`.

## Seed deterministico

O seed usa `2026-07-17T12:00:00.000Z`, IDs previsiveis e dados ficticios. Senhas recebem salt deterministico derivado do segredo local apenas para repetir a homologacao DEMO. Em producao, essa estrategia deve ser substituida por criacao real de usuarios e rotacao de credenciais.

## Reset

`platform:reset` aceita somente um `.sqlite` sob `apps/platform/data/`, remove o banco e journals, migra e semeia novamente. O catalogo real e apenas lido para criar snapshots DEMO; nunca e escrito.

## Migracao futura

O destino deve preservar constraints, transacoes e isolamento. O banco DEMO nao deve ser exportado. Somente schema, migrations revisadas e contratos de dados podem seguir para homologacao de producao.
