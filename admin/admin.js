const API_URL = "https://zenix.lol/api/backup-config";
const VERIFY_URL = "https://zenix.lol/api/verify-admin";

const refs = {
  currentUrl: document.getElementById("currentUrl"),
  previousUrl: document.getElementById("previousUrl"),
  lastUpdated: document.getElementById("lastUpdated"),
  form: document.getElementById("backupForm"),
  password: document.getElementById("adminPassword"),
  newUrl: document.getElementById("newUrl"),
  status: document.getElementById("formStatus"),
  refreshBtn: document.getElementById("refreshBtn"),
  loginCard: document.getElementById("loginCard"),
  loginForm: document.getElementById("loginForm"),
  loginStatus: document.getElementById("loginStatus"),
  loginBtn: document.getElementById("loginBtn"),
  panel: document.getElementById("adminPanel"),
  updateBtn: document.getElementById("updateBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
};

function setAuthed(authed) {
  if (refs.loginCard) refs.loginCard.hidden = authed;
  if (refs.panel) refs.panel.hidden = !authed;
  if (refs.logoutBtn) refs.logoutBtn.hidden = !authed;
}

function setStatus(text, isError = false) {
  if (!refs.status) return;
  refs.status.textContent = text || "";
  refs.status.style.color = isError ? "#fca5a5" : "rgba(226, 232, 240, 0.7)";
}

function setLoginStatus(text, isError = false) {
  if (!refs.loginStatus) return;
  refs.loginStatus.textContent = text || "";
  refs.loginStatus.style.color = isError ? "#fca5a5" : "#86efac";
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
  const token = sessionStorage.getItem("admin_token");
  if (!token) {
    setAuthed(false);
    return;
  }

  try {
    const res = await fetch(API_URL, { 
      cache: "no-store",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    if (res.status === 401) {
      sessionStorage.removeItem("admin_token");
      setAuthed(false);
      return;
    }
    if (!res.ok) throw new Error("fetch failed");
    const payload = await res.json();
    renderData(payload.data || null);
  } catch {
    if (refs.lastUpdated) {
      refs.lastUpdated.textContent = "Impossible de charger";
    }
  }
}

async function handleLogin(event) {
  if (event?.preventDefault) {
    event.preventDefault();
  }
  const password = String(refs.password?.value || "").trim();
  if (!password) {
    setLoginStatus("Mot de passe requis.", true);
    return;
  }
  
  setLoginStatus("Vérification...");
  
  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });
    
    const payload = await res.json().catch(() => ({}));
    
    if (res.status === 401 || !payload.valid) {
      setLoginStatus("Mot de passe incorrect.", true);
      return;
    }
    
    if (res.status === 429) {
      setLoginStatus("Trop de tentatives. Réessaie plus tard.", true);
      return;
    }
    
    if (!res.ok) {
      setLoginStatus(payload?.error || "Erreur de vérification.", true);
      return;
    }
    
    if (payload.token) {
      sessionStorage.setItem("admin_token", payload.token);
    }
    
    if (refs.password) refs.password.value = "";
    setLoginStatus("Connexion réussie !");
    setAuthed(true);
    loadConfig();
    
  } catch {
    setLoginStatus("Erreur réseau.", true);
  }
}

function handleLogout() {
  sessionStorage.removeItem("admin_token");
  setAuthed(false);
  if (refs.password) refs.password.value = "";
}

async function submitConfig(event) {
  if (event?.preventDefault) {
    event.preventDefault();
  }
  
  const token = sessionStorage.getItem("admin_token");
  if (!token) {
    setStatus("Session expirée, reconnectez-vous.", true);
    setAuthed(false);
    return;
  }
  
  const url = String(refs.newUrl?.value || "").trim();
  if (!url) {
    setStatus("URL obligatoire.", true);
    return;
  }
  
  setStatus("Mise a jour en cours...");
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ url }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || !payload?.ok) {
      if (res.status === 401) {
        sessionStorage.removeItem("admin_token");
        setAuthed(false);
        setStatus("Session expirée, reconnectez-vous.", true);
      }
      setStatus(payload?.error || "Mise a jour impossible", true);
      return;
    }
    renderData(payload.data || null);
    setStatus("Lien mis a jour.");
    if (refs.newUrl) {
      refs.newUrl.value = "";
    }
  } catch {
    setStatus("Erreur réseau.", true);
  }
}

if (refs.form) {
  refs.form.addEventListener("submit", submitConfig);
}
if (refs.loginForm) {
  refs.loginForm.addEventListener("submit", handleLogin);
}
if (refs.loginBtn) {
  refs.loginBtn.addEventListener("click", handleLogin);
}
if (refs.updateBtn) {
  refs.updateBtn.addEventListener("click", submitConfig);
}
if (refs.refreshBtn) {
  refs.refreshBtn.addEventListener("click", loadConfig);
}
if (refs.logoutBtn) {
  refs.logoutBtn.addEventListener("click", handleLogout);
}

if (refs.password) {
  refs.password.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleLogin();
    }
  });
}
if (refs.newUrl) {
  refs.newUrl.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitConfig();
    }
  });
}

setAuthed(false);

window.__zenixLolAdminReady = true;
