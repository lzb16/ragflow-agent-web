import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, ExternalLink, BookOpen } from 'lucide-react'
import { api } from '../api'
import type { Agent, Comment } from '../types'
import LikeButton from '../components/LikeButton'
import FavoriteButton from '../components/FavoriteButton'
import CommentList from '../components/CommentList'
import CommentForm from '../components/CommentForm'
import Navbar from '../components/Navbar'

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>()
  const [agent, setAgent] = useState<Agent | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [favorited, setFavorited] = useState(false)

  const currentUserId = localStorage.getItem('user_id') ? Number(localStorage.getItem('user_id')) : null
  const isAdmin = localStorage.getItem('is_admin') === 'true'

  useEffect(() => {
    if (!id) return
    const agentId = Number(id)
    Promise.all([api.getAgent(agentId), api.listComments(agentId)])
      .then(([a, c]) => { setAgent(a); setComments(c) })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
    const token = localStorage.getItem('token')
    if (token) {
      api.listMyFavorites()
        .then(ids => setFavorited(ids.includes(agentId)))
        .catch(() => {})
    }
  }, [id])

  if (loading) return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="text-center py-20 text-slate-400 text-sm">加载中...</div>
    </div>
  )

  if (notFound || !agent) return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="text-center py-20">
        <p className="text-slate-500 mb-3">智能体不存在</p>
        <Link to="/" className="text-blue-600 hover:underline text-sm">返回首页</Link>
      </div>
    </div>
  )

  const tags = agent.tags ? agent.tags.split(',').map(t => t.trim()).filter(Boolean) : []

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <Link to="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors">
          <ArrowLeft size={14} />
          返回首页
        </Link>

        {/* Agent Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-4">
          <div className="flex items-start gap-4 mb-5">
            {agent.avatar_path ? (
              <img src={`/${agent.avatar_path}`} alt={agent.name}
                className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold font-display flex-shrink-0">
                {agent.name[0]}
              </div>
            )}
            <div className="flex-1 min-w-0 pt-0.5">
              <h1 className="text-xl font-bold text-slate-800 font-display">{agent.name}</h1>
              {tags.length > 0 && (
                <div className="flex gap-1.5 flex-wrap mt-2">
                  {tags.map(tag => (
                    <span key={tag}
                      className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {agent.description && (
            <p className="text-slate-600 text-sm leading-relaxed mb-5 whitespace-pre-line">
              {agent.description}
            </p>
          )}

          {agent.usage_guide && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-5">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-2">
                <BookOpen size={14} />
                使用说明
              </div>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{agent.usage_guide}</p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <LikeButton agentId={agent.id} initialCount={agent.likes_count} />
            <FavoriteButton agentId={agent.id} initialFavorited={favorited} />
            <a href={agent.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors">
              去使用
              <ExternalLink size={13} />
            </a>
          </div>
        </div>

        {/* Comments */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-slate-800 font-display mb-4">
            评论
            <span className="text-slate-400 font-normal text-sm ml-1.5">({comments.length})</span>
          </h2>
          <div className="mb-6">
            <CommentForm agentId={agent.id} onCommentAdded={c => setComments(prev => [...prev, c])} />
          </div>
          <CommentList
            comments={comments}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            onCommentUpdated={updated => setComments(prev => prev.map(c => c.id === updated.id ? updated : c))}
            onCommentDeleted={commentId => setComments(prev => prev.filter(c => c.id !== commentId))}
          />
        </div>
      </main>
    </div>
  )
}
