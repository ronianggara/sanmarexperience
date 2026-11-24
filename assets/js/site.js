/* Halaman publik: pemuatan data, komponen bersama, countdown, navigasi */
window.SITE = (function () {
  let cache = null;
  let cacheAt = 0;

  function config() {
    return window.SANMAR_CONFIG || {};
  }

  async function loadData(force) {
    const ttl = (Number(config().CACHE_MINUTES) || 3) * 60000;
    if (cache && !force && Date.now() - cacheAt < ttl) return cache;
    let raw = null;
    window.BACKEND_OFFLINE = false;
    if (window.API && API.configured) {
      try {
        raw = await API.get("bootstrap");
      } catch (err) {
        console.warn("[SANMAR] API tidak dapat dihubungi, memakai data lokal:", err.message);
        window.BACKEND_OFFLINE = true;
      }
    }
    if (!raw) raw = window.SEED;
    cache = CORE.normalize(raw);
    cacheAt = Date.now();
    return cache;
  }

  function isOpen(data) {
    return String(data.settings.pendaftaran_status || "").toLowerCase() === "buka";
  }

  function katBadge(kat) {
    if (Number(kat.kuota) > 0 && Number(kat.terisi) >= Number(kat.kuota)) return '<span class="chip bad">Kuota penuh</span>';
    return '<span class="chip ok">Dibuka</span>';
  }

  function lombaStatusText(lomba, data) {
    if (!isOpen(data) || Number(lomba.aktif) === 0) return "Pendaftaran ditutup";
    const open = (lomba.kategori || []).some(function (k) { return !(Number(k.kuota) > 0 && Number(k.terisi) >= Number(k.kuota)); });
    return open ? "Daftar sekarang" : "Kuota penuh";
  }

  function renderHeader(data) {
    const reg = document.getElementById("navReg");
    if (!reg) return;
    const open = isOpen(data);
    reg.textContent = open ? "Daftar" : "Pendaftaran ditutup";
    reg.setAttribute("href", "register.html");
    reg.className = "btn sm " + (open ? "" : "ghost");
  }

  function renderHero(data, els) {
    const s = data.settings;
    const logo = CORE.mediaUrl(s.logo);
    document.querySelectorAll("[data-logo]").forEach(function (img) { if (logo) img.src = logo; });
    document.querySelectorAll("[data-event-name]").forEach(function (el) { el.textContent = s.nama_event; });
    document.querySelectorAll("[data-sekolah]").forEach(function (el) { el.textContent = s.sekolah; });
    const tema = document.getElementById("heroTema");
    if (tema) tema.textContent = "“" + s.tema + "”";
    const desc = document.getElementById("heroDesc");
    if (desc) desc.textContent = s.deskripsi;
    const badge = document.getElementById("regBadge");
    if (badge) {
      if (isOpen(data)) {
        badge.className = "badge ok";
        badge.style.fontSize = "14px";
        badge.style.padding = "8px 14px";
        badge.textContent = "Pendaftaran dibuka " + CORE.fmtDateTime(s.pendaftaran_buka) + " – " + CORE.fmtDateTime(s.pendaftaran_tutup) + ".";
      } else {
        badge.className = "badge bad";
        badge.style.fontSize = "14px";
        badge.style.padding = "8px 14px";
        badge.textContent = "Pendaftaran sudah ditutup pada " + CORE.fmtDateTime(s.pendaftaran_tutup) + ".";
      }
    }
    const label = document.getElementById("cdLabel");
    if (label) label.textContent = "Event dimulai " + CORE.fmtDateTime(s.event_mulai);
    initCountdown(s.event_mulai);
  }

  function initCountdown(iso) {
    const el = document.getElementById("cd");
    if (!el) return;
    const target = CORE.toDate(iso);
    if (!target) return;
    const pad = function (n) { return String(n).padStart(2, "0"); };
    const set = function (id, val) {
      const node = document.getElementById(id);
      if (node) node.textContent = val;
    };
    function tick() {
      const diff = target.getTime() - Date.now();
      if (diff <= 0) {
        el.innerHTML = '<div class="cd-lbl cd-go">🎉 Event telah dimulai!</div>';
        return;
      }
      set("cd-d", Math.floor(diff / 86400000));
      set("cd-h", pad(Math.floor((diff % 86400000) / 3600000)));
      set("cd-m", pad(Math.floor((diff % 3600000) / 60000)));
      set("cd-s", pad(Math.floor((diff % 60000) / 1000)));
      setTimeout(tick, 1000 - (Date.now() % 1000));
    }
    tick();
  }

  function renderInfoStrip(data) {
    const el = document.getElementById("infoStrip");
    if (!el) return;
    const s = data.settings;
    const ditutup = !isOpen(data);
    el.innerHTML =
      '<div><small>Pendaftaran</small><b>' + CORE.esc(CORE.fmtDateTime(s.pendaftaran_buka)) + " – " + CORE.esc(CORE.fmtDateTime(s.pendaftaran_tutup)) + "</b>" +
      '<span class="badge ' + (ditutup ? "bad" : "ok") + '">' + (ditutup ? "Ditutup" : "Dibuka") + "</span></div>" +
      '<div><small>Technical Meeting</small><b>' + CORE.esc(CORE.fmtDateTime(s.technical_meeting)) + "</b></div>" +
      '<div><small>Event dimulai</small><b>' + CORE.esc(CORE.fmtDateTime(s.event_mulai)) + "</b></div>" +
      '<div><small>Lokasi</small><b>' + CORE.esc(s.alamat) + "</b></div>";
  }

  function renderTimeline(data) {
    const el = document.getElementById("timelineList");
    if (!el) return;
    el.innerHTML = data.timeline.map(function (t) {
      const d = CORE.fmtDayParts(t.tanggal);
      const selesai = String(t.status || "").toLowerCase() === "selesai";
      const badge = t.status ? ' <span class="badge ' + (selesai ? "ok" : "warn") + '">' + CORE.esc(t.status) + "</span>" : "";
      return '<li class="rg-i' + (selesai ? " done" : "") + '">' +
        '<div class="rg-d"><small>' + CORE.esc(d.hari) + "</small><b>" + CORE.esc(d.tgl) + "</b><span>" + CORE.esc(d.bulan) + "</span></div>" +
        '<div class="rg-b"><h3>' + CORE.esc(t.judul) + badge + "</h3>" +
        '<p class="rg-t">' + CORE.esc(t.waktu) + "</p><p>" + CORE.esc(t.deskripsi) + "</p></div></li>";
    }).join("");
  }

  function renderLombaGrid(data) {
    const el = document.getElementById("lombaGrid");
    if (!el) return;
    el.innerHTML = data.lomba.filter(function (l) { return Number(l.aktif) !== 0; }).map(function (l) {
      const kats = (l.kategori || []).map(function (k) {
        const kuota = Number(k.kuota) > 0
          ? ' <small style="color:var(--soft)">· ' + Number(k.terisi) + "/" + Number(k.kuota) + " terisi</small>"
          : "";
        const badge = isOpen(data) && Number(l.aktif) !== 0 ? katBadge(k) : '<span class="chip bad">Ditutup</span>';
        return '<div class="kat"><span><b>' + CORE.esc(k.nama) + "</b>" + kuota + "</span>" + badge + "</div>";
      }).join("");
      const btn = isOpen(data) && Number(l.aktif) !== 0
        ? '<a class="btn sm" href="register.html?s=' + encodeURIComponent(l.slug) + '">' + CORE.esc(lombaStatusText(l, data)) + "</a>"
        : '<span class="btn sm off" aria-disabled="true">Pendaftaran ditutup</span>';
      return '<div class="card"><h3>' + CORE.esc(l.nama) + "</h3><p>" + CORE.esc(l.deskripsi) + "</p>" +
        '<div class="meta"><span class="chip">' + CORE.esc(l.jenis) + '</span><span class="chip y">' + CORE.esc(CORE.rupiah(l.biaya)) + "</span></div>" +
        '<div class="kats">' + kats + "</div>" +
        '<a class="btn sm" href="lomba.html?s=' + encodeURIComponent(l.slug) + '">Detail & Juknis</a> ' + btn + "</div>";
    }).join("");
  }

  function badgeForMatch(status) {
    if (status === "Selesai") return '<span class="badge ok">Selesai</span>';
    if (status === "Sedang berlangsung") return '<span class="badge warn">Berlangsung</span>';
    if (status === "Batal") return '<span class="badge bad">Batal</span>';
    return '<span class="badge warn">Terjadwal</span>';
  }

  function teamSpan(data, id, right) {
    const t = CORE.timById(data, id) || { nama: id, logo: "" };
    const img = t.logo ? '<img class="tl" src="' + CORE.esc(CORE.mediaUrl(t.logo)) + '" alt="" width="34" height="34" loading="lazy">' : "";
    return right
      ? '<span class="tm r"><span>' + CORE.esc(t.nama) + "</span>" + img + "</span>"
      : '<span class="tm">' + img + "<span>" + CORE.esc(t.nama) + "</span></span>";
  }

  function matchCard(mt, data) {
    const done = mt.status === "Selesai" && mt.skor_a !== "" && mt.skor_b !== "";
    const sa = done ? Number(mt.skor_a) : null;
    const sb = done ? Number(mt.skor_b) : null;
    const aWin = done && sa > sb;
    const bWin = done && sb > sa;
    const stage = mt.babak === "Penyisihan" ? "Penyisihan Grup " + mt.grup : mt.babak;
    const score = done ? sa + " : " + sb : "vs";
    return '<div class="match"><div class="mh"><span class="mi">' + CORE.esc(stage) + " · Game " + CORE.esc(mt.game) + "</span>" +
      '<span class="mw">' + CORE.esc(CORE.fmtDate(mt.tanggal)) + (mt.waktu ? ", " + CORE.esc(mt.waktu) : "") +
      (mt.tempat ? " · " + CORE.esc(mt.tempat) : "") + " " + badgeForMatch(mt.status) + "</span></div>" +
      '<div class="ta' + (aWin ? " win" : "") + '">' + teamSpan(data, mt.tim_a, false) + '<b class="pt">' + (done ? sa : "–") + "</b></div>" +
      '<div class="sc">' + score + "</div>" +
      '<div class="tb' + (bWin ? " win" : "") + '">' + teamSpan(data, mt.tim_b, true) + '<b class="pt">' + (done ? sb : "–") + "</b></div></div>";
  }

  function standingsTable(group) {
    if (!group || !group.rows.length) return "";
    const rows = group.rows.map(function (r) {
      return '<tr class="sr' + (r.qualified ? " q" : "") + '"><td class="n rk">' + r.rank + "</td>" +
        '<td class="tmc"><span class="tm">' + (r.logo ? '<img class="tl" src="' + CORE.esc(CORE.mediaUrl(r.logo)) + '" alt="" width="28" height="28" loading="lazy">' : "") +
        "<span>" + CORE.esc(r.nama) + "</span></span></td>" +
        '<td class="n" data-label="Main">' + r.main + '</td><td class="n" data-label="M">' + r.m + '</td><td class="n" data-label="K">' + r.k + "</td>" +
        '<td class="n" data-label="PF">' + r.pf + '</td><td class="n" data-label="PA">' + r.pa + '</td><td class="n" data-label="Selisih">' + r.selisih + "</td>" +
        '<td class="n pts" data-label="Poin"><b>' + r.poin + "</b></td></tr>";
    }).join("");
    return '<table class="st"><tr class="sth"><th class="n">#</th><th>Tim</th><th class="n">Main</th><th class="n">M</th><th class="n">K</th><th class="n">PF</th><th class="n">PA</th><th class="n">Selisih</th><th class="n">Poin</th></tr>' + rows + "</table>";
  }

  const HELP_STANDINGS = "Babak penyisihan, setengah kompetisi. Poin: menang 2, kalah 1. Bila poin sama: 2 tim → head-to-head; lebih dari 2 tim → selisih poin, lalu poin dibuat. Juara & runner-up tiap grup (ditandai) lolos ke Semi Final.";

  function renderBasketHome(data) {
    const el = document.getElementById("basketWrap");
    if (!el) return;
    const html = ["Putra", "Putri"].map(function (cat) {
      const final = data.pertandingan.filter(function (m) { return m.kategori === cat && m.babak === "Final"; }).slice(-1)[0];
      const groups = (data.klasemen[cat] || []);
      return "<h3 style=\"margin:20px 0 10px\">" + cat + "</h3>" +
        '<div class="tw mlist" style="background:#fff">' + (final ? matchCard(final, data) : '<div class="match"><div class="mh"><span class="mi">Final</span></div></div>') + "</div>" +
        '<h4 style="margin:18px 0 8px">Klasemen penyisihan</h4>' +
        groups.map(function (g) {
          return '<h4 style="margin:14px 0 8px">Grup ' + CORE.esc(g.nama) + '</h4><div class="tw stw">' + standingsTable(g) + "</div>" +
            '<p class="help">' + HELP_STANDINGS + "</p>";
        }).join("");
    }).join("");
    el.innerHTML = html + '<p><a class="btn sm ghost" href="lomba.html?s=bola-basket#pertandingan">Semua jadwal & hasil</a></p>';
  }

  function juaraGroups(data) {
    const groups = [];
    data.lomba.forEach(function (l) {
      const rows = data.juara.filter(function (j) { return j.lomba_id === l.id; });
      if (rows.length) groups.push({ lomba: l, rows: rows.slice().sort(function (a, b) { return Number(a.peringkat) - Number(b.peringkat); }) });
    });
    return groups;
  }

  function podium(rows) {
    return '<div class="podium">' + rows.map(function (j) {
      return '<div class="card"><div class="medal">' + CORE.medal(Number(j.peringkat)) + "</div><h3>" + CORE.esc(j.nama) + "</h3><p>" + CORE.esc(j.sekolah) + "</p></div>";
    }).join("") + "</div>";
  }

  function renderJuara(targetId, data) {
    const el = document.getElementById(targetId);
    if (!el) return;
    const groups = juaraGroups(data);
    if (!groups.length) {
      el.innerHTML = '<div class="card"><p>Juara akan diumumkan setelah pertandingan selesai.</p></div>';
      return;
    }
    el.innerHTML = groups.map(function (g) {
      return '<h3 style="margin:18px 0 12px">' + CORE.esc(g.lomba.nama) + (g.lomba.kategori && g.lomba.kategori.length > 1 ? "" : "") + "</h3>" + podium(g.rows);
    }).join("");
  }

  function renderSponsorContacts(data) {
    const el = document.getElementById("cpSponsor");
    if (!el) return;
    const kontak = data.kontak.filter(function (k) { return k.tipe !== "lomba"; });
    el.innerHTML = kontak.map(function (k) {
      return '<a class="cp-i" href="' + CORE.esc(CORE.waLink(k.wa, "Halo, saya ingin menanyakan sponsorship " + data.settings.nama_event + ".")) + '" target="_blank" rel="noopener">' +
        '<span class="cp-ic">☎</span><span><b>' + CORE.esc(k.nama) + "</b><small>" + CORE.esc(k.jabatan || "") + "</small>" +
        "<em>" + CORE.esc(CORE.waPretty(k.wa)) + " · chat WhatsApp</em></span></a>";
    }).join("");
  }

  function initChrome() {
    const btn = document.getElementById("navBtn");
    const nav = document.getElementById("nv");
    const ov = document.getElementById("navOv");
    if (btn && nav) {
      const set = function (open) {
        nav.classList.toggle("open", open);
        document.body.classList.toggle("nav-open", open);
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        btn.textContent = open ? "✕" : "☰";
      };
      btn.addEventListener("click", function () { set(!nav.classList.contains("open")); });
      if (ov) ov.addEventListener("click", function () { set(false); });
      nav.addEventListener("click", function (e) { if (e.target.closest("a")) set(false); });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") set(false); });
      window.addEventListener("resize", function () { if (window.innerWidth > 820) set(false); });
    }
    const top = document.getElementById("toTop");
    if (top) {
      const on = function () { top.classList.toggle("show", (window.pageYOffset || 0) > 400); };
      window.addEventListener("scroll", on, { passive: true });
      on();
      top.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
    }
    const y = document.getElementById("year");
    if (y) y.textContent = new Date().getFullYear();
  }

  document.addEventListener("DOMContentLoaded", initChrome);

  return {
    loadData: loadData, isOpen: isOpen, renderHeader: renderHeader, renderHero: renderHero,
    renderInfoStrip: renderInfoStrip, renderTimeline: renderTimeline, renderLombaGrid: renderLombaGrid,
    renderBasketHome: renderBasketHome, renderJuara: renderJuara, renderSponsorContacts: renderSponsorContacts,
    juaraGroups: juaraGroups, podium: podium, matchCard: matchCard, standingsTable: standingsTable,
    katBadge: katBadge, HELP_STANDINGS: HELP_STANDINGS, badgeForMatch: badgeForMatch
  };
})();
