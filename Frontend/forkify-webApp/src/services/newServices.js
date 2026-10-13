import api from './api';

// Analytics
export const analyticsService = {
  getOverview:   (branchId, days = 30) => api.get('/analytics/overview',   { params: { branchId, days } }),
  getFoodCost:   (branchId, days = 30) => api.get('/analytics/food-cost',  { params: { branchId, days } }),
};

// Allergens
export const allergenService = {
  getMatrix:     (category, status) => api.get('/allergens/matrix', { params: { category, status } }),
  getForRecipe:  (id)               => api.get(`/allergens/recipe/${id}`),
  getList:       ()                 => api.get('/allergens/list'),
};

// Recipe Versions
export const recipeVersionService = {
  getVersions:   (recipeId)           => api.get(`/recipe-versions/${recipeId}`),
  saveSnapshot:  (recipeId, summary)  => api.post(`/recipe-versions/${recipeId}/snapshot`, { summary }),
  restore:       (recipeId, version)  => api.put(`/recipe-versions/${recipeId}/restore/${version}`),
};

// Customers / CRM
export const customerService = {
  getAll:        (branchId, q)        => api.get('/customers', { params: { branchId, q } }),
  getById:       (id)                 => api.get(`/customers/${id}`),
  create:        (data)               => api.post('/customers', data),
  update:        (id, data)           => api.put(`/customers/${id}`, data),
  addPoints:     (id, points)         => api.put(`/customers/${id}/add-points`, { points }),
  redeemPoints:  (id, points)         => api.put(`/customers/${id}/redeem-points`, { points }),
  recordVisit:   (id, spend)          => api.put(`/customers/${id}/record-visit`, { spend }),
  getBirthdays:  (month)              => api.get('/customers/birthdays', { params: { month } }),
  getStats:      (branchId)           => api.get('/customers/stats', { params: { branchId } }),
};

// Stock Transfers
export const transferService = {
  getAll:        (branchId, status)   => api.get('/transfers', { params: { branchId, status } }),
  create:        (data)               => api.post('/transfers', data),
  approve:       (id)                 => api.put(`/transfers/${id}/approve`),
  dispatch:      (id)                 => api.put(`/transfers/${id}/dispatch`),
  receive:       (id)                 => api.put(`/transfers/${id}/receive`),
  cancel:        (id)                 => api.put(`/transfers/${id}/cancel`),
};

// Shifts
export const shiftService = {
  getAll:        (branchId, from, to) => api.get('/shifts', { params: { branchId, from, to } }),
  getMy:         (from, to)           => api.get('/shifts/my', { params: { from, to } }),
  create:        (data)               => api.post('/shifts', data),
  update:        (id, data)           => api.put(`/shifts/${id}`, data),
  clockIn:       (id)                 => api.put(`/shifts/${id}/clock-in`),
  clockOut:      (id)                 => api.put(`/shifts/${id}/clock-out`),
  delete:        (id)                 => api.delete(`/shifts/${id}`),
};

const services = { analyticsService, allergenService, recipeVersionService, customerService, transferService, shiftService };
export default services;