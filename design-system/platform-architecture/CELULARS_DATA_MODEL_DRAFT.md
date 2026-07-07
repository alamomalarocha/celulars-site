# CELULARS Data Model Draft

## Objetivo

Rascunho inicial das entidades futuras da plataforma CELULARS.

Este documento não implementa banco de dados. Serve como base para futura API, painel administrativo, área B2B e app.

## Entidades

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

Sensível: sim.

Público: não.

### roles

Campos sugeridos:
- `id`
- `key`
- `name`
- `description`
- `permissions_json`
- `created_at`
- `updated_at`

Sensível: parcialmente.

Público: não.

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

Sensível: sim.

Público: não.

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

Sensível: sim.

Público: não.

### products

Campos sugeridos:
- `id`
- `brand`
- `model_name`
- `line`
- `year`
- `category`
- `public_status`
- `b2b_status`
- `created_at`
- `updated_at`

Sensível: parcialmente.

Público: sim, apenas campos aprovados.

### product_variants

Campos sugeridos:
- `id`
- `product_id`
- `capacity`
- `color_name`
- `color_hex`
- `condition`
- `sku`
- `public_visible`
- `created_at`
- `updated_at`

Sensível: parcialmente.

Público: sim, apenas variantes aprovadas.

### inventory

Campos sugeridos:
- `id`
- `product_variant_id`
- `quantity_available`
- `quantity_reserved`
- `location`
- `lot_code`
- `condition_grade`
- `availability_status`
- `updated_by_user_id`
- `updated_at`

Sensível: sim.

Público: não. Pode aparecer em B2B apenas de forma controlada.

### wholesale_prices

Campos sugeridos:
- `id`
- `product_variant_id`
- `price_tier`
- `currency`
- `unit_price`
- `minimum_quantity`
- `valid_from`
- `valid_to`
- `created_by_user_id`

Sensível: sim.

Público: não.

### retail_prices

Campos sugeridos:
- `id`
- `product_variant_id`
- `currency`
- `apple_price_usd`
- `tax_rate`
- `site_price_usd`
- `site_price_brl`
- `source`
- `valid_from`
- `valid_to`

Sensível: parcialmente.

Público: sim, quando aprovado.

### price_sources

Campos sugeridos:
- `id`
- `source_name`
- `source_url`
- `source_type`
- `checked_at`
- `checked_by_user_id`
- `notes`

Sensível: parcialmente.

Público: não obrigatório.

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

Sensível: não, mas deve ser controlado.

Público: sim, taxa final e data.

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

Sensível: sim.

Público: não. Cliente vê apenas seus próprios pedidos.

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

Sensível: sim.

Público: não. Cliente vê apenas suas próprias solicitações.

### audit_logs

Campos sugeridos:
- `id`
- `actor_user_id`
- `action`
- `entity_type`
- `entity_id`
- `before_json`
- `after_json`
- `ip_address`
- `user_agent`
- `created_at`

Sensível: sim.

Público: não.

### site_content

Campos sugeridos:
- `id`
- `page_key`
- `section_key`
- `content_json`
- `status`
- `updated_by_user_id`
- `updated_at`

Sensível: parcialmente.

Público: sim, somente conteúdo publicado.

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

Sensível: parcialmente.

Público: sim, somente arquivos aprovados.

## Observações

- Dados sensíveis devem ficar em banco/API protegidos.
- O site público deve consumir apenas dados aprovados.
- O app futuro deve usar a mesma API do site.
- Logs devem ser gravados para alterações de preço, estoque e permissões.
