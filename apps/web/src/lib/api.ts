import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (error: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

// Add auth interceptor - use JWT token or fallback to userId
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const accessToken = localStorage.getItem('accessToken');
    const userId = localStorage.getItem('userId');
    
    if (accessToken) {
      config.headers['Authorization'] = `Bearer ${accessToken}`;
    }
    // Fallback for backward compatibility
    if (userId) {
      config.headers['x-user-id'] = userId;
    }
  }
  return config;
});

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Wait for the refresh to complete
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;

      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
          
          if (data.accessToken) {
            localStorage.setItem('accessToken', data.accessToken);
            api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
            originalRequest.headers['Authorization'] = `Bearer ${data.accessToken}`;
            
            processQueue(null, data.accessToken);
            return api(originalRequest);
          }
        } catch (refreshError) {
          processQueue(refreshError, null);
          // Clear all tokens and redirect to login
          if (typeof window !== 'undefined') {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('userId');
            localStorage.removeItem('user');
            window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      } else {
        // No refresh token, redirect to login
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('userId');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      }
    }
    
    return Promise.reject(error);
  },
);

export const authApi = {
  login: async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
  },
  
  refresh: async (refreshToken: string) => {
    const { data } = await api.post('/auth/refresh', { refreshToken });
    return data;
  },
  
  forgotPassword: async (email: string) => {
    const { data } = await api.post('/auth/forgot-password', { email });
    return data;
  },
  
  resetPassword: async (token: string, newPassword: string) => {
    const { data } = await api.post('/auth/reset-password', { token, newPassword });
    return data;
  },
  
  changePassword: async (currentPassword: string, newPassword: string) => {
    const { data } = await api.post('/auth/change-password', { currentPassword, newPassword });
    return data;
  },
  
  logout: async () => {
    const { data } = await api.post('/auth/logout');
    // Clear local storage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userId');
      localStorage.removeItem('user');
    }
    return data;
  },
  
  getSession: async () => {
    const { data } = await api.get('/auth/session');
    return data;
  },
};

export const itemsApi = {
  getAll: async () => {
    const { data } = await api.get('/items');
    return data;
  },
  getCritical: async () => {
    const { data } = await api.get('/items/critical');
    return data;
  },
  analyze: async () => {
    const { data } = await api.get('/items/analyze');
    return data;
  },
  create: async (item: any) => {
    const { data } = await api.post('/items', item);
    return data;
  },
  update: async (id: string, item: any) => {
    const { data } = await api.put(`/items/${id}`, item);
    return data;
  },
  movimentar: async (id: string, movimento: any) => {
    const { data } = await api.post(`/items/${id}/movimentar`, movimento);
    return data;
  },
  // Import/Export Excel
  exportExcel: async () => {
    const { data } = await api.get('/items/export');
    return data;
  },
  getTemplate: async () => {
    const { data } = await api.get('/items/template');
    return data;
  },
  importExcel: async (items: any[]) => {
    const { data } = await api.post('/items/import', { items });
    return data;
  },
};

export const suppliersApi = {
  getAll: async () => {
    const { data } = await api.get('/suppliers');
    return data;
  },
  create: async (supplier: any) => {
    const { data } = await api.post('/suppliers', supplier);
    return data;
  },
  update: async (id: string, supplier: any) => {
    const { data } = await api.put(`/suppliers/${id}`, supplier);
    return data;
  },
};

export const purchaseOrdersApi = {
  getAll: async () => {
    const { data } = await api.get('/purchase-orders');
    return data;
  },
  getOne: async (id: string) => {
    const { data } = await api.get(`/purchase-orders/${id}`);
    return data;
  },
  create: async (po: any) => {
    const { data} = await api.post('/purchase-orders', po);
    return data;
  },
  approve: async (id: string) => {
    const { data } = await api.post(`/purchase-orders/${id}/approve`);
    return data;
  },
  send: async (id: string) => {
    const { data } = await api.post(`/purchase-orders/${id}/send`);
    return data;
  },
  receive: async (id: string) => {
    const { data } = await api.post(`/purchase-orders/${id}/receive`);
    return data;
  },
};

export const kanbanApi = {
  getBoard: async () => {
    const { data } = await api.get('/kanban/board');
    return data;
  },
  createCard: async (card: any) => {
    const { data } = await api.post('/kanban/cards', card);
    return data;
  },
  moveCard: async (id: string, status: string) => {
    const { data } = await api.patch(`/kanban/cards/${id}/move`, { status });
    return data;
  },
};

export const auditApi = {
  getLogs: async (params?: any) => {
    const { data } = await api.get('/audit/logs', { params });
    return data;
  },
  getStats: async () => {
    const { data } = await api.get('/audit/stats');
    return data;
  },
};

export const notificationsApi = {
  getHistory: async () => {
    const { data } = await api.get('/notifications/history');
    return data;
  },
  getStats: async () => {
    const { data } = await api.get('/notifications/stats');
    return data;
  },
  getSettings: async () => {
    const { data } = await api.get('/notifications/settings');
    return data;
  },
  sendEmail: async (destinatario: string, assunto: string, mensagem: string) => {
    const { data } = await api.post('/notifications/send/email', { destinatario, assunto, mensagem });
    return data;
  },
  sendWhatsApp: async (destinatario: string, mensagem: string) => {
    const { data } = await api.post('/notifications/send/whatsapp', { destinatario, mensagem });
    return data;
  },
  sendSMS: async (destinatario: string, mensagem: string) => {
    const { data } = await api.post('/notifications/send/sms', { destinatario, mensagem });
    return data;
  },
  sendAll: async (params: { email?: string; whatsapp?: string; sms?: string; assunto?: string; mensagem: string }) => {
    const { data } = await api.post('/notifications/send/all', params);
    return data;
  },
  test: async (params: { email?: string; whatsapp?: string; sms?: string }) => {
    const { data } = await api.post('/notifications/test', params);
    return data;
  },
};
