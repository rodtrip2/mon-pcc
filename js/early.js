/* Capte au plus tôt l'autorisation d'installation (Android), avant le chargement de l'application.
   Choisit aussi tout de suite la langue de la page et du manifeste (installation en anglais ou en français). */
(function () {
  var lang = null;
  try { lang = localStorage.getItem('monpcc.lang'); } catch (e) { /* stockage indisponible */ }
  if (lang !== 'fr' && lang !== 'en') {
    lang = 'fr';
    var ls = navigator.languages || [navigator.language || ''];
    for (var i = 0; i < ls.length; i++) {
      var c = String(ls[i] || '').slice(0, 2).toLowerCase();
      if (c === 'fr' || c === 'en') { lang = c; break; }
    }
  }
  document.documentElement.lang = lang;
  if (lang === 'en') {
    var m = document.querySelector('link[rel="manifest"]');
    if (m) m.setAttribute('href', 'manifest-en.webmanifest');
  }
})();

window.addEventListener('beforeinstallprompt', function (e) {
  e.preventDefault();
  window.__pccInstall = e;
  window.dispatchEvent(new Event('pcc-installable'));
});
