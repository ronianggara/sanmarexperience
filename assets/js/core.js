/* Util bersama untuk halaman publik & admin */
window.CORE = (function () {
  const TZ = "Asia/Jakarta";

  function esc(value) {
    return String(value === undefined || value === null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function toDate(value) {
    if (!value) return null;
    let d;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) d = new Date(value + "T00:00:00+07:00");
    else d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  function fmtDateTime(value) {
    const d = toDate(value);
    if (!d) return value ? String(value) : "";
    const s = new Intl.DateTimeFormat("id-ID", {
      timeZone: TZ, day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    }).format(d);
    return s.replace(/\u00a0/g, " ") + " WIB";
  }

  function fmtDate(value) {
    const d = toDate(value);
    if (!d) return value ? String(value) : "";
    return new Intl.DateTimeFormat("id-ID", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" }).format(d);
  }

  function fmtDayParts(value) {
    const d = toDate(value) || new Date();
    return {
      hari: new Intl.DateTimeFormat("id-ID", { timeZone: TZ, weekday: "short" }).format(d),
      tgl: new Intl.DateTimeFormat("id-ID", { timeZone: TZ, day: "numeric" }).format(d),
      bulan: new Intl.DateTimeFormat("id-ID", { timeZone: TZ, month: "short", year: "numeric" }).format(d)
    };
  }

  function rupiah(n) {
    const num = Number(n);
    if (!isFinite(num) || num <= 0) return "";
    return "Rp" + num.toLocaleString("id-ID");
  }

  function waLink(number, text) {
    const n = String(number || "").replace(/\D/g, "");
    return "https://wa.me/" + n + (text ? "?text=" + encodeURIComponent(text) : "");
  }

  function waPretty(number) {
    let n = String(number || "").replace(/\D/g, "");
    if (n.startsWith("62")) n = "0" + n.slice(2);
    return n.replace(/(\d{4})(?=\d)/g, "$1-").replace(/-(\d{2,4})$/, "-$1");
  }

  function list(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean);
    return String(value).split("|").map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function mediaUrl(value) {
    const v = String(value || "").trim();
    if (!v) return "";
    if (/^(https?:)?\/\//i.test(v) || v.startsWith("data:") || v.startsWith("assets/")) return v;
    return v;
  }

  function regBadge(status) {
    const map = {
      Menunggu: ["warn", "Menunggu verifikasi"],
      Disetujui: ["ok", "Disetujui"],
      Ditolak: ["bad", "Ditolak"]
    };
    const item = map[status] || ["warn", status || "-"];
    return '<span class="badge ' + item[0] + '">' + esc(item[1]) + "</span>";
  }

  function lombaById(data, id) {
    return (data.lomba || []).find(function (l) { return l.id === id; });
  }
  function lombaBySlug(data, slug) {
    return (data.lomba || []).find(function (l) { return l.slug === slug; });
  }
  function timById(data, id) {
    return (data.tim || []).find(function (t) { return t.id === id; });
  }

  function terisi(data, kat) {
    const base = Number(kat.terisi_awal) || 0;
    const count = (data.pendaftaran || []).filter(function (p) {
      return p.status === "Disetujui" && p.lomba_id === kat.lomba_id && p.kategori === kat.nama;
    }).length;
    return base + count;
  }

  function computeKlasemen(pertandingan, tim) {
    const result = {};
    ["Putra", "Putri"].forEach(function (cat) {
      const teams = (tim || []).filter(function (t) { return t.kategori === cat; });
      const groups = Array.from(new Set(teams.map(function (t) { return t.grup; }))).filter(Boolean).sort();
      result[cat] = groups.map(function (g) {
        const rows = teams.filter(function (t) { return t.grup === g; }).map(function (t) {
          return {
            tim_id: t.id, nama: t.nama, logo: t.logo, grup: g,
            main: 0, m: 0, k: 0, pf: 0, pa: 0, selisih: 0, poin: 0
          };
        });
        const byId = {};
        rows.forEach(function (r) { byId[r.tim_id] = r; });
        (pertandingan || []).forEach(function (mt) {
          if (mt.kategori !== cat || mt.babak !== "Penyisihan" || mt.grup !== g || mt.status !== "Selesai") return;
          const a = byId[mt.tim_a], b = byId[mt.tim_b];
          if (!a || !b) return;
          const sa = Number(mt.skor_a), sb = Number(mt.skor_b);
          if (!isFinite(sa) || !isFinite(sb) || mt.skor_a === "" || mt.skor_b === "") return;
          a.main++; b.main++;
          a.pf += sa; a.pa += sb; b.pf += sb; b.pa += sa;
          if (sa > sb) { a.m++; b.k++; a.poin += 2; b.poin += 1; }
          else if (sb > sa) { b.m++; a.k++; b.poin += 2; a.poin += 1; }
          else { a.poin += 1; b.poin += 1; }
        });
        rows.forEach(function (r) { r.selisih = r.pf - r.pa; });
        rows.sort(function (x, y) {
          if (y.poin !== x.poin) return y.poin - x.poin;
          if (y.selisih !== x.selisih) return y.selisih - x.selisih;
          if (y.pf !== x.pf) return y.pf - x.pf;
          return String(x.nama).localeCompare(String(y.nama));
        });
        rows.forEach(function (r, i) { r.rank = i + 1; r.qualified = i < 2; });
        return { nama: g, rows: rows };
      });
    });
    return result;
  }

  function normalize(raw) {
    const data = Object.assign({}, raw || {});
    const defaults = (window.SEED && window.SEED.settings) || {};
    data.settings = Object.assign({}, defaults, data.settings || {});
    data.timeline = (data.timeline || []).slice().sort(function (a, b) {
      return (Number(a.urutan) || 0) - (Number(b.urutan) || 0) || String(a.tanggal).localeCompare(String(b.tanggal));
    });
    const kats = data.kategori || (window.SEED && window.SEED.kategori) || [];
    data.lomba = (data.lomba || []).slice().sort(function (a, b) {
      return (Number(a.urutan) || 0) - (Number(b.urutan) || 0);
    }).map(function (l) {
      const lk = (l.kategori && l.kategori.length ? l.kategori : kats.filter(function (k) { return k.lomba_id === l.id; }))
        .slice().sort(function (a, b) { return (Number(a.urutan) || 0) - (Number(b.urutan) || 0); });
      return Object.assign({}, l, {
        kategori: lk.map(function (k) { return Object.assign({}, k, { terisi: terisi(data, k) }); })
      });
    });
    data.tim = (data.tim || []).slice().sort(function (a, b) { return String(a.nama).localeCompare(String(b.nama)); });
    data.pertandingan = (data.pertandingan || []).slice().sort(function (a, b) {
      return String(a.tanggal).localeCompare(String(b.tanggal)) || (Number(a.urutan) || 0) - (Number(b.urutan) || 0);
    });
    data.juara = (data.juara || []).slice().sort(function (a, b) { return (Number(a.peringkat) || 9) - (Number(b.peringkat) || 9); });
    data.paket = (data.paket || []).slice().sort(function (a, b) { return (Number(a.urutan) || 0) - (Number(b.urutan) || 0); });
    data.kontak = (data.kontak || []).slice().sort(function (a, b) { return (Number(a.urutan) || 0) - (Number(b.urutan) || 0); });
    data.kesan = (data.kesan || []).filter(function (k) { return !k.status || k.status === "Tampil"; });
    data.referral = (data.referral || []);
    data.pendaftaran = data.pendaftaran || [];
    data.klasemen = computeKlasemen(data.pertandingan, data.tim);
    return data;
  }

  function medal(peringkat) {
    return peringkat === 1 ? "🥇" : peringkat === 2 ? "🥈" : "🥉";
  }

  return {
    TZ: TZ, esc: esc, toDate: toDate, fmtDateTime: fmtDateTime, fmtDate: fmtDate,
    fmtDayParts: fmtDayParts, rupiah: rupiah, waLink: waLink, waPretty: waPretty,
    list: list, mediaUrl: mediaUrl, regBadge: regBadge, lombaById: lombaById,
    lombaBySlug: lombaBySlug, timById: timById, terisi: terisi,
    computeKlasemen: computeKlasemen, normalize: normalize, medal: medal
  };
})();
