const PASSWORD_HASH = "486c5499c7bfd161f98183a8e732da6b0ba17f9adaadf806d48c9a665e358c0c";
const PASSWORD_SALT = "zenix-lol-admin::";
const PASSWORD_SUFFIX = "::v1";
const AUTH_KEY = "zenix_lol_admin_auth";
const TOKEN_KEY = "zenix_lol_github_token";
const CONFIG_URL = new URL("../config.js", window.location.href).toString();
const RAW_CONFIG_URL = "https://raw.githubusercontent.com/Notimax/zenix-lol-vitrine/main/config.js";
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
  githubToken: document.getElementById("githubToken"),
  githubTokenGroup: document.getElementById("githubTokenGroup"),
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

function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return sessionStorage.getItem(TOKEN_KEY) || "";
  }
}

function storeToken(value) {
  try {
    if (value) {
      localStorage.setItem(TOKEN_KEY, value);
      sessionStorage.setItem(TOKEN_KEY, value);
    } else {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    if (value) {
      sessionStorage.setItem(TOKEN_KEY, value);
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
    }
  }
}

function updateTokenFieldVisibility() {
  if (!refs.githubTokenGroup) return;
  const hasToken = !!getStoredToken();
  refs.githubTokenGroup.hidden = hasToken;
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
    if (showPrevious) {
      refs.previousUrl.textContent = currentConfigState.previousUrl;
    }
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

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
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

async function loadConfig() {
  try {
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
    renderData(parseConfigJs(source));
  } catch {
    renderData({
      currentUrl: "",
      previousUrl: "",
      updatedAtLabel: "Impossible de charger config.js",
    });
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
      setLoginStatus("Mot de passe incorrect.", true);
      return;
    }

    sessionStorage.setItem(AUTH_KEY, "1");
    if (refs.password) refs.password.value = "";
    if (refs.githubToken && !refs.githubToken.value && getStoredToken()) {
      refs.githubToken.value = getStoredToken();
    }
    updateTokenFieldVisibility();

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
  storeToken("");
  setAuthed(false);
  setStatus("");
  if (refs.password) refs.password.value = "";
  if (refs.githubToken) refs.githubToken.value = "";
  updateTokenFieldVisibility();
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
    throw new Error(payload?.message || "Impossible de lire config.js depuis GitHub.");
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
    throw new Error(payload?.message || "Publication GitHub impossible.");
  }

  return {
    currentUrl: nextUrl,
    previousUrl,
    updatedAtLabel: "Publication GitHub envoyee. Render peut prendre 1 a 2 minutes.",
  };
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

  const token = String(refs.githubToken?.value || getStoredToken() || "").trim();
  if (!token) {
    if (refs.githubTokenGroup) refs.githubTokenGroup.hidden = false;
    setStatus("Token GitHub requis pour publier config.js depuis cette page.", true);
    return;
  }

  storeToken(token);
  updateTokenFieldVisibility();
  setStatus("Publication GitHub en cours...");

  try {
    const nextState = await pushGithubConfig(token, nextUrl);
    renderData(nextState);
    setStatus("Lien publie sur GitHub. Si Render n'auto-deploie pas, lance un manual update.");
    if (refs.newUrl) {
      refs.newUrl.value = "";
    }
  } catch (error) {
    setStatus(error?.message || "Publication impossible.", true);
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

if (refs.githubToken && getStoredToken()) {
  refs.githubToken.value = getStoredToken();
}
updateTokenFieldVisibility();

setAuthed(isAuthed());
if (isAuthed()) {
  loadConfig();
}

window.__zenixLolAdminReady = true;
