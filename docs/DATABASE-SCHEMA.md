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

