(function () {
  "use strict";
  var els = document.querySelectorAll("[data-rating]");
  if (!els.length) return;

  var css =
    ".rt{font-size:16px;line-height:1.4}" +
    ".rt-in{display:flex;gap:4px}" +
    ".rt-b{width:34px;height:34px;padding:0;border:0;cursor:pointer;background:url(/assets/StarNoColor.png) center/contain no-repeat}" +
    ".rt-b.on{background-image:url(/assets/Star.png)}" +
    ".rt-b:focus-visible{outline:3px solid #ffc93c;outline-offset:2px;border-radius:6px}" +
    ".rt-avg{display:flex;align-items:center;gap:8px;flex-wrap:wrap;color:var(--mut,#555);font-size:15px}" +
    ".rt-st{position:relative;display:inline-block;width:90px;height:18px;background:url(/assets/StarNoColor.png) left center/18px 18px repeat-x}" +
    ".rt-fill{position:absolute;left:0;top:0;height:100%;background:url(/assets/Star.png) left center/18px 18px repeat-x}" +
    ".rt-msg{font-size:15px;color:var(--ok,#0f8a5f);min-height:1.4em;font-weight:600}" +
    ".valora{margin-top:12px}";
  var sty = document.createElement("style");
  sty.textContent = css;
  document.head.appendChild(sty);

  var CFG = "";

  function gen(n) {
    var a = "abcdefghijklmnopqrstuvwxyz0123456789", b = new Uint8Array(n), o = "";
    try { crypto.getRandomValues(b); } catch (e) { for (var i = 0; i < n; i++) b[i] = Math.floor(Math.random() * 256); }
    for (var j = 0; j < n; j++) o += a[b[j] % 36];
    return o;
  }
  function uid() {
    try {
      var u = localStorage.getItem("tecnovara-uid");
      if (!u) { u = gen(12); localStorage.setItem("tecnovara-uid", u); }
      return u;
    } catch (e) { return "anon" + gen(8); }
  }
  function demoLeer() { try { return JSON.parse(localStorage.getItem("tvvalor") || "{}") || {}; } catch (e) { return {}; } }

  /* ---------- datos ---------- */
  function leer(id) {
    if (!CFG) return Promise.resolve(demoLeer()[id] || null);
    return fetch(CFG + "/valoraciones/" + id + ".json").then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    });
  }
  function votar(id, n) {
    if (!CFG) {
      var d = demoLeer();
      d[id] = d[id] || {};
      d[id][uid()] = n;
      try { localStorage.setItem("tvvalor", JSON.stringify(d)); } catch (e) {}
      return Promise.resolve();
    }
    return fetch(CFG + "/valoraciones/" + id + "/" + uid() + ".json", { method: "PUT", body: JSON.stringify(n) })
      .then(function (r) { if (!r.ok) throw new Error(r.status); });
  }
  function resumen(o) {
    var v = o ? Object.keys(o).map(function (k) { return +o[k]; }).filter(function (n) { return n >= 1 && n <= 5; }) : [];
    var s = v.reduce(function (a, b) { return a + b; }, 0);
    return { n: v.length, avg: v.length ? s / v.length : 0, mine: o && o[uid()] ? +o[uid()] : 0 };
  }

  /* ---------- pantalla ---------- */
  function promedioHTML(r) {
    if (!r.n) return '<div class="rt-avg"><span>Sin valoraciones todavía</span></div>';
    var pct = Math.round(r.avg / 5 * 100);
    return '<div class="rt-avg"><span class="rt-st" aria-hidden="true"><span class="rt-fill" style="width:' + pct + '%"></span></span>' +
      '<span>' + r.avg.toFixed(1).replace(".", ",") + ' de 5 · ' + r.n + (r.n === 1 ? " valoración" : " valoraciones") + "</span></div>";
  }

  function montar(el) {
    var id = el.getAttribute("data-rating"), solo = el.getAttribute("data-readonly") === "1";
    if (!/^[a-z0-9-]+$/i.test(id)) return;
    el.classList.add("rt");

    function pintar(r) {
      if (solo) { el.innerHTML = promedioHTML(r); return; }
      var h = '<div class="rt-in" role="group" aria-label="Tu valoración del curso">';
      for (var i = 1; i <= 5; i++) {
        h += '<button type="button" class="rt-b' + (i <= r.mine ? " on" : "") + '" data-n="' + i + '" aria-label="Calificar con ' + i + (i === 1 ? " estrella" : " estrellas") + '" aria-pressed="' + (i === r.mine) + '"></button>';
      }
      h += "</div>" + promedioHTML(r) + '<div class="rt-msg" role="status" aria-live="polite"></div>';
      el.innerHTML = h;
      var bs = el.querySelectorAll(".rt-b");
      function resaltar(n) { Array.prototype.forEach.call(bs, function (b, k) { b.classList.toggle("on", k < n); }); }
      Array.prototype.forEach.call(bs, function (b) {
        b.addEventListener("mouseenter", function () { resaltar(+b.getAttribute("data-n")); });
        b.addEventListener("focus", function () { resaltar(+b.getAttribute("data-n")); });
        b.addEventListener("click", function () {
          var n = +b.getAttribute("data-n");
          votar(id, n).then(function () {
            return leer(id).then(function (o) {
              var rr = resumen(o); rr.mine = n; pintar(rr);
              el.querySelector(".rt-msg").textContent = "¡Gracias por tu valoración!";
            });
          }).catch(function () { el.querySelector(".rt-msg").textContent = "No se pudo guardar tu voto. Inténtalo de nuevo."; el.querySelector(".rt-msg").style.color = "var(--bad,#c0392b)"; });
        });
      });
      el.querySelector(".rt-in").addEventListener("mouseleave", function () { resaltar(r.mine); });
    }

    leer(id).then(function (o) { pintar(resumen(o)); }).catch(function () {
      el.innerHTML = '<div class="rt-avg"><span>No se pudieron cargar las valoraciones</span></div>';
    });
  }

  function iniciar() {
    CFG = String(window.TECNOVARA_DB || "").replace(/\/$/, "");
    Array.prototype.forEach.call(els, montar);
  }

  /* La dirección de la base de datos se toma de /clase/config.js */
  if (typeof window.TECNOVARA_DB === "undefined") {
    var s = document.createElement("script");
    s.src = "/clase/config.js";
    s.onload = iniciar;
    s.onerror = iniciar;
    document.head.appendChild(s);
  } else iniciar();
})();
