(async function () {
  const data = await SITE.loadData();
  SITE.renderHeader(data);
  const e = CORE.esc;

  const rows = data.lomba.filter(function (l) { return Number(l.aktif) !== 0; }).map(function (l) {
    const acts = [];
    if (l.juknis_halaman) acts.push('<a class="btn sm ghost" href="' + e(l.juknis_halaman) + '">Baca / simpan PDF</a>');
    if (l.juknis_pdf) acts.push('<a class="btn sm" href="' + e(l.juknis_pdf) + '" target="_blank" rel="noopener">PDF</a>');
    if (l.juknis_docx) acts.push('<a class="btn sm" href="' + e(l.juknis_docx) + '" target="_blank" rel="noopener">Word (.docx)</a>');
    return '<tr><td><b>' + e(l.nama) + "</b></td><td class=\"acts\">" + (acts.join(" ") || '<span class="help">Juknis belum tersedia</span>') + "</td></tr>";
  }).join("");
  const tbody = document.getElementById("juknisRows");
  if (tbody) tbody.innerHTML = rows || '<tr><td colspan="2">Belum ada juknis.</td></tr>';

  const eventLogos = document.getElementById("logoEvent");
  if (eventLogos) {
    const logos = [];
    if (data.settings.logo) logos.push({ label: "WebP", desc: "Ringan, untuk web & media sosial", src: data.settings.logo, file: "Logo-SANMAR-EXPERIENCE-2026.webp" });
    if (data.settings.logo_png) logos.push({ label: "PNG", desc: "Untuk dokumen, spanduk, & cetak", src: data.settings.logo_png, file: "Logo-SANMAR-EXPERIENCE-2026.png" });
    eventLogos.innerHTML = logos.map(function (x) {
      return '<div class="card" style="text-align:center"><img src="' + e(CORE.mediaUrl(x.src)) + '" alt="Logo SANMAR EXPERIENCE 2026" style="max-height:150px;width:auto;max-width:100%;object-fit:contain">' +
        '<p style="margin:10px 0"><b>' + x.label + "</b><br><small>" + x.desc + '</small></p><a class="btn sm" href="' + e(CORE.mediaUrl(x.src)) + '" download="' + e(x.file) + '">Unduh ' + x.label + "</a></div>";
    }).join("");
  }

  const groups = document.getElementById("logoGroups");
  if (groups) {
    const html = ["Putra", "Putri"].map(function (cat) {
      const teams = data.tim.filter(function (t) { return t.kategori === cat; });
      if (!teams.length) return "";
      return '<h4 style="margin:18px 0 10px">Sanmar Basketball Competition — ' + cat + "</h4>" +
        '<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(170px,1fr))">' + teams.map(function (t) {
          const file = "Logo-" + String(t.nama).replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") + ".webp";
          return '<div class="card" style="text-align:center;padding:14px"><img src="' + e(CORE.mediaUrl(t.logo)) + '" alt="Logo ' + e(t.nama) + '" loading="lazy" style="height:90px;width:auto;max-width:100%;object-fit:contain">' +
            '<p style="margin:8px 0 10px"><b>' + e(t.nama) + '</b></p><a class="btn sm" href="' + e(CORE.mediaUrl(t.logo)) + '" download="' + e(file) + '">Unduh</a></div>';
        }).join("") + "</div>";
    }).join("");
    groups.innerHTML = html || '<div class="alert info">Belum ada logo tim.</div>';
  }
})();
