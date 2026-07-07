# iPhone 17 new price table report

## Objetivo

Atualizar a página pública de iPhones para exibir somente modelos novos da linha iPhone 17, sem imagens, sem CDVS visual, sem eCPO público e sem alterar a lógica de PTAX/Cotação CELULARS.

## Escopo público

Modelos exibidos:

- iPhone 17 Pro Max
- iPhone 17 Pro
- iPhone Air
- iPhone 17
- iPhone 17e

Modelos anteriores foram removidos da tabela pública desta etapa. Eles continuam preservados na base interna do catálogo, mas não aparecem na página iPhones.

## Fonte de preço

Fonte principal: páginas oficiais Apple Store para compra de iPhone.

- iPhone 17: https://www.apple.com/shop/buy-iphone/iphone-17/6.3-inch-display-256gb-black-unlocked
- iPhone 17 Pro / Pro Max: https://www.apple.com/shop/buy-iphone/iphone-17-pro
- iPhone Air: https://www.apple.com/shop/buy-iphone/iphone-air
- iPhone 17e: https://www.apple.com/shop/buy-iphone/iphone-17e

Os valores usados são preços Apple em dólar antes de impostos. Para o iPhone 17 foi usado o preço direto do fluxo "connect on your own later", sem desconto condicionado a operadora.

## Taxa local

Taxa aplicada: 7%.

Referência usada: sales/use tax local indicando composição de 6% do estado da Flórida + 1% de Miami-Dade.

- https://www.citynmb.com/286/Sales-Use-Tax

## Fórmula

```text
preco_celulars_usd = preco_apple_usd * 1.07
preco_celulars_brl = preco_celulars_usd * Cotacao CELULARS
Cotacao CELULARS = PTAX Banco Central + R$ 0,1500
```

## Preços cadastrados

| Modelo | Capacidade | Apple USD | Taxa 7% | CELULARS USD |
| --- | ---: | ---: | ---: | ---: |
| iPhone 17 Pro Max | 256 GB | 1199.00 | 83.93 | 1282.93 |
| iPhone 17 Pro Max | 512 GB | 1399.00 | 97.93 | 1496.93 |
| iPhone 17 Pro Max | 1 TB | 1599.00 | 111.93 | 1710.93 |
| iPhone 17 Pro Max | 2 TB | 1999.00 | 139.93 | 2138.93 |
| iPhone 17 Pro | 256 GB | 1099.00 | 76.93 | 1175.93 |
| iPhone 17 Pro | 512 GB | 1299.00 | 90.93 | 1389.93 |
| iPhone 17 Pro | 1 TB | 1499.00 | 104.93 | 1603.93 |
| iPhone Air | 256 GB | 999.00 | 69.93 | 1068.93 |
| iPhone Air | 512 GB | 1199.00 | 83.93 | 1282.93 |
| iPhone Air | 1 TB | 1399.00 | 97.93 | 1496.93 |
| iPhone 17 | 256 GB | 829.00 | 58.03 | 887.03 |
| iPhone 17 | 512 GB | 1029.00 | 72.03 | 1101.03 |
| iPhone 17e | 256 GB | 599.00 | 41.93 | 640.93 |
| iPhone 17e | 512 GB | 799.00 | 55.93 | 854.93 |

## Arquivos alterados

- `iphones.html`
- `script.js`
- `style.css`

## Validação local

- Página testada: `iphones.html`.
- 5 modelos públicos exibidos.
- 14 linhas de capacidade/preço exibidas.
- Nenhuma imagem de aparelho exibida.
- Nenhum CDVS visual exibido.
- PTAX/Cotação CELULARS preservada com cache existente.
- WhatsApp institucional com modelo, capacidade e condição Novo.

## Correção posterior: eCPO separado

A página iPhones não deve ser interpretada como uma página apenas de aparelhos novos.

Estrutura corrigida:

- Novos: somente linha iPhone 17, com preço Apple + taxa FL 7% e conversão por Cotação CELULARS.
- eCPO: modelos do iPhone 12 ao iPhone 17, em seção separada, sem preço público por enquanto.

Regra eCPO:

- não mostrar `US$ 0`;
- não mostrar `R$ 0,00`;
- não mostrar preço inventado;
- não usar "A partir de";
- mostrar `Preço sob consulta`;
- orientar confirmação por WhatsApp conforme lote, grade, condição e disponibilidade.

Essa correção preserva a lógica de PTAX, a tabela de novos linha 17 e o WhatsApp institucional.
- Layout sem overflow em desktop, 768px, 430px e 390px.
- Demais páginas locais (`index.html`, `sobre.html`, `contato.html`, `atacado.html`) abriram sem erro de console e sem overflow mobile.

## Observação sobre PTAX

Nenhuma alteração foi feita na lógica de PTAX. Durante o teste local, a Cotação CELULARS exibida veio do cache/lógica existente da página, mantendo a fórmula já aprovada: PTAX Banco Central + R$ 0,1500.
