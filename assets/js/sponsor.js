(async function () {
  const data = await SITE.loadData();
  SITE.renderHeader(data);
  SITE.renderSponsorContacts(data);
  const e = CORE.esc;
  const cp = data.kontak[0];

  const grid = document.getElementById("paketGrid");
  if (grid) {
    grid.innerHTML = data.paket.map(function (p) {
      const benefits = CORE.list(p.benefit).map(function (b) { return "<li>" + e(b) + "</li>"; }).join("");
      const text = "Halo, saya tertarik dengan Paket " + p.nama + " " + data.settings.nama_event + ".";
      const link = cp ? CORE.waLink(cp.wa, text) : "#kontak";
      return '<div class="pk' + (Number(p.sorot) === 1 ? " sorot" : "") + '"><h3>' + e(p.nama) + '</h3><div class="nl">' + e(p.nominal) + "</div>" +
        "<ul>" + benefits + "</ul>" +
        '<a class="btn sm' + (Number(p.sorot) === 1 ? " red" : "") + '" href="' + e(link) + '" target="_blank" rel="noopener">Tanyakan paket ini</a></div>';
    }).join("");
  }

  const form = document.getElementById("bantuForm");
  const status = document.getElementById("bantuStatus");
  if (!form) return;
  if (!API.configured) {
    status.innerHTML = '<div class="alert info">Form bantuan akan aktif setelah backend Google Apps Script dihubungkan (lihat README).</div>';
    return;
  }
  form.addEventListener("submit", async function (ev) {
    ev.preventDefault();
    const btn = document.getElementById("bantuSubmit");
    const fd = new FormData(form);
    const peran = fd.getAll("peran");
    btn.disabled = true;
    status.innerHTML = '<div class="alert info">Mengirim…</div>';
    try {
      await API.post("bantuan", {
        website: fd.get("website") || "",
        nama: fd.get("nama") || "",
        wa: fd.get("wa") || "",
        status: fd.get("status") || "",
        usaha: fd.get("usaha") || "",
        peran: peran,
        pesan: fd.get("pesan") || ""
      });
      form.reset();
      status.innerHTML = '<div class="alert ok">Terima kasih! Tim sponsorship akan menghubungi Anda.</div>';
    } catch (err) {
      status.innerHTML = '<div class="alert err">' + e(err.message) + "</div>";
    } finally {
      btn.disabled = false;
    }
  });
})();
