# CELULARS Impact Counter Report

## Arquivos alterados

- `index.html`
- `sobre.html`
- `iphones.html`
- `impact-counter.css`
- `impact-calculator.js`

## Onde a secao foi adicionada

- Home (`index.html`): bloco compacto depois da area "Escolha o melhor caminho".
- Sobre (`sobre.html`): bloco completo depois da secao de responsabilidade/ciclo responsavel.
- iPhones (`iphones.html`): bloco compacto abaixo do aviso de precos/cotacao e antes dos filtros da tabela.

## Formula usada

O contador calcula o impacto acumulado a partir de uma data inicial configuravel:

```text
semanas = dias desde startDate / 7
totalDevices = floor(semanas * estimatedEcpoUnitsPerWeek)
co2AvoidedKg = totalDevices * co2KgPerDevice
ewasteAvoidedKg = totalDevices * ewasteKgPerDevice
waterSavedLiters = totalDevices * waterLitersPerDevice
```

Os valores sao atualizados automaticamente ao carregar a pagina.

## Valores configurados

Arquivo: `impact-calculator.js`

```js
startDate: "2026-01-01"
estimatedEcpoUnitsPerWeek: 0
co2KgPerDevice: 0
ewasteKgPerDevice: 0
waterLitersPerDevice: 0
```

## Status dos valores

Status: pendentes de numeros oficiais internos da CELULARS.

Como os valores-base ainda estao zerados, o site exibe "Dados em configuracao" e nao mostra numeros ambientais inventados.

## Observacoes

- Nao foi copiado texto ou layout de terceiros.
- Nao foi usada marca Rebright.
- Nao foi feita promessa de carbono neutro.
- Nao foi declarada certificacao ambiental.
- PTAX, precos, WhatsApp, menu e tabela de iPhones foram mantidos.

## Resultado dos testes locais

- `index.html`: bloco de impacto exibido; PTAX visivel; sem overflow.
- `iphones.html`: bloco compacto exibido; tabela preservada com 26 linhas; filtros, ficha tecnica e WhatsApp preservados; PTAX visivel; sem imagens; sem texto CDVS; sem overflow.
- `sobre.html`: bloco completo exibido com texto adicional, principios e cinco metricas; PTAX visivel; sem overflow.
- `contato.html`: pagina carregou sem alteracao visual relevante e sem overflow.
- Breakpoints testados na pagina iPhones: desktop, 768px, 430px e 390px.
- Resultado com valores zerados: exibicao correta de "Dados em configuracao", sem numeros falsos.
