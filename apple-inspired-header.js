(function () {
  const iconPath = "brand-assets/celulars-official-logos/icon/celulars-header-icon-original-512.png";
  const BCB_CACHE_KEY = "celulars_bcb_ptax_usd_brl_v3_spread15";
  const BCB_LEGACY_CACHE_KEYS = ["celulars_bcb_ptax_usd_brl_v2", "celulars_bcb_ptax_usd_brl_v1"];
  const BCB_CACHE_TTL_MS = 86400000;
  const FALLBACK_BCB_RATE = 5.32;
  const CELULARS_EXCHANGE_SPREAD_BRL = 0.15;
  const brandImage = document.querySelector(".cel-global-brand img");
  const nav = document.querySelector(".cel-global-nav");

  if (brandImage) {
    brandImage.src = iconPath;
    brandImage.alt = "CELULARS";
    brandImage.loading = "eager";
  }

  if (!nav) return;

  const searchItems = [
    { label: "Home", url: "index.html", terms: "home inicio celulars" },
    { label: "iPhones", url: "iphones.html", terms: "iphone iphones modelos 17 16 15 14 13 12 novo ecpo catalogo" },
    { label: "Acessos", url: "acessos.html", terms: "acessos acesso atacado b2b revenda lojista empresa comercial volume funcionario equipe administrativo" },
    { label: "Sobre", url: "sobre.html", terms: "sobre celulars miami girtab operacao empresa" },
    { label: "Contato / WhatsApp", url: "contato.html", terms: "contato whatsapp telefone atendimento suporte" }
  ];

  if (!nav.querySelector(".cel-global-search")) {
    const search = document.createElement("div");
    search.className = "cel-global-search";
    search.innerHTML = [
      '<button class="cel-global-search-button" type="button" aria-label="Buscar no site" aria-expanded="false">',
      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m16.5 16.5 4 4"></path></svg>',
      "</button>",
      '<div class="cel-global-search-panel" role="search" aria-label="Busca CELULARS">',
      '<input type="search" placeholder="Buscar iPhone, eCPO, Acessos..." aria-label="Buscar no site CELULARS">',
      '<div class="cel-global-search-results"></div>',
      "</div>"
    ].join("");

    nav.appendChild(search);

    const button = search.querySelector("button");
    const panel = search.querySelector(".cel-global-search-panel");
    const input = search.querySelector("input");
    const results = search.querySelector(".cel-global-search-results");

    function matchesItem(item, query) {
      const text = `${item.label} ${item.terms}`.toLowerCase();
      return query.split(/\s+/).every((part) => text.includes(part));
    }

    function renderResults() {
      const query = input.value.trim().toLowerCase();
      const filtered = query ? searchItems.filter((item) => matchesItem(item, query)) : searchItems.slice(1, 5);
      results.innerHTML = filtered.length
        ? filtered.map((item) => `<a href="${item.url}">${item.label}</a>`).join("")
        : '<span class="cel-global-search-empty">Nenhum resultado encontrado</span>';
    }

    function openPanel() {
      panel.classList.add("is-open");
      button.setAttribute("aria-expanded", "true");
      renderResults();
      window.setTimeout(() => input.focus(), 0);
    }

    function closePanel() {
      panel.classList.remove("is-open");
      button.setAttribute("aria-expanded", "false");
    }

    button.addEventListener("click", () => {
      panel.classList.contains("is-open") ? closePanel() : openPanel();
    });

    input.addEventListener("input", renderResults);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        const first = results.querySelector("a");
        if (first) window.location.href = first.href;
      }
      if (event.key === "Escape") closePanel();
    });

    document.addEventListener("click", (event) => {
      if (!search.contains(event.target)) closePanel();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closePanel();
    });
  }

  if (!nav.querySelector(".cel-global-currency")) {
    const currency = document.createElement("div");
    currency.className = "cel-global-currency";
    currency.setAttribute("aria-live", "polite");
    currency.setAttribute("data-global-exchange-card", "");
    currency.innerHTML = [
      '<span class="cel-currency-title">Cotação de referência CELULARS</span>',
      '<span class="cel-currency-value">USD/BRL <strong data-cel-reference-rate data-bcb-rate>R$ 5,4700</strong></span>',
      '<span class="cel-currency-base">Base PTAX/Banco Central: <strong data-cel-ptax-rate>R$ 5,3200</strong> + ajuste operacional: <strong data-cel-spread-rate>R$ 0,1500</strong></span>',
      '<span class="cel-currency-date" data-cel-ptax-date data-bcb-date>Atualizando cotação PTAX USD/BRL...</span>'
    ].join("");
    nav.appendChild(currency);
  }

  function formatBcbRate(value) {
    return "R$ " + Number(value).toLocaleString("pt-BR", {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4
    });
  }

  function localDateKey(date = new Date()) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  }

  function bcbParamDate(date) {
    return [
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
      date.getFullYear()
    ].join("-");
  }

  function formatBcbDate(value) {
    const parts = String(value || "").slice(0, 10).split("-");
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : "--/--/----";
  }

  function referenceRateFrom(rateInfo) {
    return (Number(rateInfo.rate) || FALLBACK_BCB_RATE) + CELULARS_EXCHANGE_SPREAD_BRL;
  }

  function readBcbCache() {
    try {
      const cached = JSON.parse(localStorage.getItem(BCB_CACHE_KEY) || "null");
      return cached && Number(cached.rate) > 0 ? { ...cached, cacheVersion: 3 } : null;
    } catch (error) {
      return null;
    }
  }

  function readLegacyBcbCache() {
    for (const key of BCB_LEGACY_CACHE_KEYS) {
      try {
        const cached = JSON.parse(localStorage.getItem(key) || "null");
        if (cached && Number(cached.rate) > 0) return { ...cached, cacheVersion: key.includes("_v2") ? 2 : 1 };
      } catch (error) {}
    }
    return null;
  }

  function writeBcbCache(rateInfo) {
    try {
      localStorage.setItem(BCB_CACHE_KEY, JSON.stringify({
        ...rateInfo,
        spread: CELULARS_EXCHANGE_SPREAD_BRL,
        referenceRate: referenceRateFrom(rateInfo),
        cacheVersion: 3
      }));
    } catch (error) {}
  }

  function updateExchangeCards(rateInfo, status) {
    const ptax = Number(rateInfo.rate) || FALLBACK_BCB_RATE;
    const reference = ptax + CELULARS_EXCHANGE_SPREAD_BRL;
    document.querySelectorAll("[data-cel-reference-rate], [data-bcb-rate]").forEach((el) => {
      el.textContent = formatBcbRate(reference);
    });
    document.querySelectorAll("[data-cel-ptax-rate]").forEach((el) => {
      el.textContent = formatBcbRate(ptax);
    });
    document.querySelectorAll("[data-cel-spread-rate]").forEach((el) => {
      el.textContent = formatBcbRate(CELULARS_EXCHANGE_SPREAD_BRL);
    });
    document.querySelectorAll("[data-bcb-date], [data-cel-ptax-date]").forEach((el) => {
      el.textContent = status === "fallback"
        ? "Cotação indisponível temporariamente."
        : "Atualizada em " + formatBcbDate(rateInfo.date || rateInfo.dataHoraCotacao) + ".";
    });
  }

  function logBcbStatus(source, rateInfo) {
    try {
      console.info("[CELULARS PTAX]", {
        source,
        checkedAt: new Date().toISOString(),
        checkedKey: localDateKey(),
        quoteDate: rateInfo.date || String(rateInfo.dataHoraCotacao || "").slice(0, 10),
        ptaxRate: Number(rateInfo.rate) || null,
        spread: CELULARS_EXCHANGE_SPREAD_BRL,
        referenceRate: referenceRateFrom(rateInfo),
        cacheKey: BCB_CACHE_KEY
      });
    } catch (error) {}
  }

  async function fetchBcbPtax() {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 14);
    const url = "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?@dataInicial='" + bcbParamDate(start) + "'&@dataFinalCotacao='" + bcbParamDate(end) + "'&$format=json&$orderby=dataHoraCotacao desc&$top=1";
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error("BCB PTAX HTTP " + response.status);
    const data = await response.json();
    const row = data && data.value && data.value[0];
    if (!row || !Number(row.cotacaoVenda)) throw new Error("BCB PTAX sem cotação");
    return {
      rate: Number(row.cotacaoVenda),
      date: String(row.dataHoraCotacao).slice(0, 10),
      dataHoraCotacao: row.dataHoraCotacao,
      fetchedKey: localDateKey(),
      fetchedAt: Date.now(),
      source: "Banco Central do Brasil - PTAX USD/BRL venda"
    };
  }

  async function updateGlobalBcbExchangeRate() {
    const cached = readBcbCache();
    const today = localDateKey();
    if (cached && cached.fetchedKey === today && Date.now() - Number(cached.fetchedAt || 0) < BCB_CACHE_TTL_MS) {
      updateExchangeCards(cached, "cache");
      logBcbStatus("cache", cached);
      return;
    }

    try {
      const fresh = await fetchBcbPtax();
      writeBcbCache(fresh);
      updateExchangeCards(fresh, "live");
      logBcbStatus("api", fresh);
    } catch (error) {
      console.warn("Não foi possível carregar PTAX do Banco Central.", error);
      const saved = readBcbCache() || readLegacyBcbCache();
      if (saved) {
        updateExchangeCards(saved, "saved");
        logBcbStatus("saved-cache", saved);
        return;
      }
      const fallback = { rate: FALLBACK_BCB_RATE, date: "" };
      updateExchangeCards(fallback, "fallback");
      logBcbStatus("fallback", fallback);
    }
  }

  updateGlobalBcbExchangeRate();
})();
