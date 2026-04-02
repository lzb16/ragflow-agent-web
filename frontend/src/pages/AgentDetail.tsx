import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'
import type { Agent, Comment } from '../types'
import LikeButton from '../components/LikeButton'
import CommentList from '../components/CommentList'
import CommentForm from '../components/CommentForm'

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>()
  const [agent, setAgent] = useState<Agent | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    const agentId = Number(id)
    Promise.all([api.getAgent(agentId), api.listComments(agentId)])
      .then(([a, c]) => { setAgent(a); setComments(c) })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="text-center py-20 text-gray-400">加载中...</div>
  if (notFound || !agent) return (
    <div className="text-center py-20">
      <p className="text-gray-500">智能体不存在</p>
      <Link to="/" className="text-blue-500 hover:underline mt-2 block">返回首页</Link>
    </div>
  )

  const tags = agent.tags ? agent.tags.split(',').map(t => t.trim()).filter(Boolean) : []

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link to="/" className="text-sm text-gray-500 hover:text-gray-700 mb-6 block">← 返回首页</Link>

      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <div className="flex items-start gap-4 mb-4">
          {agent.avatar_path ? (
            <img src={`/${agent.avatar_path}`} alt={agent.name}
              className="w-16 h-16 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 text-2xl font-bold flex-shrink-0">
              {agent.name[0]}
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{agent.name}</h1>
            {tags.length > 0 && (
              <div className="flex gap-2 flex-wrap mt-1">
                {tags.map(tag => (
                  <span key={tag} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {agent.description && (
          <p className="text-gray-600 text-sm mb-4 whitespace-pre-line">{agent.description}</p>
        )}

        {agent.usage_guide && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">使用说明</h2>
            <p className="text-sm text-gray-600 whitespace-pre-line">{agent.usage_guide}</p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <LikeButton agentId={agent.id} initialCount={agent.likes_count} />
          <a href={agent.url} target="_blank" rel="noopener noreferrer"
            className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600">
            去使用 →
          </a>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">评论 ({comments.length})</h2>
        <div className="mb-6">
          <CommentForm agentId={agent.id} onCommentAdded={c => setComments(prev => [...prev, c])} />
        </div>
        <CommentList comments={comments} />
      </div>
    </div>
  )
}
