const PASSWORD_HASH = "486c5499c7bfd161f98183a8e732da6b0ba17f9adaadf806d48c9a665e358c0c";
const PASSWORD_SALT = "zenix-lol-admin::";
const PASSWORD_SUFFIX = "::v1";
const TOKEN_SALT = "zenix-lol-token::";
const TOKEN_SUFFIX = "::v1";
const EMBEDDED_TOKEN_IV = "386BXYwl1FEBRDJQ";
const EMBEDDED_TOKEN_CIPHER = "Y8eKPi1kjd8180Yya4KdIWPzWz1+8rVmOq28H/On+jGEr9i1WLKW8Q==";
const EMBEDDED_TOKEN_TAG = "rT/Dxl0VJT/Bzo71kccXMg==";
const AUTH_KEY = "zenix_lol_admin_auth";
const PASSWORD_SESSION_KEY = "zenix_lol_admin_password";
const CONFIG_URL = new URL("../config.js", window.location.href).toString();
const RAW_CONFIG_URL = "https://raw.githubusercontent.com/Notimax/zenix-lol-vitrine/main/config.js";
const BACKUP_API_URL = "https://zenix.best/api/backup-config";
const GITHUB_OWNER = "Notimax";
const GITHUB_REPO = "zenix-lol-vitrine";
const GITHUB_BRANCH = "main";
const GITHUB_CONTENTS_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/config.js`;

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

let currentConfigState = {
  currentUrl: "",
  previousUrl: "",
  updatedAtLabel: "",
};

function setAuthed(authed) {
  if (refs.loginCard) refs.loginCard.hidden = authed;
  if (refs.panel) refs.panel.hidden = !authed;
  if (refs.logoutBtn) refs.logoutBtn.hidden = !authed;
}

function setStatus(text, isError = false) {
  if (!refs.status) return;
  refs.status.textContent = text || "";
  refs.status.style.color = isError ? "#fca5a5" : "rgba(226, 232, 240, 0.78)";
}

function setLoginStatus(text, isError = false) {
  if (!refs.loginStatus) return;
  refs.loginStatus.textContent = text || "";
  refs.loginStatus.style.color = isError ? "#fca5a5" : "#86efac";
}

function buildUpdatedLabel(value) {
  if (!value) {
    return "Config chargee.";
  }
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return `Derniere mise a jour : ${new Date(numeric).toLocaleString("fr-FR")}`;
  }
  return `Derniere publication : ${String(value).trim()}`;
}

function renderData(data) {
  currentConfigState = {
    currentUrl: String(data.currentUrl || "").trim(),
    previousUrl: String(data.previousUrl || "").trim(),
    updatedAtLabel: String(data.updatedAtLabel || "").trim(),
  };

  if (refs.currentUrl) {
    refs.currentUrl.textContent = currentConfigState.currentUrl || "-";
  }

  if (refs.previousUrl) {
    const showPrevious =
      currentConfigState.previousUrl &&
      currentConfigState.previousUrl !== currentConfigState.currentUrl;
    refs.previousUrl.hidden = !showPrevious;
    refs.previousUrl.textContent = showPrevious ? currentConfigState.previousUrl : "";
  }

  if (refs.lastUpdated) {
    refs.lastUpdated.textContent = currentConfigState.updatedAtLabel || "Config locale chargee.";
  }
}

function parseConfigJs(source) {
  const content = String(source || "");
  const currentMatch = content.match(/ZENIX_ACTIVE_URL\s*=\s*["']([^"']+)["']/);
  const previousMatch = content.match(/ZENIX_PREVIOUS_URL\s*=\s*["']([^"']*)["']/);
  const updatedMatch = content.match(/ZENIX_LAST_UPDATED\s*=\s*["']([^"']*)["']/);

  return {
    currentUrl: currentMatch ? String(currentMatch[1]).trim() : "",
    previousUrl: previousMatch ? String(previousMatch[1]).trim() : "",
    updatedAtLabel: updatedMatch ? `Derniere publication : ${String(updatedMatch[1]).trim()}` : "Config chargee.",
  };
}

function base64ToBytes(value) {
  return Uint8Array.from(atob(String(value || "")), (char) => char.charCodeAt(0));
}

function encodeBase64(value) {
  return btoa(unescape(encodeURIComponent(value)));
}

function decodeBase64(value) {
  return decodeURIComponent(escape(atob(String(value || "").replace(/\s+/g, ""))));
}

function buildConfigFile(nextUrl, previousUrl) {
  const dateLabel = new Date().toISOString().slice(0, 10);
  return [
    `window.ZENIX_ACTIVE_URL = "${nextUrl}";`,
    `window.ZENIX_PREVIOUS_URL = "${previousUrl}";`,
    `window.ZENIX_LAST_UPDATED = "${dateLabel}";`,
    "",
  ].join("\n");
}

async function sha256Bytes(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return new Uint8Array(digest);
}

async function sha256Hex(value) {
  const digest = await sha256Bytes(value);
  return Array.from(digest)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyPassword(password) {
  const candidate = await sha256Hex(`${PASSWORD_SALT}${String(password || "").trim()}${PASSWORD_SUFFIX}`);
  return candidate === PASSWORD_HASH;
}

function isAuthed() {
  return sessionStorage.getItem(AUTH_KEY) === "1";
}

function storeSessionPassword(password) {
  if (!password) {
    sessionStorage.removeItem(PASSWORD_SESSION_KEY);
    return;
  }
  sessionStorage.setItem(PASSWORD_SESSION_KEY, password);
}

function getSessionPassword() {
  return String(sessionStorage.getItem(PASSWORD_SESSION_KEY) || "");
}

async function decryptEmbeddedGithubToken(password) {
  const normalized = String(password || "").trim();
  if (!normalized) {
    throw new Error("Session admin expiree. Reconnecte-toi.");
  }

  const keyMaterial = await sha256Bytes(`${TOKEN_SALT}${normalized}${TOKEN_SUFFIX}`);
  const cryptoKey = await crypto.subtle.importKey("raw", keyMaterial, "AES-GCM", false, ["decrypt"]);
  const iv = base64ToBytes(EMBEDDED_TOKEN_IV);
  const cipher = base64ToBytes(EMBEDDED_TOKEN_CIPHER);
  const tag = base64ToBytes(EMBEDDED_TOKEN_TAG);
  const payload = new Uint8Array(cipher.length + tag.length);
  payload.set(cipher, 0);
  payload.set(tag, cipher.length);

  try {
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, cryptoKey, payload);
    return new TextDecoder().decode(decrypted).trim();
  } catch {
    throw new Error("Cle de publication indisponible.");
  }
}

function githubHeaders(token) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function fetchGithubConfig(token) {
  const response = await fetch(`${GITHUB_CONTENTS_URL}?ref=${encodeURIComponent(GITHUB_BRANCH)}`, {
    headers: githubHeaders(token),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.message || "Impossible de lire config.js.");
  }

  const source = decodeBase64(String(payload.content || ""));
  return {
    sha: String(payload.sha || ""),
    source,
    parsed: parseConfigJs(source),
  };
}

async function pushGithubConfig(token, nextUrl) {
  const remote = await fetchGithubConfig(token);
  const previousUrl = remote.parsed.currentUrl || currentConfigState.currentUrl || "";
  const nextContent = buildConfigFile(nextUrl, previousUrl);

  const response = await fetch(GITHUB_CONTENTS_URL, {
    method: "PUT",
    headers: {
      ...githubHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: `update active url to ${nextUrl}`,
      content: encodeBase64(nextContent),
      sha: remote.sha,
      branch: GITHUB_BRANCH,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || "Publication impossible.");
  }

  return {
    currentUrl: nextUrl,
    previousUrl,
    updatedAtLabel: "Derniere publication : GitHub mis a jour",
  };
}

async function fetchBackendConfig() {
  const response = await fetch(`${BACKUP_API_URL}?cb=${Date.now()}`, {
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.data?.currentUrl) {
    throw new Error(payload?.error || "Backend indisponible");
  }
  return {
    currentUrl: String(payload.data.currentUrl || "").trim(),
    previousUrl: String(payload.data.previousUrl || "").trim(),
    updatedAtLabel: buildUpdatedLabel(payload.data.updatedAt),
  };
}

async function fetchFallbackConfig() {
  let response = await fetch(`${RAW_CONFIG_URL}?cb=${Date.now()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    response = await fetch(`${CONFIG_URL}?cb=${Date.now()}`, {
      cache: "no-store",
    });
  }

  if (!response.ok) {
    throw new Error("config fetch failed");
  }

  const source = await response.text();
  return parseConfigJs(source);
}

