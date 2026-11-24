(async function () {
  const data = await SITE.loadData();
  SITE.renderHeader(data);
  const e = CORE.esc;

  const lombaSel = document.getElementById("kesanLomba");
  lombaSel.innerHTML = '<option value="">—</option>' + data.lomba.map(function (l) {
    return '<option value="' + e(l.nama) + '">' + e(l.nama) + "</option>";
  }).join("");

  const criterias = [
    ["r_daftar", "Kemudahan pendaftaran"],
    ["r_panitia", "Pelayanan panitia"],
    ["r_jadwal", "Jadwal & jalannya lomba"],
    ["r_fasilitas", "Fasilitas & tempat"],
    ["r_umum", "Kepuasan keseluruhan"]
  ];
  document.getElementById("ratingFields").innerHTML = criterias.map(function (c) {
    let stars = "";
    for (let n = 5; n >= 1; n--) {
      stars += '<input type="radio" name="' + c[0] + '" id="' + c[0] + n + '" value="' + n + '"' + (n === 5 ? " required" : "") + '><label for="' + c[0] + n + '" title="' + n + ' dari 5">★</label>';
    }
    return '<div style="margin:10px 0"><div style="font-weight:700;font-size:14px">' + c[1] + '</div><div class="rate">' + stars + "</div></div>";
  }).join("");

  function renderList() {
    const list = document.getElementById("kesanList");
    const items = data.kesan || [];
    if (!items.length) {
      list.innerHTML = '<div class="card"><p>Belum ada kesan yang ditampilkan.</p></div>';
      return;
    }
    list.innerHTML = items.slice().reverse().map(function (k) {
      const avg = ["r_daftar", "r_panitia", "r_jadwal", "r_fasilitas", "r_umum"]
        .map(function (r) { return Number(k[r]) || 0; })
        .filter(Boolean);
      const mean = avg.length ? (avg.reduce(function (a, b) { return a + b; }, 0) / avg.length).toFixed(1) : "";
      return '<div class="card" style="margin-bottom:14px"><p style="font-weight:600">“' + e(k.pesan) + "”</p>" +
        (k.saran ? '<p class="help">Saran: ' + e(k.saran) + "</p>" : "") +
        "<p style=\"margin:10px 0 0\"><b>" + e(k.nama) + "</b>" + (k.sekolah ? ' <small style="color:var(--soft)">· ' + e(k.sekolah) + "</small>" : "") + "</p>" +
        (mean ? '<small style="color:var(--soft)">Rata-rata penilaian ' + mean + " / 5</small>" : "") + "</div>";
    }).join("");
  }
  renderList();

  const form = document.getElementById("kesanForm");
  const status = document.getElementById("kesanStatus");
  if (!API.configured) {
    status.innerHTML = '<div class="alert info">Form kesan akan aktif setelah backend Google Apps Script dihubungkan.</div>';
    return;
  }
  form.addEventListener("submit", async function (ev) {
    ev.preventDefault();
    const fd = new FormData(form);
    const btn = document.getElementById("kesanSubmit");
    const payload = {
      website: fd.get("website") || "",
      nama: fd.get("nama"),
      sekolah: fd.get("sekolah") || "",
      peran: fd.get("peran"),
      lomba: fd.get("lomba") || "",
      pesan: fd.get("pesan"),
      saran: fd.get("saran") || ""
    };
    criterias.forEach(function (c) { payload[c[0]] = fd.get(c[0]); });
    btn.disabled = true;
    status.innerHTML = '<div class="alert info">Mengirim…</div>';
    try {
      await API.post("kesan", payload);
      form.reset();
      status.innerHTML = '<div class="alert ok">Terima kasih! Kesan Anda akan ditampilkan setelah ditinjau panitia.</div>';
    } catch (err) {
      status.innerHTML = '<div class="alert err">' + e(err.message) + "</div>";
    } finally {
      btn.disabled = false;
    }
  });
})();
