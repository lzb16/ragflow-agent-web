const BASE = ''

function getToken(): string | null {
  return localStorage.getItem('token')
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  const resp = await fetch(`${BASE}${path}`, { ...options, headers })
  if (resp.status === 401) {
    localStorage.removeItem('token')
    window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`
    throw new Error('Unauthorized')
  }
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: resp.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  if (resp.status === 204) return undefined as unknown as T
  return resp.json()
}

export const api = {
  register: (username: string, email: string, password: string) =>
    request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    }),

  login: (login: string, password: string) =>
    request<{ token: string; is_admin: boolean; user_id: number }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login, password }),
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    request<void>('/api/auth/change-password', {
      method: 'PATCH',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    }),

  listAgents: (q?: string, page = 1) => {
    const params = new URLSearchParams({ page: String(page) })
    if (q) params.set('q', q)
    return request<{ items: import('./types').Agent[]; total: number }>(`/api/agents?${params}`)
  },

  getAgent: (id: number) =>
    request<import('./types').Agent>(`/api/agents/${id}`),

  parseLink: (url: string) =>
    request<import('./types').ParseResponse>('/api/agents/parse', {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),

  submitAgent: (formData: FormData) =>
    request<import('./types').Agent>('/api/agents', {
      method: 'POST',
      body: formData,
    }),

  toggleLike: (agentId: number) =>
    request<{ likes_count: number; liked: boolean }>(`/api/agents/${agentId}/like`, {
      method: 'POST',
    }),

  toggleFavorite: (agentId: number) =>
    request<{ favorited: boolean }>(`/api/favorites/${agentId}`, {
      method: 'POST',
    }),

  listMyFavorites: () =>
    request<number[]>('/api/favorites/me'),

  listComments: (agentId: number) =>
    request<import('./types').Comment[]>(`/api/agents/${agentId}/comments`),

  postComment: (agentId: number, content: string) =>
    request<import('./types').Comment>(`/api/agents/${agentId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  updateComment: (agentId: number, commentId: number, content: string) =>
    request<import('./types').Comment>(`/api/agents/${agentId}/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    }),

  deleteComment: (agentId: number, commentId: number) =>
    request<void>(`/api/agents/${agentId}/comments/${commentId}`, { method: 'DELETE' }),

  adminListAgents: (status?: string) => {
    const params = status ? `?status=${status}` : ''
    return request<{ items: import('./types').Agent[]; total: number }>(`/api/admin/agents${params}`)
  },

  adminApprove: (id: number) =>
    request<import('./types').Agent>(`/api/admin/agents/${id}/approve`, { method: 'POST' }),

  adminReject: (id: number) =>
    request<import('./types').Agent>(`/api/admin/agents/${id}/reject`, { method: 'POST' }),

  adminDeleteAgent: (id: number) =>
    request<void>(`/api/admin/agents/${id}`, { method: 'DELETE' }),

  adminListUsers: () =>
    request<{ items: import('./types').AdminUser[]; total: number }>('/api/admin/users'),

  adminSetAdmin: (userId: number, isAdmin: boolean) =>
    request<import('./types').AdminUser>(`/api/admin/users/${userId}/set-admin`, {
      method: 'PATCH',
      body: JSON.stringify({ is_admin: isAdmin }),
    }),

  adminResetPassword: (userId: number, newPassword: string) =>
    request<void>(`/api/admin/users/${userId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ new_password: newPassword }),
    }),
}
