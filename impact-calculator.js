(function(){
  // Atualizar estes valores com os numeros oficiais internos da CELULARS.
  const CELULARS_IMPACT_START_DATE = '2026-01-01';
  const CELULARS_ESTIMATED_ECPO_UNITS_PER_WEEK = 0;
  const CELULARS_ESTIMATED_CO2_KG_PER_DEVICE = 0;
  const CELULARS_ESTIMATED_EWASTE_KG_PER_DEVICE = 0;
  const CELULARS_ESTIMATED_WATER_LITERS_PER_DEVICE = 0;

  const CELULARS_IMPACT_CONFIG = {
    startDate: CELULARS_IMPACT_START_DATE,
    estimatedEcpoUnitsPerWeek: CELULARS_ESTIMATED_ECPO_UNITS_PER_WEEK,
    co2KgPerDevice: CELULARS_ESTIMATED_CO2_KG_PER_DEVICE,
    ewasteKgPerDevice: CELULARS_ESTIMATED_EWASTE_KG_PER_DEVICE,
    waterLitersPerDevice: CELULARS_ESTIMATED_WATER_LITERS_PER_DEVICE,
    valuesStatus: 'CONFIGURAR'
  };

  window.CELULARS_IMPACT_CONFIG = CELULARS_IMPACT_CONFIG;

  function numberValue(value){
    return Number.isFinite(Number(value)) ? Number(value) : 0;
  }

  function weeksSince(startDate){
    const start = new Date(startDate + 'T00:00:00');
    if (Number.isNaN(start.getTime())) return 0;
    const now = new Date();
    const diff = Math.max(0, now.getTime() - start.getTime());
    return diff / (7 * 24 * 60 * 60 * 1000);
  }

  function isConfigured(config){
    return numberValue(config.estimatedEcpoUnitsPerWeek) > 0 &&
      (numberValue(config.co2KgPerDevice) > 0 ||
       numberValue(config.ewasteKgPerDevice) > 0 ||
       numberValue(config.waterLitersPerDevice) > 0);
  }

  function formatInteger(value){
    return Math.round(value).toLocaleString('pt-BR');
  }

  function formatMassKg(value){
    const kg = Math.max(0, Number(value) || 0);
    if (kg >= 1000) {
      return (kg / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' t';
    }
    return Math.round(kg).toLocaleString('pt-BR') + ' kg';
  }

  function formatWater(value){
    const liters = Math.max(0, Number(value) || 0);
    if (liters >= 1000) {
      return (liters / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' m³';
    }
    return Math.round(liters).toLocaleString('pt-BR') + ' L';
  }

  function impactTotals(config){
    const totalDevices = Math.floor(weeksSince(config.startDate) * numberValue(config.estimatedEcpoUnitsPerWeek));
    return {
      devices: totalDevices,
      co2: totalDevices * numberValue(config.co2KgPerDevice),
      ewaste: totalDevices * numberValue(config.ewasteKgPerDevice),
      water: totalDevices * numberValue(config.waterLitersPerDevice),
      lifecycle: totalDevices > 0 ? '+1 ciclo' : 'Dados em configuração'
    };
  }

  function metricText(metric, totals, configured){
    if (!configured) return 'Dados em configuração';
    if (metric === 'devices') return formatInteger(totals.devices) + '+';
    if (metric === 'co2') return formatMassKg(totals.co2);
    if (metric === 'ewaste') return formatMassKg(totals.ewaste);
    if (metric === 'water') return formatWater(totals.water);
    if (metric === 'lifecycle') return totals.lifecycle;
    return 'Dados em configuração';
  }

  function updateImpactCounters(){
    const blocks = document.querySelectorAll('[data-cel-impact]');
    if (!blocks.length) return;

    const config = window.CELULARS_IMPACT_CONFIG || CELULARS_IMPACT_CONFIG;
    const configured = isConfigured(config);
    const totals = impactTotals(config);

    blocks.forEach(function(block){
      block.querySelectorAll('[data-cel-impact-value]').forEach(function(el){
        el.textContent = metricText(el.getAttribute('data-cel-impact-value'), totals, configured);
      });

      block.querySelectorAll('[data-cel-impact-updated]').forEach(function(el){
        el.textContent = configured
          ? 'Atualizado automaticamente com base em ' + formatInteger(numberValue(config.estimatedEcpoUnitsPerWeek)) + ' aparelho(s) eCPO por semana desde ' + config.startDate + '.'
          : 'Atualizar estes valores com os números oficiais internos da CELULARS.';
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateImpactCounters);
  } else {
    updateImpactCounters();
  }
})();