async function loadConfig() {
  try {
    const backendData = await fetchBackendConfig();
    renderData(backendData);
    setStatus("");
    return;
  } catch {
    try {
      const fallback = await fetchFallbackConfig();
      renderData(fallback);
      setStatus("");
      return;
    } catch {
      renderData({
        currentUrl: "",
        previousUrl: "",
        updatedAtLabel: "Impossible de charger la configuration",
      });
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

  setLoginStatus("Verification...");

  try {
    const valid = await verifyPassword(password);
    if (!valid) {
      sessionStorage.removeItem(AUTH_KEY);
      storeSessionPassword("");
      setLoginStatus("Mot de passe incorrect.", true);
      return;
    }

    sessionStorage.setItem(AUTH_KEY, "1");
    storeSessionPassword(password);
    if (refs.password) refs.password.value = "";

    setLoginStatus("Connexion reussie.");
    setAuthed(true);
    setStatus("");
    await loadConfig();
  } catch {
    setLoginStatus("Erreur de verification.", true);
  }
}

function handleLogout() {
  sessionStorage.removeItem(AUTH_KEY);
  storeSessionPassword("");
  setAuthed(false);
  setStatus("");
  if (refs.password) refs.password.value = "";
}

async function submitConfig(event) {
  if (event?.preventDefault) {
    event.preventDefault();
  }

  if (!isAuthed()) {
    setAuthed(false);
    setStatus("Reconnecte-toi d'abord.", true);
    return;
  }

  const nextUrl = String(refs.newUrl?.value || "").trim();
  if (!nextUrl) {
    setStatus("URL obligatoire.", true);
    return;
  }

  try {
    const parsedUrl = new URL(nextUrl);
    if (!/^https?:$/i.test(parsedUrl.protocol)) {
      throw new Error("bad protocol");
    }
  } catch {
    setStatus("URL invalide.", true);
    return;
  }

  const password = getSessionPassword();
  if (!password) {
    sessionStorage.removeItem(AUTH_KEY);
    setAuthed(false);
    setStatus("Session admin expiree. Reconnecte-toi.", true);
    return;
  }

  setStatus("Mise a jour en cours...");

  try {
    let published = false;

    try {
      const response = await fetch(BACKUP_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password,
          url: nextUrl,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (response.ok && payload?.data?.currentUrl) {
        renderData({
          currentUrl: String(payload.data.currentUrl || "").trim(),
          previousUrl: String(payload.data.previousUrl || "").trim(),
          updatedAtLabel: buildUpdatedLabel(payload.data.updatedAt),
        });
        published = true;
      }
    } catch {
      // fallback below
    }

    if (!published) {
      const githubToken = await decryptEmbeddedGithubToken(password);
      const nextState = await pushGithubConfig(githubToken, nextUrl);
      renderData(nextState);
    }

    setStatus("Lien mis a jour. Zenix.lol utilise maintenant cette nouvelle URL.");
    if (refs.newUrl) {
      refs.newUrl.value = "";
    }
  } catch (error) {
    setStatus(String(error?.message || "Mise a jour impossible."), true);
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

setAuthed(isAuthed());
if (isAuthed()) {
  loadConfig();
}

window.__zenixLolAdminReady = true;
