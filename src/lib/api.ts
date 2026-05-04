const BASE = '/api'

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  // Dashboard
  getDashboard: (month?: string) =>
    fetchJSON<any>(`/dashboard${month ? `?month=${month}` : ''}`),

  // Categories
  getCategories: (type?: string) =>
    fetchJSON<any[]>(`/categories${type ? `?type=${type}` : ''}`),
  createCategory: (data: any) =>
    fetchJSON<any>('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id: string, data: any) =>
    fetchJSON<any>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id: string) =>
    fetchJSON<any>(`/categories/${id}`, { method: 'DELETE' }),

  // Payment Methods
  getPaymentMethods: () =>
    fetchJSON<any[]>('/payment-methods'),
  createPaymentMethod: (data: any) =>
    fetchJSON<any>('/payment-methods', { method: 'POST', body: JSON.stringify(data) }),
  updatePaymentMethod: (id: string, data: any) =>
    fetchJSON<any>(`/payment-methods/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePaymentMethod: (id: string) =>
    fetchJSON<any>(`/payment-methods/${id}`, { method: 'DELETE' }),

  // Transactions
  getTransactions: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : ''
    return fetchJSON<any[]>(`/transactions${query}`)
  },
  createTransaction: (data: any) =>
    fetchJSON<any>('/transactions', { method: 'POST', body: JSON.stringify(data) }),
  updateTransaction: (id: string, data: any) =>
    fetchJSON<any>(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTransaction: (id: string) =>
    fetchJSON<any>(`/transactions/${id}`, { method: 'DELETE' }),

  // Wishlists
  getWishlists: () =>
    fetchJSON<any[]>('/wishlists'),
  createWishlist: (data: any) =>
    fetchJSON<any>('/wishlists', { method: 'POST', body: JSON.stringify(data) }),
  updateWishlist: (id: string, data: any) =>
    fetchJSON<any>(`/wishlists/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteWishlist: (id: string) =>
    fetchJSON<any>(`/wishlists/${id}`, { method: 'DELETE' }),
  buyWishlist: (id: string) =>
    fetchJSON<any>(`/wishlists/${id}/buy`, { method: 'POST' }),

  // Bills
  getBills: () =>
    fetchJSON<any[]>('/bills'),
  createBill: (data: any) =>
    fetchJSON<any>('/bills', { method: 'POST', body: JSON.stringify(data) }),
  updateBill: (id: string, data: any) =>
    fetchJSON<any>(`/bills/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBill: (id: string) =>
    fetchJSON<any>(`/bills/${id}`, { method: 'DELETE' }),
  payBill: (id: string) =>
    fetchJSON<any>(`/bills/${id}/pay`, { method: 'POST' }),

  // Budgets
  getBudgets: (month?: string) =>
    fetchJSON<any[]>(`/budgets${month ? `?month=${month}` : ''}`),
  createBudget: (data: any) =>
    fetchJSON<any>('/budgets', { method: 'POST', body: JSON.stringify(data) }),
  deleteBudget: (id: string) =>
    fetchJSON<any>(`/budgets/${id}`, { method: 'DELETE' }),
}
