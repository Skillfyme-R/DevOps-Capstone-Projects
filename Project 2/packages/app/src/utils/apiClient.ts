import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const API_BASE: string = (typeof window !== 'undefined' && (window as any).REACT_APP_API_URL)
  ? (window as any).REACT_APP_API_URL
  : 'http://localhost:8008';

export const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Attach JWT token from localStorage to every request
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('vv-token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401 (session expired)
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('vv-token');
      localStorage.removeItem('vv-user');
      window.location.href = '/login?expired=true';
    }
    return Promise.reject(error);
  }
);

// ── Typed API helpers ─────────────────────────────────────────────────────

export const authApi = {
  login:    (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }),
  register: (data: Record<string, unknown>) =>
    apiClient.post('/auth/register', data),
  logout:   () =>
    apiClient.post('/auth/logout'),
  me:       () =>
    apiClient.get('/auth/me'),
  refresh:  () =>
    apiClient.post('/auth/refresh'),
};

export const catalogApi = {
  listProducts: (params?: Record<string, unknown>) =>
    apiClient.get('/catalog/products', { params }),
  getProduct:   (id: string) =>
    apiClient.get(`/catalog/products/${id}`),
  searchProducts: (query: string, params?: Record<string, unknown>) =>
    apiClient.get('/catalog/search', { params: { q: query, ...params } }),
  getCategories: () =>
    apiClient.get('/catalog/categories'),
  getFeatured:   () =>
    apiClient.get('/catalog/featured'),
};

export const cartApi = {
  getCart:    () =>
    apiClient.get('/cart'),
  addItem:    (productId: string, quantity: number, variantId?: string) =>
    apiClient.post('/cart/items', { productId, quantity, variantId }),
  updateItem: (itemId: string, quantity: number) =>
    apiClient.patch(`/cart/items/${itemId}`, { quantity }),
  removeItem: (itemId: string) =>
    apiClient.delete(`/cart/items/${itemId}`),
  clearCart:  () =>
    apiClient.delete('/cart'),
  applyCoupon: (code: string) =>
    apiClient.post('/cart/coupon', { code }),
};

export const ordersApi = {
  listOrders:  (params?: Record<string, unknown>) =>
    apiClient.get('/orders', { params }),
  getOrder:    (id: string) =>
    apiClient.get(`/orders/${id}`),
  placeOrder:  (data: Record<string, unknown>) =>
    apiClient.post('/orders', data),
  cancelOrder: (id: string, reason: string) =>
    apiClient.patch(`/orders/${id}/cancel`, { reason }),
  trackOrder:  (id: string) =>
    apiClient.get(`/orders/${id}/tracking`),
};

export const vendorApi = {
  listVendors:    (params?: Record<string, unknown>) =>
    apiClient.get('/vendors', { params }),
  getVendor:      (id: string) =>
    apiClient.get(`/vendors/${id}`),
  getVendorStats: () =>
    apiClient.get('/vendors/me/stats'),
  getVendorOrders: (params?: Record<string, unknown>) =>
    apiClient.get('/vendors/me/orders', { params }),
  updateVendorProduct: (id: string, data: Record<string, unknown>) =>
    apiClient.patch(`/vendors/me/products/${id}`, data),
};

export const analyticsApi = {
  getSalesOverview: (period: string) =>
    apiClient.get('/analytics/sales', { params: { period } }),
  getTopProducts:   (limit?: number) =>
    apiClient.get('/analytics/top-products', { params: { limit } }),
  getRevenueByCategory: (period: string) =>
    apiClient.get('/analytics/revenue-by-category', { params: { period } }),
  getCustomerMetrics: () =>
    apiClient.get('/analytics/customers'),
};

export const wishlistApi = {
  getWishlist:   () =>
    apiClient.get('/wishlist'),
  addToWishlist: (productId: string) =>
    apiClient.post('/wishlist', { productId }),
  removeFromWishlist: (productId: string) =>
    apiClient.delete(`/wishlist/${productId}`),
};
