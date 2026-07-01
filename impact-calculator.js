(function(){
  // Valores editaveis. Estimativa interna CELULARS, sem certificacao ambiental ou auditoria externa.
  const CELULARS_IMPACT_CONFIG = {
    startDate: "2016-01-01",
    estimatedDevicesPerWeek: 2500,
    annualGrowthPercent: 0.05,
    co2KgPerDevice: 70,
    ewasteKgPerDevice: 0.2,
    batteryUnitsPerDevice: 1
  };

  window.CELULARS_IMPACT_CONFIG = window.CELULARS_IMPACT_CONFIG || CELULARS_IMPACT_CONFIG;

  const MINUTE = 60;
  const HOUR = 60 * 60;
  const DAY = 24 * HOUR;
  const WEEK = 7 * DAY;
  const MONTH_DAYS = 30.4375;
  const MONTH = MONTH_DAYS * DAY;
  const YEAR = 365 * DAY;

  function numberValue(value){
    return Number.isFinite(Number(value)) ? Number(value) : 0;
  }

  function config(){
    return window.CELULARS_IMPACT_CONFIG || CELULARS_IMPACT_CONFIG;
  }

  function startTime(configValue){
    const start = new Date(String(configValue.startDate || "") + "T00:00:00");
    return Number.isNaN(start.getTime()) ? new Date("2016-01-01T00:00:00").getTime() : start.getTime();
  }

  function elapsedSeconds(configValue){
    return Math.max(0, (Date.now() - startTime(configValue)) / 1000);
  }

  function yearsSinceStart(configValue){
    return elapsedSeconds(configValue) / YEAR;
  }

  function isConfigured(configValue){
    return numberValue(configValue.estimatedDevicesPerWeek) > 0 &&
      numberValue(configValue.co2KgPerDevice) > 0 &&
      numberValue(configValue.ewasteKgPerDevice) > 0 &&
      numberValue(configValue.batteryUnitsPerDevice) > 0;
  }

  function weeklyDevicesPerSecond(configValue){
    return numberValue(configValue.estimatedDevicesPerWeek) / WEEK;
  }

  function growthMultiplier(configValue){
    return 1 + ((numberValue(configValue.annualGrowthPercent) / 100) * yearsSinceStart(configValue));
  }

  function adjustedDevicesPerSecond(configValue){
    return weeklyDevicesPerSecond(configValue) * growthMultiplier(configValue);
  }

  function formatInteger(value){
    return Math.floor(Math.max(0, Number(value) || 0)).toLocaleString("pt-BR");
  }

  function formatRounded(value){
    const number = Math.max(0, Number(value) || 0);
    if (number >= 1000000) return formatInteger(Math.round(number / 1000) * 1000);
    if (number >= 10000) return formatInteger(Math.round(number / 100) * 100);
    if (number >= 1000) return formatInteger(Math.round(number / 10) * 10);
    return formatInteger(Math.round(number));
  }

  function formatSmall(value, digits){
    return (Math.max(0, Number(value) || 0)).toLocaleString("pt-BR", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
  }

  function formatTonnesRounded(kg, suffix){
    const tonnes = Math.max(0, Number(kg) || 0) / 1000;
    return formatRounded(tonnes) + " t" + (suffix ? " " + suffix : "");
  }

  function formatDate(dateString){
    const date = new Date(String(dateString || "") + "T00:00:00");
    if (Number.isNaN(date.getTime())) return "01/01/2016";
    return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
  }

  function secondsToClock(seconds){
    const total = Math.max(0, Math.ceil(Number(seconds) || 0));
    const minutes = Math.floor(total / 60);
    const remainingSeconds = total % 60;
    return String(minutes).padStart(2, "0") + ":" + String(remainingSeconds).padStart(2, "0");
  }

  function impactTotals(configValue){
    const rate = adjustedDevicesPerSecond(configValue);
    const elapsed = elapsedSeconds(configValue);
    const devices = elapsed * rate;

    return {
      rate: rate,
      elapsed: elapsed,
      devices: devices,
      co2: devices * numberValue(configValue.co2KgPerDevice),
      ewaste: devices * numberValue(configValue.ewasteKgPerDevice),
      batteries: devices * numberValue(configValue.batteryUnitsPerDevice)
    };
  }

  function rhythmTotals(rate){
    return {
      second: rate,
      minute: rate * MINUTE,
      hour: rate * HOUR,
      day: rate * DAY,
      week: rate * WEEK,
      month: rate * MONTH,
      year: rate * YEAR
    };
  }

  function nextDeviceSeconds(totals){
    if (!totals.rate) return 0;
    const cycleSeconds = 1 / totals.rate;
    const position = totals.devices - Math.floor(totals.devices);
    return Math.max(0, (1 - position) * cycleSeconds);
  }

  function metricText(metric, totals, rhythm, configured){
    if (!configured) return "Calculando...";
    if (metric === "devices") return formatRounded(totals.devices) + "+";
    if (metric === "co2") return formatTonnesRounded(totals.co2, "CO\u2082e");
    if (metric === "ewaste") return formatTonnesRounded(totals.ewaste, "");
    if (metric === "batteries") return formatRounded(totals.batteries) + "+";
    if (metric === "currentRate") return formatRounded(rhythm.week) + " / semana";
    if (metric === "live") return "LIVE";
    return "Calculando...";
  }

  function updateImpactCounters(){
    const blocks = document.querySelectorAll("[data-cel-impact]");
    if (!blocks.length) return;

    const currentConfig = config();
    const configured = isConfigured(currentConfig);
    const totals = impactTotals(currentConfig);
    const rhythm = rhythmTotals(weeklyDevicesPerSecond(currentConfig));

    blocks.forEach(function(block){
      block.toggleAttribute("data-impact-running", configured);

      block.querySelectorAll("[data-cel-impact-value]").forEach(function(el){
        el.textContent = metricText(el.getAttribute("data-cel-impact-value"), totals, rhythm, configured);
      });

      block.querySelectorAll("[data-cel-impact-rhythm]").forEach(function(el){
        const rhythmKey = el.getAttribute("data-cel-impact-rhythm");
        el.textContent = configured && Object.prototype.hasOwnProperty.call(rhythm, rhythmKey)
          ? formatRounded(rhythm[rhythmKey])
          : "0";
      });

      block.querySelectorAll("[data-cel-impact-pace]").forEach(function(el){
        el.textContent = "\u2248 " + formatRounded(rhythm.day) + " por dia \u00b7 \u2248 " +
          formatRounded(rhythm.hour) + " por hora \u00b7 1 aparelho a cada " +
          Math.max(1, Math.round((1 / totals.rate) / 60)) + " min";
      });

      block.querySelectorAll("[data-cel-impact-start]").forEach(function(el){
        el.textContent = formatDate(currentConfig.startDate);
      });

      block.querySelectorAll("[data-cel-impact-next]").forEach(function(el){
        el.textContent = secondsToClock(nextDeviceSeconds(totals));
      });

      block.querySelectorAll("[data-cel-impact-updated]").forEach(function(el){
        el.textContent = "Estimativas internas calculadas com base em uma média operacional de " +
          formatRounded(numberValue(currentConfig.estimatedDevicesPerWeek)) + " iPhones por semana, desde " +
          formatDate(currentConfig.startDate) + ", e fatores médios configuráveis de reaproveitamento por aparelho. Os resultados são referenciais e podem variar conforme modelo, lote, condição, metodologia e mercado.";
      });
    });
  }

  function startLiveCounter(){
    updateImpactCounters();
    window.setInterval(updateImpactCounters, 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startLiveCounter);
  } else {
    startLiveCounter();
  }
})();
