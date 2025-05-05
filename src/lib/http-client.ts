import Axios from 'axios';

export const httpClient = Axios.create({
  baseURL: import.meta.env.VITE_APP_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

httpClient.interceptors.request.use(
  (config) => {
    config.headers = config.headers ?? {};
    const authInfo = localStorage.getItem('site') ? JSON.parse(localStorage.getItem('site') || '') : null;
    if (authInfo) {
      config.headers['Authorization'] = `Bearer ${authInfo.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

httpClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const status = error.response?.status ?? 0;

    // if (status === 403) {
    //   window.location.href = '/dang-nhap';
    // }

    if (status >= 500 && status <= 599) {
      window.location.href = '/500';
    }

    return Promise.reject(error);
  }
);
