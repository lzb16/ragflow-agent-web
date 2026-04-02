import { useState } from 'react'
import { api } from '../api'

interface Props {
  agentId: number
  initialCount: number
  initialLiked?: boolean
}

export default function LikeButton({ agentId, initialCount, initialLiked = false }: Props) {
  const [count, setCount] = useState(initialCount)
  const [liked, setLiked] = useState(initialLiked)
  const [loading, setLoading] = useState(false)
  const token = localStorage.getItem('token')

  async function handleClick() {
    if (!token) { window.location.href = '/login'; return }
    if (loading) return
    setLoading(true)
    try {
      const data = await api.toggleLike(agentId)
      setCount(data.likes_count)
      setLiked(data.liked)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button onClick={handleClick} disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${liked ? 'bg-blue-50 border-blue-300 text-blue-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
      <span>👍</span>
      <span>{count}</span>
    </button>
  )
}
