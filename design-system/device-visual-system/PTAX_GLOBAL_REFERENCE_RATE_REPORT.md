# PTAX Global Reference Rate Report

## Fonte e regra

- Fonte: Banco Central do Brasil - PTAX USD/BRL venda.
- Endpoint: `CotacaoDolarPeriodo` no servico PTAX v1 do Banco Central.
- Chave de cache ativa: `celulars_bcb_ptax_usd_brl_v3_spread15`.
- Atualizacao: no maximo 1 vez por dia.
- Fallback: cache v3 salvo; caches v2/v1 apenas se a API falhar; fallback final `R$ 5,3200`.

## Cotacao validada

- PTAX retornada pela API: `R$ 5,1717`.
- Data da PTAX: `29/06/2026`.
- Data/hora retornada: `2026-06-29 13:06:58.963012`.
- Acrescimo operacional: `R$ 0,1500`.
- Cotacao de referencia CELULARS: `R$ 5,3217`.

## Calculo aplicado

A taxa usada nos valores em reais do catalogo e:

`referenceRate = ptaxRate + CELULARS_EXCHANGE_SPREAD_BRL`

Com a PTAX validada:

`5,1717 + 0,1500 = 5,3217`

Exemplos de validacao:

| Produto | USD | Calculo | BRL exibido |
| --- | ---: | ---: | ---: |
| iPhone 17e | US$ 699 | 699 x 5,3217 | R$ 3.719,87 |
| iPhone 15 | US$ 549 | 549 x 5,3217 | R$ 2.921,61 |
| iPhone 16 Pro | US$ 849 | 849 x 5,3217 | R$ 4.518,12 |

## Paginas atualizadas

- `index.html`
- `iphones.html`
- `sobre.html`
- `contato.html`
- `script.js`
- `style.css`
- `ptax-reference.css`
- `ptax-reference.js`

## Resultado local

Validado localmente em:

- `index.html`
- `iphones.html`
- `sobre.html`
- `contato.html`

Resultado:

- Bloco de cotacao presente nas 4 paginas.
- Aviso de valores de referencia presente nas 4 paginas.
- PTAX original exibida com 4 casas: `R$ 5,1717`.
- Cotacao CELULARS exibida com 4 casas: `R$ 5,3217`.
- Ajuste operacional exibido com 4 casas: `R$ 0,1500`.
- Data exibida: `Atualizada em 29/06/2026.`
- Pagina iPhones manteve 52 cards.
- Valores BRL recalculados com PTAX + spread.
- Filtros funcionando.
- Chips de cor funcionando.
- Lightbox funcionando.
- WhatsApp funcionando com mensagem contextual.
- Nenhum texto tecnico CDVS visivel no site publico.
- Sem erro no console.
- Sem overflow em desktop, 768px, 430px e 390px.

## Resultado publicado

Validado no publicado apos deploy:

- `https://celulars.com.br`
- `https://celulars.com.br/iphones`
- `https://celulars.com.br/sobre`
- `https://celulars.com.br/contato`
- `https://celulars.com.br/iphones?ptax-spread-check=efcd76b`

Resultado:

- Bloco de cotacao presente nas 4 paginas.
- PTAX original exibida com 4 casas: `R$ 5,1717`.
- Cotacao CELULARS exibida com 4 casas: `R$ 5,3217`.
- Ajuste operacional exibido com 4 casas: `R$ 0,1500`.
- Data exibida: `Atualizada em 29/06/2026.`
- Pagina iPhones manteve 52 cards.
- Valores BRL recalculados com PTAX + spread.
- Nenhum texto tecnico CDVS visivel no site publico.
- Nenhum `alt` publico com `CDVS`.
- Sem overflow no desktop.
- O lightbox foi ajustado para nao nascer com `src=""`, evitando leitura de imagem vazia durante validacoes.
