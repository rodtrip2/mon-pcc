/* Capte au plus tôt l'autorisation d'installation (Android), avant le chargement de l'application. */
window.addEventListener('beforeinstallprompt', function (e) {
  e.preventDefault();
  window.__pccInstall = e;
  window.dispatchEvent(new Event('pcc-installable'));
});
