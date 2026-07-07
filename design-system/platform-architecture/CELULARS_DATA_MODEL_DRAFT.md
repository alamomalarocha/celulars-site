# CELULARS Data Model Draft

## Objetivo

Rascunho inicial das entidades futuras da plataforma CELULARS.

Este documento nao implementa banco de dados. Serve como base para futura API, painel administrativo, area B2B e app.

## Entidades Principais

### users

Campos sugeridos:

- `id`
- `name`
- `email`
- `phone`
- `role_id`
- `status`
- `last_login_at`
- `created_at`
- `updated_at`

Sensivel: sim.

Publico: nao.

### roles

Campos sugeridos:

- `id`
- `key`
- `name`
- `description`
- `permissions_json`
- `created_at`
- `updated_at`

Sensivel: parcialmente.

Publico: nao.

### customers

Campos sugeridos:

- `id`
- `name`
- `email`
- `phone`
- `company_name`
- `tax_id`
- `billing_address`
- `shipping_address`
- `status`
- `created_at`
- `updated_at`

Sensivel: sim.

Publico: nao.

### b2b_accounts

Campos sugeridos:

- `id`
- `customer_id`
- `approved`
- `approval_status`
- `approved_by_user_id`
- `sales_rep_user_id`
- `price_tier`
- `notes_internal`
- `created_at`
- `updated_at`

Sensivel: sim.

Publico: nao.

### products

Campos sugeridos:

- `id`
- `name`
- `brand`
- `model_name`
- `line`
- `year`
- `category`
- `condition_type`
- `public_status`
- `b2b_status`
- `active`
- `created_at`
- `updated_at`

Sensivel: parcialmente.

Publico: sim, apenas campos aprovados.

### product_variants

Campos sugeridos:

- `id`
- `product_id`
- `capacity`
- `color`
- `color_name`
- `color_hex`
- `model_number`
- `sku`
- `active`
- `public_visible`
- `created_at`
- `updated_at`

Sensivel: parcialmente.

Publico: sim, apenas variantes aprovadas.

### retail_prices

Campos sugeridos:

- `id`
- `variant_id`
- `apple_price_usd`
- `florida_tax_rate`
- `celulares_price_usd`
- `celulares_price_brl`
- `source`
- `visible_public`
- `updated_by`
- `updated_at`

Sensivel: parcialmente.

Publico: sim, quando aprovado.

### ecpo_prices

Campos sugeridos:

- `id`
- `variant_id`
- `grade`
- `price_usd`
- `price_brl`
- `visible_public`
- `updated_by`
- `updated_at`

Sensivel: parcialmente.

Publico: apenas quando aprovado. A regra atual e nao exibir preco eCPO publico.

### inventory

Campos sugeridos:

- `id`
- `variant_id`
- `condition_type`
- `grade`
- `qty`
- `location`
- `lot`
- `reserved_qty`
- `available_qty`
- `availability_status`
- `updated_by`
- `updated_at`

Sensivel: sim.

Publico: nao. Pode aparecer em B2B apenas de forma controlada.

### wholesale_prices

Campos sugeridos:

- `id`
- `variant_id`
- `customer_group`
- `grade`
- `price_usd`
- `min_qty`
- `active`
- `valid_from`
- `valid_to`
- `created_by_user_id`
- `updated_at`

Sensivel: sim.

Publico: nao.

### site_tables

Campos sugeridos:

- `id`
- `table_key`
- `page`
- `source_type`
- `description`
- `editable_by_role`
- `public_visible`
- `created_at`
- `updated_at`

Objetivo:

- registrar quais tabelas existem no site;
- definir se a fonte atual e HTML/JS, API ou banco;
- documentar qual role pode editar;
- orientar migracao do estatico para dados administraveis.

### exchange_rates

Campos sugeridos:

- `id`
- `source`
- `base_currency`
- `quote_currency`
- `ptax_rate`
- `operational_spread`
- `final_rate`
- `rate_date`
- `fetched_at`
- `updated_by`
- `updated_at`

Sensivel: nao, mas deve ser controlado.

Publico: sim, taxa final e data.

### settings

Campos sugeridos:

- `id`
- `key`
- `value_json`
- `description`
- `editable_by_role`
- `updated_by`
- `updated_at`

Uso:

- ajuste operacional;
- parametros publicos;
- configuracoes simples;
- limites de exibicao.

### orders

Campos sugeridos:

- `id`
- `customer_id`
- `status`
- `total_usd`
- `total_brl`
- `created_by_user_id`
- `created_at`
- `updated_at`

Sensivel: sim.

Publico: nao. Cliente ve apenas seus proprios pedidos.

### quote_requests

Campos sugeridos:

- `id`
- `customer_id`
- `product_variant_id`
- `requested_quantity`
- `message`
- `status`
- `assigned_to_user_id`
- `created_at`
- `updated_at`

Sensivel: sim.

Publico: nao. Cliente ve apenas suas proprias solicitacoes.

### audit_logs

Campos sugeridos:

- `id`
- `user_id`
- `actor_user_id`
- `action`
- `entity`
- `entity_type`
- `entity_id`
- `before_json`
- `after_json`
- `ip_address`
- `user_agent`
- `created_at`

Sensivel: sim.

Publico: nao.

### site_content

Campos sugeridos:

- `id`
- `page_key`
- `section_key`
- `content_json`
- `status`
- `updated_by_user_id`
- `updated_at`

Sensivel: parcialmente.

Publico: sim, somente conteudo publicado.

### media_assets

Campos sugeridos:

- `id`
- `file_name`
- `storage_key`
- `public_url`
- `mime_type`
- `alt_text`
- `usage_context`
- `uploaded_by_user_id`
- `created_at`

Sensivel: parcialmente.

Publico: sim, somente arquivos aprovados.

## Observacoes

- Dados sensiveis devem ficar em banco/API protegidos.
- O site publico deve consumir apenas dados aprovados.
- O app futuro deve usar a mesma API do site.
- Logs devem ser gravados para alteracoes de preco, estoque, clientes, conteudo e permissoes.
- Nenhuma tabela deve depender permanentemente de HTML hardcoded.
