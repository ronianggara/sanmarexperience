(async function () {
  const params = new URLSearchParams(location.search);
  const slug = params.get("s") || "bola-basket";
  const data = await SITE.loadData();
  SITE.renderHeader(data);
  const e = CORE.esc;
  const lomba = CORE.lombaBySlug(data, slug);
  const detailEl = document.getElementById("lombaDetail");
  const juknisEl = document.getElementById("lombaJuknis");
  const hasilEl = document.getElementById("lombaHasil");

  if (!lomba) {
    detailEl.innerHTML = '<div class="alert info">Cabang lomba tidak ditemukan. <a href="index.html#lomba">Kembali ke daftar lomba</a>.</div>';
    juknisEl.innerHTML = "";
    hasilEl.innerHTML = "";
    return;
  }

  const open = SITE.isOpen(data) && Number(lomba.aktif) !== 0;
  const kats = lomba.kategori || [];

  const statusRows = kats.map(function (k) {
    const kuota = Number(k.kuota) > 0;
    const info = kuota
      ? "· " + Number(k.terisi) + "/" + Number(k.kuota) + " slot terisi"
      : "· kuota tidak dibatasi";
    const badge = !open
      ? '<span class="chip bad">Ditutup</span>'
      : kuota && Number(k.terisi) >= Number(k.kuota)
        ? '<span class="chip bad">Kuota penuh</span>'
        : '<span class="chip ok">Dibuka</span>';
    return '<div class="kat"><span><b>' + e(k.nama) + '</b> <small style="color:var(--soft)">' + info + "</small></span>" + badge + "</div>";
  }).join("");

  const desc = CORE.list(lomba.deskripsi_panjang ? lomba.deskripsi_panjang.split(/\n{2,}/).join("|") : "")
    .map(function (p) { return '<p class="prose">' + e(p) + "</p>"; }).join("");

  const fasilitas = CORE.list(lomba.fasilitas).map(function (f) { return "<li>" + e(f) + "</li>"; }).join("");
  const cp = lomba.cp_nama
    ? '<h3 style="margin:24px 0 10px">Contact person</h3><div class="cp-wrap"><a class="cp-i" href="' +
      e(CORE.waLink(lomba.cp_wa, "Halo, saya ingin bertanya tentang lomba " + lomba.nama + " di " + data.settings.nama_event + ".")) +
      '" target="_blank" rel="noopener"><span class="cp-ic">☎</span><span><b>' + e(lomba.cp_nama) + "</b><small>" + e(lomba.cp_jabatan || "") +
      "</small><em>" + e(CORE.waPretty(lomba.cp_wa)) + " · chat WhatsApp</em></span></a></div>"
    : "";

  const action = open
    ? '<a class="btn" href="register.html?s=' + encodeURIComponent(lomba.slug) + '">Daftar sekarang</a>'
    : '<span class="btn off" aria-disabled="true">Pendaftaran ditutup / kuota penuh</span>';

  detailEl.innerHTML =
    '<a href="index.html#lomba" class="help">← Semua lomba</a>' +
    '<h1 style="font-size:clamp(30px,4.5vw,46px);margin:8px 0 10px">' + e(lomba.nama) + "</h1>" +
    '<div class="meta"><span class="chip">' + e(lomba.jenis) + '</span><span class="chip y">Biaya ' + e(CORE.rupiah(lomba.biaya)) + "</span></div>" +
    '<div class="card" style="max-width:560px;margin:14px 0"><b style="font-size:14px">Status pendaftaran</b><div class="kats" style="margin:8px 0 0">' + statusRows + "</div>" +
    (!open ? '<small style="color:var(--soft)">Pendaftaran ditutup sejak ' + e(CORE.fmtDateTime(data.settings.pendaftaran_tutup)) + ".</small>" : "") + "</div>" +
    desc +
    (lomba.hadiah ? '<div class="alert info"><b>Hadiah:</b> ' + e(lomba.hadiah) + "</div>" : "") +
    (lomba.info ? '<div class="alert info"><b>' + e(lomba.info) + "</b></div>" : "") +
    (fasilitas ? '<h3 style="margin:24px 0 10px">Fasilitas lomba</h3><ul class="fs">' + fasilitas + "</ul>" : "") +
    cp +
    "<p>" + action + "</p>";

  const juk = [];
  if (lomba.juknis_halaman) juk.push('<a class="btn" href="' + e(lomba.juknis_halaman) + '">Baca Juknis Resmi</a>');
  if (lomba.juknis_pdf) juk.push('<a class="btn" href="' + e(lomba.juknis_pdf) + '" target="_blank" rel="noopener">Unduh PDF</a>');
  if (lomba.juknis_docx) juk.push('<a class="btn ghost" href="' + e(lomba.juknis_docx) + '" target="_blank" rel="noopener">Unduh Word (.docx)</a>');
  juknisEl.innerHTML = '<div class="head"><span class="eyebrow">Juknis</span><h2>Petunjuk teknis</h2></div>' +
    (juk.length
      ? "<p>Juknis resmi tersedia dalam tampilan rapi, bisa dicetak sebagai PDF atau diunduh dalam format Word.</p><p>" + juk.join(" ") + "</p>"
      : '<p class="help">Juknis belum tersedia. Silakan hubungi panitia.</p>');

  const winners = data.juara.filter(function (j) { return j.lomba_id === lomba.id; });
  const winnerBlock = winners.length
    ? '<h3 style="margin:18px 0 12px">' + e(lomba.nama) + "</h3>" + SITE.podium(winners.map(function (j) {
        return Object.assign({}, j, { peringkat: Number(j.peringkat) });
      }))
    : '<div class="card"><p>Juara akan diumumkan setelah pertandingan selesai.</p></div>';

  if (slug === "bola-basket") {
    let activeCat = (params.get("k") || "Putra").toLowerCase() === "putri" ? "Putri" : "Putra";

    function renderBasket() {
      const matches = data.pertandingan.filter(function (m) { return m.kategori === activeCat; });
      const groups = data.klasemen[activeCat] || [];
      hasilEl.innerHTML = '<div id="pertandingan"><div class="head"><span class="eyebrow">Pertandingan</span><h2>Jadwal, skor &amp; klasemen</h2></div>' +
        '<div class="tabs">' + ["Putra", "Putri"].map(function (c) {
          return '<a href="#" data-kat="' + c + '" class="' + (c === activeCat ? "on" : "") + '">' + c + "</a>";
        }).join("") + "</div>" +
        '<div class="tw mlist" style="background:#fff">' + (matches.map(function (m) { return SITE.matchCard(m, data); }).join("") || '<div class="match"><div class="mh"><span class="mi">Belum ada pertandingan</span></div></div>') + "</div>" +
        '<h3 style="margin:26px 0 12px">Klasemen penyisihan</h3>' +
        groups.map(function (g) {
          return '<h4 style="margin:14px 0 8px">Grup ' + e(g.nama) + '</h4><div class="tw stw">' + SITE.standingsTable(g) + '</div><p class="help">' + SITE.HELP_STANDINGS + "</p>";
        }).join("") +
        '<h3 style="margin:26px 0 4px">Juara</h3>' + winnerBlock + "</div>";
      hasilEl.querySelectorAll(".tabs a").forEach(function (a) {
        a.addEventListener("click", function (ev) {
          ev.preventDefault();
          activeCat = a.dataset.kat;
          renderBasket();
        });
      });
    }
    renderBasket();
  } else {
    hasilEl.innerHTML = '<div class="head"><span class="eyebrow">Hasil</span><h2>Juara</h2></div>' + winnerBlock;
  }
})();
