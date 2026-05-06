const sanitize = (value) => (typeof value === "string" ? value.trim() : "");

const rawApiBaseUrl = sanitize(process.env.REACT_APP_API_BASE_URL);
const rawBackendUrl = sanitize(process.env.REACT_APP_BACKEND_URL);
const rawVoiceBackendUrl = sanitize(process.env.REACT_APP_VOICE_BACKEND_URL);
const rawVoiceProvider = sanitize(process.env.REACT_APP_VOICE_PROVIDER);
const rawOpenFinanceEnabled = sanitize(process.env.REACT_APP_OPEN_FINANCE_ENABLED);

const derivedBackendUrl =
  rawBackendUrl ||
  (rawApiBaseUrl.endsWith("/api")
    ? rawApiBaseUrl.slice(0, -4)
    : rawApiBaseUrl);

export const BACKEND_URL = derivedBackendUrl || "http://localhost:8000";
export const API_BASE_URL = rawApiBaseUrl || `${BACKEND_URL}/api`;
export const VOICE_BACKEND_URL = rawVoiceBackendUrl || "";
export const VOICE_PROVIDER = rawVoiceProvider || "browser-fallback";
export const OPEN_FINANCE_ENABLED = /^true$/i.test(rawOpenFinanceEnabled);

export const isProductionBuild = process.env.NODE_ENV === "production";

export const assertEnv = () => {
  if (!BACKEND_URL) {
    throw new Error(
      "Config invalida: defina REACT_APP_API_BASE_URL ou REACT_APP_BACKEND_URL."
    );
  }
};
