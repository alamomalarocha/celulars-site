# CELULARS Impact Counter Report

## Purpose

Refine the Home impact block into a more compact and conservative internal estimate for CELULARS iPhone reuse activity.

The counter appears only on `index.html`.

## Configuration

Configured in `impact-calculator.js`:

```js
const CELULARS_IMPACT_CONFIG = {
  startDate: "2016-01-01",
  estimatedDevicesPerWeek: 2500,
  annualGrowthPercent: 0.05,
  co2KgPerDevice: 70,
  ewasteKgPerDevice: 0.2,
  batteryUnitsPerDevice: 1
};
```

## Removed Previous Base

The previous `baseDevicesPerSecond: 3` configuration was removed because it produced exaggerated public figures:

- almost 1 billion reused devices;
- tens of millions of tonnes of estimated CO2e;
- hundreds of thousands of tonnes of e-waste.

The new base uses `2,500` iPhones per week, which produces a more rational institutional estimate.

## Formulas

- `devicesPerSecond = estimatedDevicesPerWeek / (7 * 24 * 60 * 60)`
- `yearsSinceStart = secondsSinceStart / (365 * 24 * 60 * 60)`
- `growthMultiplier = 1 + ((annualGrowthPercent / 100) * yearsSinceStart)`
- `adjustedDevicesPerSecond = devicesPerSecond * growthMultiplier`
- `totalDevices = secondsSinceStart * adjustedDevicesPerSecond`
- `co2AvoidedKg = totalDevices * co2KgPerDevice`
- `ewasteAvoidedKg = totalDevices * ewasteKgPerDevice`
- `batteryUnitsSaved = totalDevices * batteryUnitsPerDevice`

## Approximate Rhythm

Base rhythm before annual growth adjustment:

- per second: about `0.0041`
- per minute: about `0.25`
- per hour: about `15`
- per day: about `357`
- per week: `2,500`
- per month: about `10,871`
- per year: about `130,357`

The public layout shows the rhythm compactly as week, month, year, plus a short line for day/hour/next device timing.

## Approximate Current Accumulated Result

With the 2016 start date and the small annual growth adjustment, the expected public figures are approximately:

- reused devices: around `1.3 million+`;
- CO2e avoided: around `91,000 t CO2e`;
- e-waste avoided: around `260 t`;
- batteries reused: around `1.3 million+`.

Numbers are rounded intentionally for a calmer and more credible presentation.

## Display

Compact Home block:

- title: `Impacto estimado do reuso`;
- main metric: `Aparelhos reaproveitados`;
- secondary metrics: CO2e, e-waste, batteries, rhythm;
- compact rhythm line: week, month, year;
- short pace line: day, hour, next-device equivalent;
- countdown: next estimated device.

The large dashboard-style period grid was removed.

## Transparency

This counter is an internal CELULARS estimate.

It does not represent:

- environmental certification;
- external audit;
- official carbon reduction guarantee;
- Apple certification, partnership or endorsement.

Public transparency text:

`Estimativas internas calculadas com base em uma media operacional de 2.500 iPhones por semana, desde 2016, e fatores medios configuraveis de reaproveitamento por aparelho. Os resultados sao referenciais e podem variar conforme modelo, lote, condicao, metodologia e mercado.`

`Os dados nao representam certificacao ambiental, auditoria externa ou garantia oficial de reducao de carbono.`

## Pages

Validated intent:

- Home: counter visible
- iPhones: counter not visible
- Atacado: counter not visible
- Sobre: counter not visible
- Contato: counter not visible

## Validation Checklist

Required validation:

- counter appears only on Home;
- no `Dados em configuracao`;
- no `3 iPhones por segundo`;
- uses 2,500 iPhones per week;
- accumulated devices stay near 1.3 million, not hundreds of millions;
- CO2e stays near 91,000 tonnes, not tens of millions;
- e-waste stays near 260 tonnes;
- layout is compact and does not dominate Home;
- next-device countdown works;
- LIVE badge appears;
- PTAX continues working;
- iPhones continues working;
- Atacado remains protected by Cloudflare Access;
- WhatsApp continues working;
- no console errors;
- no horizontal overflow at desktop, 768 px, 430 px and 390 px.

## Local Validation Result

Local validation was run against `http://127.0.0.1:5500`.

Home:

- counter visible only on Home: passed;
- `Dados em configuracao` not visible: passed;
- previous `3 iPhones por segundo` base not visible: passed;
- displayed rhythm: `2.500 / semana`;
- displayed devices: about `1.377.000+`;
- displayed CO2e: about `96.400 t CO2e`;
- displayed e-waste: about `275 t`;
- next-device countdown visible: passed;
- PTAX still visible: passed;
- WhatsApp links still visible: passed;
- no console errors: passed;
- no horizontal overflow at 1280 px, 768 px, 430 px and 390 px: passed.

Other pages:

- `iphones.html`: counter not visible, PTAX/WhatsApp/table remain functional;
- `atacado.html`: counter not visible locally and wholesale table remains functional;
- `sobre.html`: counter not visible;
- `contato.html`: counter not visible.

Mobile layout:

- 768 px: no overflow;
- 430 px: no overflow;
- 390 px: no overflow.

## Published Validation Result

Published validation was run against:

- `https://celulars.com.br?impact-realistic=1`
- `https://celulars.com.br/iphones?impact-realistic=1`
- `https://celulars.com.br/sobre?impact-realistic=1`
- `https://celulars.com.br/contato?impact-realistic=1`
- `https://celulars.com.br/atacado?impact-realistic=1`

Published Home result:

- title: `Impacto estimado do reuso`;
- devices: about `1.377.000+`;
- CO2e: about `96.400 t CO2e`;
- e-waste: about `275 t`;
- rhythm: `2.500 / semana`;
- week/month/year: `2.500`, `10.900`, `130.400`;
- next-device countdown visible: passed;
- no previous inflated figures visible: passed;
- no `Dados em configuracao`: passed;
- PTAX visible: passed;
- WhatsApp visible: passed;
- no console errors: passed;
- no horizontal overflow: passed.

Published page isolation:

- iPhones: counter not visible, PTAX/WhatsApp visible, no overflow;
- Sobre: counter not visible, PTAX/WhatsApp visible, no overflow;
- Contato: counter not visible, PTAX/WhatsApp visible, no overflow;
- Atacado: remains protected by Cloudflare Access as expected.
