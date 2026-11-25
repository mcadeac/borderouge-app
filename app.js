/* App Borderouge — accès aux Google Sheets (Apps Script), code restaurant, bouton Accueil.
 * Les adresses des scripts sont dans config.js. Aucune donnée n'est stockée ici ni sur GitHub. */
(function () {
  var CLE = 'br_code';

  function code() { try { return localStorage.getItem(CLE) || ''; } catch (e) { return ''; } }
  function setCode(c) { try { localStorage.setItem(CLE, c); } catch (e) {} }

  var attente = null; // une seule fenêtre de code à la fois, partagée par tous les appels
  function demanderCode(msg) {
    if (attente) return attente;
    attente = new Promise(function (ok) {
      var old = document.getElementById('br-code'); if (old) old.remove();
      var w = document.createElement('div'); w.id = 'br-code';
      w.innerHTML = '<form><img src="logo.png" alt="KFC"><b>Code restaurant</b><p></p>' +
        '<input type="password" inputmode="text" autocomplete="off" aria-label="Code restaurant">' +
        '<button type="submit">Valider</button></form>';
      w.querySelector('p').textContent = msg || 'À taper une seule fois sur cette tablette.';
      document.body.appendChild(w);
      var i = w.querySelector('input'); setTimeout(function () { i.focus(); }, 50);
      w.querySelector('form').onsubmit = function (e) {
        e.preventDefault();
        if (!i.value.trim()) return;
        setCode(i.value.trim()); w.remove(); attente = null; ok();
      };
    });
    return attente;
  }

  function appel(app, fn, arg) {
    var url = (window.BR_CONFIG || {})[app];
    if (!url) return Promise.reject(new Error('Adresse du script « ' + app + ' » pas encore renseignée (config.js)'));
    var go = function () {
      return fetch(url, { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ fn: fn, arg: arg === undefined ? null : arg, key: code() }) })
        .then(function (r) { if (!r.ok) throw new Error('Réseau : ' + r.status); return r.json(); })
        .then(function (j) {
          if (j.ok) return j.data;
          if (/^CODE:/.test(j.error)) { var e = new Error('code'); e.code = true; throw e; }
          throw new Error(j.error || 'Erreur');
        });
    };
    var essai = function () {
      return (code() ? Promise.resolve() : demanderCode()).then(go).catch(function (e) {
        if (e.code) { setCode(''); return demanderCode('Code incorrect, réessaie.').then(essai); }
        if (e instanceof TypeError) throw new Error('Pas de connexion internet');
        throw e;
      });
    };
    return essai();
  }

  // Lecture avec cache : renvoie tout de suite la dernière copie connue (si elle existe),
  // puis appelle frais(data) quand le Google Sheet a répondu.
  function charge(app, fn, premier, frais) {
    var k = 'br_cache_' + app + '_' + fn, c = null;
    try { c = JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) {}
    if (c) premier(c);
    return appel(app, fn).then(function (d) {
      try { localStorage.setItem(k, JSON.stringify(d)); } catch (e) {}
      (c ? (frais || premier) : premier)(d);
      return d;
    });
  }

  function majCache(app, fn, d) { try { localStorage.setItem('br_cache_' + app + '_' + fn, JSON.stringify(d)); } catch (e) {} }

  window.BR = { srv: appel, charge: charge, majCache: majCache, oublierCode: function () { setCode(''); } };

  // Bouton « Accueil » dans l'en-tête des pages
  document.addEventListener('DOMContentLoaded', function () {
    if (!document.body.dataset.app) return;
    var h = document.querySelector('header');
    if (!h) return;
    var a = document.createElement('a'); a.href = './'; a.className = 'br-home'; a.setAttribute('aria-label', 'Accueil'); a.textContent = '‹';
    h.insertBefore(a, h.firstChild);
  });

  if ('serviceWorker' in navigator) window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
})();
