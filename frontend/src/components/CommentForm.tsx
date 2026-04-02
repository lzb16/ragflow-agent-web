import { useState } from 'react'
import type { FormEvent } from 'react'
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
      <p className="text-sm text-gray-500">
        <a href="/login" className="text-blue-500 hover:underline">登录</a>后发表评论
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
    <form onSubmit={handleSubmit} className="space-y-2">
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="写下你的评论..."
        rows={3}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
      />
      <button type="submit" disabled={loading || !content.trim()}
        className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50">
        {loading ? '提交中...' : '发表评论'}
      </button>
    </form>
  )
}
