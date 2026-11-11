/*
  Valoraciones con estrellas de TECNOVARA.
  Uso en cualquier página:
    <div data-rating="canva"></div>                    estrellas para votar + promedio
    <div data-rating="canva" data-readonly="1"></div>  solo muestra el promedio

  Se muestra así:   4,5 estrellas | 31 votos   + 5 estrellas (las llenas usan Star.png y las vacías StarNoColor.png)

  Si hay una base de datos configurada en /clase/config.js, los votos se comparten entre
  todas las personas. Si no, funciona en "modo de prueba" y guarda solo en este navegador.
*/
(function () {
  "use strict";
  var els = document.querySelectorAll("[data-rating]");
  if (!els.length) return;

  /* Imágenes de las estrellas: si cambias los nombres o la carpeta, edítalos aquí */
  var IMG_LLENA = "/assets/Star.png";
  var IMG_VACIA = "/assets/StarNoColor.png";
  var MIN_VOTOS = 5; /* con menos votos no se declaran valoraciones a Google */

  var css =
    ".rt{font-size:16px;line-height:1.4}" +
    ".rt-avg{display:flex;align-items:center;gap:10px;flex-wrap:wrap;color:var(--mut,#555);font-size:15px}" +
    ".rt-avg b{color:var(--ink,#111)}" +
    ".rt-row{display:inline-flex;align-items:center;gap:3px}" +
    ".rt-i{display:block;object-fit:contain}" +
    ".rt-x{display:block;line-height:1;color:var(--line,#ccc)}" +
    ".rt-x.on{color:#f5a623}" +
    ".rt-vota{margin-top:10px;font-size:14px;color:var(--mut,#555)}" +
    ".rt-in{display:flex;gap:4px;margin-top:4px}" +
    ".rt-b{background:none;border:0;padding:2px;cursor:pointer;border-radius:6px}" +
    ".rt-b:focus-visible{outline:3px solid #ffc93c;outline-offset:2px}" +
    ".rt-msg{font-size:15px;color:var(--ok,#0f8a5f);min-height:1.4em;font-weight:600;margin-top:4px}" +
    ".valora{margin-top:12px}";
  var sty = document.createElement("style");
  sty.textContent = css;
  document.head.appendChild(sty);

  var CFG = "";
  var usarTexto = false; /* se activa si una imagen no carga: se usan estrellas de texto */

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
      if (!r.ok) {
        try { console.warn("[TECNOVARA] No se pudieron leer las valoraciones (código " + r.status + "). Si es 401, revisa las reglas de Firebase: falta permitir lectura en \"valoraciones\"."); } catch (e) {}
        throw new Error(r.status);
      }
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

  /* ---------- estrellas (imágenes PNG, con respaldo de texto) ---------- */
  function estrella(llena, px) {
    if (usarTexto) return '<span class="rt-x' + (llena ? " on" : "") + '" style="font-size:' + px + 'px;width:' + px + 'px" aria-hidden="true">\u2605</span>';
    return '<img class="rt-i" src="' + (llena ? IMG_LLENA : IMG_VACIA) + '" alt="" width="' + px + '" height="' + px + '" decoding="async">';
  }
  function vigilar(root) {
    Array.prototype.forEach.call(root.querySelectorAll("img.rt-i"), function (im) {
      im.addEventListener("error", function () {
        var llena = im.getAttribute("src") === IMG_LLENA, px = im.getAttribute("width") || 18;
        if (!usarTexto) {
          usarTexto = true;
          try { console.warn("[TECNOVARA] No se pudo cargar la imagen de la estrella (" + im.getAttribute("src") + "). Revisa que exista en la carpeta assets con ese nombre exacto, respetando mayúsculas."); } catch (e) {}
        }
        var t = document.createElement("span");
        t.className = "rt-x" + (llena ? " on" : "");
        t.style.fontSize = px + "px";
        t.style.width = px + "px";
        t.setAttribute("aria-hidden", "true");
        t.textContent = "\u2605";
        if (im.parentNode) im.parentNode.replaceChild(t, im);
      });
    });
  }
  function fila(llenas, px) {
    var h = '<span class="rt-row" aria-hidden="true">';
    for (var i = 1; i <= 5; i++) h += estrella(i <= llenas, px);
    return h + "</span>";
  }

  function formato(avg) {
    var s = avg.toFixed(1).replace(".", ",");
    return s.replace(/,0$/, "");
  }
  /* "4,5 estrellas | 31 votos" + estrellas (se cuentan las estrellas completas: 4,5 → 4) */
  function promedioHTML(r) {
    if (!r.n) return '<div class="rt-avg" aria-label="Sin votos todavía"><span>Sin votos todavía</span>' + fila(0, 18) + "</div>";
    var txt = "<b>" + formato(r.avg) + "</b> " + (formato(r.avg) === "1" ? "estrella" : "estrellas") + " | " + r.n + (r.n === 1 ? " voto" : " votos");
    return '<div class="rt-avg" aria-label="Valoración: ' + formato(r.avg) + ' de 5 estrellas, ' + r.n + (r.n === 1 ? " voto" : " votos") + '"><span>' + txt + "</span>" + fila(Math.floor(r.avg), 18) + "</div>";
  }

  /* Agrega aggregateRating al JSON-LD del curso, solo con votos reales suficientes */
  function datosEstructurados(r) {
    if (r.n < MIN_VOTOS) return;
    var nodos = document.querySelectorAll('script[type="application/ld+json"]');
    Array.prototype.forEach.call(nodos, function (n) {
      try {
        var d = JSON.parse(n.textContent);
        if (d && d["@type"] === "Course") {
          d.aggregateRating = { "@type": "AggregateRating", ratingValue: r.avg.toFixed(1), bestRating: "5", worstRating: "1", ratingCount: r.n };
          n.textContent = JSON.stringify(d);
        }
      } catch (e) {}
    });
  }

  function montar(el) {
    var id = el.getAttribute("data-rating"), solo = el.getAttribute("data-readonly") === "1";
    if (!/^[a-z0-9-]+$/i.test(id)) return;
    el.classList.add("rt");

    function pintar(r) {
      if (solo) { el.innerHTML = promedioHTML(r); vigilar(el); return; }
      var h = promedioHTML(r) + '<div class="rt-vota" id="rtv-' + id + '">Tu valoración:</div><div class="rt-in" role="group" aria-labelledby="rtv-' + id + '">';
      for (var i = 1; i <= 5; i++) {
        h += '<button type="button" class="rt-b' + (i <= r.mine ? " on" : "") + '" data-n="' + i + '" aria-label="Calificar con ' + i + (i === 1 ? " estrella" : " estrellas") + '" aria-pressed="' + (i === r.mine) + '">' + estrella(i <= r.mine, 30) + "</button>";
      }
      h += '</div><div class="rt-msg" role="status" aria-live="polite"></div>';
      el.innerHTML = h;
      vigilar(el);
      var bs = el.querySelectorAll(".rt-b");
      function resaltar(n) {
        Array.prototype.forEach.call(bs, function (b, k) {
          b.classList.toggle("on", k < n);
          b.innerHTML = estrella(k < n, 30);
          vigilar(b);
        });
      }
      Array.prototype.forEach.call(bs, function (b) {
        b.addEventListener("mouseenter", function () { resaltar(+b.getAttribute("data-n")); });
        b.addEventListener("focus", function () { resaltar(+b.getAttribute("data-n")); });
        b.addEventListener("click", function () {
          var n = +b.getAttribute("data-n");
          votar(id, n).then(function () {
            return leer(id).then(function (o) {
              var rr = resumen(o); rr.mine = n; pintar(rr);
              el.querySelector(".rt-msg").textContent = "¡Gracias por tu valoración!";
              if (el.getAttribute("data-schema") === "1") datosEstructurados(rr);
            });
          }).catch(function () {
            var m = el.querySelector(".rt-msg");
            m.textContent = "No se pudo guardar tu voto. Inténtalo de nuevo.";
            m.style.color = "var(--bad,#c0392b)";
          });
        });
      });
      el.querySelector(".rt-in").addEventListener("mouseleave", function () { resaltar(r.mine); });
    }

    leer(id).then(function (o) {
      var r = resumen(o);
      pintar(r);
      if (el.getAttribute("data-schema") === "1") datosEstructurados(r);
    }).catch(function () {
      if (solo) { el.innerHTML = ""; return; }
      pintar({ n: 0, avg: 0, mine: 0 });
      var m = el.querySelector(".rt-msg");
      if (m) { m.textContent = "Por ahora no podemos mostrar el promedio."; m.style.color = "var(--mut,#555)"; }
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
