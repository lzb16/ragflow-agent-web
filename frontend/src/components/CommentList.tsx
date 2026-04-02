import type { Comment } from '../types'

interface Props {
  comments: Comment[]
}

export default function CommentList({ comments }: Props) {
  if (comments.length === 0) {
    return <p className="text-gray-400 text-sm py-4">暂无评论</p>
  }
  return (
    <ul className="space-y-4">
      {comments.map(c => (
        <li key={c.id} className="bg-gray-50 rounded-lg px-4 py-3">
          <p className="text-gray-800 text-sm">{c.content}</p>
          <p className="text-xs text-gray-400 mt-1">{new Date(c.created_at).toLocaleString('zh-CN')}</p>
        </li>
      ))}
    </ul>
  )
}
