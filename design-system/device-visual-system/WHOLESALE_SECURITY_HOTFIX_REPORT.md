# Wholesale Security Hotfix Report

Data: 2026-07-05

## Risco encontrado

O teste publicado indicou que `/atacado` podia abrir publicamente e que `data/wholesale-inventory.json` continha 375 itens. Mesmo que a pagina `/atacado` seja protegida por Cloudflare Access, um arquivo estatico em `/data/` pode ser acessado diretamente se estiver publicado no frontend.

## Arquivos alterados

- `data/wholesale-inventory.json`
- `atacado.html`
- `_headers`
- `design-system/device-visual-system/WHOLESALE_ACCESS_SECURITY_PLAN.md`
- `design-system/device-visual-system/WHOLESALE_INVENTORY_DATA_SCHEMA.md`
- `design-system/device-visual-system/WHOLESALE_SECURITY_HOTFIX_REPORT.md`

## Inventario removido

`data/wholesale-inventory.json` foi substituido por:

```json
[]
```

Nenhum modelo, quantidade, preco real, estoque real ou total comercial deve permanecer neste arquivo publico.

## Estado final da pagina Atacado

A pagina `atacado.html` continua existindo com:

- estrutura visual B2B;
- login visual;
- texto de acesso restrito;
- chamada para WhatsApp;
- bloco PTAX global.

A tabela real nao e exibida quando o JSON esta vazio. A pagina mostra a mensagem:

> Tabela de atacado em preparacao. O acesso aos dados reais sera liberado somente apos validacao B2B e protecao completa da area.

## Encoding corrigido

`atacado.html` foi normalizado para UTF-8 e mantem:

```html
<meta charset="UTF-8">
```

Os textos quebrados por mojibake foram corrigidos.

## Headers adicionados

`_headers` recebeu regra para o JSON de atacado:

```text
/data/wholesale-inventory.json
  X-Robots-Tag: noindex, nofollow
  Cache-Control: no-store
```

Isso nao e uma protecao real de seguranca. Serve apenas para reduzir indexacao e cache.

## Recomendacoes para proxima etapa

1. Proteger `/atacado` com Cloudflare Access antes de qualquer dado real voltar ao site.
2. Nao publicar inventario real em arquivos estaticos dentro de `/data/`.
3. Mover dados reais para Pages Functions, Worker, D1, KV, R2 ou outro backend protegido.
4. Validar acesso B2B no servidor antes de entregar qualquer dado de estoque, quantidade ou preco.
5. Manter no frontend publico somente estrutura, sample ou mensagens institucionais.
