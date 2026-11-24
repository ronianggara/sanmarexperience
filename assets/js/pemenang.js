(async function () {
  const data = await SITE.loadData();
  SITE.renderHeader(data);
  SITE.renderJuara("allJuara", data);
})();
