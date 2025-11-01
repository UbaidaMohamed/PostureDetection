// src/lib/api.ts
import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5003/api", // Updated to match backend port
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
