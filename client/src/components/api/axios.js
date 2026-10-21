import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "https://careal-backend.onrender.com/api";

export default axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});
