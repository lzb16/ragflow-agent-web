export interface Agent {
  id: number
  name: string
  url: string
  description: string | null
  tags: string | null
  avatar_path: string | null
  usage_guide: string | null
  status: 'pending' | 'approved' | 'rejected'
  submitter_id: number
  likes_count: number
  created_at: string
}

export interface Comment {
  id: number
  content: string
  agent_id: number
  user_id: number
  username: string
  created_at: string
}

export interface AgentListResponse {
  items: Agent[]
  total: number
}

export interface ParseResponse {
  name?: string
  description?: string
  avatar_base64?: string
  error?: string
}

export interface AuthUser {
  token: string
  is_admin: boolean
}

export interface AdminUser {
  id: number
  username: string
  email: string
  is_admin: boolean
  created_at: string
}
