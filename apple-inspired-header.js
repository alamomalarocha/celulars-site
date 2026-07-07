(function () {
  const iconPath = "brand-assets/celulars-official-logos/icon/celulars-header-icon-original-512.png";
  const brandImage = document.querySelector(".cel-global-brand img");
  const nav = document.querySelector(".cel-global-nav");

  if (brandImage) {
    brandImage.src = iconPath;
    brandImage.alt = "CELULARS";
    brandImage.loading = "eager";
  }

  if (!nav || nav.querySelector(".cel-global-search")) return;

  const searchItems = [
    { label: "Home", url: "index.html", terms: "home inicio celulars" },
    { label: "iPhones", url: "iphones.html", terms: "iphone iphones modelos 17 16 15 14 13 12 novo ecpo catalogo" },
    { label: "Acessos", url: "acessos.html", terms: "acessos acesso atacado b2b revenda lojista empresa comercial volume funcionario equipe administrativo" },
    { label: "Sobre", url: "sobre.html", terms: "sobre celulars miami girtab operacao empresa" },
    { label: "Contato / WhatsApp", url: "contato.html", terms: "contato whatsapp telefone atendimento suporte" }
  ];

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
})();
