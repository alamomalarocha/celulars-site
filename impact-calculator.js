(function(){
  // Atualizar estes valores com os numeros oficiais internos da CELULARS.
  const CELULARS_IMPACT_CONFIG = {
    startDate: "2026-01-01",
    estimatedDevicesPerWeek: 0,
    co2KgPerDevice: 0,
    ewasteKgPerDevice: 0
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
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
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

  function metricText(metric, totals, configured){
    if (!configured) return "Dados em configura\u00e7\u00e3o";
    if (metric === "devices") return formatInteger(totals.devices);
    if (metric === "co2") return formatMassKg(totals.co2, "CO\u2082");
    if (metric === "ewaste") return formatMassKg(totals.ewaste);
    if (metric === "next") return formatCountdown(totals.next);
    if (metric === "live") return "● LIVE";
    return "Dados em configura\u00e7\u00e3o";
  }

  function updateImpactCounters(){
    const blocks = document.querySelectorAll("[data-cel-impact]");
    if (!blocks.length) return;

    const currentConfig = config();
    const configured = isConfigured(currentConfig);
    const totals = impactTotals(currentConfig);

    blocks.forEach(function(block){
      block.toggleAttribute("data-impact-running", configured);

      block.querySelectorAll("[data-cel-impact-value]").forEach(function(el){
        el.textContent = metricText(el.getAttribute("data-cel-impact-value"), totals, configured);
      });

      block.querySelectorAll("[data-cel-impact-updated]").forEach(function(el){
        el.textContent = configured
          ? "Estimativa em atualiza\u00e7\u00e3o autom\u00e1tica desde " + currentConfig.startDate + "."
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
