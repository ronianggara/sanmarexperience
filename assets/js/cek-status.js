(async function () {
  const data = await SITE.loadData();
  SITE.renderHeader(data);
  const e = CORE.esc;
  const form = document.getElementById("statusForm");
  const result = document.getElementById("statusResult");

  function renderStatus(s) {
    const lomba = CORE.lombaById(data, s.lomba_id);
    result.innerHTML = '<div class="card" style="max-width:640px"><b style="font-size:14px">Kode ' + e(s.kode) + "</b>" +
      '<div class="kats" style="margin:8px 0 0"><div class="kat"><span><b>' + e(lomba ? lomba.nama : s.lomba_id) + "</b> <small style=\"color:var(--soft)\">· " + e(s.kategori) + "</small></span>" + CORE.regBadge(s.status) + "</div></div>" +
      '<p style="margin:12px 0 4px"><b>' + e(s.nama) + "</b><br><small>" + e(s.sekolah) + "</small></p>" +
      (s.catatan ? '<p class="help">Catatan panitia: ' + e(s.catatan) + "</p>" : "") +
      '<p class="help">Dikirim ' + e(CORE.fmtDateTime(s.dibuat)) + "</p>" +
      '<p><a class="btn sm ghost" href="' + e(CORE.waLink(data.settings.wa_bantuan, "Halo, saya ingin menanyakan status pendaftaran " + s.kode + ".")) + '" target="_blank" rel="noopener">Hubungi panitia</a></p>' +
      "</div>";
  }

  async function check(kode) {
    if (!kode) return;
    if (!API.configured) {
      result.innerHTML = '<div class="alert info">Fitur cek status memerlukan backend Google Apps Script. Setelah backend dihubungkan, status pendaftaran dapat dicek di sini.</div>';
      return;
    }
    result.innerHTML = '<div class="alert info">Mencari kode ' + e(kode) + "…</div>";
    try {
      const s = await API.get("status", { kode: kode });
      if (!s) {
        result.innerHTML = '<div class="alert err">Kode pendaftaran <b>' + e(kode) + "</b> tidak ditemukan. Periksa kembali atau hubungi panitia.</div>";
        return;
      }
      renderStatus(s);
    } catch (err) {
      result.innerHTML = '<div class="alert err">' + e(err.message) + "</div>";
    }
  }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    const kode = String(new FormData(form).get("kode") || "").trim().toUpperCase();
    check(kode);
    const url = new URL(location.href);
    url.searchParams.set("kode", kode);
    history.replaceState(null, "", url);
  });

  const fromUrl = new URLSearchParams(location.search).get("kode");
  if (fromUrl) {
    form.querySelector("input[name=kode]").value = fromUrl;
    check(fromUrl.trim().toUpperCase());
  }
})();
