(() => {
  const fallbackUrl = String(window.ZENIX_ACTIVE_URL || "https://zenix.best").trim();
  const fallbackPrevious = String(window.ZENIX_PREVIOUS_URL || "").trim();
  const fallbackUpdated = String(window.ZENIX_LAST_UPDATED || "").trim();
  const rawConfigUrl = "https://raw.githubusercontent.com/Notimax/zenix-lol-vitrine/main/config.js";
  const backupApiUrl = "https://zenix.best/api/backup-config";

  const urlEl = document.getElementById("activeUrl");
  const oldEl = document.getElementById("previousUrl");
  const btn = document.getElementById("activeBtn");
  const status = document.getElementById("lastUpdated");
  const blockedUrlInline = document.getElementById("blockedUrlInline");

  function parseConfigJs(source) {
    const content = String(source || "");
    const currentMatch = content.match(/ZENIX_ACTIVE_URL\s*=\s*["']([^"']+)["']/);
    const previousMatch = content.match(/ZENIX_PREVIOUS_URL\s*=\s*["']([^"']*)["']/);
    const updatedMatch = content.match(/ZENIX_LAST_UPDATED\s*=\s*["']([^"']*)["']/);
    return {
      currentUrl: currentMatch ? String(currentMatch[1]).trim() : "",
      previousUrl: previousMatch ? String(previousMatch[1]).trim() : "",
      updatedAtLabel: updatedMatch ? String(updatedMatch[1]).trim() : "",
    };
  }

  function buildUpdatedLabel(value) {
    if (!value) {
      return "";
    }
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) {
      return new Date(numeric).toLocaleString("fr-FR");
    }
    return String(value).trim();
  }

  function render(payload) {
    const current = String(payload?.currentUrl || fallbackUrl || "https://zenix.best").trim();
    const previous = String(payload?.previousUrl || fallbackPrevious || "").trim();
    const updatedAtLabel = String(payload?.updatedAtLabel || fallbackUpdated || "").trim();

    if (urlEl) {
      urlEl.textContent = current || "Lien indisponible";
    }

    if (btn) {
      btn.href = current || "#";
      btn.setAttribute("aria-disabled", current ? "false" : "true");
    }

    if (oldEl) {
      const showPrevious = previous && previous !== current;
      oldEl.hidden = !showPrevious;
      oldEl.textContent = showPrevious ? previous : "";
    }

    if (blockedUrlInline) {
      blockedUrlInline.textContent = current || "le lien actif";
    }

    if (status) {
      status.textContent = updatedAtLabel ? `Lien verifie - ${updatedAtLabel}` : "Lien verifie";
    }
  }

  async function refreshConfig() {
    try {
      const backendResponse = await fetch(`${backupApiUrl}?cb=${Date.now()}`, {
        cache: "no-store",
      });
      const backendPayload = await backendResponse.json().catch(() => null);
      if (backendResponse.ok && backendPayload?.data?.currentUrl) {
        render({
          currentUrl: String(backendPayload.data.currentUrl || "").trim(),
          previousUrl: String(backendPayload.data.previousUrl || "").trim(),
          updatedAtLabel: buildUpdatedLabel(backendPayload.data.updatedAt),
        });
        return;
      }
    } catch {
      // fallback below
    }

    try {
      let response = await fetch(`${rawConfigUrl}?cb=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("raw config fetch failed");
      }
      const source = await response.text();
      const parsed = parseConfigJs(source);
      if (!parsed.currentUrl) {
        throw new Error("missing current url");
      }
      render(parsed);
      return;
    } catch {
      render({
        currentUrl: fallbackUrl,
        previousUrl: fallbackPrevious,
        updatedAtLabel: fallbackUpdated,
      });
    }
  }

  refreshConfig();
})();
