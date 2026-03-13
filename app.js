(() => {
  const url = String(window.ZENIX_ACTIVE_URL || "https://zenix.best").trim();
  const updated = String(window.ZENIX_LAST_UPDATED || "").trim();
  const urlEl = document.getElementById("activeUrl");
  const btn = document.getElementById("activeBtn");
  const status = document.getElementById("lastUpdated");

  if (urlEl) {
    urlEl.textContent = url;
  }
  if (btn) {
    btn.href = url;
  }
  if (status) {
    status.textContent = updated ? `Lien verifie · ${updated}` : "Lien verifie";
  }
})();
