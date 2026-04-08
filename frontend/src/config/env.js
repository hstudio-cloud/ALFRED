const sanitize = (value) => (typeof value === "string" ? value.trim() : "");

const rawBackendUrl = sanitize(process.env.REACT_APP_BACKEND_URL);
const rawVoiceBackendUrl = sanitize(process.env.REACT_APP_VOICE_BACKEND_URL);
const rawVoiceProvider = sanitize(process.env.REACT_APP_VOICE_PROVIDER);

export const BACKEND_URL = rawBackendUrl || "http://localhost:8000";
export const API_BASE_URL = `${BACKEND_URL}/api`;
export const VOICE_BACKEND_URL = rawVoiceBackendUrl || "";
export const VOICE_PROVIDER = rawVoiceProvider || "browser-fallback";

export const isProductionBuild = process.env.NODE_ENV === "production";

export const assertEnv = () => {
  if (!BACKEND_URL) {
    throw new Error(
      "Config invalida: REACT_APP_BACKEND_URL nao definida e sem fallback disponivel."
    );
  }
};

