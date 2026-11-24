/* Panel panitia SANMAR EXPERIENCE 2026 — memakai API Apps Script */
(function () {
  "use strict";

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var esc = CORE.esc;
  var TOKEN_KEY = "sanmar_admin_token";

  var TITLES = {
    ringkasan: { t: "Ringkasan", s: "Pantau pendaftaran, konten, dan hasil lomba dari satu tempat." },
    pendaftaran: { t: "Pendaftaran", s: "Verifikasi pendaftar. Hasil disampaikan panitia lewat WhatsApp." },
    pertandingan: { t: "Basket & Skor", s: "Input pertandingan dan skor; klasemen dihitung otomatis dari hasil penyisihan." },
    juara: { t: "Juara", s: "Daftar juara per lomba yang tampil di halaman publik." },
    lomba: { t: "Lomba & Kategori", s: "Lima lomba beserta kategori dan kuota peserta." },
    tim: { t: "Tim Basket", s: "Tim peserta basket putra/putri beserta grup dan logo." },
    sponsor: { t: "Sponsor & Paket", s: "Daftar sponsor, paket kemitraan, dan contact person." },
    rangkaian: { t: "Rangkaian Acara", s: "Linimasa acara yang tampil di halaman utama." },
    kesan: { t: "Kesan & Pesan", s: "Moderasi pesan pengunjung; hanya status Tampil yang muncul di situs." },
    referral: { t: "Duta Referral", s: "Kode guru/karyawan dan jumlah pendaftar yang memakai kodenya." },
    bantuan: { t: "Bantuan Sponsor", s: "Pengajuan kerja sama sponsor dari formulir publik." },
    pengaturan: { t: "Pengaturan", s: "Identitas acara, jadwal, status pendaftaran, dan aset logo." },
    akun: { t: "Akun", s: "Keamanan akun admin." }
  };

  var state = { token: "", user: null, data: null, tab: "ringkasan", regQ: "", regStatus: "" };

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    bindEvents();
    state.token = localStorage.getItem(TOKEN_KEY) || "";
    if (!API.configured) { showSetupNotice(); return; }
    if (state.token) {
      enterApp().catch(function (err) {
        clearToken();
        showLogin((err && err.message) || "Sesi berakhir. Silakan masuk kembali.");
      });
    } else {
      showLogin("");
    }
  }

  function bindEvents() {
    $("#loginForm").addEventListener("submit", login);
    $("#logoutBtn").addEventListener("click", function () { logout(true); });
    $("#refreshBtn").addEventListener("click", refresh);
    $("#modalClose").addEventListener("click", closeModal);
    $("#modal").addEventListener("click", function (ev) { if (ev.target === $("#modal")) closeModal(); });
    document.addEventListener("keydown", function (ev) { if (ev.key === "Escape") closeModal(); });
    $("#nav").addEventListener("click", function (ev) {
      var b = ev.target.closest("button[data-tab]");
      if (b) setTab(b.dataset.tab);
    });
    $("#content").addEventListener("click", function (ev) {
      var g = ev.target.closest("[data-goto]");
      if (g) { setTab(g.dataset.goto); return; }
      var b = ev.target.closest("button[data-act]");
      if (b) onAction(b.dataset.act, b.dataset.id);
    });
  }

  /* ------------------------------ sesi ------------------------------ */

  function showSetupNotice() {
    $("#loginInner").innerHTML =
      '<h1>Backend belum terhubung</h1>' +
      '<p class="sub">Panel admin membutuhkan Google Apps Script + Google Sheets sebagai database.</p>' +
      alertBox("Buka <b>assets/js/config.js</b>, isi <b>API_URL</b> dengan URL Web App Apps Script (berakhiran <b>/exec</b>). Langkah lengkap ada di <b>README.md</b>.", "warn") +
      '<p style="margin-top:16px"><a class="btn" href="../README.md" target="_blank">Buka README</a> <a class="btn ghost" href="../index.html">Lihat situs</a></p>';
  }

  function showLogin(msg) {
    $("#appView").hidden = true;
    $("#loginView").hidden = false;
    var st = $("#loginStatus");
    st.innerHTML = msg ? alertBox(esc(msg), "err") : "";
    var pw = $("#password");
    if (pw) pw.value = "";
  }

  function clearToken() {
    state.token = "";
    state.data = null;
    localStorage.removeItem(TOKEN_KEY);
  }

  async function login(ev) {
    ev.preventDefault();
    var btn = $("#loginBtn");
    var st = $("#loginStatus");
    var username = $("#username").value.trim();
    var password = $("#password").value;
    if (!username || !password) {
      st.innerHTML = alertBox("Username dan password wajib diisi.", "err");
      return;
    }
    btn.disabled = true;
    btn.textContent = "Memeriksa…";
    st.innerHTML = "";
    try {
      var res = await API.post("admin_login", { username: username, password: password });
      state.token = res.token;
      state.user = res.user || null;
      localStorage.setItem(TOKEN_KEY, state.token);
      await enterApp();
    } catch (err) {
      st.innerHTML = alertBox(esc(err.message || "Gagal masuk."), "err");
    } finally {
      btn.disabled = false;
      btn.textContent = "Masuk";
    }
  }

  async function enterApp() {
    var data = await API.post("admin_data", { token: state.token });
    state.data = data;
    state.user = data.user || state.user;
    $("#loginView").hidden = true;
    $("#appView").hidden = false;
    $("#whoami").textContent = "Masuk sebagai " + ((state.user && state.user.nama) || (state.user && state.user.username) || "Admin");
    setTab(TITLES[state.tab] ? state.tab : "ringkasan");
  }

  function logout(ask) {
    if (ask && !window.confirm("Keluar dari panel admin?")) return;
    var token = state.token;
    clearToken();
    closeModal();
    showLogin("");
    if (token) API.post("admin_logout", { token: token }).catch(function () {});
  }

  async function loadData() {
    state.data = await API.post("admin_data", { token: state.token });
    state.user = state.data.user || state.user;
  }

  async function refresh() {
    var btn = $("#refreshBtn");
    btn.disabled = true;
    try {
      await loadData();
      renderTab(state.tab);
      toast("Data dimuat ulang", "ok");
    } catch (err) {
      handleErr(err);
    } finally {
      btn.disabled = false;
    }
  }

  function handleErr(err) {
    var msg = (err && err.message) || "Terjadi kesalahan.";
    if (/sesi|token|login|masuk kembali/i.test(msg)) {
      closeModal();
      clearToken();
      showLogin(msg);
      return;
    }
    toast(msg, "err");
  }

  function setTab(tab) {
    if (!TITLES[tab] || !state.data) return;
    state.tab = tab;
    $$("#nav button").forEach(function (b) { b.classList.toggle("on", b.dataset.tab === tab); });
    $("#pageTitle").textContent = TITLES[tab].t;
    $("#pageSub").textContent = TITLES[tab].s;
    renderTab(tab);
    window.scrollTo({ top: 0 });
  }

  function renderTab(tab) {
    var el = $("#content");
    el.innerHTML = "";
    if (tab === "ringkasan") renderRingkasan(el);
    else if (tab === "pendaftaran") renderPendaftaran(el);
    else if (tab === "pertandingan") renderPertandingan(el);
    else if (tab === "juara") renderJuara(el);
    else if (tab === "lomba") renderLomba(el);
    else if (tab === "tim") renderTim(el);
    else if (tab === "sponsor") renderSponsor(el);
    else if (tab === "rangkaian") renderRangkaian(el);
    else if (tab === "kesan") renderKesan(el);
    else if (tab === "referral") renderReferral(el);
    else if (tab === "bantuan") renderBantuan(el);
    else if (tab === "pengaturan") renderPengaturan(el);
    else if (tab === "akun") renderAkun(el);
  }

  /* --------------------------- aksi tabel --------------------------- */

  async function onAction(act, id) {
    try {
      switch (act) {
        case "reg-detail": openRegModal(regById(id)); break;
        case "reg-approve": await approveReg(id); break;
        case "reg-reject": await rejectReg(id); break;
        case "match-add": openMatchForm(null); break;
        case "match-edit": openMatchForm(matchById(id)); break;
        case "juara-add": openJuaraForm(null); break;
        case "juara-edit": openJuaraForm(rowById("juara", id)); break;
        case "lomba-add": openLombaForm(null); break;
        case "lomba-edit": openLombaForm(rowById("lomba", id)); break;
        case "kat-add": openKategoriForm(null); break;
        case "kat-edit": openKategoriForm(rowById("kategori", id)); break;
        case "tim-add": openTimForm(null); break;
        case "tim-edit": openTimForm(rowById("tim", id)); break;
        case "sponsor-add": openSponsorForm(null); break;
        case "sponsor-edit": openSponsorForm(rowById("sponsor", id)); break;
        case "paket-add": openPaketForm(null); break;
        case "paket-edit": openPaketForm(rowById("paket", id)); break;
        case "kontak-add": openKontakForm(null); break;
        case "kontak-edit": openKontakForm(rowById("kontak", id)); break;
        case "rk-add": openTimelineForm(null); break;
        case "rk-edit": openTimelineForm(rowById("timeline", id)); break;
        case "kesan-view": openKesanModal(rowById("kesan", id)); break;
        case "kesan-show": await setKesanStatus(id, "Tampil"); break;
        case "kesan-hide": await setKesanStatus(id, "Menunggu"); break;
        case "ref-add": openReferralForm(null); break;
        case "ref-edit": openReferralForm(rowById("referral", id)); break;
        case "bantuan-view": openBantuanModal(rowById("bantuan", id)); break;
        case "del":
          await confirmDelete(id.split(":")[0], id.split(":").slice(1).join(":"));
          break;
        default: break;
      }
    } catch (err) {
      handleErr(err);
    }
  }

  async function confirmDelete(entity, id) {
    if (!id) return;
    if (!window.confirm("Hapus data ini? Tindakan tidak bisa dibatalkan.")) return;
    await API.post("delete", { token: state.token, entity: entity, id: id });
    await loadData();
    renderTab(state.tab);
    toast("Data dihapus", "ok");
  }

  async function saveRow(entity, row) {
    var res = await API.post("save", { token: state.token, entity: entity, row: row });
    await loadData();
    renderTab(state.tab);
    return res;
  }

  async function approveReg(id) {
    var r = regById(id);
    if (!r) return;
    if (!window.confirm("Setujui pendaftaran " + r.kode + " (" + r.nama + ")?")) return;
    await saveRow("pendaftaran", { id: id, status: "Disetujui" });
    toast("Pendaftaran disetujui", "ok");
  }

  async function rejectReg(id) {
    var r = regById(id);
    if (!r) return;
    var note = window.prompt("Alasan penolakan untuk " + r.kode + " " + r.nama + ":", r.catatan || "");
    if (note === null) return;
    await saveRow("pendaftaran", { id: id, status: "Ditolak", catatan: note });
    toast("Pendaftaran ditolak", "ok");
  }

  /* ---------------------------- ringkasan ---------------------------- */

  function renderRingkasan(el) {
    var d = state.data;
    var pend = d.pendaftaran || [];
    var menunggu = pend.filter(function (p) { return (p.status || "Menunggu") === "Menunggu"; }).length;
    var disetujui = pend.filter(function (p) { return p.status === "Disetujui"; }).length;
    var kesanBaru = (d.kesan || []).filter(function (k) { return (k.status || "Menunggu") === "Menunggu"; }).length;
    var bantuanBaru = (d.bantuan || []).length;

    var stats = '<div class="stats">' +
      statCard(pend.length, "Total pendaftar") +
      statCard(menunggu, "Menunggu verifikasi", menunggu ? "warn" : "") +
      statCard(disetujui, "Disetujui", disetujui ? "ok" : "") +
      statCard((d.lomba || []).length, "Lomba") +
      statCard((d.tim || []).length, "Tim basket") +
      statCard(kesanBaru, "Testimoni menunggu", kesanBaru ? "warn" : "") +
      statCard(bantuanBaru, "Pengajuan sponsor", bantuanBaru ? "warn" : "") +
      '</div>';

    var recent = (pend.slice(0, 6)).map(function (p) {
      return '<tr><td>' + esc(p.kode) + '</td><td>' + esc(p.nama) + '</td><td>' + esc(lombaName(p.lomba_id)) + '</td><td>' + statusBadge(p.status) + '</td><td>' + esc(CORE.fmtDateTime(p.dibuat)) + '</td></tr>';
    }).join("");
    var recentTable = recent
      ? '<div class="table-wrap"><table><thead><tr><th>Kode</th><th>Nama</th><th>Lomba</th><th>Status</th><th>Waktu</th></tr></thead><tbody>' + recent + '</tbody></table></div>'
      : '<div class="empty">Belum ada pendaftaran.</div>';

    var quick = '<div class="quick">' +
      '<button class="btn ghost" data-goto="pendaftaran">Verifikasi pendaftaran</button>' +
      '<button class="btn ghost" data-goto="pertandingan">Input skor basket</button>' +
      '<button class="btn ghost" data-goto="juara">Tetapkan juara</button>' +
      '<button class="btn ghost" data-goto="pengaturan">Atur status pendaftaran</button>' +
      '<a class="btn ghost" href="../index.html" target="_blank">Lihat situs publik</a>' +
      '</div>';

    el.innerHTML = stats +
      alertBox("Segera ganti password bawaan di tab <b>Akun</b> setelah login pertama.", "warn") +
      '<div class="grid2" style="margin-top:16px">' +
        '<div class="card"><h2>Pendaftaran terbaru</h2><p class="help" style="margin-bottom:10px">Enam data terakhir.</p>' + recentTable + '</div>' +
        '<div class="card"><h2>Aksi cepat</h2><p class="help" style="margin-bottom:10px">Pintasan pekerjaan panitia.</p>' + quick + '</div>' +
      '</div>';
  }

  function statCard(value, label, tone) {
    return '<div class="stat' + (tone ? " " + tone : "") + '"><small>' + esc(label) + '</small><b>' + esc(value) + '</b></div>';
  }

  /* --------------------------- pendaftaran --------------------------- */

  function renderPendaftaran(el) {
    el.innerHTML = '<div class="card">' +
      '<div class="toolbar">' +
        '<input type="search" id="regQ" placeholder="Cari kode, nama, sekolah, WhatsApp…" value="' + esc(state.regQ) + '">' +
        '<select id="regStatus">' +
          ['', 'Menunggu', 'Disetujui', 'Ditolak'].map(function (v) {
            return '<option value="' + v + '"' + (state.regStatus === v ? ' selected' : '') + '>' + (v || 'Semua status') + '</option>';
          }).join('') +
        '</select>' +
        '<span class="count" id="regCount"></span>' +
      '</div><div id="regTable"></div></div>';

    var debounced = debounce(function () {
      state.regQ = $("#regQ").value.trim();
      drawRegTable();
    }, 220);
    $("#regQ").addEventListener("input", debounced);
    $("#regStatus").addEventListener("change", function () {
      state.regStatus = $("#regStatus").value;
      drawRegTable();
    });
    drawRegTable();
  }

  function filteredReg() {
    var q = state.regQ.toLowerCase();
    return (state.data.pendaftaran || []).filter(function (p) {
      var status = p.status || "Menunggu";
      if (state.regStatus && status !== state.regStatus) return false;
      if (!q) return true;
      return [p.kode, p.nama, p.sekolah, p.wa, p.kategori, lombaName(p.lomba_id)].join(" ").toLowerCase().indexOf(q) >= 0;
    });
  }

  function drawRegTable() {
    var list = filteredReg();
    $("#regCount").textContent = list.length + " data";
    var rows = list.map(function (p) {
      var st = p.status || "Menunggu";
      var acts = '<button class="btn ico" data-act="reg-detail" data-id="' + esc(p.id) + '">Detail</button>';
      if (st !== "Disetujui") acts += ' <button class="btn ico ok" data-act="reg-approve" data-id="' + esc(p.id) + '" style="color:#0b5b2c">Setujui</button>';
      if (st !== "Ditolak") acts += ' <button class="btn ico" data-act="reg-reject" data-id="' + esc(p.id) + '">Tolak</button>';
      acts += ' <button class="btn ico danger" data-act="del" data-id="pendaftaran:' + esc(p.id) + '">Hapus</button>';
      return [
        '<b>' + esc(p.kode) + '</b>',
        esc(p.nama) + '<br><small style="color:var(--soft)">' + esc(p.sekolah || "-") + '</small>',
        esc(lombaName(p.lomba_id)) + '<br><small style="color:var(--soft)">' + esc(p.kategori || "-") + '</small>',
        esc(CORE.waPretty(p.wa)) + '<br><small style="color:var(--soft)">' + esc(p.referral || "tanpa kode") + '</small>',
        statusBadge(st),
        esc(CORE.fmtDateTime(p.dibuat)),
        '<div class="acts">' + acts + '</div>'
      ];
    });
    $("#regTable").innerHTML = dataTable(["Kode", "Nama / Sekolah", "Lomba / Kategori", "WhatsApp", "Status", "Dibuat", "Aksi"], rows, "Tidak ada pendaftaran yang cocok.");
  }

  function regById(id) {
    return (state.data.pendaftaran || []).filter(function (r) { return String(r.id) === String(id); })[0];
  }

  function openRegModal(r) {
    if (!r) return;
    var wa = String(r.wa || "").replace(/\D/g, "");
    var bukti = /^https?:/i.test(String(r.bukti || ""));
    var info = '<dl class="detail-dl">' +
      detailRow("Kode", '<b>' + esc(r.kode) + '</b>') +
      detailRow("Nama", esc(r.nama)) +
      detailRow("Lomba", esc(lombaName(r.lomba_id)) + (r.kategori ? " · " + esc(r.kategori) : "")) +
      detailRow("Sekolah", esc(r.sekolah || "-")) +
      detailRow("Pendamping", esc(r.pendamping || "-")) +
      detailRow("WhatsApp", esc(CORE.waPretty(r.wa)) + (wa ? ' · <a href="' + esc(CORE.waLink(wa, "Halo " + r.nama + ", kami panitia SANMAR EXPERIENCE 2026.")) + '" target="_blank" rel="noopener">chat</a>' : "")) +
      detailRow("Email", esc(r.email || "-")) +
      detailRow("Jumlah anggota", esc(r.jumlah || "-")) +
      detailRow("Kode referral", esc(r.referral || "-")) +
      detailRow("Bukti bayar", bukti ? '<a href="' + esc(r.bukti) + '" target="_blank" rel="noopener">Lihat bukti</a>' : esc(r.bukti || "-")) +
      detailRow("Dibuat", esc(CORE.fmtDateTime(r.dibuat))) +
      '</dl>';

    openForm({
      title: "Pendaftaran " + r.kode,
      info: info,
      values: r,
      submitLabel: "Simpan status",
      fields: [
        { key: "status", label: "Status", type: "select", options: ["Menunggu", "Disetujui", "Ditolak"], required: true },
        { key: "catatan", label: "Catatan panitia", type: "textarea", rows: 3, full: true, help: "Dipakai saat menolak atau memberi info tambahan." }
      ],
      onSubmit: async function (data) {
        await saveRow("pendaftaran", Object.assign({ id: r.id }, data));
        toast("Pendaftaran diperbarui", "ok");
      }
    });
  }

  /* --------------------------- pertandingan -------------------------- */

  function renderPertandingan(el) {
    el.innerHTML = '<div class="card">' +
      '<div class="toolbar"><b>Pertandingan</b><span class="spacer"></span><button class="btn sm" data-act="match-add">+ Tambah pertandingan</button></div>' +
      matchTable() + '</div>' +
      '<div class="card" style="margin-top:16px"><h2>Klasemen otomatis</h2><p class="help" style="margin-bottom:10px">Dihitung dari pertandingan penyisihan berstatus Selesai (menang 2, kalah 1). Dua teratas tiap grup lolos.</p>' + standingsPreview() + '</div>';
  }

  function matchTable() {
    var list = (state.data.pertandingan || []).slice().sort(function (a, b) {
      return String(a.tanggal || "").localeCompare(String(b.tanggal || "")) || (Number(a.urutan) || 0) - (Number(b.urutan) || 0);
    });
    var rows = list.map(function (m) {
      var a = CORE.timById(state.data, m.tim_a);
      var b = CORE.timById(state.data, m.tim_b);
      var skor = (m.skor_a === "" || m.skor_a === undefined || m.skor_a === null) ? "–" : esc(m.skor_a) + " – " + esc(m.skor_b === "" ? 0 : m.skor_b);
      return [
        esc(CORE.fmtDate(m.tanggal)),
        esc(m.kategori || "-") + '<br><small style="color:var(--soft)">' + esc(m.babak || "") + (m.grup ? ' · Grup ' + esc(m.grup) : "") + '</small>',
        '<b>' + esc(a ? a.nama : (m.tim_a || "-")) + '</b><br>vs <b>' + esc(b ? b.nama : (m.tim_b || "-")) + '</b>',
        esc(m.waktu || "-"),
        '<b style="font-size:14px">' + skor + '</b>',
        statusBadge(m.status),
        '<div class="acts"><button class="btn ico" data-act="match-edit" data-id="' + esc(m.id) + '">Edit</button> <button class="btn ico danger" data-act="del" data-id="pertandingan:' + esc(m.id) + '">Hapus</button></div>'
      ];
    });
    return dataTable(["Tanggal", "Babak", "Pertandingan", "Waktu", "Skor", "Status", "Aksi"], rows, "Belum ada pertandingan.");
  }

  function matchById(id) {
    return (state.data.pertandingan || []).filter(function (r) { return String(r.id) === String(id); })[0];
  }

  function standingsPreview() {
    var k = CORE.computeKlasemen(state.data.pertandingan || [], state.data.tim || []);
    var html = "";
    ["Putra", "Putri"].forEach(function (cat) {
      var groups = k[cat] || [];
      if (!groups.length) return;
      html += '<div class="st-block"><h4 style="margin:14px 0 8px;font-size:14px">Basket ' + cat + '</h4><div class="st-grid">' +
        groups.map(function (g) {
          var rows = g.rows.map(function (r) {
            return [
              String(r.rank),
              esc(r.nama) + (r.qualified ? ' <span class="badge ok">Q</span>' : ""),
              String(r.main),
              String(r.m) + "/" + String(r.k),
              String(r.poin)
            ];
          });
          return '<div><h4>Grup ' + esc(g.nama) + '</h4>' + dataTable(["#", "Tim", "Main", "M/K", "Poin"], rows, "Belum ada tim.") + '</div>';
        }).join("") + '</div></div>';
    });
    return html || '<div class="empty">Belum ada grup dan tim basket.</div>';
  }

  function teamOptions() {
    return [{ value: "", label: "— Pilih tim —" }].concat((state.data.tim || []).map(function (t) {
      return { value: t.id, label: (t.kategori || "-") + " · " + t.nama + (t.grup ? " (Grup " + t.grup + ")" : "") };
    }));
  }

  function openMatchForm(row) {
    var r = row || { id: "", kategori: "Putra", babak: "Penyisihan", grup: "", game: "", tanggal: "", waktu: "", tempat: "", tim_a: "", tim_b: "", skor_a: "", skor_b: "", status: "Terjadwal", urutan: "" };
    openForm({
      title: row ? "Edit pertandingan" : "Tambah pertandingan",
      values: r,
      fields: [
        { key: "kategori", label: "Kategori", type: "select", options: ["Putra", "Putri"], required: true },
        { key: "babak", label: "Babak", type: "select", options: ["Penyisihan", "Perempat Final", "Semifinal", "Final", "Perebutan Juara 3"], required: true },
        { key: "grup", label: "Grup", help: "Wajib untuk babak penyisihan (A/B/C…)." },
        { key: "game", label: "Nomor game", type: "number", min: 0 },
        { key: "tanggal", label: "Tanggal", type: "date", required: true },
        { key: "waktu", label: "Waktu", placeholder: "mis. 13.00–14.00 WIB" },
        { key: "tempat", label: "Tempat", full: true },
        { key: "tim_a", label: "Tim A", type: "select", options: teamOptions, required: true },
        { key: "tim_b", label: "Tim B", type: "select", options: teamOptions, required: true },
        { key: "skor_a", label: "Skor tim A", type: "number", min: 0 },
        { key: "skor_b", label: "Skor tim B", type: "number", min: 0 },
        { key: "status", label: "Status", type: "select", options: ["Terjadwal", "Berlangsung", "Selesai", "Batal"], required: true },
        { key: "urutan", label: "Urutan tampil", type: "number", min: 0 }
      ],
      onSubmit: async function (data) {
        if (data.id === undefined) data.id = r.id;
        await saveRow("pertandingan", data);
        toast("Pertandingan disimpan", "ok");
      }
    });
  }

  /* ------------------------------ juara ------------------------------ */

  function renderJuara(el) {
    var rows = (state.data.juara || []).map(function (j) {
      return [
        CORE.medal(Number(j.peringkat)) + " " + esc(j.peringkat),
        esc(lombaName(j.lomba_id)) + (j.kategori ? '<br><small style="color:var(--soft)">' + esc(j.kategori) + '</small>' : ""),
        '<b>' + esc(j.nama) + '</b>',
        esc(j.sekolah || "-"),
        '<div class="acts"><button class="btn ico" data-act="juara-edit" data-id="' + esc(j.id) + '">Edit</button> <button class="btn ico danger" data-act="del" data-id="juara:' + esc(j.id) + '">Hapus</button></div>'
      ];
    });
    el.innerHTML = '<div class="card"><div class="toolbar"><b>Daftar juara</b><span class="spacer"></span><button class="btn sm" data-act="juara-add">+ Tambah juara</button></div>' +
      dataTable(["Peringkat", "Lomba", "Nama", "Sekolah", "Aksi"], rows, "Belum ada data juara.") + '</div>';
  }

  function openJuaraForm(row) {
    var r = row || { id: "", lomba_id: "", kategori: "", peringkat: 1, nama: "", sekolah: "" };
    openForm({
      title: row ? "Edit juara" : "Tambah juara",
      values: r,
      fields: [
        { key: "lomba_id", label: "Lomba", type: "select", options: lombaOptions, required: true },
        { key: "kategori", label: "Kategori", help: "Kosongkan untuk lomba perorangan." },
        { key: "peringkat", label: "Peringkat", type: "number", min: 1, max: 3, required: true },
        { key: "nama", label: "Nama pemenang", required: true, full: true },
        { key: "sekolah", label: "Sekolah", full: true }
      ],
      onSubmit: async function (data) {
        if (data.id === undefined) data.id = r.id;
        await saveRow("juara", data);
        toast("Data juara disimpan", "ok");
      }
    });
  }

  /* --------------------------- lomba & kategori ---------------------- */

  function renderLomba(el) {
    var rows = (state.data.lomba || []).map(function (l) {
      var jml = (state.data.kategori || []).filter(function (k) { return k.lomba_id === l.id; }).length;
      return [
        '<b>' + esc(l.nama) + '</b><br><small style="color:var(--soft)">' + esc(l.slug) + '</small>',
        esc(l.jenis || "-"),
        l.biaya ? esc(CORE.rupiah(l.biaya)) : "Gratis",
        String(jml),
        esc(l.urutan || "-"),
        Number(l.aktif) ? '<span class="badge ok">Aktif</span>' : '<span class="badge grey">Nonaktif</span>',
        '<div class="acts"><button class="btn ico" data-act="lomba-edit" data-id="' + esc(l.id) + '">Edit</button> <button class="btn ico danger" data-act="del" data-id="lomba:' + esc(l.id) + '">Hapus</button></div>'
      ];
    });
    var katRows = (state.data.kategori || []).slice().sort(function (a, b) {
      return String(a.lomba_id).localeCompare(String(b.lomba_id)) || (Number(a.urutan) || 0) - (Number(b.urutan) || 0);
    }).map(function (k) {
      return [
        '<b>' + esc(k.nama) + '</b>',
        esc(lombaName(k.lomba_id)),
        esc(k.kuota === "" || k.kuota === undefined ? "—" : k.kuota),
        esc(k.terisi_awal || 0),
        esc(k.urutan || "-"),
        '<div class="acts"><button class="btn ico" data-act="kat-edit" data-id="' + esc(k.id) + '">Edit</button> <button class="btn ico danger" data-act="del" data-id="kategori:' + esc(k.id) + '">Hapus</button></div>'
      ];
    });
    el.innerHTML = '<div class="card"><div class="toolbar"><b>Lomba</b><span class="spacer"></span><button class="btn sm" data-act="lomba-add">+ Tambah lomba</button></div>' +
      dataTable(["Nama", "Jenis", "Biaya", "Kategori", "Urutan", "Status", "Aksi"], rows, "Belum ada lomba.") + '</div>' +
      '<div class="card" style="margin-top:16px"><div class="toolbar"><b>Kategori / kuota</b><span class="spacer"></span><button class="btn sm" data-act="kat-add">+ Tambah kategori</button></div>' +
      dataTable(["Kategori", "Lomba", "Kuota", "Terisi awal", "Urutan", "Aksi"], katRows, "Belum ada kategori.") + '</div>';
  }

  function openLombaForm(row) {
    var r = row || { id: "", slug: "", nama: "", jenis: "Perorangan", biaya: "", hadiah: "", fasilitas: "", info: "", deskripsi: "", deskripsi_panjang: "", cp_nama: "", cp_jabatan: "", cp_wa: "", juknis_halaman: "", juknis_pdf: "", juknis_docx: "", urutan: "", aktif: 1 };
    var values = Object.assign({}, r, { fasilitas: String(r.fasilitas || "").replace(/\|/g, "\n") });
    openForm({
      title: row ? "Edit lomba" : "Tambah lomba",
      values: values,
      fields: [
        { key: "nama", label: "Nama lomba", required: true, full: true },
        { key: "slug", label: "Slug URL", help: "Huruf kecil dan tanda hubung, mis. reading-champ." },
        { key: "jenis", label: "Jenis", type: "select", options: ["Perorangan", "Kelompok"] },
        { key: "biaya", label: "Biaya (angka)", type: "number", min: 0 },
        { key: "hadiah", label: "Hadiah" },
        { key: "deskripsi", label: "Deskripsi singkat", type: "textarea", rows: 3, full: true },
        { key: "deskripsi_panjang", label: "Deskripsi panjang", type: "textarea", rows: 4, full: true },
        { key: "fasilitas", label: "Fasilitas", type: "textarea", rows: 4, full: true, multiline: true, help: "Satu fasilitas per baris." },
        { key: "info", label: "Info tambahan", type: "textarea", rows: 3, full: true },
        { key: "cp_nama", label: "Contact person" },
        { key: "cp_jabatan", label: "Jabatan CP" },
        { key: "cp_wa", label: "WhatsApp CP", placeholder: "628…" },
        { key: "juknis_halaman", label: "Halaman juknis", placeholder: "juknis-reading-champ.html" },
        { key: "juknis_pdf", label: "Juknis PDF (URL)" },
        { key: "juknis_docx", label: "Juknis Word (URL)" },
        { key: "urutan", label: "Urutan", type: "number", min: 0 },
        { key: "aktif", label: "Tampilkan di situs", type: "checkbox", checkLabel: "Aktif", full: true }
      ],
      onSubmit: async function (data) {
        if (data.id === undefined) data.id = r.id;
        await saveRow("lomba", data);
        toast("Lomba disimpan", "ok");
      }
    });
  }

  function openKategoriForm(row) {
    var r = row || { id: "", lomba_id: "", nama: "", kuota: "", terisi_awal: 0, urutan: "" };
    openForm({
      title: row ? "Edit kategori" : "Tambah kategori",
      values: r,
      fields: [
        { key: "lomba_id", label: "Lomba", type: "select", options: lombaOptions, required: true },
        { key: "nama", label: "Nama kategori", required: true },
        { key: "kuota", label: "Kuota", type: "number", min: 0, help: "Kosongkan jika tidak dibatasi." },
        { key: "terisi_awal", label: "Terisi awal", type: "number", min: 0, help: "Peserta lama di luar sistem." },
        { key: "urutan", label: "Urutan", type: "number", min: 0 }
      ],
      onSubmit: async function (data) {
        if (data.id === undefined) data.id = r.id;
        await saveRow("kategori", data);
        toast("Kategori disimpan", "ok");
      }
    });
  }

  /* ------------------------------- tim ------------------------------- */

  function renderTim(el) {
    var rows = (state.data.tim || []).map(function (t) {
      return [
        '<b>' + esc(t.nama) + '</b>',
        esc(t.kategori || "-"),
        esc(t.grup || "-"),
        t.logo ? '<a href="' + esc(CORE.mediaUrl(t.logo)) + '" target="_blank" rel="noopener">' + esc(t.logo) + '</a>' : "—",
        '<div class="acts"><button class="btn ico" data-act="tim-edit" data-id="' + esc(t.id) + '">Edit</button> <button class="btn ico danger" data-act="del" data-id="tim:' + esc(t.id) + '">Hapus</button></div>'
      ];
    });
    el.innerHTML = '<div class="card"><div class="toolbar"><b>Tim basket</b><span class="spacer"></span><button class="btn sm" data-act="tim-add">+ Tambah tim</button></div>' +
      dataTable(["Nama tim", "Kategori", "Grup", "Logo", "Aksi"], rows, "Belum ada tim.") + '</div>';
  }

  function openTimForm(row) {
    var r = row || { id: "", nama: "", kategori: "Putra", grup: "", logo: "" };
    openForm({
      title: row ? "Edit tim" : "Tambah tim",
      values: r,
      fields: [
        { key: "nama", label: "Nama tim", required: true, full: true },
        { key: "kategori", label: "Kategori", type: "select", options: ["Putra", "Putri"], required: true },
        { key: "grup", label: "Grup", placeholder: "A / B / C" },
        { key: "logo", label: "Path logo", full: true, help: "Contoh: assets/img/logos/namafile.webp" }
      ],
      onSubmit: async function (data) {
        if (data.id === undefined) data.id = r.id;
        await saveRow("tim", data);
        toast("Tim disimpan", "ok");
      }
    });
  }

  /* --------------------------- sponsor & paket ----------------------- */

  function renderSponsor(el) {
    var spRows = (state.data.sponsor || []).map(function (s) {
      return [
        '<b>' + esc(s.nama) + '</b>',
        esc(s.level || "-"),
        s.url ? '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.url) + '</a>' : "—",
        esc(s.urutan || "-"),
        '<div class="acts"><button class="btn ico" data-act="sponsor-edit" data-id="' + esc(s.id) + '">Edit</button> <button class="btn ico danger" data-act="del" data-id="sponsor:' + esc(s.id) + '">Hapus</button></div>'
      ];
    });
    var pkRows = (state.data.paket || []).map(function (p) {
      return [
        '<b>' + esc(p.nama) + '</b>' + (Number(p.sorot) ? ' <span class="badge ok">Sorot</span>' : ""),
        esc(p.nominal || "-"),
        esc(String(p.benefit || "").split("|").length) + " benefit",
        esc(p.urutan || "-"),
        '<div class="acts"><button class="btn ico" data-act="paket-edit" data-id="' + esc(p.id) + '">Edit</button> <button class="btn ico danger" data-act="del" data-id="paket:' + esc(p.id) + '">Hapus</button></div>'
      ];
    });
    var ktRows = (state.data.kontak || []).map(function (k) {
      return [
        '<b>' + esc(k.nama) + '</b>',
        esc(k.tipe || "-"),
        esc(k.jabatan || "-"),
        esc(CORE.waPretty(k.wa)),
        esc(k.urutan || "-"),
        '<div class="acts"><button class="btn ico" data-act="kontak-edit" data-id="' + esc(k.id) + '">Edit</button> <button class="btn ico danger" data-act="del" data-id="kontak:' + esc(k.id) + '">Hapus</button></div>'
      ];
    });
    el.innerHTML =
      '<div class="card"><div class="toolbar"><b>Sponsor</b><span class="spacer"></span><button class="btn sm" data-act="sponsor-add">+ Tambah sponsor</button></div>' +
        dataTable(["Nama", "Level", "URL", "Urutan", "Aksi"], spRows, "Belum ada sponsor terdaftar.") + '</div>' +
      '<div class="card" style="margin-top:16px"><div class="toolbar"><b>Paket kemitraan</b><span class="spacer"></span><button class="btn sm" data-act="paket-add">+ Tambah paket</button></div>' +
        dataTable(["Paket", "Nominal", "Benefit", "Urutan", "Aksi"], pkRows, "Belum ada paket.") + '</div>' +
      '<div class="card" style="margin-top:16px"><div class="toolbar"><b>Contact person</b><span class="spacer"></span><button class="btn sm" data-act="kontak-add">+ Tambah kontak</button></div>' +
        dataTable(["Nama", "Tipe", "Jabatan", "WhatsApp", "Urutan", "Aksi"], ktRows, "Belum ada kontak.") + '</div>';
  }

  function openSponsorForm(row) {
    var r = row || { id: "", nama: "", level: "", logo: "", url: "", urutan: "" };
    openForm({
      title: row ? "Edit sponsor" : "Tambah sponsor",
      values: r,
      fields: [
        { key: "nama", label: "Nama sponsor", required: true, full: true },
        { key: "level", label: "Level", placeholder: "Platinum / Gold / Media Partner" },
        { key: "logo", label: "Path logo" },
        { key: "url", label: "URL situs", full: true },
        { key: "urutan", label: "Urutan", type: "number", min: 0 }
      ],
      onSubmit: async function (data) {
        if (data.id === undefined) data.id = r.id;
        await saveRow("sponsor", data);
        toast("Sponsor disimpan", "ok");
      }
    });
  }

  function openPaketForm(row) {
    var r = row || { id: "", nama: "", nominal: "", benefit: "", sorot: 0, urutan: "" };
    var values = Object.assign({}, r, { benefit: String(r.benefit || "").replace(/\|/g, "\n") });
    openForm({
      title: row ? "Edit paket" : "Tambah paket",
      values: values,
      fields: [
        { key: "nama", label: "Nama paket", required: true, full: true },
        { key: "nominal", label: "Nominal", placeholder: "mis. ≥ Rp10.000.000" },
        { key: "urutan", label: "Urutan", type: "number", min: 0 },
        { key: "benefit", label: "Benefit", type: "textarea", rows: 6, full: true, multiline: true, help: "Satu benefit per baris." },
        { key: "sorot", label: "Sorot paket", type: "checkbox", checkLabel: "Tandai sebagai paket unggulan", full: true }
      ],
      onSubmit: async function (data) {
        if (data.id === undefined) data.id = r.id;
        await saveRow("paket", data);
        toast("Paket disimpan", "ok");
      }
    });
  }

  function openKontakForm(row) {
    var r = row || { id: "", tipe: "sponsor", nama: "", jabatan: "", wa: "", urutan: "" };
    openForm({
      title: row ? "Edit kontak" : "Tambah kontak",
      values: r,
      fields: [
        { key: "tipe", label: "Tipe", placeholder: "sponsor / panitia / lomba" },
        { key: "nama", label: "Nama", required: true },
        { key: "jabatan", label: "Jabatan", full: true },
        { key: "wa", label: "WhatsApp", placeholder: "628…" },
        { key: "urutan", label: "Urutan", type: "number", min: 0 }
      ],
      onSubmit: async function (data) {
        if (data.id === undefined) data.id = r.id;
        await saveRow("kontak", data);
        toast("Kontak disimpan", "ok");
      }
    });
  }

  /* ----------------------------- rangkaian --------------------------- */

  function renderRangkaian(el) {
    var rows = (state.data.timeline || []).map(function (t) {
      return [
        esc(CORE.fmtDate(t.tanggal)),
        '<b>' + esc(t.judul) + '</b>' + (t.deskripsi ? '<br><small style="color:var(--soft)">' + esc(t.deskripsi) + '</small>' : ""),
        esc(t.waktu || "-"),
        statusBadge(t.status),
        esc(t.urutan || "-"),
        '<div class="acts"><button class="btn ico" data-act="rk-edit" data-id="' + esc(t.id) + '">Edit</button> <button class="btn ico danger" data-act="del" data-id="timeline:' + esc(t.id) + '">Hapus</button></div>'
      ];
    });
    el.innerHTML = '<div class="card"><div class="toolbar"><b>Rangkaian acara</b><span class="spacer"></span><button class="btn sm" data-act="rk-add">+ Tambah agenda</button></div>' +
      dataTable(["Tanggal", "Agenda", "Waktu", "Status", "Urutan", "Aksi"], rows, "Belum ada agenda.") + '</div>';
  }

  function openTimelineForm(row) {
    var r = row || { id: "", tanggal: "", judul: "", waktu: "", lokasi: "", deskripsi: "", status: "", urutan: "" };
    openForm({
      title: row ? "Edit agenda" : "Tambah agenda",
      values: r,
      fields: [
        { key: "judul", label: "Judul agenda", required: true, full: true },
        { key: "tanggal", label: "Tanggal", type: "date", required: true },
        { key: "waktu", label: "Waktu", placeholder: "mis. 08.00 – 14.00 WIB" },
        { key: "lokasi", label: "Lokasi", full: true },
        { key: "deskripsi", label: "Deskripsi", type: "textarea", rows: 3, full: true },
        { key: "status", label: "Status", placeholder: "Selesai / kosong" },
        { key: "urutan", label: "Urutan", type: "number", min: 0 }
      ],
      onSubmit: async function (data) {
        if (data.id === undefined) data.id = r.id;
        await saveRow("timeline", data);
        toast("Agenda disimpan", "ok");
      }
    });
  }

  /* --------------------------- kesan & pesan ------------------------- */

  function renderKesan(el) {
    var rows = (state.data.kesan || []).map(function (k) {
      var rata = [k.r_daftar, k.r_panitia, k.r_jadwal, k.r_fasilitas, k.r_umum].map(Number).filter(function (n) { return n > 0; });
      var avg = rata.length ? (rata.reduce(function (a, b) { return a + b; }, 0) / rata.length).toFixed(1) : "-";
      var st = k.status || "Menunggu";
      var acts = '<button class="btn ico" data-act="kesan-view" data-id="' + esc(k.id) + '">Lihat</button>';
      if (st !== "Tampil") acts += ' <button class="btn ico" data-act="kesan-show" data-id="' + esc(k.id) + '">Tampilkan</button>';
      if (st === "Tampil") acts += ' <button class="btn ico" data-act="kesan-hide" data-id="' + esc(k.id) + '">Sembunyikan</button>';
      acts += ' <button class="btn ico danger" data-act="del" data-id="kesan:' + esc(k.id) + '">Hapus</button>';
      return [
        '<b>' + esc(k.nama) + '</b><br><small style="color:var(--soft)">' + esc(k.sekolah || "-") + '</small>',
        esc(k.peran || "-") + '<br><small style="color:var(--soft)">' + esc(k.lomba || "-") + '</small>',
        esc(avg) + " / 5",
        esc(shorten(k.pesan, 70)),
        statusBadge(st),
        esc(CORE.fmtDateTime(k.dibuat)),
        '<div class="acts">' + acts + '</div>'
      ];
    });
    el.innerHTML = '<div class="card"><b>Testimoni masuk</b><p class="help" style="margin-bottom:10px">Hanya testimoni berstatus Tampil yang muncul di halaman publik.</p>' +
      dataTable(["Nama", "Peran / Lomba", "Rating", "Pesan", "Status", "Dibuat", "Aksi"], rows, "Belum ada kesan & pesan.") + '</div>';
  }

  function openKesanModal(k) {
    if (!k) return;
    var info = '<dl class="detail-dl">' +
      detailRow("Nama", esc(k.nama)) +
      detailRow("Sekolah", esc(k.sekolah || "-")) +
      detailRow("Peran", esc(k.peran || "-")) +
      detailRow("Lomba", esc(k.lomba || "-")) +
      detailRow("Rating", ["Daftar", "Panitia", "Jadwal", "Fasilitas", "Umum"].map(function (label, i) {
        var val = k[["r_daftar", "r_panitia", "r_jadwal", "r_fasilitas", "r_umum"][i]];
        return label + " " + (val ? esc(val) + "/5" : "-");
      }).join(" · ")) +
      detailRow("Dibuat", esc(CORE.fmtDateTime(k.dibuat))) +
      '</dl>' +
      '<div class="quote"><b>Kesan</b><p>' + esc(k.pesan || "-") + '</p><b>Saran</b><p>' + esc(k.saran || "-") + '</p></div>';
    openForm({
      title: "Testimoni — " + (k.nama || ""),
      info: info,
      values: k,
      submitLabel: "Simpan status",
      fields: [{ key: "status", label: "Status", type: "select", options: ["Menunggu", "Tampil", "Ditolak"], required: true }],
      onSubmit: async function (data) {
        await saveRow("kesan", Object.assign({ id: k.id }, data));
        toast("Testimoni diperbarui", "ok");
      }
    });
  }

  async function setKesanStatus(id, status) {
    await saveRow("kesan", { id: id, status: status });
    toast(status === "Tampil" ? "Testimoni ditampilkan" : "Testimoni disembunyikan", "ok");
  }

  /* ----------------------------- referral ---------------------------- */

  function renderReferral(el) {
    var rows = (state.data.referral || []).map(function (r) {
      return [
        '<b>' + esc(r.kode) + '</b>',
        esc(r.nama || "-"),
        Number(r.aktif) ? '<span class="badge ok">Aktif</span>' : '<span class="badge grey">Nonaktif</span>',
        esc(r.jumlah || 0),
        '<div class="acts"><button class="btn ico" data-act="ref-edit" data-id="' + esc(r.id) + '">Edit</button> <button class="btn ico danger" data-act="del" data-id="referral:' + esc(r.id) + '">Hapus</button></div>'
      ];
    });
    el.innerHTML = '<div class="card"><div class="toolbar"><b>Kode referral</b><span class="spacer"></span><button class="btn sm" data-act="ref-add">+ Tambah kode</button></div>' +
      '<p class="help" style="margin-bottom:10px">Tampilkan papan peringkat publik lewat Pengaturan → Papan referral publik.</p>' +
      dataTable(["Kode", "Pemilik", "Status", "Pendaftar memakai kode", "Aksi"], rows, "Belum ada kode referral.") + '</div>';
  }

  function openReferralForm(row) {
    var r = row || { id: "", kode: "", nama: "", aktif: 1 };
    openForm({
      title: row ? "Edit kode referral" : "Tambah kode referral",
      values: r,
      fields: [
        { key: "kode", label: "Kode", required: true, help: "Huruf besar, tanpa spasi. Contoh: GURU-ANA" },
        { key: "nama", label: "Nama pemilik", required: true },
        { key: "aktif", label: "Aktif", type: "checkbox", checkLabel: "Kode aktif dipakai pendaftar", full: true }
      ],
      onSubmit: async function (data) {
        data.kode = String(data.kode || "").toUpperCase();
        if (data.id === undefined) data.id = r.id;
        await saveRow("referral", data);
        toast("Kode referral disimpan", "ok");
      }
    });
  }

  /* ----------------------------- bantuan ----------------------------- */

  function renderBantuan(el) {
    var rows = (state.data.bantuan || []).map(function (b) {
      return [
        '<b>' + esc(b.nama) + '</b><br><small style="color:var(--soft)">' + esc(b.usaha || "-") + '</small>',
        esc(CORE.waPretty(b.wa)),
        esc(b.status || "-"),
        esc(shorten(b.peran, 60)),
        esc(CORE.fmtDateTime(b.dibuat)),
        '<div class="acts"><button class="btn ico" data-act="bantuan-view" data-id="' + esc(b.id) + '">Lihat</button> <button class="btn ico danger" data-act="del" data-id="bantuan:' + esc(b.id) + '">Hapus</button></div>'
      ];
    });
    el.innerHTML = '<div class="card"><b>Pengajuan bantuan sponsor</b><p class="help" style="margin-bottom:10px">Masuk dari formulir bagian Sponsor di situs publik.</p>' +
      dataTable(["Nama / Usaha", "WhatsApp", "Pengaju", "Bentuk dukungan", "Dibuat", "Aksi"], rows, "Belum ada pengajuan bantuan.") + '</div>';
  }

  function openBantuanModal(b) {
    if (!b) return;
    var wa = String(b.wa || "").replace(/\D/g, "");
    var info = '<dl class="detail-dl">' +
      detailRow("Nama", esc(b.nama)) +
      detailRow("Usaha", esc(b.usaha || "-")) +
      detailRow("Pengaju", esc(b.status || "-")) +
      detailRow("WhatsApp", esc(CORE.waPretty(b.wa)) + (wa ? ' · <a href="' + esc(CORE.waLink(wa, "Halo " + b.nama + ", kami panitia SANMAR EXPERIENCE 2026.")) + '" target="_blank" rel="noopener">chat</a>' : "")) +
      detailRow("Bentuk dukungan", esc(b.peran || "-")) +
      detailRow("Pesan", esc(b.pesan || "-")) +
      detailRow("Dibuat", esc(CORE.fmtDateTime(b.dibuat))) +
      '</dl>';
    openModal("Pengajuan bantuan — " + (b.nama || ""), info +
      '<div class="form-actions"><button type="button" class="btn ghost" id="helpClose">Tutup</button></div>');
    $("#helpClose").addEventListener("click", closeModal);
  }

  /* ---------------------------- pengaturan --------------------------- */

  var SETTINGS_FIELDS = [
    { key: "nama_event", label: "Nama event" },
    { key: "sekolah", label: "Nama sekolah" },
    { key: "tema", label: "Tema", full: true },
    { key: "deskripsi", label: "Deskripsi singkat", type: "textarea", rows: 3, full: true },
    { key: "alamat", label: "Alamat", full: true },
    { key: "lokasi", label: "Lokasi acara" },
    { key: "wa_bantuan", label: "WhatsApp bantuan", placeholder: "628…" },
    { key: "admin_wa", label: "WhatsApp admin", placeholder: "628…" },
    { key: "pendaftaran_buka", label: "Pendaftaran dibuka", type: "datetime-local" },
    { key: "pendaftaran_tutup", label: "Pendaftaran ditutup", type: "datetime-local" },
    { key: "technical_meeting", label: "Technical meeting", type: "datetime-local" },
    { key: "event_mulai", label: "Hitung mundur mulai", type: "datetime-local" },
    { key: "pendaftaran_status", label: "Status pendaftaran", type: "select", options: [{ value: "buka", label: "Buka" }, { value: "tutup", label: "Tutup" }] },
    { key: "referral_publik", label: "Papan referral publik", type: "select", options: [{ value: "1", label: "Tampilkan" }, { value: "0", label: "Sembunyikan" }] },
    { key: "logo", label: "Path logo WebP", help: "Contoh: assets/img/logo.webp" },
    { key: "logo_png", label: "Path logo PNG", help: "Dipakai pada unduhan dokumen." }
  ];

  function renderPengaturan(el) {
    var values = state.data.settings || state.data.pengaturan || {};
    el.innerHTML = '<div class="card"><h2>Identitas & jadwal</h2><p class="help" style="margin-bottom:12px">Perubahan langsung tampil di situs publik setelah disimpan.</p>' +
      '<form id="settingsForm" class="forms">' +
        SETTINGS_FIELDS.map(function (f) { return fieldHTML(f, values); }).join("") +
        '<div class="form-actions"><span id="setStatus" style="margin-right:auto"></span><button class="btn" id="setSave" type="submit">Simpan pengaturan</button></div>' +
      '</form></div>' +
      alertBox("Jadwal memakai zona waktu <b>WIB</b>. Format input: tanggal dan jam lokal.", "info");

    $("#settingsForm").addEventListener("submit", async function (ev) {
      ev.preventDefault();
      var btn = $("#setSave");
      var st = $("#setStatus");
      btn.disabled = true;
      st.innerHTML = "";
      try {
        var valuesOut = collectForm($("#settingsForm"), SETTINGS_FIELDS);
        SETTINGS_FIELDS.forEach(function (f) {
          if (f.type === "datetime-local" && valuesOut[f.key] && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valuesOut[f.key])) {
            valuesOut[f.key] += ":00+07:00";
          }
        });
        var res = await API.post("save_settings", { token: state.token, values: valuesOut });
        if (res && res.settings) state.data.settings = res.settings;
        st.innerHTML = alertBox("Pengaturan disimpan.", "ok");
        toast("Pengaturan disimpan", "ok");
      } catch (err) {
        handleErr(err);
        st.innerHTML = alertBox(esc(err.message || "Gagal menyimpan."), "err");
      } finally {
        btn.disabled = false;
      }
    });
  }

  /* ------------------------------- akun ------------------------------ */

  function renderAkun(el) {
    var u = state.user || {};
    el.innerHTML = '<div class="grid2">' +
      '<div class="card"><h2>Akun admin</h2>' +
        '<dl class="detail-dl">' +
          detailRow("Username", '<b>' + esc(u.username || "-") + '</b>') +
          detailRow("Nama", esc(u.nama || "-")) +
        '</dl>' +
        '<p class="help" style="margin:12px 0">Gunakan password kuat (minimal 8 karakter) dan jangan dibagikan.</p>' +
        '<button class="btn red sm" id="tabLogout" type="button">Keluar dari panel</button>' +
      '</div>' +
      '<div class="card"><h2>Ganti password</h2>' +
        '<form id="pwForm" class="forms" style="margin-top:10px">' +
          '<div class="field full"><label>Password lama</label><input type="password" id="pwOld" autocomplete="current-password" required></div>' +
          '<div class="field full"><label>Password baru</label><input type="password" id="pwNew" autocomplete="new-password" minlength="8" required></div>' +
          '<div class="field full"><label>Ulangi password baru</label><input type="password" id="pwNew2" autocomplete="new-password" minlength="8" required></div>' +
          '<div class="form-actions"><span id="pwStatus" style="margin-right:auto"></span><button class="btn" id="pwBtn" type="submit">Simpan password</button></div>' +
        '</form>' +
      '</div>' +
    '</div>';

    $("#tabLogout").addEventListener("click", function () { logout(true); });
    $("#pwForm").addEventListener("submit", async function (ev) {
      ev.preventDefault();
      var st = $("#pwStatus");
      var oldP = $("#pwOld").value;
      var newP = $("#pwNew").value;
      var rep = $("#pwNew2").value;
      var btn = $("#pwBtn");
      st.innerHTML = "";
      if (newP.length < 8) { st.innerHTML = alertBox("Password baru minimal 8 karakter.", "err"); return; }
      if (newP !== rep) { st.innerHTML = alertBox("Konfirmasi password tidak sama.", "err"); return; }
      btn.disabled = true;
      try {
        await API.post("change_password", { token: state.token, old_password: oldP, new_password: newP });
        st.innerHTML = alertBox("Password berhasil diganti.", "ok");
        $("#pwOld").value = "";
        $("#pwNew").value = "";
        $("#pwNew2").value = "";
        toast("Password diganti", "ok");
      } catch (err) {
        st.innerHTML = alertBox(esc(err.message || "Gagal mengganti password."), "err");
      } finally {
        btn.disabled = false;
      }
    });
  }

  /* --------------------------- komponen UI ---------------------------- */

  function lombaOptions() {
    return [{ value: "", label: "— Pilih lomba —" }].concat((state.data.lomba || []).map(function (l) { return { value: l.id, label: l.nama }; }));
  }

  function lombaName(id) {
    var l = (state.data.lomba || []).filter(function (x) { return x.id === id; })[0];
    return l ? l.nama : (id || "-");
  }

  function rowById(entity, id) {
    return (state.data[entity] || []).filter(function (r) { return String(r.id) === String(id); })[0];
  }

  function statusBadge(status) {
    var s = String(status || "").trim();
    var tone = (s === "Selesai" || s === "Disetujui" || s === "Tampil" || s === "Aktif" || s === "Diproses") ? "ok"
      : (s === "Menunggu" || s === "Berlangsung" || s === "Baru") ? "warn"
      : (s === "Ditolak" || s === "Batal" || s === "Nonaktif" || s === "Ditutup") ? "bad"
      : "grey";
    return '<span class="badge ' + tone + '">' + esc(s || "—") + '</span>';
  }

  function dataTable(headers, rows, emptyText) {
    if (!rows.length) return '<div class="empty">' + esc(emptyText || "Belum ada data.") + '</div>';
    return '<div class="table-wrap"><table><thead><tr>' +
      headers.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join("") +
      '</tr></thead><tbody>' +
      rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + c + '</td>'; }).join("") + '</tr>'; }).join("") +
      '</tbody></table></div>';
  }

  function detailRow(label, value) {
    return '<dt>' + esc(label) + '</dt><dd>' + value + '</dd>';
  }

  function shorten(text, max) {
    var s = String(text || "").replace(/\s+/g, " ").trim();
    return s.length > max ? s.slice(0, max - 1) + "…" : s;
  }

  function alertBox(msg, tone) {
    return '<div class="alert ' + (tone || "info") + '">' + msg + '</div>';
  }

  function debounce(fn, ms) {
    var t = null;
    return function () {
      var args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(null, args); }, ms);
    };
  }

  function toast(msg, tone) {
    var box = document.createElement("div");
    box.className = tone || "";
    box.textContent = msg;
    $("#toast").appendChild(box);
    setTimeout(function () { box.remove(); }, 3400);
  }

  function openModal(title, bodyHTML) {
    $("#modalTitle").textContent = title;
    $("#modalBody").innerHTML = bodyHTML;
    $("#modal").hidden = false;
    $("#modal").querySelector(".modal-card").scrollTop = 0;
  }

  function closeModal() {
    var m = $("#modal");
    if (!m) return;
    m.hidden = true;
    $("#modalBody").innerHTML = "";
  }

  function toLocalInput(value) {
    var s = String(value || "").trim();
    var m = s.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
    return m ? m[1] + "T" + m[2] : s;
  }

  function fieldHTML(f, values) {
    var raw = values[f.key];
    var v = raw === undefined || raw === null ? (f.def !== undefined ? f.def : "") : raw;
    if (f.type === "datetime-local") v = toLocalInput(v);

    if (f.type === "checkbox") {
      return '<div class="field full"><label class="check"><input type="checkbox" name="' + f.key + '"' + (Number(v) ? " checked" : "") + '> ' + esc(f.checkLabel || f.label) + '</label>' +
        (f.help ? '<span class="help">' + esc(f.help) + '</span>' : "") + '</div>';
    }

    var input;
    if (f.type === "textarea") {
      input = '<textarea name="' + f.key + '" rows="' + (f.rows || 3) + '"' + (f.required ? " required" : "") +
        (f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : "") + '>' + esc(v) + '</textarea>';
    } else if (f.type === "select") {
      var opts = typeof f.options === "function" ? f.options() : (f.options || []);
      input = '<select name="' + f.key + '"' + (f.required ? " required" : "") + '>' + opts.map(function (o) {
        var val = typeof o === "string" ? o : o.value;
        var label = typeof o === "string" ? o : o.label;
        return '<option value="' + esc(val) + '"' + (String(val) === String(v) ? " selected" : "") + '>' + esc(label) + '</option>';
      }).join("") + '</select>';
    } else {
      input = '<input type="' + (f.type || "text") + '" name="' + f.key + '" value="' + esc(v) + '"' +
        (f.min !== undefined ? ' min="' + f.min + '"' : "") +
        (f.max !== undefined ? ' max="' + f.max + '"' : "") +
        (f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : "") +
        (f.required ? " required" : "") + '>';
    }
    return '<div class="field' + (f.full ? " full" : "") + '"><label>' + esc(f.label) + (f.required ? " *" : "") + '</label>' + input +
      (f.help ? '<span class="help">' + esc(f.help) + '</span>' : "") + '</div>';
  }

  function collectForm(form, fields) {
    var out = {};
    fields.forEach(function (f) {
      if (f.type === "checkbox") {
        var cb = form.elements[f.key];
        out[f.key] = cb && cb.checked ? 1 : 0;
        return;
      }
      var el = form.elements[f.key];
      var val = el ? el.value : "";
      if (f.multiline) {
        val = val.replace(/\r/g, "").split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean).join("|");
      }
      out[f.key] = val;
    });
    return out;
  }

  function openForm(opts) {
    var fields = opts.fields || [];
    var values = opts.values || {};
    var html = (opts.info || "") +
      '<form id="edForm" novalidate>' +
        '<div class="forms">' + fields.map(function (f) { return fieldHTML(f, values); }).join("") + '</div>' +
        '<div class="form-actions"><button type="button" class="btn ghost" id="edCancel">Batal</button><button type="submit" class="btn">' + esc(opts.submitLabel || "Simpan") + '</button></div>' +
      '</form>';
    openModal(opts.title || "Formulir", html);
    $("#edCancel").addEventListener("click", closeModal);
    $("#edForm").addEventListener("submit", async function (ev) {
      ev.preventDefault();
      var form = $("#edForm");
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      var btn = form.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
      try {
        await opts.onSubmit(collectForm(form, fields));
        closeModal();
      } catch (err) {
        handleErr(err);
      } finally {
        if (btn) btn.disabled = false;
      }
    });
    var first = $("#edForm input:not([type=checkbox]), #edForm select, #edForm textarea");
    if (first) first.focus();
  }
})();
