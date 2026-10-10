import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export const api = axios.create({ baseURL: BASE_URL });

const getTokens = () => ({
  access: localStorage.getItem("access_token"),
  refresh: localStorage.getItem("refresh_token"),
});

export const setTokens = ({ access, refresh }) => {
  if (access) localStorage.setItem("access_token", access);
  if (refresh) localStorage.setItem("refresh_token", refresh);
};

export const clearTokens = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
};

// Attach the access token to every request.
api.interceptors.request.use((config) => {
  const { access } = getTokens();
  if (access) config.headers.Authorization = `Bearer ${access}`;
  return config;
});

// On a 401, try refreshing the access token exactly once, then retry the
// original request. If refresh itself fails, log the user out client-side.
let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const { refresh } = getTokens();

    if (error.response?.status === 401 && refresh && !original._retried) {
      original._retried = true;
      try {
        if (!refreshPromise) {
          refreshPromise = axios
            .post(`${BASE_URL}/auth/refresh/`, { refresh })
            .then((res) => res.data)
            .finally(() => {
              refreshPromise = null;
            });
        }
        const data = await refreshPromise;
        setTokens({ access: data.access });
        original.headers.Authorization = `Bearer ${data.access}`;
        return api(original);
      } catch (refreshError) {
        clearTokens();
        window.dispatchEvent(new Event("auth:logout"));
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

/** Pull the first human-readable message out of a DRF error response. */
export function extractErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  const data = error?.response?.data;
  if (!data) return error?.message || fallback;
  if (typeof data === "string") return data;
  if (data.error) return data.error;
  if (data.detail) return data.detail;
  if (Array.isArray(data.shortages) && data.shortages.length) {
    return data.shortages
      .map((s) => `Only ${s.available} left of ${s.sku} (requested ${s.requested}).`)
      .join(" ");
  }
  const firstKey = Object.keys(data)[0];
  if (firstKey) {
    const val = data[firstKey];
    return Array.isArray(val) ? `${firstKey}: ${val[0]}` : String(val);
  }
  return fallback;
}
