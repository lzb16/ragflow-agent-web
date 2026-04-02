import type { Comment } from '../types'

interface Props {
  comments: Comment[]
}

export default function CommentList({ comments }: Props) {
  if (comments.length === 0) {
    return <p className="text-slate-400 text-sm py-4 text-center">暂无评论，来说点什么吧</p>
  }
  return (
    <ul className="space-y-3">
      {comments.map(c => (
        <li key={c.id} className="border border-slate-100 rounded-lg px-4 py-3 bg-slate-50">
          <p className="text-slate-700 text-sm leading-relaxed">{c.content}</p>
          <p className="text-xs text-slate-400 mt-1.5">{new Date(c.created_at).toLocaleString('zh-CN')}</p>
        </li>
      ))}
    </ul>
  )
}
