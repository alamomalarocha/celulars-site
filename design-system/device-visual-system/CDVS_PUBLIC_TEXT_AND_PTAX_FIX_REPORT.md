# CDVS Public Text and PTAX Fix Report

Relatorio da correcao final apos o commit `262880f Complete priority CDVS image batch 1`.

## 1. Causa do texto CDVS no site publico

O texto tecnico `CDVS` estava sendo incluido no atributo `alt` das imagens integradas pelo mapa interno `CDVS_IMAGE_OVERRIDES`.

Trecho anterior:

- `alt: modelName + " " + color + " CDVS"`

Quando uma imagem demorava para carregar, falhava ou era renderizada em estado intermediario, o navegador podia expor esse texto alternativo visualmente no card.

CDVS permanece permitido apenas como nome interno de constante, pasta, relatorio e documentacao tecnica.

## 2. Correcao aplicada ao texto publico

O `alt` publico das imagens foi ajustado para conter apenas modelo e cor.

Exemplos corretos:

- `iPhone 17e Black`
- `iPhone 16 Pro Black Titanium`
- `iPhone 15 Plus Black`

Nenhum `alt` publico do catalogo deve conter `CDVS`.

## 3. Arquivos corrigidos

- `script.js`
- `iphones.html`

## 4. Imagens 404 / caminhos publicos

Na validacao local:

- 52 cards carregaram.
- As imagens CDVS disponiveis carregaram.
- Nenhuma imagem visivel quebrada foi detectada.
- Nenhum 404 de imagem CDVS foi detectado no catalogo.
- Fallback visual permanece ativo para modelos/cores sem imagem final.

## 5. PTAX Banco Central

Fonte verificada:

- Banco Central do Brasil - PTAX USD/BRL venda
- Endpoint OData oficial `CotacaoDolarPeriodo`

Consulta manual realizada contra a API oficial para o periodo ate `30/06/2026` retornou como ultima cotacao disponivel:

- Data da cotacao: `2026-06-29`
- PTAX venda: `5.17170`

No site, a exibicao validada foi:

- `Cotação de referência (PTAX/Banco Central): R$ 5,17`
- `Atualizada em 29/06/2026.`

## 6. Cache PTAX

O cache anterior usava a chave:

- `celulars_bcb_ptax_usd_brl_v1`

Para evitar que navegadores ficassem presos em uma cotacao antiga, a chave ativa foi atualizada para:

- `celulars_bcb_ptax_usd_brl_v2`

Comportamento validado:

- Se existir cache `v2` do mesmo dia, a pagina usa o cache e nao faz nova busca.
- Se existir apenas cache antigo `v1`, ele nao bloqueia a nova busca diaria.
- Se a API falhar, a pagina ainda pode usar a ultima cotacao salva como fallback.
- A busca segue limitada a no maximo uma atualizacao util por dia via `fetchedKey` e TTL.
- Sabados, domingos e feriados continuam usando a ultima cotacao util retornada pela API.

Log de validacao local:

- Source: `api`
- Checked at: `2026-06-30T02:09:56.722Z`
- Checked key: `2026-06-29`
- Quote date: `2026-06-29`
- Rate: `5.1717`

Teste especifico de cache antigo:

- Cache `v1` simulado com data `2026-06-26`
- Resultado: a pagina buscou a API novamente e salvou cache `v2` com data `2026-06-29`

## 7. Resultado do teste local

Paginas testadas localmente:

- `index.html`
- `iphones.html`
- `sobre.html`
- `contato.html`

Viewports testados:

- Desktop: 1366 x 900
- Tablet: 768 x 900
- Mobile: 430 x 900
- Mobile pequeno: 390 x 900

Validacoes da pagina iPhones:

- 52 cards continuam aparecendo.
- Nenhum texto `CDVS` aparece visualmente no site publico.
- Nenhum atributo `alt` de imagem publica contem `CDVS`.
- Imagens CDVS carregam quando disponiveis.
- Fallback aparece quando nao ha imagem final.
- Nenhuma imagem quebrada foi detectada.
- Chips de cor funcionam.
- Lightbox funciona.
- Filtros funcionam.
- WhatsApp funciona.
- PTAX aparece e atualiza via API quando o cache ativo esta vazio/antigo.
- Sem erro no console.
- Sem overflow em desktop, 768px, 430px e 390px.

## 8. Resultado do teste publicado

Validacao publicada realizada em:

- `https://celulars.com.br`
- `https://celulars.com.br/iphones.html` redirecionando corretamente para `https://celulars.com.br/iphones`

Resultado publicado:

- Home sem texto `CDVS` visivel.
- Pagina iPhones com 52 cards.
- Nenhum texto `CDVS` aparece visualmente no catalogo publico.
- Nenhum atributo `alt` de imagem publica contem `CDVS`.
- Nenhuma imagem de card quebrada.
- As 7 imagens do lote prioritario 1 carregam corretamente.
- Lightbox abre a imagem correta.
- Filtros continuam funcionando.
- WhatsApp continua funcionando.
- PTAX exibida: `Cotacao de referencia (PTAX/Banco Central): R$ 5,17`
- Data PTAX exibida: `Atualizada em 29/06/2026.`
- Log publicado da PTAX: source `api`, quoteDate `2026-06-29`, rate `5.1717`
- Sem erro de console.
- Sem overflow em desktop, 768px, 430px e 390px.
