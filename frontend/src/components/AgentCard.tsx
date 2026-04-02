import { Link } from 'react-router-dom'
import { ThumbsUp } from 'lucide-react'
import type { Agent } from '../types'

interface Props {
  agent: Agent
}

export default function AgentCard({ agent }: Props) {
  const tags = agent.tags ? agent.tags.split(',').map(t => t.trim()).filter(Boolean) : []

  return (
    <Link to={`/agents/${agent.id}`}
      className="bg-white border border-slate-200 rounded-xl p-4 flex gap-4 items-start hover:border-blue-300 hover:bg-blue-50/40 transition-colors cursor-pointer">
      <div className="flex-shrink-0">
        {agent.avatar_path ? (
          <img src={`/${agent.avatar_path}`} alt={agent.name}
            className="w-12 h-12 rounded-xl object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 text-lg font-bold font-display">
            {agent.name[0]}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-slate-800 truncate font-display">{agent.name}</h3>
        {agent.description && (
          <p className="text-sm text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{agent.description}</p>
        )}
        {tags.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
          <ThumbsUp size={12} />
          <span>{agent.likes_count}</span>
        </div>
      </div>
    </Link>
  )
}
