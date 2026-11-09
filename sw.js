/* Service worker de TECNOVARA. Si cambias archivos importantes, sube el número de versión. */
const V = "tecnovara-v4";
const PRE = [
  "/", "/cursos/", "/clase/", "/prueba/",
  "/cursodecanva/", "/cursodecanva/logrado/",
  "/cursodecanva/parte2/", "/cursodecanva/parte2/logrado/",
  "/cursodegmail/", "/cursodegmail/logrado/",
  "/cursodegmail/parte2/", "/cursodegmail/parte2/logrado/",
  "/cursodegoogleforms/", "/cursodegoogleforms/logrado/",
  "/favicon.ico", "/assets/icon-192.png", "/assets/icon-512.png",
  "/assets/Canva.png", "/assets/Canva1.png", "/assets/Canva2.png",
  "/assets/CanvaPanel.png", "/assets/CanvaTama%C3%B1o.png", "/assets/CanvaColor.png", "/assets/CanvaCreado.png",
  "/assets/Gmail1.png", "/assets/Gmail2.png", "/assets/Gmail3.png", "/assets/Gmail4.png",
  "/assets/Canva_2_1.png", "/assets/Canva_2_2.png", "/assets/Canva_2_3.png",
  "/assets/GmailP2.png", "/assets/GmailP3.png",
  "/assets/GoogleForms.png", "/assets/GoogleForms1.png", "/assets/GoogleForms2.png",
  "/assets/GoogleForms3.png", "/assets/GoogleForms4.png", "/assets/GoogleForms5.png",
  "/assets/Correct.mp3"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(V)
      .then(function (c) { return Promise.allSettled(PRE.map(function (u) { return c.add(u); })); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.clients.claim(); })
  );
});

function guardar(req, res) {
  if (res && res.ok && !res.redirected) {
    var cp = res.clone();
    caches.open(V).then(function (c) { c.put(req, cp); });
  }
  return res;
}

self.addEventListener("fetch", function (e) {
  var r = e.request;
  if (r.method !== "GET" || r.headers.has("range")) return;
  var u = new URL(r.url);
  if (u.origin !== location.origin) return; /* no tocar Firebase, fuentes, etc. */

  /* /prueba/curso/ID no es un archivo: se sirve la página /prueba/, que lee la dirección */
  if (r.mode === "navigate" && /^\/prueba\/[^\/]+\/[^\/]+\/?$/.test(u.pathname)) {
    e.respondWith(
      fetch("/prueba/").then(function (res) { return guardar(new Request("/prueba/"), res); })
        .catch(function () { return caches.match("/prueba/"); })
    );
    return;
  }

  /* Páginas y config.js: primero la red; si no hay internet, la copia guardada */
  if (r.mode === "navigate" || u.pathname.endsWith("config.js")) {
    e.respondWith(
      fetch(r).then(function (res) { return guardar(r, res); })
        .catch(function () { return caches.match(r).then(function (m) { return m || caches.match("/"); }); })
    );
    return;
  }

  /* Imágenes y demás: copia guardada primero y se actualiza en segundo plano */
  e.respondWith(
    caches.match(r).then(function (m) {
      var red = fetch(r).then(function (res) { return guardar(r, res); }).catch(function () { return m; });
      return m || red;
    })
  );
});
