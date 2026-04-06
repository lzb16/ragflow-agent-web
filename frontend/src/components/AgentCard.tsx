import { Link } from 'react-router-dom'
import { ThumbsUp } from 'lucide-react'
import type { Agent } from '../types'
import FavoriteButton from './FavoriteButton'

interface Props {
  agent: Agent
  favoritedIds?: number[]
  onFavoriteToggle?: (agentId: number, favorited: boolean) => void
}

const TAG_STYLES = [
  'bg-blue-50 text-blue-700',
  'bg-violet-50 text-violet-700',
  'bg-emerald-50 text-emerald-700',
  'bg-orange-50 text-orange-700',
  'bg-cyan-50 text-cyan-700',
  'bg-pink-50 text-pink-700',
]

// 无头像时横幅背景色
const BANNER_BG_STYLES = [
  'bg-blue-50',
  'bg-violet-50',
  'bg-emerald-50',
  'bg-orange-50',
  'bg-cyan-50',
  'bg-pink-50',
]

// 无头像时头像占位符背景色（比横幅深一档）
const AVATAR_BG_STYLES = [
  'bg-blue-100',
  'bg-violet-100',
  'bg-emerald-100',
  'bg-orange-100',
  'bg-cyan-100',
  'bg-pink-100',
]

// 无头像时横幅大字母的颜色
const BANNER_TEXT_STYLES = [
  'text-blue-200',
  'text-violet-200',
  'text-emerald-200',
  'text-orange-200',
  'text-cyan-200',
  'text-pink-200',
]

function getColorIndex(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return hash % TAG_STYLES.length
}

export default function AgentCard({ agent, favoritedIds = [], onFavoriteToggle }: Props) {
  const tags = agent.tags ? agent.tags.split(',').map(t => t.trim()).filter(Boolean) : []
  const idx = getColorIndex(agent.name)
  const tagStyle = TAG_STYLES[idx]
  const bannerBg = BANNER_BG_STYLES[idx]
  const avatarBg = AVATAR_BG_STYLES[idx]

  return (
    <Link to={`/agents/${agent.id}`}
      className="group bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col
        shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">

      {/* 顶部横幅 + 头像 */}
      <div className={`relative h-14 flex-shrink-0 ${agent.avatar_path ? 'bg-slate-100' : bannerBg}`}>
        {/* 模糊背景单独裁剪，不影响探出的头像 */}
        <div className="absolute inset-0 overflow-hidden">
          {agent.avatar_path && (
            <>
              <img src={`/${agent.avatar_path}`} alt="" aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover scale-125 blur-xl opacity-70" />
              <div className="absolute inset-0 bg-white/40" />
            </>
          )}
        </div>
        {/* 底部分隔线 */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-black/5" />

        <div className="absolute -bottom-5 left-4">
          {agent.avatar_path ? (
            <img src={`/${agent.avatar_path}`} alt={agent.name}
              className="w-12 h-12 rounded-xl object-cover ring-2 ring-white shadow-sm" />
          ) : (
            <div className={`w-12 h-12 rounded-xl ring-2 ring-white shadow-sm ${avatarBg}
              flex items-center justify-center text-xl font-bold font-display leading-none ${tagStyle.split(' ')[1]}`}>
              {agent.name[0]}
            </div>
          )}
        </div>
        {/* 点赞数 + 收藏 */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5">
          <div className="flex items-center gap-1 text-slate-500 text-xs bg-white/70 backdrop-blur-sm rounded-md px-1.5 py-0.5">
            <ThumbsUp size={11} />
            <span>{agent.likes_count}</span>
          </div>
          <FavoriteButton agentId={agent.id} initialFavorited={favoritedIds.includes(agent.id)} onToggle={onFavoriteToggle} />
        </div>
      </div>

      {/* 内容区 */}
      <div className="flex-1 flex flex-col pt-7 px-4 pb-4">
        <h3 className="font-semibold text-slate-800 text-base font-display leading-snug line-clamp-1">
          {agent.name}
        </h3>
        {agent.description && (
          <p className="text-sm text-slate-500 mt-1.5 line-clamp-2 leading-relaxed flex-1">
            {agent.description}
          </p>
        )}
        {tags.length > 0 && (
          <div className="flex items-center gap-1.5 mt-3 flex-wrap">
            {tags.slice(0, 3).map(tag => (
              <span key={tag} className={`text-xs ${tagStyle} px-2 py-0.5 rounded-full font-medium`}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}
