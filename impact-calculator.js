(function(){
  // Estimativa interna CELULARS. Nao representa certificacao ambiental ou auditoria externa.
  const CELULARS_IMPACT_CONFIG = {
    startDate: "2016-07-01",
    estimatedDevicesPerWeek: 2500,
    co2KgPerDevice: 70,
    ewasteKgPerDevice: 0.2
  };

  window.CELULARS_IMPACT_CONFIG = window.CELULARS_IMPACT_CONFIG || CELULARS_IMPACT_CONFIG;

  const WEEK_SECONDS = 7 * 24 * 60 * 60;

  function numberValue(value){
    return Number.isFinite(Number(value)) ? Number(value) : 0;
  }

  function config(){
    return window.CELULARS_IMPACT_CONFIG || CELULARS_IMPACT_CONFIG;
  }

  function startTime(configValue){
    const start = new Date(String(configValue.startDate || "") + "T00:00:00");
    return Number.isNaN(start.getTime()) ? Date.now() : start.getTime();
  }

  function elapsedSeconds(configValue){
    return Math.max(0, (Date.now() - startTime(configValue)) / 1000);
  }

  function isConfigured(configValue){
    return numberValue(configValue.estimatedDevicesPerWeek) > 0 &&
      numberValue(configValue.co2KgPerDevice) > 0 &&
      numberValue(configValue.ewasteKgPerDevice) > 0;
  }

  function formatInteger(value){
    return Math.floor(value).toLocaleString("pt-BR");
  }

  function formatMassKg(value, suffix){
    const kg = Math.max(0, Number(value) || 0);
    if (kg >= 1000) {
      return (kg / 1000).toLocaleString("pt-BR", {
        maximumFractionDigits: 0
      }) + " t" + (suffix ? " " + suffix : "");
    }
    return Math.floor(kg).toLocaleString("pt-BR") + " kg" + (suffix ? " " + suffix : "");
  }

  function formatCountdown(seconds){
    const total = Math.max(0, Math.ceil(seconds));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    if (hours > 0) {
      return String(hours).padStart(2, "0") + ":" + String(minutes).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
    }
    return String(minutes).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
  }

  function impactTotals(configValue){
    const devicesPerWeek = numberValue(configValue.estimatedDevicesPerWeek);
    const devicesPerSecond = devicesPerWeek / WEEK_SECONDS;
    const elapsed = elapsedSeconds(configValue);
    const devices = elapsed * devicesPerSecond;
    const secondsPerDevice = devicesPerWeek > 0 ? WEEK_SECONDS / devicesPerWeek : 0;
    const nextSeconds = secondsPerDevice > 0 ? secondsPerDevice - (elapsed % secondsPerDevice) : 0;

    return {
      devices: devices,
      co2: devices * numberValue(configValue.co2KgPerDevice),
      ewaste: devices * numberValue(configValue.ewasteKgPerDevice),
      next: nextSeconds
    };
  }

  function rhythmTotals(configValue){
    const devicesPerWeek = numberValue(configValue.estimatedDevicesPerWeek);
    return {
      week: devicesPerWeek,
      fortnight: devicesPerWeek * 2,
      month: devicesPerWeek * 52 / 12,
      year: devicesPerWeek * 52
    };
  }

  function metricText(metric, totals, configured){
    if (!configured) return "Dados em configura\u00e7\u00e3o";
    if (metric === "devices") return formatInteger(totals.devices);
    if (metric === "co2") return formatMassKg(totals.co2, "CO\u2082");
    if (metric === "ewaste") return formatMassKg(totals.ewaste);
    if (metric === "next") return formatCountdown(totals.next);
    if (metric === "live") return "\u25cf LIVE";
    return "Dados em configura\u00e7\u00e3o";
  }

  function updateImpactCounters(){
    const blocks = document.querySelectorAll("[data-cel-impact]");
    if (!blocks.length) return;

    const currentConfig = config();
    const configured = isConfigured(currentConfig);
    const totals = impactTotals(currentConfig);
    const rhythm = rhythmTotals(currentConfig);

    blocks.forEach(function(block){
      block.toggleAttribute("data-impact-running", configured);

      block.querySelectorAll("[data-cel-impact-value]").forEach(function(el){
        el.textContent = metricText(el.getAttribute("data-cel-impact-value"), totals, configured);
      });

      block.querySelectorAll("[data-cel-impact-rhythm]").forEach(function(el){
        const rhythmKey = el.getAttribute("data-cel-impact-rhythm");
        el.textContent = configured && Object.prototype.hasOwnProperty.call(rhythm, rhythmKey)
          ? formatInteger(rhythm[rhythmKey])
          : "0";
      });

      block.querySelectorAll("[data-cel-impact-updated]").forEach(function(el){
        el.textContent = configured
          ? "Estimativas internas calculadas com base em uma m\u00e9dia operacional de " + formatInteger(currentConfig.estimatedDevicesPerWeek) + " iPhones por semana e fator configur\u00e1vel de CO\u2082e por aparelho. Os resultados s\u00e3o referenciais e podem variar conforme modelo, lote, condi\u00e7\u00e3o, metodologia de c\u00e1lculo e mercado."
          : "Dados em configura\u00e7\u00e3o. Atualizar estes valores com os n\u00fameros oficiais internos da CELULARS.";
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", updateImpactCounters);
  } else {
    updateImpactCounters();
  }

  setInterval(updateImpactCounters, 1000);
})();
