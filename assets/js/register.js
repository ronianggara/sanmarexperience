(async function () {
  const data = await SITE.loadData();
  SITE.renderHeader(data);
  const e = CORE.esc;
  const form = document.getElementById("regForm");
  const notice = document.getElementById("regNotice");
  const done = document.getElementById("regDone");

  if (!SITE.isOpen(data)) {
    notice.innerHTML = '<div class="alert info">Pendaftaran sudah ditutup pada ' + e(CORE.fmtDateTime(data.settings.pendaftaran_tutup)) + ".</div>";
    return;
  }

  const lombaSel = document.getElementById("regLomba");
  const katSel = document.getElementById("regKategori");
  const lombaList = data.lomba.filter(function (l) { return Number(l.aktif) !== 0; });
  lombaSel.innerHTML = lombaList.map(function (l) {
    return '<option value="' + e(l.id) + '">' + e(l.nama) + " — " + e(CORE.rupiah(l.biaya)) + "</option>";
  }).join("");

  function syncKats() {
    const lomba = CORE.lombaById(data, lombaSel.value);
    katSel.innerHTML = (lomba && lomba.kategori || []).map(function (k) {
      const penuh = Number(k.kuota) > 0 && Number(k.terisi) >= Number(k.kuota);
      return '<option value="' + e(k.nama) + '"' + (penuh ? " disabled" : "") + ">" + e(k.nama) + (penuh ? " (kuota penuh)" : "") + "</option>";
    }).join("");
  }
  lombaSel.addEventListener("change", syncKats);
  syncKats();

  const wanted = new URLSearchParams(location.search).get("s");
  if (wanted) {
    const l = CORE.lombaBySlug(data, wanted);
    if (l && lombaList.some(function (x) { return x.id === l.id; })) {
      lombaSel.value = l.id;
      syncKats();
    }
  }

  if (!API.configured) {
    notice.innerHTML = '<div class="alert info">Formulir tampil, namun pengiriman online belum aktif karena backend Google Apps Script belum dihubungkan. Hubungi panitia untuk mendaftar.</div>';
  }

  form.hidden = false;

  function fileToBase64(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () {
        const s = String(reader.result || "");
        resolve({ name: file.name, mime: file.type, data: s.slice(s.indexOf(",") + 1) });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  form.addEventListener("submit", async function (ev) {
    ev.preventDefault();
    const status = document.getElementById("regStatus");
    const btn = document.getElementById("regSubmit");
    const fd = new FormData(form);
    const file = form.querySelector('input[name="bukti"]').files[0];
    if (file && file.size > 2 * 1024 * 1024) {
      status.innerHTML = '<div class="alert err">Ukuran bukti pembayaran melebihi 2 MB.</div>';
      return;
    }
    if (!API.configured) {
      status.innerHTML = '<div class="alert err">Belum dapat mengirim: backend belum dihubungkan panitia.</div>';
      return;
    }
    btn.disabled = true;
    status.innerHTML = '<div class="alert info">Mengirim pendaftaran…</div>';
    try {
      const payload = {
        website: fd.get("website") || "",
        lomba_id: fd.get("lomba_id"),
        kategori: fd.get("kategori"),
        nama: fd.get("nama"),
        sekolah: fd.get("sekolah"),
        pendamping: fd.get("pendamping"),
        wa: fd.get("wa"),
        email: fd.get("email") || "",
        jumlah: fd.get("jumlah") || 1,
        referral: fd.get("referral") || ""
      };
      if (file) payload.bukti = await fileToBase64(file);
      const res = await API.post("daftar", payload);
      form.hidden = true;
      notice.innerHTML = "";
      done.innerHTML = '<div class="alert ok"><b>Pendaftaran terkirim.</b><br>Kode pendaftaran Anda: <b style="font-size:18px">' + e(res.kode) + "</b><br>Simpan kode ini untuk mengecek status. Panitia akan menghubungi lewat WhatsApp.</div>" +
        '<p><a class="btn" href="cek-status.html?kode=' + encodeURIComponent(res.kode) + '">Cek status</a> <a class="btn sm ghost" href="index.html">Beranda</a></p>';
    } catch (err) {
      status.innerHTML = '<div class="alert err">' + e(err.message) + "</div>";
      btn.disabled = false;
    }
  });
})();
