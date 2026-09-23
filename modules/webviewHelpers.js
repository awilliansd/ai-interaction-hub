// modules/webviewHelpers.js
// Helpers puros usados pelo webviewHost (sem dependência do Electron),
// extraídos para permitir testes unitários diretos.

const AUTH_PROVIDER_ROOTS = [
  "google.com",
  "github.com",
  "apple.com",
  "facebook.com",
  "microsoftonline.com",
  "live.com",
];

function getRootHost(hostname) {
  const parts = String(hostname || "")
    .toLowerCase()
    .replace(/^www\./, "")
    .split(".");
  return parts.slice(-2).join(".");
}

function isAuthProviderHost(hostname) {
  return AUTH_PROVIDER_ROOTS.includes(getRootHost(hostname));
}

function isTabSiteHost(hostname, tabUrl) {
  try {
    const base = getRootHost(new URL(tabUrl).hostname);
    return getRootHost(hostname) === base;
  } catch (_e) {
    return false;
  }
}

function normalizeConfig(payload) {
  if (!payload || !payload.id || !payload.url) {
    throw new Error("webviewHost.showTab: payload inválido (id e url são obrigatórios).");
  }
  const config = {
    id: payload.id,
    url: payload.url,
    label: payload.label || payload.id,
    partition: payload.partition || `persist:${payload.id}`,
  };
  if (payload.preload) config.preload = payload.preload;
  if (payload.userAgent) config.userAgent = payload.userAgent;
  return config;
}

module.exports = {
  AUTH_PROVIDER_ROOTS,
  getRootHost,
  isAuthProviderHost,
  isTabSiteHost,
  normalizeConfig,
};
