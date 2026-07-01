# CELULARS Impact Counter Report

## Escopo

Implementacao do contador de impacto estimado do reuso somente na Home e simplificacao da pagina iPhones para manter apenas um CTA principal de WhatsApp antes dos filtros e da tabela.

## Arquivos alterados

- `index.html`
- `iphones.html`
- `sobre.html`
- `contato.html`
- `style.css`
- `script.js`
- `impact-counter.css`
- `impact-calculator.js`
- `design-system/device-visual-system/CELULARS_IMPACT_COUNTER_REPORT.md`

## Local do contador

O contador fica somente na Home, apos a area inicial de acesso rapido e antes das secoes comerciais seguintes. O bloco usa identidade CELULARS com detalhe verde discreto, folha em SVG simples, cards de metricas e selo LIVE.

O contador foi removido das paginas:

- iPhones
- Sobre
- Contato

## Configuracao

```js
const CELULARS_IMPACT_CONFIG = {
  startDate: "2026-01-01",
  estimatedDevicesPerWeek: 0,
  co2KgPerDevice: 0,
  ewasteKgPerDevice: 0
};
```

Comentario no codigo:

`Atualizar estes valores com os numeros oficiais internos da CELULARS.`

## Formula usada

- Tempo decorrido = agora - `startDate`
- Aparelhos por segundo = `estimatedDevicesPerWeek / 604800`
- Aparelhos reaproveitados = tempo decorrido em segundos x aparelhos por segundo
- CO2 estimado evitado = aparelhos x `co2KgPerDevice`
- Residuo eletronico evitado = aparelhos x `ewasteKgPerDevice`
- Proximo aparelho estimado em = tempo restante ate o proximo ciclo calculado pela frequencia semanal

## Status dos valores

Os valores atuais estao zerados porque os numeros oficiais internos da CELULARS ainda estao pendentes.

Com valores zerados, o contador nao exibe numeros falsos e mostra:

`Dados em configuracao`

Quando os tres campos numericos forem maiores que zero, o contador passa a atualizar automaticamente e o indicador exibe LIVE.

## Transparencia

Texto exibido na Home:

`Estimativas internas calculadas com base no volume medio semanal de aparelhos eCPO trabalhados pela CELULARS. Os resultados sao referenciais e podem variar conforme modelo, lote, condicao e metodologia de calculo.`

## IPhones

A pagina iPhones manteve a tabela premium de iPhone 12 a iPhone 17, sem imagens, sem CDVS publico, sem status, sem ficha tecnica e sem coluna Acao. O CTA de WhatsApp agora aparece uma unica vez no topo da pagina, antes dos filtros e da tabela.

## Validacao

Validacao local e publicada executadas para:

- Home
- iPhones
- Sobre
- Contato

Resultados registrados no fechamento da tarefa.

### Resultado local

- Home: contador presente, folha SVG presente, valores zerados exibindo `Dados em configuracao`, sem overflow.
- iPhones: 26 linhas principais de iPhone 12 a iPhone 17, ordem de `iPhone 17 Pro Max` ate `iPhone 12 mini`, somente um CTA de WhatsApp no topo, sem coluna Acao, sem impacto ambiental, sem CDVS publico e sem overflow.
- Sobre: contador removido, sem overflow.
- Contato: sem contador, sem overflow.
- Breakpoints validados: desktop, 768px, 430px e 390px.
- Console: sem erros durante a validacao local.
