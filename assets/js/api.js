(function () {
  const API_URL = ((window.SANMAR_CONFIG && window.SANMAR_CONFIG.API_URL) || "").trim();

  function qs(params) {
    return Object.keys(params)
      .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== "")
      .map((k) => encodeURIComponent(k) + "=" + encodeURIComponent(params[k]))
      .join("&");
  }

  async function get(action, params) {
    if (!API_URL) throw new Error("API belum dikonfigurasi");
    const url = API_URL + "?" + qs(Object.assign({ action: action, t: Date.now() }, params || {}));
    const res = await fetch(url, { cache: "no-store", redirect: "follow" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const json = await res.json();
    if (json && json.ok === false) throw new Error(json.error || "Terjadi kesalahan");
    return json.data !== undefined ? json.data : json;
  }

  async function post(action, payload) {
    if (!API_URL) throw new Error("API belum dikonfigurasi");
    const body = Object.assign({ action: action }, payload || {});
    const encoded = JSON.stringify(body);
    let json;
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        redirect: "follow",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: encoded
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      json = await res.json();
    } catch (err) {
      // Sebagian deployment Apps Script menolak POST cross-origin.
      // Muatan kecil dikirim ulang lewat GET (?payload=...) agar tetap berfungsi.
      if (encoded.length > 3000) throw err;
      const res2 = await fetch(API_URL + "?payload=" + encodeURIComponent(encoded) + "&t=" + Date.now(), { cache: "no-store", redirect: "follow" });
      if (!res2.ok) throw new Error("HTTP " + res2.status);
      json = await res2.json();
    }
    if (json && json.ok === false) throw new Error(json.error || "Terjadi kesalahan");
    return json.data !== undefined ? json.data : json;
  }

  window.API = { configured: !!API_URL, url: API_URL, get: get, post: post };
})();
