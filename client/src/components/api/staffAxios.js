import axios from 'axios';

import { API_BASE } from '../../config.js';

const staffAxios = axios.create({ baseURL: API_BASE });

staffAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('staff_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Deliberately does NOT read careal_token
  return config;
});

export default staffAxios;
