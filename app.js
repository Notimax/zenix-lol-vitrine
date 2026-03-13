(() => {
  const fallbackUrl = String(window.ZENIX_ACTIVE_URL || "https://zenix.best").trim();
  const fallbackUpdated = String(window.ZENIX_LAST_UPDATED || "").trim();
  const urlEl = document.getElementById("activeUrl");
  const oldEl = document.getElementById("previousUrl");
  const btn = document.getElementById("activeBtn");
  const status = document.getElementById("lastUpdated");

  function applyData(payload) {
    const current = String(payload?.currentUrl || fallbackUrl || "https://zenix.best").trim();
    const previous = String(payload?.previousUrl || "").trim();
    const updatedAt = Number(payload?.updatedAt || 0);
    if (urlEl) {
      urlEl.textContent = current;
    }
    if (btn) {
      btn.href = current;
    }
    if (oldEl) {
      const showPrevious = previous && previous !== current;
      oldEl.hidden = !showPrevious;
      if (showPrevious) {
        oldEl.textContent = previous;
      }
    }
    if (status) {
      if (updatedAt) {
        const label = new Date(updatedAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
        status.textContent = "Lien verifie ? " + label;
      } else {
        status.textContent = fallbackUpdated ? "Lien verifie ? " + fallbackUpdated : "Lien verifie";
      }
    }
  }

  fetch("https://zenix.best/api/backup-config", { cache: "no-store" })
    .then((res) => (res.ok ? res.json() : null))
    .then((payload) => {
      if (payload && payload.data) {
        applyData(payload.data);
        return;
      }
      applyData(null);
    })
    .catch(() => {
      applyData(null);
    });
})();
