// src/lib/api.ts
import axios from "axios";

// Determine API base URL with following precedence:
// 1. VITE_API_URL (build-time)
// 2. Explicit runtime override on window.__BACKEND_URL__ (optional)
// 3. If running on the deployed frontend hostname, point to the deployed backend
// 4. Fallback to current origin + /api (local dev)
const viteBase = (import.meta.env.VITE_API_URL as string) || "";
const runtimeOverride = (window as any).__BACKEND_URL__ as string | undefined;
const deployedFrontendHost = "posture-frontend-6umr.onrender.com";
const deployedBackendBase = "https://posture-backend-skw3.onrender.com/api";

let rawBase = "";
if (viteBase) {
  rawBase = viteBase;
} else if (runtimeOverride) {
  rawBase = runtimeOverride;
} else if (window.location.hostname.includes(deployedFrontendHost)) {
  rawBase = deployedBackendBase;
} else {
  rawBase = `${window.location.origin}/api`;
}

const baseURL = rawBase.replace(/\/$/, "");

const API = axios.create({
  baseURL,
});

// Attach JWT token if logged in
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

export default API;
