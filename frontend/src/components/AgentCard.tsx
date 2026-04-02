import { Link } from 'react-router-dom'
import type { Agent } from '../types'

interface Props {
  agent: Agent
}

export default function AgentCard({ agent }: Props) {
  const tags = agent.tags ? agent.tags.split(',').map(t => t.trim()).filter(Boolean) : []

  return (
    <Link to={`/agents/${agent.id}`}
      className="bg-white rounded-xl shadow hover:shadow-md transition-shadow p-4 flex gap-4 items-start">
      <div className="flex-shrink-0">
        {agent.avatar_path ? (
          <img src={`/${agent.avatar_path}`} alt={agent.name}
            className="w-14 h-14 rounded-full object-cover" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 text-xl font-bold">
            {agent.name[0]}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 truncate">{agent.name}</h3>
        {agent.description && (
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{agent.description}</p>
        )}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {tags.map(tag => (
            <span key={tag} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1 mt-2 text-sm text-gray-400">
          <span>👍</span>
          <span>{agent.likes_count}</span>
        </div>
      </div>
    </Link>
  )
}
