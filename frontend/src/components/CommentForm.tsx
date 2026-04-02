import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import type { Comment } from '../types'

interface Props {
  agentId: number
  onCommentAdded: (comment: Comment) => void
}

export default function CommentForm({ agentId, onCommentAdded }: Props) {
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const token = localStorage.getItem('token')

  if (!token) {
    return (
      <p className="text-sm text-slate-500">
        <Link to="/login" className="text-blue-600 hover:underline font-medium">登录</Link>后发表评论
      </p>
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setError('')
    setLoading(true)
    try {
      const comment = await api.postComment(agentId, content.trim())
      onCommentAdded(comment)
      setContent('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-3 py-2 text-sm">{error}</div>
      )}
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="写下你的评论..."
        rows={3}
        className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
      />
      <button type="submit" disabled={loading || !content.trim()}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer">
        {loading ? '提交中...' : '发表评论'}
      </button>
    </form>
  )
}
