# CELULARS Impact Counter Report

## Scope

The live reuse impact counter is enabled only on the Home page (`index.html`).

It is not displayed on:

- `iphones.html`
- `atacado.html`
- `sobre.html`
- `contato.html`

## Internal Baseline

```js
startDate: "2016-07-01"
estimatedDevicesPerWeek: 2500
co2KgPerDevice: 70
ewasteKgPerDevice: 0.2
```

These values are CELULARS internal operating estimates and are configurable in `impact-calculator.js`.

## Calculation

- Devices reused = elapsed seconds since `2016-07-01` multiplied by `2500 / 604800`.
- CO2e estimated avoided = devices reused multiplied by `70 kg`.
- E-waste estimated avoided = devices reused multiplied by `0.2 kg`.
- Next estimated device interval = `604800 / 2500`, approximately `241.92` seconds, displayed as about `04:02`.

## Rhythm Display

- 2,500 per week
- 5,000 per fortnight
- 10,833 per month
- 130,000 per year

The monthly value uses `2500 * 52 / 12`.

## Transparency Text

The Home page states that the numbers are internal estimates based on an average operational volume of 2,500 iPhones per week and a configurable CO2e factor per device.

It also states that the numbers do not represent environmental certification or external audit.

## Implementation

Files changed:

- `index.html`
- `impact-calculator.js`
- `impact-counter.css`

The counter updates every second in the browser and does not affect PTAX, iPhone pricing, the wholesale page, WhatsApp links, or catalog logic.

## Validation Notes

Required validation:

- Home shows live impact values and no visible `Dados em configuracao` text.
- Other public pages do not show the impact counter.
- No horizontal overflow at desktop, 768px, 430px, or 390px.
- Existing PTAX, iPhones, Atacado, and WhatsApp flows remain unchanged.
