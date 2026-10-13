import api from './api';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://forkify-erp-2.onrender.com/api';

// Unauthenticated axios instance for public QR endpoints
const publicApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

const menuService = {
  // ── Authenticated endpoints (existing) ──────────────────────────────────
  getAll:        (activeOnly = false) => api.get('/menus', { params: { activeOnly } }),
  getById:       (id)                 => api.get(`/menus/${id}`),
  create:        (data)               => api.post('/menus', data),
  update:        (id, data)           => api.put(`/menus/${id}`, data),
  activate:      (id)                 => api.put(`/menus/${id}/activate`),
  deactivate:    (id)                 => api.put(`/menus/${id}/deactivate`),
  push:          (id)                 => api.post(`/menus/${id}/push`),
  delete:        (id)                 => api.delete(`/menus/${id}`),
  getBranchPricing: (menuId, branchId) => api.get(`/menus/${menuId}/pricing`, { params: { branchId } }),
  saveBranchPrice: (itemId, branchId, price, available) =>
    api.put(`/menus/items/${itemId}/pricing`, null, { params: { branchId, price, available } }),

  // ── PUBLIC endpoints — no JWT required (QR menu page) ───────────────────
  // GET /api/menus/public/{menuId}?branchId=
  // Returns menu with real-time stock status per item
  getPublicMenu: (menuId, branchId) =>
    publicApi.get(`/menus/public/${menuId}`, { params: { branchId } }),

  // POST /api/menus/public/order
  // Places a QR-based sales order (no auth, creates SalesEntry in ERP)
  placePublicOrder: (orderData) =>
    publicApi.post('/menus/public/order', orderData),
};

export default menuService;
