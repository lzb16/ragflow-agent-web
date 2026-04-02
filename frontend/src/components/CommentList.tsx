import { useState } from 'react'
import { Pencil, Trash2, Check, X } from 'lucide-react'
import { api } from '../api'
import type { Comment } from '../types'

interface Props {
  comments: Comment[]
  currentUserId: number | null
  isAdmin: boolean
  onCommentUpdated: (comment: Comment) => void
  onCommentDeleted: (commentId: number) => void
}

export default function CommentList({
  comments,
  currentUserId,
  isAdmin,
  onCommentUpdated,
  onCommentDeleted,
}: Props) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editContent, setEditContent] = useState('')
  const [loadingId, setLoadingId] = useState<number | null>(null)

  function startEdit(c: Comment) {
    setEditingId(c.id)
    setEditContent(c.content)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditContent('')
  }

  async function submitEdit(c: Comment) {
    if (!editContent.trim()) return
    setLoadingId(c.id)
    try {
      const updated = await api.updateComment(c.agent_id, c.id, editContent.trim())
      onCommentUpdated(updated)
      setEditingId(null)
    } finally {
      setLoadingId(null)
    }
  }

  async function handleDelete(c: Comment) {
    if (!confirm('确定删除这条评论吗？')) return
    setLoadingId(c.id)
    try {
      await api.deleteComment(c.agent_id, c.id)
      onCommentDeleted(c.id)
    } finally {
      setLoadingId(null)
    }
  }

  if (comments.length === 0) {
    return <p className="text-slate-400 text-sm py-4 text-center">暂无评论，来说点什么吧</p>
  }

  return (
    <ul className="space-y-3">
      {comments.map(c => {
        const canEdit = currentUserId === c.user_id
        const canDelete = currentUserId === c.user_id || isAdmin
        const isEditing = editingId === c.id
        const isLoading = loadingId === c.id

        return (
          <li key={c.id} className="border border-slate-100 rounded-lg px-4 py-3 bg-slate-50">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-medium text-slate-600">{c.username}</span>
              {(canEdit || canDelete) && !isEditing && (
                <div className="flex gap-1 flex-shrink-0">
                  {canEdit && (
                    <button
                      onClick={() => startEdit(c)}
                      disabled={isLoading}
                      className="text-slate-400 hover:text-blue-500 transition-colors p-0.5 cursor-pointer">
                      <Pencil size={13} />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(c)}
                      disabled={isLoading}
                      className="text-slate-400 hover:text-red-500 transition-colors p-0.5 cursor-pointer">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {isEditing ? (
              <div className="mt-2 space-y-2">
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  rows={3}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => submitEdit(c)}
                    disabled={isLoading || !editContent.trim()}
                    className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer">
                    <Check size={12} />
                    保存
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="flex items-center gap-1 text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer">
                    <X size={12} />
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-slate-700 text-sm leading-relaxed mt-1">{c.content}</p>
            )}

            <p className="text-xs text-slate-400 mt-1.5">{new Date(c.created_at).toLocaleString('zh-CN')}</p>
          </li>
        )
      })}
    </ul>
  )
}
