import { useState, useRef, useEffect } from 'react'
import { Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../api'

interface Props {
  agentId: number
  initialFavorited: boolean
}

export default function FavoriteButton({ agentId, initialFavorited }: Props) {
  const [favorited, setFavorited] = useState(initialFavorited)
  const [loading, setLoading] = useState(false)
  const [showTip, setShowTip] = useState(false)
  const [error, setError] = useState(false)
  const tipTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const token = localStorage.getItem('token')

  useEffect(() => {
    return () => { if (tipTimer.current) clearTimeout(tipTimer.current) }
  }, [])

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (!token) {
      setShowTip(true)
      if (tipTimer.current) clearTimeout(tipTimer.current)
      tipTimer.current = setTimeout(() => setShowTip(false), 3000)
      return
    }
    if (loading) return
    setLoading(true)
    const prev = favorited
    setFavorited(!prev)
    try {
      const data = await api.toggleFavorite(agentId)
      setFavorited(data.favorited)
    } catch {
      setFavorited(prev)
      setError(true)
      if (tipTimer.current) clearTimeout(tipTimer.current)
      tipTimer.current = setTimeout(() => setError(false), 3000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={loading}
        title={favorited ? '取消收藏' : '收藏'}
        className={`flex items-center justify-center w-9 h-9 rounded-lg border transition-colors cursor-pointer ${
          favorited
            ? 'bg-amber-50 border-amber-300 text-amber-500'
            : 'border-slate-200 text-slate-400 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-400'
        }`}>
        <Star size={15} fill={favorited ? 'currentColor' : 'none'} strokeWidth={favorited ? 2 : 1.5} />
      </button>

      {error && (
        <div className="absolute bottom-full left-0 mb-2 whitespace-nowrap bg-red-600 text-white text-xs rounded-lg px-3 py-2 shadow-lg z-10">
          操作失败，请重试
          <div className="absolute top-full left-4 border-4 border-transparent border-t-red-600" />
        </div>
      )}

      {showTip && (
        <div className="absolute bottom-full left-0 mb-2 whitespace-nowrap bg-slate-800 text-white text-xs rounded-lg px-3 py-2 flex items-center gap-2 shadow-lg z-10">
          <span>登录后才能收藏</span>
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
