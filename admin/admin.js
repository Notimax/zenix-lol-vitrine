const API_URL = "https://zenix.best/api/backup-config";

const refs = {
  currentUrl: document.getElementById("currentUrl"),
  previousUrl: document.getElementById("previousUrl"),
  lastUpdated: document.getElementById("lastUpdated"),
  form: document.getElementById("backupForm"),
  password: document.getElementById("adminPassword"),
  newUrl: document.getElementById("newUrl"),
  status: document.getElementById("formStatus"),
  refreshBtn: document.getElementById("refreshBtn"),
};

function setStatus(text, isError = false) {
  if (!refs.status) return;
  refs.status.textContent = text || "";
  refs.status.style.color = isError ? "#fca5a5" : "rgba(226, 232, 240, 0.7)";
}

function renderData(data) {
  if (!data) return;
  const current = String(data.currentUrl || "").trim();
  const previous = String(data.previousUrl || "").trim();
  const updatedAt = Number(data.updatedAt || 0);
  if (refs.currentUrl) {
    refs.currentUrl.textContent = current || "-";
  }
  if (refs.previousUrl) {
    const show = previous && previous !== current;
    refs.previousUrl.hidden = !show;
    if (show) {
      refs.previousUrl.textContent = previous;
    }
  }
  if (refs.lastUpdated) {
    if (updatedAt) {
      const label = new Date(updatedAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
      refs.lastUpdated.textContent = "Mis a jour · " + label;
    } else {
      refs.lastUpdated.textContent = "Mis a jour";
    }
  }
}

async function loadConfig() {
  try {
    const res = await fetch(API_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("fetch failed");
    const payload = await res.json();
    renderData(payload.data || null);
  } catch {
    if (refs.lastUpdated) {
      refs.lastUpdated.textContent = "Impossible de charger";
    }
  }
}

async function submitConfig(event) {
  event.preventDefault();
  const password = String(refs.password?.value || "").trim();
  const url = String(refs.newUrl?.value || "").trim();
  if (!password || !url) {
    setStatus("Mot de passe et URL obligatoires.", true);
    return;
  }
  setStatus("Mise a jour en cours...");
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password, url }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || !payload?.ok) {
      setStatus(payload?.error || "Mise a jour impossible", true);
      return;
    }
    renderData(payload.data || null);
    setStatus("Lien mis a jour.");
    if (refs.newUrl) {
      refs.newUrl.value = "";
    }
  } catch {
    setStatus("Erreur reseau.", true);
  }
}

if (refs.form) {
  refs.form.addEventListener("submit", submitConfig);
}
if (refs.refreshBtn) {
  refs.refreshBtn.addEventListener("click", loadConfig);
}

loadConfig();
