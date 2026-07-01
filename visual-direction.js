(function () {
  function moveRateCard() {
    const homeHero = document.querySelector("#celulars-home .cel-home-hero");
    const homeRate = document.querySelector("#celulars-home .cel-ptax-reference");
    if (homeHero && homeRate && !homeHero.contains(homeRate)) {
      homeHero.classList.add("cel-hero-with-rate");
      homeHero.appendChild(homeRate);
    }

    const sobreHero = document.querySelector("#celulars-sobre .cel-hero");
    const sobreRate = document.querySelector("#celulars-sobre .cel-ptax-reference");
    if (sobreHero && sobreRate && !sobreHero.contains(sobreRate)) {
      sobreHero.classList.add("cel-hero-with-rate");
      sobreHero.appendChild(sobreRate);
    }

    const contatoHero = document.querySelector("#celulars-contato .cel-hero");
    const contatoRate = document.querySelector("#celulars-contato .cel-ptax-reference");
    if (contatoHero && contatoRate && !contatoHero.contains(contatoRate)) {
      contatoHero.classList.add("cel-hero-with-rate");
      contatoHero.appendChild(contatoRate);
    }

    const atacadoHero = document.querySelector("#celulars-atacado .cel-atacado-hero");
    const atacadoRate = document.querySelector("#celulars-atacado .cel-ptax-reference");
    if (atacadoHero && atacadoRate && !atacadoHero.contains(atacadoRate)) {
      atacadoHero.classList.add("cel-hero-with-rate");
      atacadoHero.appendChild(atacadoRate);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", moveRateCard);
  } else {
    moveRateCard();
  }
})();
