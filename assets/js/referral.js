(async function () {
  const data = await SITE.loadData();
  SITE.renderHeader(data);
  const e = CORE.esc;
  const board = document.getElementById("refBoard");
  const result = document.getElementById("refResult");

  const rows = (data.referral || []).slice().sort(function (a, b) { return (Number(b.jumlah) || 0) - (Number(a.jumlah) || 0); });
  if (rows.length && String(data.settings.referral_publik) === "1") {
    board.innerHTML = '<div class="tw" style="background:#fff"><table><tr><th class="n">#</th><th>Kode</th><th>Nama</th><th class="n">Perolehan</th></tr>' +
      rows.map(function (r, i) {
        return '<tr><td class="n">' + (i + 1) + "</td><td><b>" + e(r.kode) + "</b></td><td>" + e(r.nama) + '</td><td class="n"><b>' + (Number(r.jumlah) || 0) + "</b></td></tr>";
      }).join("") + "</table></div>";
  } else {
    board.innerHTML = '<div class="alert info">Papan peringkat lengkap belum dipublikasikan panitia.</div>';
  }

  const form = document.getElementById("refForm");
  form.addEventListener("submit", async function (ev) {
    ev.preventDefault();
    const kode = String(new FormData(form).get("kode") || "").trim().toUpperCase();
    if (!kode) return;
    if (!API.configured) {
      result.innerHTML = '<div class="alert info">Cek perolehan kode memerlukan backend Google Apps Script yang sudah dihubungkan.</div>';
      return;
    }
    result.innerHTML = '<div class="alert info">Mencari kode ' + e(kode) + "…</div>";
    try {
      const r = await API.get("referral", { kode: kode });
      if (!r) {
        result.innerHTML = '<div class="alert err">Kode <b>' + e(kode) + "</b> tidak terdaftar. Hubungi panitia bila kode Anda seharusnya aktif.</div>";
        return;
      }
      result.innerHTML = '<div class="alert ok">Kode <b>' + e(r.kode) + "</b> (" + e(r.nama) + ") telah dipakai <b>" + (Number(r.jumlah) || 0) + "</b> kali.</div>";
    } catch (err) {
      result.innerHTML = '<div class="alert err">' + e(err.message) + "</div>";
    }
  });
})();
