# CELULARS Impact Counter Report

## Purpose

Refactor the Home impact block into a live internal estimate counter for CELULARS reuse activity.

The counter appears only on `index.html`.

## Configuration

Configured in `impact-calculator.js`:

```js
const CELULARS_IMPACT_CONFIG = {
  startDate: "2016-01-01",
  baseDevicesPerSecond: 3,
  growthPercent: 0.05,
  co2KgPerDevice: 70,
  ewasteKgPerDevice: 0.2,
  batteryUnitsPerDevice: 1
};
```

## Formulas

- `secondsSinceStart = now - startDate`
- `growthMultiplier = 1 + (growthPercent / 100)`
- `adjustedDevicesPerSecond = baseDevicesPerSecond * growthMultiplier`
- `devicesTotal = secondsSinceStart * adjustedDevicesPerSecond`
- `devicesPerMinute = adjustedDevicesPerSecond * 60`
- `devicesPerHour = adjustedDevicesPerSecond * 60 * 60`
- `devicesPerDay = devicesPerHour * 24`
- `devicesPerWeek = devicesPerDay * 7`
- `devicesPerMonth = devicesPerDay * 30.4375`
- `devicesPerYear = devicesPerDay * 365`
- `co2AvoidedKg = devicesTotal * co2KgPerDevice`
- `ewasteAvoidedKg = devicesTotal * ewasteKgPerDevice`
- `batteryUnitsSaved = devicesTotal * batteryUnitsPerDevice`

## Display

Main card:

- Aparelhos reaproveitados
- Live counter increasing over time
- Since 2016 label

Secondary cards:

- CO2 estimado evitado, displayed in tonnes
- Resíduo eletrônico evitado, displayed in tonnes
- Baterias reaproveitadas
- Ritmo atual, displayed as iPhones per second

Rhythm block:

- Por segundo
- Por minuto
- Por hora
- Por dia
- Por semana
- Por mês
- Por ano

Time block:

- Operação estimada desde: 01/01/2016
- Tempo acumulado since start date

## Transparency

This counter is an internal CELULARS estimate.

It does not represent:

- environmental certification;
- external audit;
- official carbon reduction guarantee;
- Apple certification, partnership or endorsement.

## Pages

Validated intent:

- Home: counter visible
- iPhones: counter not visible
- Atacado: counter not visible
- Sobre: counter not visible
- Contato: counter not visible

## Validation

Local browser validation was run at:

- desktop: 1280 px
- tablet: 768 px
- mobile: 430 px
- mobile: 390 px

Results:

- Counter appears only on Home: passed.
- Counter does not appear on iPhones, Atacado, Sobre or Contato: passed.
- `Dados em configuração` is not visible: passed.
- Main devices counter increases in real time: passed.
- CO2 estimate increases in real time: passed.
- E-waste estimate increases in real time: passed.
- Battery estimate increases in real time: passed.
- Rhythm values appear for second, minute, hour, day, week, month and year: passed.
- Start date appears as `01/01/2016`: passed.
- Accumulated operation time appears and updates: passed.
- LIVE badge appears: passed.
- PTAX continues working: passed.
- iPhones table continues working: passed.
- Atacado local page remains functional and published Atacado remains protected by Cloudflare Access: pending published validation.
- WhatsApp links remain active: passed.
- No console errors: passed.
- No horizontal overflow at tested breakpoints: passed.

Example local readings during validation:

- Devices: changed from `994.453.559+` to `994.453.568+`.
- CO2: changed from `69.611.749,2 t CO2e` to `69.611.749,8 t CO2e`.
- E-waste: changed from `198.890,712 t` to `198.890,714 t`.
- Batteries: changed from `994.453.559+` to `994.453.568+`.

Published validation was run using:

- `https://celulars.com.br?impact-live-v2=1`
- `https://celulars.com.br/iphones?impact-live-v2=1`
- `https://celulars.com.br/sobre?impact-live-v2=1`
- `https://celulars.com.br/contato?impact-live-v2=1`
- `https://celulars.com.br/atacado?impact-live-v2=1`

Published results:

- Home counter visible and increasing: passed.
- Devices changed from `994.453.934+` to `994.453.937+`.
- CO2 displayed as `69.611.775,6 t CO2e`.
- E-waste displayed as `198.890,787 t`.
- Batteries displayed as `994.453.937+`.
- Rhythm values displayed for second, minute, hour, day, week, month and year: passed.
- Start date displayed as `01/01/2016`: passed.
- No `Dados em configuração`: passed.
- iPhones, Sobre and Contato do not show the counter: passed.
- Published Atacado remains protected by Cloudflare Access. A CSP warning from Cloudflare's own sign-in page was observed and is unrelated to CELULARS site code.
