(function(){
  // Valores editaveis. Estimativa interna CELULARS, sem certificacao ambiental ou auditoria externa.
  const CELULARS_IMPACT_CONFIG = {
    startDate: "2016-01-01",
    baseDevicesPerSecond: 3,
    growthPercent: 0.05,
    co2KgPerDevice: 70,
    ewasteKgPerDevice: 0.2,
    batteryUnitsPerDevice: 1
  };

  window.CELULARS_IMPACT_CONFIG = window.CELULARS_IMPACT_CONFIG || CELULARS_IMPACT_CONFIG;

  const SECOND = 1;
  const MINUTE = 60;
  const HOUR = 60 * 60;
  const DAY = 24 * HOUR;
  const WEEK = 7 * DAY;
  const MONTH = 30.4375 * DAY;
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

  function isConfigured(configValue){
    return numberValue(configValue.baseDevicesPerSecond) > 0 &&
      numberValue(configValue.co2KgPerDevice) > 0 &&
      numberValue(configValue.ewasteKgPerDevice) > 0 &&
      numberValue(configValue.batteryUnitsPerDevice) > 0;
  }

  function adjustedDevicesPerSecond(configValue){
    const growthMultiplier = 1 + (numberValue(configValue.growthPercent) / 100);
    return numberValue(configValue.baseDevicesPerSecond) * growthMultiplier;
  }

  function formatInteger(value){
    return Math.floor(Math.max(0, Number(value) || 0)).toLocaleString("pt-BR");
  }

  function formatDecimal(value, digits){
    return (Math.max(0, Number(value) || 0)).toLocaleString("pt-BR", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
  }

  function formatMetric(value){
    const number = Math.max(0, Number(value) || 0);
    if (number >= 100) return formatInteger(number);
    return formatDecimal(number, 2);
  }

  function formatTonnes(kg, suffix, digits){
    const tonnes = Math.max(0, Number(kg) || 0) / 1000;
    const precision = Number.isFinite(Number(digits)) ? Number(digits) : 0;
    return tonnes.toLocaleString("pt-BR", {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision
    }) + " t" + (suffix ? " " + suffix : "");
  }

  function formatDate(dateString){
    const date = new Date(String(dateString || "") + "T00:00:00");
    if (Number.isNaN(date.getTime())) return "01/01/2016";
    return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
  }

  function formatUptime(configValue){
    const start = new Date(startTime(configValue));
    const now = new Date();
    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();
    let days = now.getDate() - start.getDate();

    if (days < 0) {
      months -= 1;
      const previousMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      days += previousMonth.getDate();
    }

    if (months < 0) {
      years -= 1;
      months += 12;
    }

    const hours = now.getHours();
    return years + " anos, " + months + " meses, " + days + " dias, " + hours + " horas";
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
      second: rate * SECOND,
      minute: rate * MINUTE,
      hour: rate * HOUR,
      day: rate * DAY,
      week: rate * WEEK,
      month: rate * MONTH,
      year: rate * YEAR
    };
  }

  function metricText(metric, totals, configured){
    if (!configured) return "Calculando...";
    if (metric === "devices") return formatInteger(totals.devices) + "+";
    if (metric === "co2") return formatTonnes(totals.co2, "CO\u2082e", 1);
    if (metric === "ewaste") return formatTonnes(totals.ewaste, "", 3);
    if (metric === "batteries") return formatInteger(totals.batteries) + "+";
    if (metric === "currentRate") return formatMetric(totals.rate);
    if (metric === "live") return "\u25cf LIVE";
    return "Calculando...";
  }

  function updateImpactCounters(){
    const blocks = document.querySelectorAll("[data-cel-impact]");
    if (!blocks.length) return;

    const currentConfig = config();
    const configured = isConfigured(currentConfig);
    const totals = impactTotals(currentConfig);
    const rhythm = rhythmTotals(totals.rate);

    blocks.forEach(function(block){
      block.toggleAttribute("data-impact-running", configured);

      block.querySelectorAll("[data-cel-impact-value]").forEach(function(el){
        el.textContent = metricText(el.getAttribute("data-cel-impact-value"), totals, configured);
      });

      block.querySelectorAll("[data-cel-impact-rhythm]").forEach(function(el){
        const rhythmKey = el.getAttribute("data-cel-impact-rhythm");
        el.textContent = configured && Object.prototype.hasOwnProperty.call(rhythm, rhythmKey)
          ? formatMetric(rhythm[rhythmKey])
          : "0";
      });

      block.querySelectorAll("[data-cel-impact-start]").forEach(function(el){
        el.textContent = formatDate(currentConfig.startDate);
      });

      block.querySelectorAll("[data-cel-impact-uptime]").forEach(function(el){
        el.textContent = formatUptime(currentConfig);
      });

      block.querySelectorAll("[data-cel-impact-updated]").forEach(function(el){
        el.textContent = "Estimativas internas calculadas com base em ritmo operacional configuravel de " +
          formatMetric(totals.rate) + " iPhones por segundo, historico desde " +
          formatDate(currentConfig.startDate) + " e fatores medios de reaproveitamento por aparelho. Os numeros sao referenciais e podem variar conforme modelo, lote, condicao, metodologia e mercado.";
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
