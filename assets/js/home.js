(async function () {
  const data = await SITE.loadData();
  SITE.renderHeader(data);
  SITE.renderHero(data);
  SITE.renderInfoStrip(data);
  SITE.renderTimeline(data);
  SITE.renderLombaGrid(data);
  SITE.renderBasketHome(data);
  SITE.renderJuara("juaraWrap", data);
  SITE.renderSponsorContacts(data);
  if (window.BACKEND_OFFLINE) console.info("[SANMAR] Menampilkan data lokal (backend belum terhubung).");
})();
