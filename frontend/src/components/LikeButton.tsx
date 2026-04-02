import { useState, useEffect, useRef } from 'react'
import { ThumbsUp } from 'lucide-react'
import { Link } from 'react-router-dom'
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
  const [showTip, setShowTip] = useState(false)
  const tipTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const token = localStorage.getItem('token')

  useEffect(() => {
    return () => { if (tipTimer.current) clearTimeout(tipTimer.current) }
  }, [])

  async function handleClick() {
    if (!token) {
      setShowTip(true)
      if (tipTimer.current) clearTimeout(tipTimer.current)
      tipTimer.current = setTimeout(() => setShowTip(false), 3000)
      return
    }
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
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={loading}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors cursor-pointer ${
          liked
            ? 'bg-blue-50 border-blue-300 text-blue-600'
            : 'border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
        }`}>
        <ThumbsUp size={15} strokeWidth={liked ? 2.5 : 1.5} />
        <span className="text-sm font-medium">{count}</span>
      </button>

      {showTip && (
        <div className="absolute bottom-full left-0 mb-2 whitespace-nowrap bg-slate-800 text-white text-xs rounded-lg px-3 py-2 flex items-center gap-2 shadow-lg">
          <span>登录后才能点赞</span>
          <Link
            to="/login"
            className="text-blue-300 hover:text-blue-200 font-medium underline underline-offset-2">
            去登录
          </Link>
          <div className="absolute top-full left-4 border-4 border-transparent border-t-slate-800" />
        </div>
      )}
    </div>
  )
}
