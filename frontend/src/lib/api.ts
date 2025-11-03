// src/lib/api.ts
import axios from "axios";

// Use Vite env var at build time, otherwise fall back to current origin + /api
const rawBase = (import.meta.env.VITE_API_URL as string) || `${window.location.origin}/api`;
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
